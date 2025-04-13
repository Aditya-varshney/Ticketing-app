import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User } from '@/lib/mariadb/models';

// Mark this route as dynamic to prevent caching
export const dynamic = 'force-dynamic';

// GET users filtered by role
export async function GET(request) {
  let db = null;
  
  try {
    console.log('[DEBUG] GET /api/admin/users - Starting request');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('[DEBUG] GET /api/admin/users - Not authenticated');
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      console.log('[DEBUG] GET /api/admin/users - Not admin');
      return NextResponse.json(
        { message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Connect to database
    db = await connectToDatabase();
    console.log('[DEBUG] GET /api/admin/users - Database connected');
    
    // Get role from query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    // Query users based on role parameter
    let whereClause = {};
    if (role) {
      whereClause.role = role;
    }
    
    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      order: [['name', 'ASC']]
    });
    
    console.log(`[DEBUG] GET /api/admin/users - Found ${users.length} users${role ? ` with role '${role}'` : ''}`);
    
    return NextResponse.json(users);
    
  } catch (error) {
    console.error('[DEBUG] Error in GET /api/admin/users:', error);
    
    return NextResponse.json(
      { 
        message: 'Error fetching users', 
        error: error.message,
        dbInfo: db ? 'Connected' : 'Not connected'
      },
      { status: 500 }
    );
  }
} 