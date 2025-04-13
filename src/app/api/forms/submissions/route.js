import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
// Fix import paths to match your project structure
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User, FormSubmission, FormTemplate, TicketAssignment } from '@/lib/mariadb/models';
import { Op } from 'sequelize';
import { generateTicketId } from '@/lib/utils/ticketIdGenerator';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get form submissions (admins see all, users see only theirs)
export async function GET(request) {
  try {
    console.log("GET /api/forms/submissions - Starting request");
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("GET /api/forms/submissions - Not authenticated");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();
    console.log("GET /api/forms/submissions - Connected to database");
    
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    const includeRevoked = searchParams.get('includeRevoked') === 'true';
    
    // If an ID is provided, return that specific submission
    if (submissionId) {
      const submission = await FormSubmission.findByPk(submissionId, {
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
        return NextResponse.json(
          { message: "Submission not found" },
          { status: 404 }
        );
      }
      
      // Regular users can only view their own submissions
      if (user.role === 'user' && submission.submitted_by !== user.id) {
        return NextResponse.json(
          { message: "Unauthorized to view this submission" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(submission);
    }
    
    // For regular users, return only their submissions
    if (user.role === 'user') {
      console.log(`GET /api/forms/submissions - User role: ${user.role}, fetching user's submissions`);
      const submissions = await FormSubmission.findAll({
        where: { submitted_by: user.id },
        include: [
          { model: FormTemplate, as: 'template' }
        ],
        order: [['created_at', 'DESC']]
      });
      console.log(`GET /api/forms/submissions - Found ${submissions.length} submissions for user`);
      return NextResponse.json(submissions);
    }
    
    // For admins and helpdesk, return all submissions
    console.log(`GET /api/forms/submissions - User role: ${user.role}, fetching all submissions`);
    
    let whereClause = {};

    // If revoked tickets should be excluded
    if (!includeRevoked) {
      whereClause.status = {
        [Op.or]: [null, { [Op.ne]: 'revoked' }]
      };
    }
    
    const submissions = await FormSubmission.findAll({
      where: whereClause,
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    console.log(`GET /api/forms/submissions - Found ${submissions.length} total submissions`);
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json(
      { message: "Error fetching submissions", error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// Create a new form submission
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    const body = await request.json();
    const { formTemplateId, formData, priority } = body;
    
    // Check if this is a custom ticket
    const isCustomTicket = !formTemplateId || formTemplateId === 'custom-ticket';
    
    // Validate form template if provided
    if (!isCustomTicket) {
      const template = await FormTemplate.findByPk(formTemplateId);
      if (!template) {
        return NextResponse.json(
          { message: "Invalid form template" },
          { status: 400 }
        );
      }
    }
    
    // Process form data
    let processedFormData = formData;
    if (typeof formData === 'object') {
      processedFormData = JSON.stringify(formData);
    }
    
    try {
      // Use a custom template ID for custom tickets
      const templateIdToUse = isCustomTicket ? 'custom-ticket-template' : formTemplateId;
      
      // Generate a unique ticket ID
      const ticketId = await generateTicketId(
        templateIdToUse,
        session.user.name
      );
      
      const submission = await FormSubmission.create({
        id: ticketId,
        form_template_id: templateIdToUse,
        submitted_by: session.user.id,
        form_data: processedFormData,
        priority: priority || 'pending'
      });
      
      console.log("Submission created successfully:", submission.id);
      
      return NextResponse.json(
        { message: "Submission created successfully", submission },
        { status: 201 }
      );
    } catch (modelError) {
      console.error("Error creating with model, trying direct query:", modelError);
      
      // Fall back to direct SQL query
      const sequelize = FormSubmission.sequelize;
      const ticketId = await generateTicketId(templateIdToUse);
      
      const [results] = await sequelize.query(`
        INSERT INTO form_submissions 
        (id, form_template_id, submitted_by, form_data, status, priority) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          ticketId,
          templateIdToUse,
          session.user.id,
          processedFormData,
          'open',
          priority || 'pending'
        ]
      });
      
      return NextResponse.json(
        { message: "Submission created successfully with direct query" },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating form submission:", error);
    return NextResponse.json(
      { message: "Error creating form submission", error: error.message },
      { status: 500 }
    );
  }
}

// Add a PUT method to update a submission (for admin to set priority)
export async function PUT(request) {
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
        { message: "Only admins and helpdesk can update submissions" },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) {
      return NextResponse.json(
        { message: "Submission ID is required" },
        { status: 400 }
      );
    }
    
    const submission = await FormSubmission.findByPk(submissionId);
    if (!submission) {
      return NextResponse.json(
        { message: "Submission not found" },
        { status: 404 }
      );
    }
    
    // For helpdesk users, verify they are assigned to this ticket
    if (user.role === 'helpdesk') {
      const assignment = await TicketAssignment.findOne({
        where: {
          ticket_id: submissionId,
          helpdesk_id: user.id
        }
      });
      
      if (!assignment) {
        return NextResponse.json(
          { message: "You are not assigned to this ticket" },
          { status: 403 }
        );
      }
    }
    
    const data = await request.json();
    const { priority, status } = data;
    
    // Update the submission fields
    const updateData = {};
    // Only admins can update priority
    if (priority && user.role === 'admin') updateData.priority = priority;
    // Both admins and helpdesk can update status
    if (status) updateData.status = status;

    await submission.update(updateData);
    
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
