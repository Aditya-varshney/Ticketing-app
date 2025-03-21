# Support Ticketing System

A comprehensive ticketing system for managing support requests with role-based access control, custom ticket types, and real-time messaging.

## Features

### Core Functionality
- **Role-Based Access Control**: Admin, Helpdesk, and User roles with appropriate permissions
- **Ticket Management**: Create, view, update, and close support tickets
- **User Authentication**: Secure login and registration system
- **Dashboard**: Role-specific dashboards with relevant information

### Advanced Features

#### Custom Ticket Types & Dynamic Forms
- **Form Templates**: Create custom ticket types with dynamic fields
- **Field Types**: Support for various field types including text, number, email, date, and textarea
- **Required Fields**: Mark specific fields as required for ticket submission
- **Form Preview**: Preview form templates before creating tickets

#### Priority & Status Management
- **Priority Levels**: Set ticket priorities (Low, Medium, High, Urgent)
- **Visual Indicators**: Color-coded badges for different priorities and statuses
- **Status Tracking**: Track tickets through their lifecycle (Open, In Progress, Resolved, Closed)

#### User Experience Enhancements
- **Dark Mode Support**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly interface for access on any device
- **Real-time Updates**: Instant notifications for ticket updates
- **User Profiles**: Detailed user information and ticket history

#### Analytics & Reporting
- **Dashboard Statistics**: Visual representation of ticket metrics
- **Chart Visualizations**: Distribution of tickets by priority, status, and category
- **Performance Metrics**: Track response times and resolution rates
- **Helpdesk Performance**: Monitor workload and efficiency of helpdesk staff

#### Communication Tools
- **Ticket Comments**: Add comments and updates to existing tickets
- **User Messaging**: Direct messaging between users and helpdesk staff
- **Notifications**: Email and in-app notifications for ticket updates
- **Quick Replies**: Predefined responses for common queries

## Prerequisites

- Node.js (v16+)
- MariaDB/MySQL (v10.5+ / v8.0+)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ticketing_app.git
cd ticketing_app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up MariaDB

#### Install MariaDB (if not already installed)

Ubuntu/Debian:
```bash
sudo apt update
sudo apt install mariadb-server
sudo mariadb-secure-installation
```

Arch Linux:
```bash
sudo pacman -S mariadb
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

#### Database Setup

Our application includes a comprehensive database setup script that handles:
- Creating the database and application user
- Setting up all required tables 
- Creating default user accounts for testing

Run the setup script:
```bash
node scripts/setup-db.js
```

If you prefer manual setup, you can use these commands:
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

### 4. Configure Environment Variables

The setup script will create a `.env.local` file from the `.env.example` template if it doesn't exist. You can also create it manually:

```
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

### 5. Run the Application
```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

## Usage

### Admin
- Manage users and assign roles
- Create and manage ticket types and form templates
- View all tickets and statistics
- Generate reports
- Monitor helpdesk staff performance

### Helpdesk Staff
- View and respond to assigned tickets
- Update ticket status and priority
- Communicate with users
- Access ticket history
- View performance metrics

### Users
- Create new support tickets using custom forms
- View status of their tickets
- Communicate with helpdesk staff
- Update or close their tickets

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Next.js API Routes
- **Database**: MariaDB with Sequelize ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS with dark mode support

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
DESCRIBE form_templates;
DESCRIBE form_submissions;

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

-- View form templates
SELECT id, name, fields, created_at FROM form_templates;

-- View ticket submissions
SELECT 
  fs.id, ft.name as form_name, fs.status, fs.priority, fs.form_data, fs.created_at
FROM form_submissions fs
JOIN form_templates ft ON fs.form_template_id = ft.id
ORDER BY fs.created_at DESC;
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

# Test the database connection
node scripts/test-db.js
```

Table Creation Issues
If you encounter issues creating tables:
```bash
# View MariaDB error log
sudo tail -f /var/log/mysql/error.log

# Clean and recreate the database tables
node scripts/clean-db.js
node scripts/setup-db.js
```

## Database Management Scripts

The application includes several helpful scripts to manage your database:

```bash
# Set up the database, create tables and default users
npm run setup-db

# Clean all data from the database (drops all tables)
npm run clean-db

# Test the database connection
npm run test-db

# Additional test options
npm run test-db:all      # Run all checks
npm run test-db:tables   # View all tables
npm run test-db:users    # View user information
npm run test-db:forms    # View form templates and submissions
```

For more options, run `node scripts/test-db.js --help`
