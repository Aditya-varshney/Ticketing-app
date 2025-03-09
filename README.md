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
