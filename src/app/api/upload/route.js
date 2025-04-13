import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { mkdir } from 'fs/promises';

// Mark this route as dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log("API: Upload endpoint called");
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("API: Upload - Not authenticated");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    console.log("API: Upload - User authenticated", { userId: session.user.id });

    // Get the multipart form data
    const formData = await request.formData();
    
    // Get the file from formData
    const file = formData.get('file');
    
    if (!file) {
      console.log("API: Upload - No file provided");
      return NextResponse.json(
        { message: "File is required" },
        { status: 400 }
      );
    }

    // Get file info
    const fileName = file.name;
    const fileType = file.type;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    console.log("API: Upload - File received", { 
      fileName, 
      fileType, 
      fileExtension,
      fileSize: file.size 
    });
    
    // Validate file type (allow only images and documents)
    const allowedImageTypes = ['.png', '.jpg', '.jpeg'];
    const allowedDocTypes = ['.pdf', '.docx'];
    const allowedExtensions = [...allowedImageTypes, ...allowedDocTypes];
    
    if (!allowedExtensions.includes(fileExtension)) {
      console.log("API: Upload - Invalid file type", { fileExtension });
      return NextResponse.json(
        { message: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    console.log("API: Upload - Uploads directory ensured", { uploadsDir });
    
    // Generate unique filename
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    
    console.log("API: Upload - Preparing to write file", { 
      filePath, 
      uniqueFileName 
    });
    
    // Convert file to buffer and save it
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);
    
    console.log("API: Upload - File written successfully", { 
      filePath, 
      fileSize: fileBuffer.length 
    });
    
    // Generate the URL for the uploaded file
    const fileUrl = `/uploads/${uniqueFileName}`;
    
    console.log("API: Upload - Upload completed successfully", { fileUrl });
    
    // Return file information
    return NextResponse.json({
      url: fileUrl,
      name: fileName,
      type: fileType,
      size: fileBuffer.length
    });

  } catch (error) {
    console.error("API: Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: error.message },
      { status: 500 }
    );
  }
} 