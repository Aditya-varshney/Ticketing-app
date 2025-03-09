import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import connectToDatabase from "@/lib/mongodb/connect";
import User from "@/lib/mongodb/models/User";

export async function POST(request) {
  console.log("Registration request received");
  try {
    const body = await request.json();
    console.log("Registration request body:", body);
    
    const { name, email, password, role } = body;

    // Validate input
    if (!name || !email || !password) {
      console.log("Missing required fields");
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Connect to database
    console.log("Connecting to database");
    await connectToDatabase();
    console.log("Connected to database");

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already exists:", email);
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    console.log("Hashing password");
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Password hashed");

    // Create user (ensuring role is valid)
    const validRole = ['user', 'helpdesk', 'admin'].includes(role) ? role : 'user';
    
    console.log("Creating user with role:", validRole);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: validRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    });
    console.log("User created successfully:", newUser._id);

    // Remove password from response
    const userObject = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    console.log("Registration successful");
    return NextResponse.json(
      { message: "User created successfully", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Registration failed", error: error.message },
      { status: 500 }
    );
  }
}
