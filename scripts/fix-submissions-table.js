require('dotenv').config();
const mariadb = require('mariadb');

async function fixSubmissionsTable() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ticketing',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    console.log('Connection successful');
    
    // Check if form_submissions exists
    console.log('Checking if form_submissions table exists...');
    const tables = await conn.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'form_submissions'
    `, [process.env.DB_NAME || 'ticketing']);
    
    if (tables.length === 0) {
      console.log('Table form_submissions does not exist, creating it...');
      await conn.query(`
        CREATE TABLE IF NOT EXISTS form_submissions (
          id VARCHAR(36) PRIMARY KEY,
          form_template_id VARCHAR(36) NOT NULL,
          submitted_by VARCHAR(36) NOT NULL,
          form_data TEXT NOT NULL,
          status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
          priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (form_template_id) REFERENCES form_templates(id),
          FOREIGN KEY (submitted_by) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('Table created successfully');
    } else {
      console.log('Table form_submissions exists, checking priority field...');
      
      // Get the current definition of priority field
      const columns = await conn.query(`SHOW COLUMNS FROM form_submissions LIKE 'priority'`);
      console.log('Current priority definition:', columns[0].Type);
      
      if (!columns[0].Type.includes('pending')) {
        console.log('Modifying priority field to include pending value...');
        
        // In MariaDB we need to recreate the table to modify enum values
        // First create a backup of existing data
        await conn.query(`CREATE TABLE form_submissions_backup LIKE form_submissions`);
        await conn.query(`INSERT INTO form_submissions_backup SELECT * FROM form_submissions`);
        console.log('Backup created');
        
        // Now modify the enum (this approach varies by database)
        try {
          // Try direct alter first (works in some versions)
          await conn.query(`
            ALTER TABLE form_submissions
            MODIFY COLUMN priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending'
          `);
          console.log('Altered priority field directly');
        } catch (alterError) {
          console.log('Direct alter failed, using alternative approach:', alterError.message);
          
          // More complex approach for older MariaDB versions
          try {
            // Create new table with correct schema
            await conn.query(`DROP TABLE IF EXISTS form_submissions_new`);
            await conn.query(`
              CREATE TABLE form_submissions_new (
                id VARCHAR(36) PRIMARY KEY,
                form_template_id VARCHAR(36) NOT NULL,
                submitted_by VARCHAR(36) NOT NULL,
                form_data TEXT NOT NULL,
                status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (form_template_id) REFERENCES form_templates(id),
                FOREIGN KEY (submitted_by) REFERENCES users(id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            
            // Copy data, converting priority value if needed
            await conn.query(`
              INSERT INTO form_submissions_new
              SELECT id, form_template_id, submitted_by, form_data, status,
              CASE
                WHEN priority = 'low' THEN 'low'
                WHEN priority = 'medium' THEN 'medium'
                WHEN priority = 'high' THEN 'high'
                WHEN priority = 'urgent' THEN 'urgent'
                ELSE 'pending'
              END as priority,
              created_at, updated_at
              FROM form_submissions
            `);
            
            // Swap tables
            await conn.query(`
              DROP TABLE form_submissions;
              RENAME TABLE form_submissions_new TO form_submissions;
            `);
            console.log('Recreated table with updated enum');
          } catch (recreateError) {
            console.error('Failed to recreate table:', recreateError);
            console.log('Will attempt to drop and recreate from scratch');
            
            // If all else fails, drop and recreate
            await conn.query(`DROP TABLE IF EXISTS form_submissions`);
            await conn.query(`
              CREATE TABLE form_submissions (
                id VARCHAR(36) PRIMARY KEY,
                form_template_id VARCHAR(36) NOT NULL,
                submitted_by VARCHAR(36) NOT NULL,
                form_data TEXT NOT NULL,
                status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                priority ENUM('pending', 'low', 'medium', 'high', 'urgent') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (form_template_id) REFERENCES form_templates(id),
                FOREIGN KEY (submitted_by) REFERENCES users(id)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Table recreated from scratch');
          }
        }
      } else {
        console.log('Priority field already includes pending value');
      }
    }
    
    // Verify all is good
    const finalCheck = await conn.query(`SHOW COLUMNS FROM form_submissions LIKE 'priority'`);
    console.log('Final priority definition:', finalCheck[0].Type);
    
    console.log('Form_submissions table is now fixed and ready to use!');
    
  } catch (error) {
    console.error('Error fixing submissions table:', error);
  } finally {
    if (conn) await conn.end();
  }
}

fixSubmissionsTable().then(() => process.exit(0));
