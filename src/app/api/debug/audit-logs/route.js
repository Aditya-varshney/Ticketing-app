import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import sequelize from '@/lib/mariadb/connect';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can access this debugging endpoint
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const showSchema = searchParams.get('schema') === 'true';
    
    // Check database schema if requested
    let schemaInfo = null;
    if (showSchema) {
      try {
        const [tables] = await sequelize.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        // Check audit_logs table structure
        let auditLogsColumns = [];
        if (tableNames.includes('audit_logs')) {
          const [columns] = await sequelize.query("SHOW COLUMNS FROM audit_logs");
          auditLogsColumns = columns;
        }
        
        schemaInfo = {
          tables: tableNames,
          auditLogsColumns
        };
      } catch (schemaError) {
        console.error('Error getting schema:', schemaError);
        schemaInfo = { error: schemaError.message };
      }
    }
    
    // Build query based on parameters
    let query = "SELECT * FROM audit_logs";
    const queryParams = [];
    
    if (ticketId) {
      query += " WHERE entity_id = ?";
      queryParams.push(ticketId);
    }
    
    query += " ORDER BY created_at DESC LIMIT ?";
    queryParams.push(limit);
    
    // Execute the raw query to check actual database content
    let results = [];
    let queryError = null;
    try {
      [results] = await sequelize.query(query, { 
        replacements: queryParams,
        type: sequelize.QueryTypes.SELECT,
        raw: true 
      });
    } catch (qError) {
      queryError = {
        message: qError.message,
        code: qError.code,
        sql: qError.sql
      };
      console.error('Query error:', qError);
    }
    
    // Return database information and query results
    return NextResponse.json({
      database: {
        name: process.env.DB_NAME || process.env.MARIADB_DATABASE || 'unknown',
        host: process.env.DB_HOST || process.env.MARIADB_HOST || 'unknown',
        user: process.env.DB_USER || process.env.MARIADB_USER || 'unknown'
      },
      query,
      ticketId: ticketId || 'all',
      limit,
      count: results ? results.length : 0,
      schema: schemaInfo,
      error: queryError,
      results
    });
    
  } catch (error) {
    console.error('Error in debug audit logs endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch audit logs debug info', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: "Check your database credentials and make sure the audit_logs table exists"
    }, { status: 500 });
  }
} 