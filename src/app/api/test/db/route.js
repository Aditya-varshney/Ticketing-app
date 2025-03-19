import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mariadb/connect";
import { sequelize } from "@/lib/mariadb/models";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Test database connection
    await sequelize.authenticate();
    
    // Check if tables exist
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    // Try to query the form_templates table if it exists
    let formTemplates = [];
    if (tableNames.includes('form_templates')) {
      const [templates] = await sequelize.query('SELECT id, name FROM form_templates');
      formTemplates = templates;
    }
    
    return NextResponse.json({
      status: 'Connected to database successfully',
      tables: tableNames,
      formTemplates
    });
  } catch (error) {
    console.error("Error testing database:", error);
    
    return NextResponse.json({
      status: 'Error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
