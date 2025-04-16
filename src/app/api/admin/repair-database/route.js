import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mariadb/connect';
import sequelize from '@/lib/mariadb/connect';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can access this endpoint
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();
    
    const operations = [];
    
    // Check if audit_logs table exists
    try {
      const [tables] = await sequelize.query("SHOW TABLES LIKE 'audit_logs'");
      
      // Create table if it doesn't exist
      if (tables.length === 0) {
        operations.push('Creating audit_logs table');
        
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            action VARCHAR(255) NOT NULL,
            entity_type VARCHAR(255) NOT NULL,
            entity_id VARCHAR(36) NOT NULL,
            details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        
        operations.push('audit_logs table created successfully');
      } else {
        operations.push('audit_logs table already exists');
      }
      
      // Check for previous_value and new_value columns
      const [columns] = await sequelize.query("SHOW COLUMNS FROM audit_logs");
      const columnNames = columns.map(c => c.Field);
      
      // Add columns if they don't exist
      if (!columnNames.includes('previous_value')) {
        operations.push('Adding previous_value column');
        await sequelize.query("ALTER TABLE audit_logs ADD COLUMN previous_value TEXT AFTER entity_id");
      } else {
        operations.push('previous_value column already exists');
      }
      
      if (!columnNames.includes('new_value')) {
        operations.push('Adding new_value column');
        await sequelize.query("ALTER TABLE audit_logs ADD COLUMN new_value TEXT AFTER previous_value");
      } else {
        operations.push('new_value column already exists');
      }
      
      // Migrate data from details field if needed
      operations.push('Checking for records to migrate');
      const [records] = await sequelize.query(`
        SELECT id, details
        FROM audit_logs
        WHERE details IS NOT NULL
          AND (previous_value IS NULL OR previous_value = '')
      `);
      
      if (records.length > 0) {
        operations.push(`Found ${records.length} records to migrate`);
        
        let migratedCount = 0;
        for (const record of records) {
          try {
            if (!record.details) continue;
            
            let details;
            if (typeof record.details === 'string') {
              try {
                details = JSON.parse(record.details);
              } catch (e) {
                details = null;
              }
            } else {
              details = record.details;
            }
            
            if (!details) continue;
            
            const previousValue = details.previous_value || details.previousValue || details.from;
            const newValue = details.new_value || details.newValue || details.to;
            
            if (previousValue || newValue) {
              await sequelize.query(
                "UPDATE audit_logs SET previous_value = ?, new_value = ? WHERE id = ?",
                {
                  replacements: [
                    previousValue ? String(previousValue) : null,
                    newValue ? String(newValue) : null,
                    record.id
                  ]
                }
              );
              migratedCount++;
            }
          } catch (err) {
            operations.push(`Error migrating record ${record.id}: ${err.message}`);
          }
        }
        
        operations.push(`Successfully migrated ${migratedCount} records`);
      } else {
        operations.push('No records need migration');
      }
      
      // Create a test record to verify functionality
      const { v4: uuidv4 } = require('uuid');
      const testId = uuidv4();
      
      await sequelize.query(`
        INSERT INTO audit_logs
        (id, user_id, action, entity_type, entity_id, previous_value, new_value, details)
        VALUES (?, ?, 'test_action', 'test', ?, 'old_value', 'new_value', '{"message": "Test entry from repair endpoint"}')
      `, {
        replacements: [testId, session.user.id, session.user.id]
      });
      
      operations.push('Created test record successfully');
      operations.push('Test record will be removed automatically after verification');
      
      // Verify the test record
      const [verifyResults] = await sequelize.query(
        "SELECT * FROM audit_logs WHERE id = ?",
        { replacements: [testId] }
      );
      
      if (verifyResults.length > 0) {
        operations.push('Test record verified successfully');
        
        // Delete test record
        await sequelize.query(
          "DELETE FROM audit_logs WHERE id = ?",
          { replacements: [testId] }
        );
        
        operations.push('Test record removed');
      } else {
        operations.push('Warning: Test record verification failed');
      }
      
    } catch (dbError) {
      operations.push(`Database error: ${dbError.message}`);
      return NextResponse.json({ 
        error: 'Database repair failed',
        message: dbError.message,
        operations 
      }, { status: 500 });
    }
    
    // Return success with operation log
    return NextResponse.json({ 
      message: 'Database repair completed successfully',
      operations 
    });
    
  } catch (error) {
    console.error('Error in database repair endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to repair database',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 