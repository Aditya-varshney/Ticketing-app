import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { User, TicketAssignment, FormSubmission } from "@/lib/mariadb/models";
import { Op } from "sequelize";
import { NextResponse } from "next/server";

// Mark this route as dynamic
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

    const currentUser = await User.findByPk(session.user.id);
    
    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    let contacts = [];
    
    // Logic based on user role
    switch (currentUser.role) {
      case 'admin':
        // Admins can see all users
        contacts = await User.findAll({
          where: { 
            id: { [Op.ne]: session.user.id }
          },
          attributes: ['id', 'name', 'email', 'role', 'profile_image']
        });
        
        // Transform to include _id for compatibility with frontend
        contacts = contacts.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.profile_image
        }));
        break;
        
      case 'helpdesk':
        // Helpdesk users can see all users who have tickets assigned to them
        const helpdeskAssignments = await TicketAssignment.findAll({
          where: { helpdesk_id: session.user.id },
          include: [
            {
              model: FormSubmission,
              as: 'ticket',
              include: [
                {
                  model: User,
                  as: 'submitter',
                  attributes: ['id', 'name', 'email', 'role', 'profile_image']
                }
              ]
            }
          ]
        });
        
        // Extract unique submitters
        const uniqueSubmitters = new Map();
        helpdeskAssignments.forEach(assignment => {
          if (assignment.ticket && assignment.ticket.submitter) {
            uniqueSubmitters.set(
              assignment.ticket.submitter.id, 
              assignment.ticket.submitter
            );
          }
        });
        
        contacts = Array.from(uniqueSubmitters.values());
        break;
        
      case 'user':
        // Regular users can see helpdesks assigned to their tickets
        const userSubmissions = await FormSubmission.findAll({
          where: { submitted_by: session.user.id },
          include: [
            {
              model: TicketAssignment,
              as: 'assignment',
              include: [
                {
                  model: User,
                  as: 'helpdesk',
                  attributes: ['id', 'name', 'email', 'role', 'profile_image']
                }
              ]
            }
          ]
        });
        
        // Extract unique helpdesks
        const uniqueHelpdesks = new Map();
        userSubmissions.forEach(submission => {
          if (submission.assignment && submission.assignment.helpdesk) {
            uniqueHelpdesks.set(
              submission.assignment.helpdesk.id,
              submission.assignment.helpdesk
            );
          }
        });
        
        contacts = Array.from(uniqueHelpdesks.values());
        break;
        
      default:
        contacts = [];
    }

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { message: "Error fetching contacts", error: error.message },
      { status: 500 }
    );
  }
}
