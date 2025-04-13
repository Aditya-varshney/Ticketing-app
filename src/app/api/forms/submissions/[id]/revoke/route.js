import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { FormSubmission, TicketAudit } from '@/lib/mariadb/models';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const ticketId = params.id;
    
    // Connect to database
    await connectToDatabase();
    
    // Find the ticket
    const ticket = await FormSubmission.findOne({ 
      where: { 
        id: ticketId,
        user_id: session.user.id  // Ensure the user owns this ticket
      } 
    });
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or you don\'t have permission to revoke it' }, { status: 404 });
    }
    
    // Update ticket status to revoked
    const previousStatus = ticket.status;
    ticket.status = 'revoked';
    await ticket.save();

    // Create audit entry for revocation
    await TicketAudit.create({
      ticket_id: ticketId,
      user_id: session.user.id,
      action: 'revoked',
      previous_value: previousStatus,
      new_value: 'revoked',
      details: 'Ticket revoked by user'
    });
    
    return NextResponse.json({ 
      message: 'Ticket revoked successfully',
      id: ticket.id
    });
    
  } catch (error) {
    console.error('Error revoking ticket:', error);
    return NextResponse.json({ error: 'Failed to revoke ticket' }, { status: 500 });
  }
} 