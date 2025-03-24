# Support Ticketing System

A comprehensive ticketing system for managing support requests with role-based access control, custom ticket types, and real-time messaging.

## Quick Setup Guide

To get started with the Support Ticketing System, follow these simple steps:

```bash
# Clone the repository
git clone <repository-url>
cd Ticketing-app

# Install dependencies
npm install

# Create a .env.local file with your database credentials
# You can copy from .env.example if it exists
cp .env.example .env.local  # Then edit with your database details

# Run the unified setup script (creates database, tables, and default data)
npm run setup

# Start the development server
npm run dev
```

The application will be available at http://localhost:3000

### Default Login Credentials

After setup, you can log in with these default test accounts:

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| Admin    | admin1@example.com     | admin1    |
| Helpdesk | helpdesk1@example.com  | helpdesk1 |
| User     | user1@example.com      | user1     |

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
MARIADB_HOST=localhost
MARIADB_USER=ticketing_app
MARIADB_PASSWORD=your_password
MARIADB_DATABASE=ticketing
MARIADB_PORT=3306

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secure_random_string
```

The setup script will attempt to create the database and user if given root credentials:

```
# Optional: For automatic database creation (if you have root access)
MARIADB_ROOT_PASSWORD=your_root_password
```

If you don't provide root credentials, the script will display the SQL commands you need to run manually.

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run the unified setup script (database, tables, migrations, default data)
npm run setup

# Test database connection and schema
npm run test-db

# Clean database (drops all tables - USE WITH CAUTION)
npm run clean-db
```

## Troubleshooting

If you encounter any issues with the application:

1. **Database Connection Issues**:
   - Verify your database credentials in `.env.local`
   - Ensure your MariaDB/MySQL server is running and accessible
   - Run `npm run test-db` to verify the connection and schema
   - Check port access if you're running in a container or with firewall restrictions

2. **Missing Tables or Features**:
   - The `npm run setup` script should create all necessary tables
   - If you experience errors about missing tables, try running `npm run setup` again
   - For detailed database debugging, check the scripts in the `scripts/` directory

3. **Login Problems**:
   - Make sure the database contains user records (check with `npm run test-db`)
   - Check that NEXTAUTH_SECRET is set in your `.env.local` file
   - Verify that your NEXTAUTH_URL matches your actual URL (including http/https)

4. **Port Already in Use**:
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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
