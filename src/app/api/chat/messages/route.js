import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb/connect";
import Message from "@/lib/mongodb/models/Message";
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

    // Get the current user's ID and receiver ID from query params
    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get("receiverId");

    if (!receiverId) {
      return NextResponse.json(
        { message: "Receiver ID is required" },
        { status: 400 }
      );
    }

    const currentUserId = session.user.id;

    // Connect to the database
    await connectToDatabase();

    // Fetch messages between the two users (both directions)
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: receiverId },
        { sender: receiverId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 }) // Sort by timestamp
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    // Mark all unread messages from the other user as read
    await Message.updateMany(
      { sender: receiverId, receiver: currentUserId, read: false },
      { $set: { read: true } }
    );

    // Transform messages to include sender and receiver details
    const transformedMessages = messages.map((message) => ({
      _id: message._id.toString(),
      content: message.content,
      sender: message.sender._id.toString(),
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar,
      receiver: message.receiver._id.toString(),
      receiverName: message.receiver.name,
      receiverAvatar: message.receiver.avatar,
      read: message.read,
      createdAt: message.createdAt,
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

    // Get the message data from the request body
    const data = await request.json();
    const { receiver, content } = data;

    if (!receiver || !content.trim()) {
      return NextResponse.json(
        { message: "Receiver and content are required" },
        { status: 400 }
      );
    }

    const senderId = session.user.id;

    // Connect to the database
    await connectToDatabase();

    // Create a new message
    const message = await Message.create({
      sender: senderId,
      receiver,
      content,
      read: false,
      createdAt: new Date(),
    });

    // Populate sender and receiver details
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    // Transform the message for the response
    const transformedMessage = {
      _id: populatedMessage._id.toString(),
      content: populatedMessage.content,
      sender: populatedMessage.sender._id.toString(),
      senderName: populatedMessage.sender.name,
      senderAvatar: populatedMessage.sender.avatar,
      receiver: populatedMessage.receiver._id.toString(),
      receiverName: populatedMessage.receiver.name,
      receiverAvatar: populatedMessage.receiver.avatar,
      read: populatedMessage.read,
      createdAt: populatedMessage.createdAt,
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
