import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Assignment, FormSubmission, FormTemplate, User } from "@/lib/mariadb/models";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get tickets assigned to the helpdesk user
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
    
    // Check if the user is a helpdesk
    const helpdeskUser = await User.findByPk(session.user.id);
    if (!helpdeskUser || helpdeskUser.role !== 'helpdesk') {
      return NextResponse.json(
        { message: "Only helpdesk users can access this endpoint" },
        { status: 403 }
      );
    }
    
    // Get assignments for this helpdesk
    const assignments = await Assignment.findAll({
      where: { helpdesk_id: session.user.id },
      attributes: ['user_id']
    });
    
    const userIds = assignments.map(a => a.user_id);
    
    if (userIds.length === 0) {
      // No users assigned to this helpdesk
      return NextResponse.json([]);
    }
    
    // Get submissions from assigned users
    const submissions = await FormSubmission.findAll({
      where: { submitted_by: userIds },
      include: [
        { model: FormTemplate, as: 'template' },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
    
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error fetching helpdesk tickets:", error);
    return NextResponse.json(
      { message: "Error fetching tickets", error: error.message },
      { status: 500 }
    );
  }
}
