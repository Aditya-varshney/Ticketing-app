import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can access this endpoint
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const directoryPath = searchParams.get('path');
    
    if (!directoryPath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }
    
    // Security check: only allow certain directories to be created
    const allowedPrefixes = ['public', 'uploads', 'public/uploads'];
    const normalizedPath = path.normalize(directoryPath).replace(/^\/+/, '');
    const isAllowed = allowedPrefixes.some(prefix => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`));
    
    if (!isAllowed) {
      return NextResponse.json({ 
        error: 'Path not allowed for security reasons',
        message: 'Only directories under public/ or uploads/ can be created'
      }, { status: 403 });
    }
    
    // Create full path from project root
    const fullPath = path.join(process.cwd(), normalizedPath);
    
    // Check if directory already exists
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        return NextResponse.json({ 
          message: 'Directory already exists',
          path: normalizedPath
        });
      } else {
        return NextResponse.json({ 
          error: 'Path exists but is not a directory',
          path: normalizedPath
        }, { status: 400 });
      }
    }
    
    // Create directory
    fs.mkdirSync(fullPath, { recursive: true });
    
    return NextResponse.json({ 
      message: 'Directory created successfully',
      path: normalizedPath
    });
    
  } catch (error) {
    console.error('Error creating directory:', error);
    return NextResponse.json({ 
      error: 'Failed to create directory',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 