#!/bin/bash

echo "=== MariaDB Recovery Script ==="
echo "Stopping any running MariaDB processes..."
sudo systemctl stop mariadb
sudo killall -9 mariadbd mysqld mariadbd-safe mysqld_safe 2>/dev/null

echo "Checking for locked files..."
sudo rm -f /var/lib/mysql/aria_log_control
sudo rm -f /var/lib/mysql/aria_log.*
sudo rm -f /var/lib/mysql/ib_logfile*
sudo rm -f /var/lib/mysql/*.pid
sudo rm -f /var/lib/mysql/tc.log

echo "Fixing file permissions..."
sudo chown -R mysql:mysql /var/lib/mysql/
sudo chmod -R 755 /var/lib/mysql/

echo "Checking if port 3306 is in use by another process..."
PORT_IN_USE=$(sudo netstat -tulpn | grep ":3306")
if [ -n "$PORT_IN_USE" ]; then
  echo "Port 3306 is already in use by: $PORT_IN_USE"
  echo "Attempting to kill the process..."
  PID=$(echo $PORT_IN_USE | awk '{print $7}' | cut -d'/' -f1)
  sudo kill -9 $PID 2>/dev/null
fi

echo "Starting MariaDB in safe mode to check data integrity..."
sudo mysqld_safe --skip-grant-tables --skip-networking &
sleep 5

echo "Attempting controlled shutdown..."
sudo mariadb-admin -u root shutdown 2>/dev/null

echo "Attempting to start MariaDB service normally..."
sudo systemctl start mariadb

# Check if service started successfully
sleep 2
if sudo systemctl is-active --quiet mariadb; then
  echo "SUCCESS: MariaDB service started successfully!"
else
  echo "FAILED: MariaDB service failed to start."
  echo "You may need to try more advanced recovery options:"
  echo "1. Backup your data: sudo cp -r /var/lib/mysql /var/lib/mysql.bak"
  echo "2. Reinstall MariaDB: sudo pacman -S --noconfirm mariadb"
  echo "3. Initialize a fresh data directory: sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql"
fi
