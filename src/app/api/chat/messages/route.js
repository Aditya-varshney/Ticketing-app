import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Message, User, TicketAssignment, FormSubmission } from "@/lib/mariadb/models";
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

    // Get the user ID and ticket ID from query parameters
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

    console.log(`Fetching messages for user ${user.id} (${user.role}) - ticketId: ${ticketId}, userId: ${userId}`);

    // Build the where clause
    let whereClause = {};
    
    // If ticketId is provided
    if (ticketId) {
      // For ticketId: Admin can see all messages for that ticket
      if (user.role === 'admin') {
        whereClause = {
          ticket_id: ticketId
        };
      } 
      // Helpdesk can see messages for tickets assigned to them
      else if (user.role === 'helpdesk') {
        const assignment = await TicketAssignment.findOne({
          where: {
            ticket_id: ticketId,
            helpdesk_id: user.id
          }
        });

        if (!assignment) {
          return NextResponse.json(
            { message: "You don't have access to this ticket's messages" },
            { status: 403 }
          );
        }

        whereClause = {
          ticket_id: ticketId
        };
      } 
      // Users can only see messages related to their tickets
      else {
        const ticket = await FormSubmission.findOne({
          where: {
            id: ticketId,
            submitted_by: user.id
          }
        });

        if (!ticket) {
          return NextResponse.json(
            { message: "You don't have access to this ticket's messages" },
            { status: 403 }
          );
        }

        whereClause = {
          ticket_id: ticketId
        };
      }
    } 
    // If only userId is provided (direct messages)
    else if (userId) {
      whereClause = {
        [Op.or]: [
          { sender: session.user.id, receiver: userId },
          { sender: userId, receiver: session.user.id }
        ],
        ticket_id: null // Only get direct messages
      };
    }

    console.log("Using where clause:", JSON.stringify(whereClause));

    // Get messages with user details
    const messages = await Message.findAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'senderUser', 
          attributes: ['id', 'name', 'email', 'role', 'avatar'],
          required: false // Changed to false to not filter out messages
        },
        { 
          model: User, 
          as: 'receiverUser', 
          attributes: ['id', 'name', 'email', 'role', 'avatar'],
          required: false // Changed to false to not filter out messages
        }
      ],
      order: [['created_at', 'ASC']], // Changed to ASC to show oldest first
    });

    console.log(`Found ${messages.length} messages`);

    // Add additional user info if missing
    const enhancedMessages = await Promise.all(messages.map(async (message) => {
      const messageObj = message.toJSON();
      
      // If sender info is missing, fetch it
      if (!messageObj.senderUser && message.sender) {
        const senderUser = await User.findByPk(message.sender, {
          attributes: ['id', 'name', 'email', 'role', 'avatar']
        });
        if (senderUser) {
          messageObj.senderUser = senderUser.toJSON();
        }
      }
      
      // If receiver info is missing, fetch it
      if (!messageObj.receiverUser && message.receiver) {
        const receiverUser = await User.findByPk(message.receiver, {
          attributes: ['id', 'name', 'email', 'role', 'avatar']
        });
        if (receiverUser) {
          messageObj.receiverUser = receiverUser.toJSON();
        }
      }
      
      return messageObj;
    }));

    return NextResponse.json(enhancedMessages);
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
    const { content, userId, receiverId, ticketId, attachmentUrl, attachmentType, attachmentName } = body;
    
    // Use either userId or receiverId
    const targetUserId = userId || receiverId;
    
    if (!content || !targetUserId) {
      return NextResponse.json(
        { message: "Content and recipient ID are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Create the message with attachment info if available
    const message = await Message.create({
      sender: session.user.id,
      receiver: targetUserId,
      content,
      read: false,
      ticket_id: ticketId || null,
      has_attachment: !!attachmentUrl,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      attachment_name: attachmentName || null
    });

    // Fetch the created message with user details
    const messageWithDetails = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'senderUser', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'receiverUser', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    return NextResponse.json(messageWithDetails);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { message: "Error sending message", error: error.message },
      { status: 500 }
    );
  }
}
