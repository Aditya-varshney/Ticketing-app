# Ticketing Chat Application - MariaDB Version

This branch contains the MariaDB-compatible version of the ticketing chat application. It uses Sequelize ORM with MariaDB/MySQL as the database instead of MongoDB.

## Features

- User authentication with role-based access (admin, helpdesk, user)
- Real-time chat using Socket.io
- Ticket assignment system for helpdesk support
- Responsive UI design

## Prerequisites

- Node.js (v16+)
- MariaDB/MySQL (v10.5+ / v8.0+)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ticketing_chatapp.git
cd ticketing_chatapp
git checkout mariadb-version
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up MariaDB

#### Install MariaDB (if not already installed)

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install mariadb-server
sudo mysql_secure_installation
```

Arch Linux:
```bash
sudo pacman -S mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

#### Create Database and User

Run the setup script:
```bash
npm run setup-mariadb
```

Alternatively, you can set up manually:
```bash
sudo mariadb
```

Then in MariaDB CLI:
```sql
CREATE DATABASE ticketing;
CREATE USER 'ticketing_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ticketing.* TO 'ticketing_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Create Database Tables

```bash
npm run create-db-tables
```

### 5. Initialize with Sample Data

```bash
npm run init-mariadb
```

This creates the following sample users:
- Admin: admin@example.com / admin123
- Helpdesk: helpdesk@example.com / helpdesk123

### 6. Configure Environment Variables

Create a `.env.local` file in the project root:

```sql
# MariaDB Connection
MARIADB_HOST=localhost
MARIADB_USER=ticketing_app
MARIADB_PASSWORD=secure_password
MARIADB_DATABASE=ticketing

# Next Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Socket.IO
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Run the Application
```bash
npm run dev
```

Visit http://localhost:3000 in your browser.


## Useful MariaDB Commands
Connect to MariaDB

```bash
sudo mariadb
# OR with credentials
mariadb -u ticketing_app -p ticketing
```
Database Operations
```sql
-- Show all databases
SHOW DATABASES;

-- Use the ticketing database
USE ticketing;

-- Show all tables
SHOW TABLES;

-- View table structure
DESCRIBE users;
DESCRIBE messages;
DESCRIBE assignments;

-- View all users
SELECT id, name, email, role FROM users;

-- Change a user's role
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

-- View helpdesk assignments
SELECT 
  u1.name AS user_name, 
  u2.name AS helpdesk_name,
  a.created_at
FROM assignments a
JOIN users u1 ON a.user_id = u1.id
JOIN users u2 ON a.helpdesk_id = u2.id;

-- View recent messages
SELECT 
  sender.name AS from_user,
  receiver.name AS to_user,
  m.content,
  m.created_at
FROM messages m
JOIN users sender ON m.sender = sender.id
JOIN users receiver ON m.receiver = receiver.id
ORDER BY m.created_at DESC
LIMIT 10;
```

## Database GUI Tools
You can also use GUI tools to manage your MariaDB database:

- DBeaver: Universal database manager (supports MariaDB/MySQL)
- MySQL Workbench: Official MySQL GUI tool (works with MariaDB)
- Adminer: Lightweight web-based database manager

## Troubleshooting
Connection Issues
If you're having trouble connecting to MariaDB:
```bash
# Check if MariaDB is running
sudo systemctl status mariadb

# Restart MariaDB if needed
sudo systemctl restart mariadb

# Test the connection
npm run test-mariadb
```

Table Creation Issues
If you encounter issues creating tables:
```bash
# View MariaDB error log
sudo tail -f /var/log/mysql/error.log

# Try dropping and recreating problematic tables
sudo mariadb -e "USE ticketing; DROP TABLE IF EXISTS messages; DROP TABLE IF EXISTS assignments;"
npm run create-db-tables
```

Application Startup Issues
If the application fails to start:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild the application
npm run build
npm run dev
```

## Development Commands
- npm run dev: Start development server
- npm run build: Build the application
- npm start: Run production server
- npm run test-mariadb: Test MariaDB connection
- npm run create-db-tables: Create database tables
- npm run init-mariadb: Initialize sample data