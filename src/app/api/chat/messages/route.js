import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { Message, User } from "@/lib/mariadb/models";
import { Op } from "sequelize";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

    // Get the receiver ID from query params
    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get("receiverId");

    if (!receiverId) {
      return NextResponse.json(
        { message: "Receiver ID is required" },
        { status: 400 }
      );
    }

    const currentUserId = session.user.id;

    // Connect to database
    await connectToDatabase();

    // Fetch messages between the two users (both directions)
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender: currentUserId, receiver: receiverId },
          { sender: receiverId, receiver: currentUserId }
        ]
      },
      order: [['created_at', 'ASC']],
      include: [
        {
          model: User,
          as: 'senderUser',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'receiverUser',
          attributes: ['id', 'name', 'avatar']
        }
      ]
    });

    // Mark all unread messages from the other user as read
    await Message.update(
      { read: true },
      {
        where: {
          sender: receiverId,
          receiver: currentUserId,
          read: false
        }
      }
    );

    // Transform messages to include sender and receiver details
    const transformedMessages = messages.map(message => ({
      _id: message.id,
      content: message.content,
      sender: message.sender,
      senderName: message.senderUser.name,
      senderAvatar: message.senderUser.avatar,
      receiver: message.receiver,
      receiverName: message.receiverUser.name,
      receiverAvatar: message.receiverUser.avatar,
      read: message.read,
      createdAt: message.created_at
    }));

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { message: "Error fetching messages", error: error.message },
      { status: 500 }
    );
  }
}

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

    // Get message data from request body
    const data = await request.json();
    const { receiver, content } = data;

    if (!receiver || !content.trim()) {
      return NextResponse.json(
        { message: "Receiver and content are required" },
        { status: 400 }
      );
    }

    const senderId = session.user.id;

    // Connect to database
    await connectToDatabase();

    // Create a new message
    const message = await Message.create({
      id: uuidv4(),
      sender: senderId,
      receiver,
      content,
      read: false
    });

    // Retrieve the created message with associations
    const populatedMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'senderUser',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: User,
          as: 'receiverUser',
          attributes: ['id', 'name', 'avatar']
        }
      ]
    });

    // Transform the message for response
    const transformedMessage = {
      _id: populatedMessage.id,
      content: populatedMessage.content,
      sender: populatedMessage.sender,
      senderName: populatedMessage.senderUser.name,
      senderAvatar: populatedMessage.senderUser.avatar,
      receiver: populatedMessage.receiver,
      receiverName: populatedMessage.receiverUser.name,
      receiverAvatar: populatedMessage.receiverUser.avatar,
      read: populatedMessage.read,
      createdAt: populatedMessage.created_at
    };

    return NextResponse.json(transformedMessage, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { message: "Error sending message", error: error.message },
      { status: 500 }
    );
  }
}
