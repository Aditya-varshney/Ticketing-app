import { v4 as uuidv4 } from 'uuid';

// Map ticket types to their prefixes
const TICKET_TYPE_PREFIXES = {
  'lan-issue': 'LAN',
  'erp-issue': 'ERP',
  'custom-ticket-template': 'CST',
  // Add more mappings as needed
};

// Generate a short random string (2 letters + 2 numbers)
function generateShortRandom() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let result = '';
  
  // Add 2 random letters
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // Add 2 random numbers
  for (let i = 0; i < 2; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return result;
}

// Get the next sequential number for a given prefix and date
async function getNextSequenceNumber(prefix, date) {
  try {
    const { FormSubmission } = await import('@/lib/mariadb/models');
    const sequelize = FormSubmission.sequelize;
    
    // Find the highest sequence number for this prefix and date
    const [results] = await sequelize.query(`
      SELECT MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(id, '-', 3), '-', -1) AS UNSIGNED)) as max_seq
      FROM form_submissions
      WHERE id LIKE ? AND id LIKE ?
    `, {
      replacements: [`${prefix}-${date}-%`, `%-${date}-%`]
    });
    
    return (results[0]?.max_seq || 0) + 1;
  } catch (error) {
    console.error('Error getting next sequence number:', error);
    return 1; // Fallback to 1 if there's an error
  }
}

// Format date as DDMMYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

// Generate a new ticket ID
export async function generateTicketId(ticketType, userName) {
  // Convert ticket type name to prefix (first 3 letters, uppercase)
  const prefix = ticketType.substring(0, 3).toUpperCase();
  
  // Get current date in DDMMYY format
  const date = formatDate(new Date());
  
  // Get sequence number
  const sequenceNumber = await getNextSequenceNumber(prefix, date);
  
  // Generate random part
  const randomPart = generateShortRandom();
  
  // Format: PREFIX-DATE-SEQUENCE-USER-RANDOM
  return `${prefix}-${date}-${String(sequenceNumber).padStart(3, '0')}-${userName.substring(0, 3).toUpperCase()}-${randomPart}`;
}

// Validate a ticket ID format
export function isValidTicketId(id) {
  const regex = /^[A-Z]{3}-\d{6}-\d{3}-[A-Z]{3}-[A-Z]{2}\d{2}$/;
  return regex.test(id);
} 