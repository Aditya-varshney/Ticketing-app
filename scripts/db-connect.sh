#!/bin/bash

# Read credentials from .env.local file
if [ -f .env.local ]; then
  source <(grep -v '^#' .env.local | sed -E 's/(.*)=(.*)/export \1="\2"/')
fi

# Connect to MariaDB
mariadb -h ${DB_HOST:-localhost} -u ${MARIADB_ROOT_USER:-root} -p${MARIADB_ROOT_PASSWORD} ${DB_NAME:-ticketing}

echo "Connected to database ${DB_NAME:-ticketing} as ${MARIADB_ROOT_USER:-root}."
