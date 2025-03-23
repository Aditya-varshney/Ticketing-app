import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import { User } from '@/lib/mariadb/models';
import { Op } from 'sequelize';

// Mark this route as dynamic to prevent caching
export const dynamic = 'force-dynamic';

// Add CORS headers for local development
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: { 'Access-Control-Allow-Origin': '*' } 
  });
}

// GET all helpdesk users
export async function GET(request) {
  let db = null;
  
  try {
    console.log('[DEBUG] GET /api/admin/helpdesk-users - Starting request');
    
    // Return fake test data for debugging if the debug param is set
    const { searchParams } = new URL(request.url);
    if (searchParams.get('debug') === 'true') {
      console.log('[DEBUG] Returning test data');
      return NextResponse.json([
        { id: 'test1', name: 'Test Helpdesk 1', email: 'helpdesk1@example.com', role: 'helpdesk' },
        { id: 'test2', name: 'Test Helpdesk 2', email: 'helpdesk2@example.com', role: 'helpdesk' },
        { id: 'test3', name: 'Test Helpdesk 3', email: 'helpdesk3@example.com', role: 'helpdesk' }
      ]);
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('[DEBUG] GET /api/admin/helpdesk-users - Not authenticated');
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Connect to database
    db = await connectToDatabase();
    console.log('[DEBUG] GET /api/admin/helpdesk-users - Database connected');
    
    // Try direct SQL query first for debugging
    const [rawUsers] = await db.query('SELECT id, name, email, role FROM users WHERE role = "helpdesk"');
    console.log(`[DEBUG] Direct SQL found ${rawUsers.length} helpdesk users`);
    
    // Also try model query
    const helpdeskUsers = await User.findAll({
      where: { role: 'helpdesk' },
      attributes: ['id', 'name', 'email', 'role', 'created_at']
    });
    
    console.log(`[DEBUG] GET /api/admin/helpdesk-users - Found ${helpdeskUsers.length} helpdesk users via model query`);
    
    // Return the model results
    return NextResponse.json(helpdeskUsers);
    
  } catch (error) {
    console.error('[DEBUG] Error in GET /api/admin/helpdesk-users:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    
    // Try to get more specific database error info
    if (error.parent) {
      console.error('[DEBUG] Database error details:', error.parent.message);
    }
    
    // Check if it's a sequelize connection error
    if (error.name === 'SequelizeConnectionError') {
      console.error('[DEBUG] Connection error. Check database settings.');
    }
    
    return NextResponse.json(
      { 
        message: 'Error fetching helpdesk users', 
        error: error.message,
        stack: error.stack,
        dbInfo: db ? 'Connected' : 'Not connected'
      },
      { status: 500 }
    );
  }
} 