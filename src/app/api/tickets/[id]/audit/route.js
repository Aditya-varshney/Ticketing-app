import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { TicketAudit, User } from '@/lib/mariadb/models';
import sequelize from '@/lib/mariadb/connect';

export async function GET(request, { params }) {
  try {
    console.log('Audit trail requested for ticket:', params.id);
    
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has appropriate permissions (admin or helpdesk)
    if (session.user.role !== 'admin' && session.user.role !== 'helpdesk') {
      return NextResponse.json({ error: 'Forbidden - Admin or helpdesk access required' }, { status: 403 });
    }

    const ticketId = params.id;
    console.log('Fetching audit trail for ticket ID:', ticketId);
    
    // Connect to database
    await connectToDatabase();
    
    // Use direct SQL query to have more control
    const query = `
      SELECT 
        a.id, a.action, a.entity_type, a.entity_id, 
        a.details, a.created_at,
        a.previous_value, a.new_value,
        u.id as user_id, u.name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_id = ? AND a.entity_type = 'ticket'
      ORDER BY a.created_at DESC
    `;
    
    const [results] = await sequelize.query(query, {
      replacements: [ticketId],
      type: sequelize.QueryTypes.SELECT
    });
    
    const auditEntries = Array.isArray(results) ? results : [results];
    console.log(`Found ${auditEntries?.length || 0} audit entries`);
    
    // Format the results from the query
    return NextResponse.json({
      auditTrail: auditEntries.filter(Boolean).map(row => {
        // Parse details if it's stored as a string
        let parsedDetails = null;
        if (row.details) {
          try {
            parsedDetails = typeof row.details === 'string' ? 
              JSON.parse(row.details) : row.details;
          } catch (e) {
            parsedDetails = row.details;
          }
        }

        return {
          id: row.id,
          action: row.action,
          // Try to get values from all possible locations
          previousValue: row.previous_value || parsedDetails?.previous_value || parsedDetails?.previousValue,
          newValue: row.new_value || parsedDetails?.new_value || parsedDetails?.newValue,
          details: parsedDetails,
          createdAt: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email
          }
        };
      })
    });
    
  } catch (error) {
    console.error('Error fetching ticket audit trail:', error);
    // Return a detailed error for troubleshooting
    return NextResponse.json({ 
      error: 'Failed to fetch audit trail', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 