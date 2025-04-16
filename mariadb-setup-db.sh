#!/bin/bash

echo "=== Setting Up Database for iTicket Application ==="

# Connect as root with no password (after fresh installation)
echo "Setting up root password..."
sudo mariadb -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'ticket_password';"
if [ $? -ne 0 ]; then
  echo "Trying alternative method to set root password..."
  sudo mysqladmin -u root password 'ticket_password'
fi

# Connect as root with the password we just set
echo "Creating database and application users..."
sudo mariadb -u root -pticket_password << EOF
# Create the ticketing database
CREATE DATABASE IF NOT EXISTS ticketing DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create the ticket_user user and grant privileges
CREATE USER IF NOT EXISTS 'ticket_user'@'localhost' IDENTIFIED BY 'ticket_password';
GRANT ALL PRIVILEGES ON ticketing.* TO 'ticket_user'@'localhost';

# Create the ticketing_app user and grant privileges
CREATE USER IF NOT EXISTS 'ticketing_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ticketing.* TO 'ticketing_app'@'localhost';

# Apply the changes
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
  echo "SUCCESS: Database and users created successfully!"
  echo ""
  echo "Now running application setup script to create tables and seed data..."
  npm run setup
else
  echo "ERROR: Failed to create database and users."
  echo ""
  echo "Try running these commands manually as a database administrator:"
  echo ""
  echo "CREATE DATABASE IF NOT EXISTS ticketing DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  echo "CREATE USER IF NOT EXISTS 'ticket_user'@'localhost' IDENTIFIED BY 'ticket_password';"
  echo "GRANT ALL PRIVILEGES ON ticketing.* TO 'ticket_user'@'localhost';"
  echo "CREATE USER IF NOT EXISTS 'ticketing_app'@'localhost' IDENTIFIED BY 'secure_password';"
  echo "GRANT ALL PRIVILEGES ON ticketing.* TO 'ticketing_app'@'localhost';"
  echo "FLUSH PRIVILEGES;"
  echo ""
  echo "Then run: npm run setup"
fi
