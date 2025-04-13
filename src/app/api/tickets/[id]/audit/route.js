import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { TicketAudit, User } from '@/lib/mariadb/models';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const ticketId = params.id;
    
    // Connect to database
    await connectToDatabase();
    
    // Fetch audit trail with user information
    const auditTrail = await TicketAudit.findAll({
      where: { ticket_id: ticketId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });
    
    return NextResponse.json({
      auditTrail: auditTrail.map(entry => ({
        id: entry.id,
        action: entry.action,
        previousValue: entry.previous_value,
        newValue: entry.new_value,
        details: entry.details,
        createdAt: entry.created_at,
        user: {
          id: entry.user.id,
          name: entry.user.name,
          email: entry.user.email
        }
      }))
    });
    
  } catch (error) {
    console.error('Error fetching ticket audit trail:', error);
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }
} 