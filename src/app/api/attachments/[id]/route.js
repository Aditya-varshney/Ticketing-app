import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { Message } from '@/lib/mariadb/models';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    console.log(`Serving attachment for message ID: ${messageId}`);
    
    // Find the message with the attachment
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    // Check if message has attachment
    if (!message.attachment_url) {
      return NextResponse.json({ error: 'No attachment found for this message' }, { status: 404 });
    }
    
    // Normalize the attachment path to ensure it's not trying to access files outside allowed directory
    let attachmentPath = message.attachment_url;
    console.log(`Original attachment path: ${attachmentPath}`);
    
    // Try multiple potential locations
    const possibleLocations = [
      // 1. As stored in the database (might be a full path or relative path)
      attachmentPath,
      // 2. Just the filename
      path.basename(attachmentPath),
      // 3. In public/uploads
      path.join('public', 'uploads', path.basename(attachmentPath)),
      // 4. In public
      path.join('public', path.basename(attachmentPath)),
      // 5. In root
      path.join(process.cwd(), path.basename(attachmentPath)),
      // 6. In uploads folder
      path.join('uploads', path.basename(attachmentPath))
    ];
    
    // Find the first location that exists
    let filePath = null;
    for (const location of possibleLocations) {
      // Skip empty paths
      if (!location) continue;
      
      // Check if path is absolute or relative
      const fullPath = path.isAbsolute(location) 
        ? location 
        : path.join(process.cwd(), location);
        
      console.log(`Checking path: ${fullPath}`);
      
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        filePath = fullPath;
        console.log(`File found at: ${filePath}`);
        break;
      }
    }
    
    // If file not found, return error
    if (!filePath) {
      console.error(`File not found for attachment: ${attachmentPath}`);
      console.log(`Tried locations: ${possibleLocations.join(', ')}`);
      return NextResponse.json({ 
        error: 'File not found',
        message_id: messageId,
        attachment_url: attachmentPath,
        tried_locations: possibleLocations 
      }, { status: 404 });
    }
    
    // Read file as binary
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type
    const contentType = message.attachment_type || 'application/octet-stream';
    
    // Return file as response
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${message.attachment_name || 'file'}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving attachment:', error);
    return NextResponse.json({ 
      error: 'Failed to serve attachment', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 