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
      // Helpdesk can see messages for any ticket (previously limited to assigned tickets)
      else if (user.role === 'helpdesk') {
        // Remove assignment check - allow all helpdesk staff to see ticket messages
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
          { sender_id: session.user.id, receiver_id: userId },
          { sender_id: userId, receiver_id: session.user.id }
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
          attributes: ['id', 'name', 'email', 'role', 'profile_image'],
          required: false
        },
        { 
          model: User, 
          as: 'receiverUser', 
          attributes: ['id', 'name', 'email', 'role', 'profile_image'],
          required: false
        }
      ],
      order: [['created_at', 'ASC']]
    });

    console.log(`Found ${messages.length} messages`);
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
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await User.findOne({ where: { email: session.user.email } });
    if (!userData) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const data = await req.json();
    console.log("Message data received:", {
      ...data,
      userId: userData.id,
      senderRole: userData.role
    });

    // Check if basic required fields are present
    const { content, ticketId, receiverId } = data;
    
    // Check for attachments with any possible property name structure
    const hasAttachment = Boolean(data.attachmentUrl || (data.attachment && data.attachment.url));
    
    // Extract attachment data consistently
    const attachmentUrl = data.attachmentUrl || (data.attachment && data.attachment.url);
    const attachmentType = data.attachmentType || (data.attachment && data.attachment.type) || 'application/octet-stream';
    const attachmentName = data.attachmentName || (data.attachment && data.attachment.name) || 'file';
    const attachmentSize = data.attachmentSize || (data.attachment && data.attachment.size);
    
    if (!ticketId && (!content || content.trim() === '') && !hasAttachment) {
      return Response.json({ error: "Content or attachment required" }, { status: 400 });
    }

    // Ensure we have a valid target for the message
    if (!ticketId && !receiverId) {
      return Response.json({ error: "Target (ticketId or receiverId) required" }, { status: 400 });
    }

    // Handle different message types
    let messageData = {
      sender_id: userData.id,
      content: content || "", // Empty string if no content
      read: false
    };

    // If this is a ticket-related message
    if (ticketId) {
      // Try to find the ticket by both id and ticket_id
      let ticket = await FormSubmission.findOne({
        where: { id: ticketId },
        include: [
          { model: User, as: 'submitter' }
        ]
      });
      
      // If not found by id, try with ticket_id
      if (!ticket) {
        ticket = await FormSubmission.findOne({
          where: { ticket_id: ticketId },
          include: [
            { model: User, as: 'submitter' }
          ]
        });
      }

      if (!ticket) {
        return Response.json({ error: "Ticket not found" }, { status: 404 });
      }
      
      // Get assignment information if needed
      if (userData.role === 'user') {
        try {
          const assignment = await TicketAssignment.findOne({
            where: { ticket_id: ticketId },
            include: [{ model: User, as: 'helpdesk' }]
          });
          
          if (assignment && assignment.helpdesk) {
            ticket.assigned_to = assignment.helpdesk;
          }
        } catch (err) {
          console.log("Warning: Could not fetch assignment info", err.message);
        }
      }

      messageData.ticket_id = ticketId;
      
      // For admin/helpdesk, target is the submitter
      // For submitter, target is assigned_to or system (if unassigned)
      if (userData.role === 'admin' || userData.role === 'helpdesk') {
        if (!ticket.submitter) {
          return Response.json({ error: "Ticket submitter not found" }, { status: 400 });
        }
        messageData.receiver_id = ticket.submitter.id;
      } else {
        // For users, we need to get the assignment info
        try {
          const assignment = await TicketAssignment.findOne({
            where: { ticket_id: ticketId },
            include: [{ model: User, as: 'helpdesk' }]
          });
          
          // If the ticket is assigned, send to the assigned helpdesk staff
          if (assignment && assignment.helpdesk) {
            messageData.receiver_id = assignment.helpdesk.id;
          } else {
            // If unassigned, message will go to the system (null receiver)
            messageData.receiver_id = null;
          }
        } catch (err) {
          console.error("Error getting assignment:", err);
          return Response.json({ error: "Error processing message" }, { status: 500 });
        }
      }
    } else {
      // Direct message
      messageData.receiver_id = receiverId;
    }

    // Add attachment data if present
    if (hasAttachment) {
      messageData.attachment_url = attachmentUrl;
      messageData.attachment_type = attachmentType;
      messageData.attachment_name = attachmentName;
      messageData.attachment_size = attachmentSize;
    }

    console.log("Creating message with data:", messageData);

    // Create the message
    const message = await Message.create(messageData);

    // Fetch the created message with user details
    const completeMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'senderUser' },
        { model: User, as: 'receiverUser' }
      ],
    });

    return Response.json(completeMessage);
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error);
    return Response.json({ error: error.message || "Failed to send message" }, { status: 500 });
  }
}
