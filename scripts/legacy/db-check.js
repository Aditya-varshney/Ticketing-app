#!/usr/bin/env node
const {
  checkMariaDBRunning,
  testDatabaseConnection,
  checkRequiredTables,
  checkSampleData
} = require('./db-manager');

async function runDatabaseChecks() {
  console.log('🔍 Running database health checks...');
  
  // Check if MariaDB is running
  const isRunning = await checkMariaDBRunning();
  if (!isRunning) {
    process.exit(1);
  }
  
  // Test database connection
  const { success, connection, reason } = await testDatabaseConnection();
  if (!success) {
    console.log('❌ Database connection failed');
    process.exit(1);
  }
  
  // Check required tables
  const tablesResult = await checkRequiredTables(connection);
  
  // Check sample data
  const dataResult = await checkSampleData(connection);
  
  // Close connection
  if (connection) await connection.end();
  
  // Output summary
  console.log('\n📋 Database Check Summary:');
  console.log(`Database connection: ${success ? '✅ OK' : '❌ Failed'}`);
  console.log(`Required tables: ${tablesResult.success ? '✅ OK' : '❌ Missing tables'}`);
  console.log(`Sample data: ${dataResult.success ? '✅ OK' : '❌ Incomplete'}`);
  
  // Exit with appropriate code
  if (success && tablesResult.success && dataResult.success) {
    console.log('\n✅ All checks passed. Database is properly configured.');
    process.exit(0);
  } else {
    console.log('\n❌ Some checks failed. Please run the db-manager.js script to fix the issues.');
    process.exit(1);
  }
}

// Run the function
runDatabaseChecks().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 