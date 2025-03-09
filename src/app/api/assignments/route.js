import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Assignment, User } from "@/lib/mariadb/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get all assignments
export async function GET(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify admin role
    await connectToDatabase();
    const admin = await User.findByPk(session.user.id);
    if (admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Not authorized" },
        { status: 403 }
      );
    }

    // Get all assignments with populated user and helpdesk information
    const assignments = await Assignment.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'helpdesk',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name']
        }
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

// Create a new assignment
export async function POST(request) {
  try {
    // Check authentication and admin role
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
    if (admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Not authorized" },
        { status: 403 }
      );
    }

    // Get assignment data
    const { userId, helpdeskId } = await request.json();
    
    console.log("Creating assignment with userId:", userId, "helpdeskId:", helpdeskId);
    
    if (!userId || !helpdeskId) {
      return NextResponse.json(
        { message: "User ID and Helpdesk ID are required" },
        { status: 400 }
      );
    }

    // Check if user and helpdesk exist
    const user = await User.findByPk(userId);
    console.log("Found user:", user ? user.id : "Not found");
    
    const helpdesk = await User.findByPk(helpdeskId);
    console.log("Found helpdesk:", helpdesk ? helpdesk.id : "Not found");

    if (!user) {
      return NextResponse.json(
        { message: "User not found", userId: userId },
        { status: 404 }
      );
    }

    if (!helpdesk || helpdesk.role !== 'helpdesk') {
      return NextResponse.json(
        { message: "Invalid helpdesk user" },
        { status: 400 }
      );
    }

    // Check if assignment already exists for this user
    const existingAssignment = await Assignment.findOne({
      where: { user_id: userId }
    });
    
    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.helpdesk_id = helpdeskId;
      existingAssignment.assigned_by = session.user.id;
      await existingAssignment.save();

      return NextResponse.json(
        { message: "Assignment updated successfully", assignment: existingAssignment },
        { status: 200 }
      );
    }

    // Create new assignment
    const newAssignment = await Assignment.create({
      id: uuidv4(),
      user_id: userId,
      helpdesk_id: helpdeskId,
      assigned_by: session.user.id
    });

    return NextResponse.json(
      { message: "Assignment created successfully", assignment: newAssignment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { message: "Error creating assignment", error: error.message },
      { status: 500 }
    );
  }
}

// Delete an assignment
export async function DELETE(request) {
  try {
    // Check authentication and admin role
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
    if (admin.role !== 'admin') {
      return NextResponse.json(
        { message: "Not authorized" },
        { status: 403 }
      );
    }

    // Get user ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Delete the assignment
    const deleteCount = await Assignment.destroy({
      where: { user_id: userId }
    });
    
    if (deleteCount === 0) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Assignment deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { message: "Error deleting assignment", error: error.message },
      { status: 500 }
    );
  }
}
