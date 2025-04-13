import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User, FormSubmission, FormTemplate, TicketAssignment, TicketAudit } from '@/lib/mariadb/models';

// Mark this route as dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    console.log("GET /api/forms/submissions/[id] - Starting request");
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { message: "Submission ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`GET /api/forms/submissions/[id] - Fetching submission: ${id}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("GET /api/forms/submissions/[id] - Not authenticated");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    console.log("GET /api/forms/submissions/[id] - Connected to database");
    
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Find the submission with all relevant data
    const submission = await FormSubmission.findByPk(id, {
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { 
          model: TicketAssignment, 
          as: 'assignment',
          include: [
            { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }
          ] 
        }
      ]
    });
    
    if (!submission) {
      console.log(`GET /api/forms/submissions/[id] - Submission not found: ${id}`);
      return NextResponse.json(
        { message: "Submission not found" },
        { status: 404 }
      );
    }
    
    // Regular users can only view their own submissions
    if (user.role === 'user' && submission.submitted_by !== user.id) {
      console.log(`GET /api/forms/submissions/[id] - Unauthorized access to submission: ${id}`);
      return NextResponse.json(
        { message: "Unauthorized to view this submission" },
        { status: 403 }
      );
    }
    
    // Parse form data if it's stored as a string
    try {
      if (submission.form_data && typeof submission.form_data === 'string') {
        submission.form_data = JSON.parse(submission.form_data);
      }
    } catch (e) {
      console.error("Error parsing form data:", e);
    }
    
    console.log(`GET /api/forms/submissions/[id] - Successfully fetched submission: ${id}`);
    return NextResponse.json(submission);
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { message: "Error fetching submission", error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// Update a form submission
export async function PUT(request, { params }) {
  try {
    console.log("PUT /api/forms/submissions/[id] - Starting request");
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { message: "Submission ID is required" },
        { status: 400 }
      );
    }
    
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log("Session data:", {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      isAuthenticated: !!session?.user
    });
    
    if (!session?.user?.id) {
      console.log("No authenticated user found");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get the current user with role
    const user = await User.findByPk(session.user.id);
    console.log("User data from database:", {
      id: user?.id,
      role: user?.role,
      name: user?.name
    });
    
    if (!user) {
      console.log("User not found in database");
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Get the current ticket with all its data
    const ticket = await FormSubmission.findByPk(id, {
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { 
          model: TicketAssignment, 
          as: 'assignment',
          include: [
            { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }
          ] 
        }
      ]
    });

    if (!ticket) {
      console.log("Ticket not found:", id);
      return NextResponse.json(
        { message: "Ticket not found" },
        { status: 404 }
      );
    }

    console.log("Ticket data:", {
      id: ticket.id,
      submitter: ticket.submitter,
      form_data: ticket.form_data,
      raw_ticket: ticket
    });

    // Parse the existing form data if it's stored as a string
    let currentFormData = {};
    try {
      if (ticket.form_data) {
        currentFormData = typeof ticket.form_data === 'string' 
          ? JSON.parse(ticket.form_data)
          : ticket.form_data;
      }
    } catch (e) {
      console.error("Error parsing existing form data:", e);
    }

    // Check user permissions
    const isAdmin = user.role === 'admin';
    const isHelpdesk = user.role === 'helpdesk';
    const isTicketOwner = ticket.submitter?.id === user.id;
    const isAssignedHelpdesk = isHelpdesk && ticket.assignment?.helpdesk_id === user.id;

    console.log("Permission checks:", {
      isAdmin,
      isHelpdesk,
      isTicketOwner,
      isAssignedHelpdesk,
      userId: user.id,
      submitterId: ticket.submitter?.id
    });

    // Parse request body
    const body = await request.json();
    console.log("Request body:", body);
    const { status, priority, form_data } = body;

    // Verify permissions for different update types
    if (priority && !isAdmin) {
      return NextResponse.json(
        { message: "Only admins can update ticket priority" },
        { status: 403 }
      );
    }

    if (status && !isAdmin && !isAssignedHelpdesk) {
      return NextResponse.json(
        { message: "Only admins and assigned helpdesk can update ticket status" },
        { status: 403 }
      );
    }

    if (form_data && !isAdmin && !isTicketOwner) {
      return NextResponse.json(
        { message: "Only admins and ticket owners can update ticket details" },
        { status: 403 }
      );
    }

    // Track changes for audit
    const changes = [];
    const timestamp = new Date();
    
    // Check for status change
    if (status && status !== ticket.status) {
      changes.push({
        action: 'status_change',
        field: 'status',
        previous_value: ticket.status,
        new_value: status,
        details: `Status changed from ${ticket.status} to ${status} by ${user.name} (${user.role})`,
        timestamp
      });
    }

    // Check for priority change
    if (priority && priority !== ticket.priority) {
      changes.push({
        action: 'priority_change',
        field: 'priority',
        previous_value: ticket.priority,
        new_value: priority,
        details: `Priority changed from ${ticket.priority} to ${priority} by ${user.name} (${user.role})`,
        timestamp
      });
    }

    // Check for form data changes
    if (form_data) {
      const stringifiedNewData = JSON.stringify(form_data);
      const stringifiedCurrentData = JSON.stringify(currentFormData);
      
      if (stringifiedNewData !== stringifiedCurrentData) {
        changes.push({
          action: 'form_data_change',
          field: 'form_data',
          previous_value: stringifiedCurrentData,
          new_value: stringifiedNewData,
          details: `Form data updated by ${user.name} (${user.role})`,
          timestamp
        });
      }
    }

    // Update the ticket
    const updateData = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(form_data && { form_data: JSON.stringify(form_data) }),
      updated_at: timestamp
    };

    console.log("Updating ticket with data:", updateData);
    await ticket.update(updateData);

    // Create audit entries for each change
    for (const change of changes) {
      await TicketAudit.create({
        ticket_id: id,
        user_id: user.id,
        action: change.action,
        field: change.field,
        previous_value: change.previous_value,
        new_value: change.new_value,
        details: change.details,
        created_at: change.timestamp
      });
    }

    // Fetch the updated ticket with all its data
    const updatedTicket = await FormSubmission.findByPk(id, {
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { 
          model: TicketAssignment, 
          as: 'assignment',
          include: [
            { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }
          ] 
        }
      ]
    });

    // Parse form data if it's stored as a string
    try {
      if (updatedTicket.form_data && typeof updatedTicket.form_data === 'string') {
        updatedTicket.form_data = JSON.parse(updatedTicket.form_data);
      }
    } catch (e) {
      console.error("Error parsing form data in response:", e);
    }

    console.log("Successfully updated ticket");
    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { message: "Error updating ticket", error: error.message },
      { status: 500 }
    );
  }
} 