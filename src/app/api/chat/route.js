import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb/connect";
import Assignment from "@/lib/mongodb/models/Assignment";
import User from "@/lib/mongodb/models/User";
import { NextResponse } from "next/server";

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

    // Connect to the database
    await connectToDatabase();

    const currentUser = await User.findById(session.user.id);
    
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
        contacts = await User.find({ 
          _id: { $ne: session.user.id } 
        }).select('_id name email role avatar');
        break;
        
      case 'helpdesk':
        // Helpdesk users can see all users assigned to them
        const assignments = await Assignment.find({ 
          helpdesk: session.user.id 
        }).populate('user', '_id name email role avatar');
        
        contacts = assignments.map(assignment => assignment.user);
        break;
        
      case 'user':
        // Regular users can only see their assigned helpdesk
        const assignment = await Assignment.findOne({ 
          user: session.user.id 
        }).populate('helpdesk', '_id name email role avatar');
        
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
