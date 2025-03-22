import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User, FormSubmission, FormTemplate, Assignment } from '@/lib/mariadb/models';
import { Op } from 'sequelize';

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
    
    // For helpdesk users, get assigned users first
    let userIds = [];
    if (user.role === 'helpdesk') {
      const assignments = await Assignment.findAll({
        where: { helpdesk_id: user.id }
      });
      
      userIds = assignments.map(a => a.user_id);
      
      if (userIds.length === 0) {
        // No assigned users
        return NextResponse.json([]);
      }
    }
    
    // Get tickets - for helpdesk only from assigned users, for admin all tickets
    const whereClause = user.role === 'helpdesk' 
      ? { submitted_by: { [Op.in]: userIds } }
      : {};
    
    const tickets = await FormSubmission.findAll({
      where: whereClause,
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email', 'avatar'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching helpdesk tickets:", error);
    return NextResponse.json(
      { message: "Error fetching tickets", error: error.message },
      { status: 500 }
    );
  }
}
