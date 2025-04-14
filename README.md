# iTicket

A modern helpdesk and ticketing system for managing support requests with role-based access control, custom ticket types, and real-time messaging.

## Quick Setup Guide

To get started with iTicket, follow these simple steps:

```bash
# Clone the repository
git clone <repository-url>
cd Ticketing-app

# Install dependencies
npm install

# Create a .env.local file with your database credentials
# You can copy from .env.example if it exists
cp .env.example .env.local  # Then edit with your database details

# Run the database setup script
npm run setup

# Start the development server
npm run dev
```

The application will be available at http://localhost:3000

### Default Login Credentials

After setup, you can log in with these default test accounts:

| Role     | Name        | Email                    | Password  |
|----------|-------------|--------------------------|-----------|
| Admin    | Admin1      | admin1@example.com       | admin1    |
|          | Admin2      | admin2@example.com       | admin2    |
| Helpdesk | Helpdesk1   | helpdesk1@example.com    | helpdesk1 |
|          | Helpdesk2   | helpdesk2@example.com    | helpdesk2 |
|          | Helpdesk3   | helpdesk3@example.com    | helpdesk3 |
| User     | Aditya      | user1@example.com        | user1     |
|          | Tejas       | user2@example.com        | user2     |
|          | Farhan      | user3@example.com        | user3     |
|          | Vedant      | user4@example.com        | user4     |
|          | Soumojit    | user5@example.com        | user5     |

## Features

- **Role-based access control**: Separate interfaces for users, helpdesk staff, and administrators
- **Customizable ticket forms**: Create and manage different ticket types with custom fields
- **Real-time messaging**: Communication between users and support staff
- **Ticket assignment**: Assign tickets to helpdesk staff with automatic notifications
- **Priority and status tracking**: Monitor and update ticket status and priority
- **Dashboard analytics**: View ticket statistics and performance metrics

## System Requirements

- Node.js 18.x or higher
- MariaDB/MySQL 10.x or higher

## Environment Configuration

Create a `.env.local` file in the project root with the following:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=ticket_user
DB_PASSWORD=your_password_here
DB_NAME=ticketing

# Alternative database configuration (either set works)
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_USER=ticketing_app
MARIADB_PASSWORD=your_password_here
MARIADB_DATABASE=ticketing

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secure_random_string

# Google API (for chatbot)
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
```

### Database Permissions

For basic application usage, regular database credentials are sufficient. However, for certain operations like creating or dropping databases, you'll need root/admin credentials:

```
# Required for database creation and destructive operations
MARIADB_ROOT_USER=root
MARIADB_ROOT_PASSWORD=your_root_password
```

Without these root credentials, you may encounter permission errors when running commands like `npm run clean-db` or the initial setup.

## First-Time Setup Steps

When setting up the application for the first time:

1. **Clone and configure the environment**:
   ```bash
   git clone <repository-url>
   cd iTicket
   npm install
   cp .env.example .env.local
   ```

2. **Edit the .env.local file**:
   - Set database credentials (regular user and, if possible, root access)
   - Generate a random string for NEXTAUTH_SECRET
   - Add a Google API key for the chatbot functionality

3. **Set up the database**:
   ```bash
   npm run setup
   ```
   This creates the database, tables, and sample data all in one step.
   
   If you have root access problems, you may need to manually create the database and user first:
   ```sql
   CREATE DATABASE ticketing;
   CREATE USER 'ticket_user'@'localhost' IDENTIFIED BY 'your_password_here';
   GRANT ALL PRIVILEGES ON ticketing.* TO 'ticket_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

5. **Access the application** at http://localhost:3000 and log in with the default credentials listed above.

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database Management
npm run setup        # Set up database and seed with sample data
npm run test-db      # Test database connectivity and structure
npm run backup-db    # Create a database backup
npm run restore-db   # Restore from a database backup
npm run reset-db     # Reset database (drop and recreate)
npm run clean-db     # Drop database entirely (USE WITH CAUTION)
npm run migrate      # Run all database migrations
npm run verify-db    # Verify database columns and structure
```

## Advanced Database Management

For more advanced database operations, you can use the db-master.js script directly:

```bash
# Show all available commands
node scripts/db-master.js --help

# Run a specific migration
node scripts/db-master.js migration ticket-id
node scripts/db-master.js migration message-attachments
node scripts/db-master.js migration ticket-audit
node scripts/db-master.js migration fix-collation
```

### Running Without Root Access

The script can run in several modes depending on your access level:

1. **With root credentials in .env.local**: Full access to create/drop databases
2. **With regular user credentials**: Can set up tables if the database already exists
3. **Using command-line arguments**: Bypass .env.local for one-time operations

If you don't have root access to your database server, you have these options:

```bash
# If database already exists, you can create tables without root credentials
node scripts/db-master.js setup

# Specify credentials directly from command line
node scripts/db-master.js setup --user=myuser --password=mypass

# Use root credentials only for this command
node scripts/db-master.js setup --root-user=admin --root-password=adminpass

# Get detailed output for troubleshooting
node scripts/db-master.js setup --verbose
```

For operations that require full access without proper credentials, the script will provide instructions for manual setup.

### Using a Different Database Name

If you need to use a database name other than the default 'ticketing', you can specify it directly:

```bash
# Use an existing database with a different name
node scripts/db-master.js setup --database=my_custom_db

# Backup a specific database
node scripts/db-master.js backup --database=my_custom_db --file=./my_custom_backup.sql

# Restore to a specific database
node scripts/db-master.js restore --database=my_custom_db --file=./backup.sql
```

This is useful for testing or when working with multiple environments.

## Troubleshooting

If you encounter any issues with the application:

1. **Database Connection Issues**:
   - Verify your database credentials in `.env.local`
   - Ensure your MariaDB/MySQL server is running and accessible
   - Run `npm run test-db` to verify the connection and schema
   - Check port access if you're running in a container or with firewall restrictions

2. **Permission Errors**:
   - For operations like dropping or creating databases, you need root credentials
   - Add `MARIADB_ROOT_USER` and `MARIADB_ROOT_PASSWORD` to your `.env.local`
   - If you see "Access denied" errors, your user lacks the necessary privileges
   - As a workaround, perform the action manually using a database client with admin access

3. **Missing Tables or Features**:
   - The setup script should create all necessary tables
   - If you experience errors about missing tables, try running `npm run reset-db`
   - For detailed schema diagnostics, run `npm run verify-db`
   - To apply all migrations, run `npm run migrate`

4. **Login Problems**:
   - Make sure the database contains user records (check with `npm run test-db`)
   - Check that NEXTAUTH_SECRET is set in your `.env.local` file
   - Verify that your NEXTAUTH_URL matches your actual URL (including http/https)

5. **Port Already in Use**:
   - If port 3000 is already in use, you can kill the process with:
     ```bash
     sudo fuser -k 3000/tcp  # Linux
     ```
   - Or configure a different port in your package.json:
     ```
     "dev": "next dev -p 3001"
     ```

## Project Structure

- `/src/app` - Next.js app directory structure with routes and API endpoints
- `/src/components` - Reusable UI components
- `/src/context` - Context providers (authentication, theme, etc.)
- `/src/lib` - Utility functions and database connectors
- `/scripts` - Database setup and maintenance scripts