import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { Ticket, FormTemplate } from '@/lib/mariadb/models';
import { generateTicketId } from '@/lib/utils/ticketIdGenerator';

// Create a new ticket
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Get request body
    const body = await request.json();
    
    const { title, description, form_template_id, form_data, priority = 'medium', type } = body;
    
    // Validate required fields
    if (!title || (!description && !form_data)) {
      return NextResponse.json(
        { message: "Title and either description or form data are required" },
        { status: 400 }
      );
    }
    
    // Validate form template if form_template_id is provided
    if (form_template_id) {
      const template = await FormTemplate.findByPk(form_template_id);
      if (!template) {
        return NextResponse.json(
          { message: "Invalid form template" },
          { status: 400 }
        );
      }
    }
    
    // Generate a new ticket ID
    const ticketId = await generateTicketId(form_template_id || 'custom-ticket-template');
    
    // Create the ticket
    const ticket = await Ticket.create({
      id: ticketId,
      title,
      description: description || '',
      status: 'open',
      priority,
      created_by: session.user.id,
      form_template_id: form_template_id || null,
      form_data: form_data ? JSON.stringify(form_data) : null,
      type: type || null
    });
    
    return NextResponse.json({
      message: "Ticket created successfully",
      ticket: ticket.get({ plain: true })
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { message: "Error creating ticket", error: error.message },
      { status: 500 }
    );
  }
} 