import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { User, Assignment } from "@/lib/mariadb/models";
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
          attributes: ['id', 'name', 'email', 'role', 'avatar']
        });
        
        // Transform to include _id for compatibility with frontend
        contacts = contacts.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }));
        break;
        
      case 'helpdesk':
        // Helpdesk users can see all users assigned to them
        const assignments = await Assignment.findAll({
          where: { helpdesk_id: session.user.id },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role', 'avatar']
          }]
        });
        
        contacts = assignments.map(assignment => assignment.user);
        break;
        
      case 'user':
        // Regular users can only see their assigned helpdesk
        const assignment = await Assignment.findOne({
          where: { user_id: session.user.id },
          include: [{
            model: User,
            as: 'helpdesk',
            attributes: ['id', 'name', 'email', 'role', 'avatar']
          }]
        });
        
        contacts = assignment ? [assignment.helpdesk] : [];
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
