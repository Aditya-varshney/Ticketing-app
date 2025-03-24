require('dotenv').config();
const { Sequelize, Op } = require('sequelize');

/**
 * This script analyzes messages between users and helpdesk staff,
 * and assigns the appropriate ticket_id to messages that are missing it.
 * It uses the Form_submissions and TicketAssignment tables to determine
 * which ticket belongs to which conversation.
 */
const runMigration = async () => {
  console.log('Starting update of messages with ticket IDs...');
  console.log('Connecting to database...');
  
  const host = process.env.MARIADB_HOST || 'localhost';
  const user = process.env.MARIADB_USER || 'ticketing_app';
  const password = process.env.MARIADB_PASSWORD || 'secure_password';
  const database = process.env.MARIADB_DATABASE || 'ticketing';
  const port = parseInt(process.env.MARIADB_PORT || '3306', 10);
  
  console.log(`DB Config - Host: ${host}, User: ${user}, Database: ${database}, Port: ${port}`);
  
  const sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false // Set to console.log for verbose logging
  });
  
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully!');
    
    // Step 1: Get all tickets and their submitters
    console.log('Fetching tickets and their assignments...');
    const [tickets] = await sequelize.query(`
      SELECT 
        fs.id as ticket_id, 
        fs.submitted_by as user_id,
        ta.helpdesk_id
      FROM form_submissions fs
      LEFT JOIN ticket_assignments ta ON fs.id = ta.ticket_id
    `);
    
    console.log(`Found ${tickets.length} tickets.`);
    
    // Step 2: Get all messages that don't have a ticket_id
    console.log('Fetching messages without ticket_id...');
    const [messages] = await sequelize.query(`
      SELECT id, sender, receiver
      FROM messages
      WHERE ticket_id IS NULL
    `);
    
    console.log(`Found ${messages.length} messages without ticket_id.`);
    
    if (messages.length === 0) {
      console.log('No messages need updating. Exiting.');
      return;
    }
    
    // Step 3: For each ticket, find matching messages and update them
    let updatedCount = 0;
    
    for (const ticket of tickets) {
      const userId = ticket.user_id;
      const helpdeskId = ticket.helpdesk_id;
      
      if (!userId || !helpdeskId) {
        continue; // Skip tickets without user or helpdesk assignment
      }
      
      // Find messages between this user and helpdesk staff
      const messagesForTicket = messages.filter(message => 
        (message.sender === userId && message.receiver === helpdeskId) || 
        (message.sender === helpdeskId && message.receiver === userId)
      );
      
      if (messagesForTicket.length > 0) {
        const messageIds = messagesForTicket.map(m => `'${m.id}'`).join(',');
        console.log(`Updating ${messagesForTicket.length} messages for ticket ${ticket.ticket_id}...`);
        
        // Update these messages with the ticket_id
        await sequelize.query(`
          UPDATE messages
          SET ticket_id = '${ticket.ticket_id}'
          WHERE id IN (${messageIds})
        `);
        
        updatedCount += messagesForTicket.length;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} messages with ticket IDs.`);
    console.log(`${messages.length - updatedCount} messages could not be mapped to a specific ticket.`);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Error during update:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

runMigration(); 