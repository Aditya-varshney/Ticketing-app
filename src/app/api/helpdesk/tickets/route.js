import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User, FormSubmission, FormTemplate, TicketAssignment } from '@/lib/mariadb/models';

export const dynamic = 'force-dynamic';

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
    
    // Only helpdesk or admin can access this endpoint
    if (user.role !== 'helpdesk' && user.role !== 'admin') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }
    
    let tickets;
    
    if (user.role === 'admin') {
      // Admins can see all tickets
      tickets = await FormSubmission.findAll({
        include: [
          { model: FormTemplate, as: 'template' },
          { model: User, as: 'submitter', attributes: ['id', 'name', 'email', 'avatar'] },
          { 
            model: TicketAssignment, 
            as: 'assignment',
            include: [{ model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }]
          }
        ],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Helpdesk users can see all tickets with assignment information
      tickets = await FormSubmission.findAll({
        include: [
          { model: FormTemplate, as: 'template' },
          { model: User, as: 'submitter', attributes: ['id', 'name', 'email', 'avatar'] },
          { 
            model: TicketAssignment, 
            as: 'assignment',
            include: [{ model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] }]
          }
        ],
        order: [['created_at', 'DESC']]
      });
    }
    
    // Ensure we always return an array, even if no tickets found
    return NextResponse.json(tickets || []);
  } catch (error) {
    console.error("Error fetching helpdesk tickets:", error);
    return NextResponse.json(
      { message: "Error fetching tickets", error: error.message },
      { status: 500 }
    );
  }
}
