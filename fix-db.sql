-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ticketing;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'ticket_user'@'localhost' IDENTIFIED BY 'your_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON ticketing.* TO 'ticket_user'@'localhost';
FLUSH PRIVILEGES;

-- Switch to ticketing database
USE ticketing;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add columns if they don't exist
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS previous_value TEXT AFTER entity_id,
ADD COLUMN IF NOT EXISTS new_value TEXT AFTER previous_value;

-- Create uploads directory
mkdir -p public/uploads
chmod 775 public/uploads
