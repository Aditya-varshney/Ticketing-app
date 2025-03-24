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
- npm (v7+)

## Getting Started: Complete Setup Guide

Follow these steps in order to set up the entire application from scratch.

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ticketing_app.git
cd ticketing_app
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- Next.js and React for the frontend and API routes
- MariaDB drivers and Sequelize ORM for database operations 
- NextAuth.js for authentication
- Tailwind CSS for styling
- Socket.io for real-time communication
- Other utility libraries

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
- Setting up all required tables:
  - `users`: User accounts and authentication
  - `messages`: Communication between users
  - `assignments`: Helpdesk-to-user assignments
  - `form_templates`: Custom ticket type definitions
  - `form_submissions`: Actual ticket data
- Creating default user accounts for testing (admin, helpdesk, and regular users)

Run the setup script:
```bash
npm run setup-db
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

Create a `.env.local` file in the project root with the following configuration:

```
# MariaDB Connection
MARIADB_HOST=localhost
MARIADB_USER=ticketing_app
MARIADB_PASSWORD=secure_password
MARIADB_DATABASE=ticketing

# NextAuth (generate a secure random string for NEXTAUTH_SECRET)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Socket.IO
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

You can generate a secure random string for NEXTAUTH_SECRET with:
```bash
openssl rand -base64 32
```

### 5. Verify Database Connection

Before running the application, verify that the database connection is working:

```bash
npm run test-db
```

This script will:
- Test the database connection
- Verify that all required tables exist
- Check for default user accounts

If any issues are found, the script will provide guidance on how to fix them.

### 6. Run the Application

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

### 7. Default Login Credentials

After setup, you can log in with these default accounts:

| Role     | Email              | Password    |
|----------|-------------------|-------------|
| Admin    | admin@example.com | Admin123!   |
| Helpdesk | help@example.com  | Helpdesk123!|
| User     | user@example.com  | User123!    |

## Database Management Scripts

The application includes several helpful scripts to manage your database:

### Core Database Scripts

```bash
# Set up the database, create tables and default users
npm run setup-db

# Clean all data from the database (drops all tables)
npm run clean-db

# Test the database connection and table structure
npm run test-db

# View specific database information
npm run test-db:all      # Run all checks
npm run test-db:tables   # View all tables
npm run test-db:users    # View user information
npm run test-db:forms    # View form templates and submissions

# Update the assignments schema (if needed)
npm run update-schema
```

### Additional Database Utility Scripts

These scripts provide additional functionality for database management:

```bash
# Debug helpdesk user assignments
node scripts/debug-helpdesk-users.js

# Fix database collation issues
node scripts/fix-collation.js

# Update the priority enum values
node scripts/update-priority-enum.js
```

## Understanding the Codebase Structure

The application uses a standard Next.js project structure:

```
/
├── public/               # Static assets
├── scripts/              # Database and utility scripts
├── src/
│   ├── app/              # Next.js app router
│   │   ├── (auth)/       # Authentication routes (login/register)
│   │   ├── (dashboard)/  # Role-specific dashboards
│   │   │   ├── admin/    # Admin dashboard and functionality
│   │   │   ├── helpdesk/ # Helpdesk dashboard and functionality
│   │   │   └── user/     # User dashboard and functionality
│   │   └── api/          # API routes for data operations
│   ├── components/       # Reusable React components
│   ├── context/          # React context providers
│   ├── lib/              # Library code, database models
│   └── utils/            # Utility functions
├── .env.local            # Environment variables (create this)
├── next.config.js        # Next.js configuration
├── package.json          # Project dependencies and scripts
└── tailwind.config.js    # Tailwind CSS configuration
```

## Common Development Tasks

### Creating a New User

1. Register via the application interface
2. OR manually create in the database:

```sql
INSERT INTO users (id, name, email, password, role)
VALUES (
  UUID(),
  'New User',
  'newuser@example.com',
  '$2a$10$...', -- bcrypt hashed password
  'user'
);
```

### Changing a User's Role

```sql
UPDATE users
SET role = 'admin'  -- or 'helpdesk' or 'user'
WHERE email = 'user@example.com';
```

### Creating a Custom Ticket Type

1. Log in as an admin
2. Navigate to Admin Dashboard → Form Templates
3. Click "Create New Template"
4. Define the fields and submit

### Troubleshooting

#### Database Connection Issues

If you're having trouble connecting to MariaDB:

```bash
# Check if MariaDB is running
sudo systemctl status mariadb

# Restart MariaDB if needed
sudo systemctl restart mariadb

# Test the database connection
npm run test-db
```

#### Table Creation Issues

If you encounter issues creating tables:

```bash
# View MariaDB error log
sudo tail -f /var/log/mysql/error.log

# Clean and recreate the database tables
npm run clean-db
npm run setup-db
```

#### User Authentication Problems

If login isn't working:

1. Verify the database connection is working
2. Check that the `NEXTAUTH_SECRET` and `NEXTAUTH_URL` environment variables are set correctly
3. Try resetting a user's password in the database:

```sql
-- Replace with bcrypt hash of 'NewPassword123!'
UPDATE users
SET password = '$2a$10$...'
WHERE email = 'user@example.com';
```

#### Assignment Issues

If helpdesk assignments aren't working:

```bash
# Update the assignments schema
npm run update-schema

# Debug helpdesk user assignments
node scripts/debug-helpdesk-users.js
```

## Database GUI Tools

You can also use GUI tools to manage your MariaDB database:

- DBeaver: Universal database manager (supports MariaDB/MySQL)
- MySQL Workbench: Official MySQL GUI tool (works with MariaDB)
- Adminer: Lightweight web-based database manager

## Development Tips

### Running in Production Mode

To run the application in production mode:

```bash
npm run build
npm start
```

### Customizing Appearance

The application uses Tailwind CSS for styling. You can customize the appearance by editing:

- `tailwind.config.js` - For theme colors and configuration
- CSS files in the component directories

### Adding New Features

When adding new features:

1. Create API endpoints in `src/app/api/`
2. Add React components in `src/components/`
3. Update pages in `src/app/(dashboard)/`
4. Test thoroughly with different user roles

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and support, please open an issue in the GitHub repository.
