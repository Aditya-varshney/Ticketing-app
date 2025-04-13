import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User, FormSubmission, FormTemplate, TicketAssignment } from '@/lib/mariadb/models';

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
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    
    // Find the user
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Only admins and helpdesk can update submissions
    if (user.role === 'user') {
      return NextResponse.json(
        { message: "Only admins and helpdesk staff can update submissions" },
        { status: 403 }
      );
    }
    
    // Find the submission
    const submission = await FormSubmission.findByPk(id);
    if (!submission) {
      return NextResponse.json(
        { message: "Submission not found" },
        { status: 404 }
      );
    }
    
    // Extract update data
    const data = await request.json();
    const { status, priority } = data;
    
    // Update the submission
    const updates = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    
    await submission.update(updates);
    
    console.log(`PUT /api/forms/submissions/[id] - Successfully updated submission: ${id}`);
    return NextResponse.json({
      message: "Submission updated successfully",
      submission
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { message: "Error updating submission", error: error.message },
      { status: 500 }
    );
  }
} 