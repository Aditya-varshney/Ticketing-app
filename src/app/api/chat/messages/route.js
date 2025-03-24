import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Message, User } from "@/lib/mariadb/models";
import { Op } from "sequelize";
import { NextResponse } from "next/server";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Get messages between current user and specified user
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

    // Get the user ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const ticketId = searchParams.get('ticketId');
    
    if (!userId && !ticketId) {
      return NextResponse.json(
        { message: "Either userId or ticketId is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get the current user
    const user = await User.findByPk(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Build the where clause
    let whereClause = {};
    
    // If ticketId is provided, that's our primary filter
    if (ticketId) {
      whereClause.ticket_id = ticketId;
    } 
    // If only userId is provided but no ticketId
    else if (userId) {
      whereClause = {
        [Op.or]: [
          { sender: session.user.id, receiver: userId },
          { sender: userId, receiver: session.user.id }
        ]
      };
    }

    console.log("Using where clause:", JSON.stringify(whereClause));

    // Get messages between the two users
    const messages = await Message.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'senderUser', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'receiverUser', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['created_at', 'ASC']]
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { message: "Error fetching messages", error: error.message },
      { status: 500 }
    );
  }
}

// Send a message to the specified user
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

    // Parse request body
    const body = await request.json();
    const { content, receiverId, ticketId } = body;
    
    if (!content || !receiverId) {
      return NextResponse.json(
        { message: "Content and receiver ID are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Create the message
    const message = await Message.create({
      sender: session.user.id,
      receiver: receiverId,
      content,
      read: false,
      ticket_id: ticketId || null
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { message: "Error sending message", error: error.message },
      { status: 500 }
    );
  }
}
