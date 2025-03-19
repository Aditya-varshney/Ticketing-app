require('dotenv').config();
const mariadb = require('mariadb');

async function viewForms() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ticketing',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('Connection successful');
    
    // Get all templates
    console.log('\n--- All Form Templates:');
    const templates = await conn.query('SELECT id, name, fields, created_at FROM form_templates');
    
    templates.forEach(template => {
      console.log('\nTemplate ID:', template.id);
      console.log('Name:', template.name);
      console.log('Created:', new Date(template.created_at).toLocaleString());
      
      try {
        const fields = JSON.parse(template.fields);
        console.log('Fields:');
        fields.forEach(field => {
          console.log(`  - ${field.name} (${field.type})${field.required ? ' *Required' : ''}`);
        });
      } catch (e) {
        console.log('Fields (raw):', template.fields);
      }
      
      console.log('-'.repeat(40));
    });
    
    // Get form submissions if any exist
    console.log('\n\n--- Recent Form Submissions:');
    const submissions = await conn.query(`
      SELECT fs.id, ft.name as form_name, fs.status, fs.priority, fs.form_data, fs.created_at
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      ORDER BY fs.created_at DESC
      LIMIT 5
    `);
    
    if (submissions.length === 0) {
      console.log('No submissions found');
    } else {
      submissions.forEach(sub => {
        console.log('\nSubmission ID:', sub.id);
        console.log('Form:', sub.form_name);
        console.log('Status:', sub.status);
        console.log('Priority:', sub.priority);
        console.log('Submitted:', new Date(sub.created_at).toLocaleString());
        
        try {
          const data = JSON.parse(sub.form_data);
          console.log('Form Data:');
          Object.entries(data).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
          });
        } catch (e) {
          console.log('Form Data (raw):', sub.form_data);
        }
        
        console.log('-'.repeat(40));
      });
    }
    
  } catch (error) {
    console.error('Error viewing forms:', error);
  } finally {
    if (conn) await conn.end();
  }
}

viewForms();
