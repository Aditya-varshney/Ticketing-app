import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Assignment, User } from "@/lib/mariadb/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get all assignments or filtered by user/helpdesk id
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
    
    // Get user info to check permissions
    const requestingUser = await User.findByPk(session.user.id);
    if (!requestingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const helpdeskId = searchParams.get('helpdeskId');
    
    // Define where clause based on parameters and user role
    const whereClause = {};
    
    // If filtering by user ID
    if (userId) {
      whereClause.user_id = userId;
    }
    
    // If filtering by helpdesk ID
    if (helpdeskId) {
      whereClause.helpdesk_id = helpdeskId;
    }
    
    // Regular users can only see their own assignments
    if (requestingUser.role === 'user') {
      whereClause.user_id = requestingUser.id;
    }
    
    // Helpdesk users can only see assignments where they are the helpdesk
    else if (requestingUser.role === 'helpdesk') {
      whereClause.helpdesk_id = requestingUser.id;
    }
    
    // Get assignments based on filters
    const assignments = await Assignment.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'helpdesk', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'admin', attributes: ['id', 'name', 'email'] }
      ]
    });
    
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { message: "Error fetching assignments", error: error.message },
      { status: 500 }
    );
  }
}

// Create or update an assignment
export async function POST(request) {
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
    
    // Verify admin role
    const admin = await User.findByPk(session.user.id);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can create/update assignments" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { userId, helpdeskId } = data;
    
    if (!userId || !helpdeskId) {
      return NextResponse.json(
        { message: "User ID and helpdesk ID are required" },
        { status: 400 }
      );
    }
    
    // Check if user exists and is a regular user
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }
    
    if (user.role !== 'user') {
      return NextResponse.json(
        { message: "Can only assign regular users to helpdesk" },
        { status: 400 }
      );
    }
    
    // Check if helpdesk exists and is a helpdesk user
    const helpdesk = await User.findByPk(helpdeskId);
    if (!helpdesk) {
      return NextResponse.json(
        { message: "Helpdesk user not found" },
        { status: 404 }
      );
    }
    
    if (helpdesk.role !== 'helpdesk') {
      return NextResponse.json(
        { message: "Can only assign to helpdesk users" },
        { status: 400 }
      );
    }
    
    // Check if assignment already exists
    let assignment = await Assignment.findOne({
      where: { user_id: userId }
    });
    
    if (assignment) {
      // Update existing assignment
      assignment.helpdesk_id = helpdeskId;
      assignment.assigned_by = admin.id;
      await assignment.save();
    } else {
      // Create new assignment
      assignment = await Assignment.create({
        user_id: userId,
        helpdesk_id: helpdeskId,
        assigned_by: admin.id
      });
    }
    
    // Return successful response with created/updated assignment
    return NextResponse.json(
      { message: "Assignment created/updated successfully", assignment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating/updating assignment:", error);
    return NextResponse.json(
      { message: "Error creating/updating assignment", error: error.message },
      { status: 500 }
    );
  }
}

// Delete an assignment
export async function DELETE(request) {
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
    
    // Verify admin role
    const admin = await User.findByPk(session.user.id);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Only admins can delete assignments" },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Find the assignment
    const assignment = await Assignment.findOne({
      where: { user_id: userId }
    });
    
    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 }
      );
    }
    
    // Delete the assignment
    await assignment.destroy();
    
    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { message: "Error deleting assignment", error: error.message },
      { status: 500 }
    );
  }
}
