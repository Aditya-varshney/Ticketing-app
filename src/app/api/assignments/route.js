import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { User, TicketAssignment, FormSubmission, TicketAudit } from "@/lib/mariadb/models";
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
    if (!user || (user.role !== 'admin' && user.role !== 'helpdesk')) {
      return NextResponse.json(
        { message: "Only admins and helpdesk staff can assign tickets" },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { ticketId, helpdeskId } = body;
    
    if (!ticketId || !helpdeskId) {
      return NextResponse.json(
        { message: "Ticket ID and helpdesk ID are required" },
        { status: 400 }
      );
    }

    // If user is helpdesk, they can only assign tickets to themselves
    if (user.role === 'helpdesk' && helpdeskId !== user.id) {
      return NextResponse.json(
        { message: "Helpdesk staff can only assign tickets to themselves" },
        { status: 403 }
      );
    }

    // Check if ticket exists
    const ticket = await FormSubmission.findByPk(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if helpdesk user exists and has correct role
    const helpdeskUser = await User.findByPk(helpdeskId);
    if (!helpdeskUser || helpdeskUser.role !== 'helpdesk') {
      return NextResponse.json(
        { message: "Invalid helpdesk user" },
        { status: 400 }
      );
    }

    // Get current assignment if any
    const currentAssignment = await TicketAssignment.findOne({
      where: { ticket_id: ticketId },
      include: [{ model: User, as: 'helpdesk', attributes: ['id', 'name'] }]
    });

    // Create or update assignment
    const [assignment, created] = await TicketAssignment.upsert({
      id: currentAssignment?.id || uuidv4(),
      ticket_id: ticketId,
      helpdesk_id: helpdeskId,
      assigned_by: user.id,
      assigned_at: new Date()
    });

    // Create audit entry
    try {
      await TicketAudit.create({
        id: uuidv4(),
        ticket_id: ticketId,
        user_id: user.id,
        action: created ? 'ticket_assigned' : 'ticket_reassigned',
        previous_value: currentAssignment ? currentAssignment.helpdesk.name : null,
        new_value: helpdeskUser.name,
        details: created 
          ? `Ticket assigned to ${helpdeskUser.name}`
          : `Ticket reassigned from ${currentAssignment.helpdesk.name} to ${helpdeskUser.name}`
      });
    } catch (error) {
      console.warn("Warning: Could not create ticket audit entry:", error.message);
      // Continue processing even if audit creation fails
    }

    return NextResponse.json({
      message: created ? "Ticket assigned successfully" : "Ticket reassigned successfully",
      assignment
    });
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
    if (!user || (user.role !== 'admin' && user.role !== 'helpdesk')) {
      return NextResponse.json(
        { message: "Only admins and helpdesk staff can remove assignments" },
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
    
    // Find the assignment
    const assignment = await TicketAssignment.findOne({
      where: { ticket_id: ticketId }
    });
    
    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 }
      );
    }

    // If user is helpdesk, they can only remove assignments for themselves
    if (user.role === 'helpdesk' && assignment.helpdesk_id !== user.id) {
      return NextResponse.json(
        { message: "Helpdesk staff can only remove their own assignments" },
        { status: 403 }
      );
    }

    // Create audit entry for assignment removal
    try {
      await TicketAudit.create({
        id: uuidv4(),
        ticket_id: ticketId,
        user_id: user.id,
        action: 'assignment_removed',
        previous_value: assignment.helpdesk_id,
        new_value: null,
        details: 'Assignment removed'
      });
    } catch (error) {
      console.warn("Warning: Could not create ticket audit entry:", error.message);
      // Continue processing even if audit creation fails
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
