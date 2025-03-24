import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { User, TicketAssignment, FormSubmission } from "@/lib/mariadb/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get all ticket assignments or assignments for a specific ticket
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    
    // Fetch assignments based on parameters and user role
    let assignments;
    
    if (ticketId) {
      // Get assignment for a specific ticket
      assignments = await TicketAssignment.findOne({
        where: { ticket_id: ticketId },
        include: [
          { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }
        ]
      });
    } else if (user.role === 'admin') {
      // Admins can see all assignments
      assignments = await TicketAssignment.findAll({
        include: [
          { model: FormSubmission, as: 'ticket' },
          { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }
        ]
      });
    } else if (user.role === 'helpdesk') {
      // Helpdesk users can see their assignments
      assignments = await TicketAssignment.findAll({
        where: { helpdesk_id: user.id },
        include: [
          { model: FormSubmission, as: 'ticket' }
        ]
      });
    } else {
      // Regular users can't access assignments API
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 403 }
      );
    }
    
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { message: "Error fetching assignments", error: error.message },
      { status: 500 }
    );
  }
}

// Create or update ticket assignment
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    const user = await User.findByPk(session.user.id);
    
    // Parse request body
    const requestBody = await request.json();
    const { ticketId, helpdeskId, selfAssign } = requestBody;
    
    // For self-assignment by helpdesk staff
    if (selfAssign === true) {
      // Verify the user is a helpdesk staff
      if (user.role !== 'helpdesk') {
        return NextResponse.json(
          { message: "Only helpdesk staff can self-assign tickets" },
          { status: 403 }
        );
      }
      
      // Verify ticket exists
      const ticket = await FormSubmission.findByPk(ticketId);
      if (!ticket) {
        return NextResponse.json(
          { message: "Ticket not found" },
          { status: 404 }
        );
      }
      
      // Check if ticket is already assigned
      const existingAssignment = await TicketAssignment.findOne({
        where: { ticket_id: ticketId }
      });
      
      if (existingAssignment) {
        return NextResponse.json(
          { message: "Ticket is already assigned" },
          { status: 400 }
        );
      }
      
      // Create new assignment with helpdesk as self
      const newAssignment = await TicketAssignment.create({
        id: uuidv4(),
        ticket_id: ticketId,
        helpdesk_id: user.id,
        assigned_by: user.id,
        assigned_at: new Date()
      });
      
      // Get the user who created the ticket for notification purposes
      const ticketDetails = await FormSubmission.findByPk(ticketId, {
        include: [{ model: User, as: 'submitter' }]
      });
      
      return NextResponse.json({
        message: "Ticket self-assigned successfully",
        assignment: newAssignment,
        submitterId: ticketDetails?.submitter?.id
      }, { status: 201 });
    }
    
    // For admin assignment (existing flow)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can assign tickets to others" },
        { status: 403 }
      );
    }
    
    if (!ticketId || !helpdeskId) {
      return NextResponse.json(
        { message: "Ticket ID and helpdesk ID are required" },
        { status: 400 }
      );
    }
    
    // Verify ticket exists
    const ticket = await FormSubmission.findByPk(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );
    }
    
    // Verify helpdesk user exists and has helpdesk role
    const helpdeskUser = await User.findByPk(helpdeskId);
    if (!helpdeskUser) {
      console.error(`Helpdesk user with ID ${helpdeskId} not found`);
      return NextResponse.json(
        { message: "Helpdesk user not found", helpdeskId },
        { status: 400 }
      );
    }
    
    if (helpdeskUser.role !== 'helpdesk') {
      console.error(`User ${helpdeskId} (${helpdeskUser.name}) has role ${helpdeskUser.role}, expected 'helpdesk'`);
      return NextResponse.json(
        { message: "Invalid helpdesk user - user exists but doesn't have helpdesk role", 
          userRole: helpdeskUser.role },
        { status: 400 }
      );
    }
    
    console.log(`Assigning ticket ${ticketId} to helpdesk ${helpdeskId} (${helpdeskUser.name})`);
    
    // Check if assignment already exists
    const existingAssignment = await TicketAssignment.findOne({
      where: { ticket_id: ticketId }
    });
    
    // Get the user who created the ticket for notification purposes
    const ticketDetails = await FormSubmission.findByPk(ticketId, {
      include: [{ model: User, as: 'submitter' }]
    });
    
    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.helpdesk_id = helpdeskId;
      existingAssignment.assigned_by = user.id;
      existingAssignment.assigned_at = new Date();
      await existingAssignment.save();
      
      return NextResponse.json({
        message: "Ticket assignment updated successfully",
        assignment: existingAssignment,
        submitterId: ticketDetails?.submitter?.id
      });
    } else {
      // Create new assignment
      const newAssignment = await TicketAssignment.create({
        id: uuidv4(),
        ticket_id: ticketId,
        helpdesk_id: helpdeskId,
        assigned_by: user.id,
        assigned_at: new Date()
      });
      
      return NextResponse.json({
        message: "Ticket assigned successfully",
        assignment: newAssignment,
        submitterId: ticketDetails?.submitter?.id
      }, { status: 201 });
    }
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return NextResponse.json(
      { message: "Error assigning ticket", error: error.message },
      { status: 500 }
    );
  }
}

// Delete ticket assignment
export async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    const user = await User.findByPk(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can remove assignments" },
        { status: 403 }
      );
    }
    
    // Get ticket ID from URL params
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    
    if (!ticketId) {
      return NextResponse.json(
        { message: "Ticket ID is required" },
        { status: 400 }
      );
    }
    
    // Find and delete the assignment
    const assignment = await TicketAssignment.findOne({
      where: { ticket_id: ticketId }
    });
    
    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 }
      );
    }
    
    await assignment.destroy();
    
    return NextResponse.json({
      message: "Assignment removed successfully"
    });
  } catch (error) {
    console.error("Error removing assignment:", error);
    return NextResponse.json(
      { message: "Error removing assignment", error: error.message },
      { status: 500 }
    );
  }
}
