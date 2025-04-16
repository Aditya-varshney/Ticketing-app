#!/bin/bash

echo "=== MariaDB Full Recovery Script ==="

# Create backup of existing data
echo "Creating backup of your current MySQL data directory..."
sudo cp -r /var/lib/mysql /var/lib/mysql.bak-$(date +%Y%m%d)

# Stop all MariaDB processes
echo "Stopping all MariaDB services and processes..."
sudo systemctl stop mariadb
sudo killall -9 mariadbd mysqld mariadbd-safe mysqld_safe 2>/dev/null

# Check and fix socket issues
echo "Checking for socket file issues..."
sudo rm -f /run/mysqld/mysqld.sock
sudo mkdir -p /run/mysqld
sudo chown mysql:mysql /run/mysqld

# Create a minimal MariaDB config
echo "Creating a clean minimal configuration file..."
sudo tee /etc/my.cnf.d/custom.cnf > /dev/null << 'EOF'
[mysqld]
user = mysql
pid-file = /run/mysqld/mysqld.pid
socket = /run/mysqld/mysqld.sock
port = 3306
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
bind-address = 127.0.0.1

[client-server]
socket = /run/mysqld/mysqld.sock
port = 3306

[client]
socket = /run/mysqld/mysqld.sock
port = 3306
EOF

# Reinitialize the data directory
echo "Initializing a fresh data directory..."
sudo rm -rf /var/lib/mysql/*
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql

# Fix permissions
echo "Setting correct permissions..."
sudo chown -R mysql:mysql /var/lib/mysql

# Start MariaDB
echo "Starting MariaDB service..."
sudo systemctl start mariadb
sleep 3

# Check if service started successfully
if sudo systemctl is-active --quiet mariadb; then
  echo "SUCCESS: MariaDB service started successfully!"
  
  echo "Setting root password..."
  sudo mariadb -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'ticket_password';"
  
  echo "Creating application database and users..."
  sudo mariadb -e "CREATE DATABASE IF NOT EXISTS ticketing;"
  sudo mariadb -e "CREATE USER IF NOT EXISTS 'ticket_user'@'localhost' IDENTIFIED BY 'ticket_password';"
  sudo mariadb -e "GRANT ALL PRIVILEGES ON ticketing.* TO 'ticket_user'@'localhost';"
  sudo mariadb -e "CREATE USER IF NOT EXISTS 'ticketing_app'@'localhost' IDENTIFIED BY 'secure_password';"
  sudo mariadb -e "GRANT ALL PRIVILEGES ON ticketing.* TO 'ticketing_app'@'localhost';"
  sudo mariadb -e "FLUSH PRIVILEGES;"
  
  echo "Database setup complete. You can now run 'sudo mariadb -u root -p' and enter 'ticket_password'"
else
  echo "FAILED: MariaDB service failed to start."
  echo "Check logs with: sudo journalctl -xeu mariadb.service"
fi
