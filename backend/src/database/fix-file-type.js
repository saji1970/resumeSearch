// Quick fix script to alter file_type column
// Run this manually if migration hasn't run yet: node src/database/fix-file-type.js

const pool = require('./postgres');

async function fixFileType() {
  try {
    console.log('Attempting to fix file_type column...');
    
    // Direct ALTER TABLE statement
    await pool.query('ALTER TABLE resumes ALTER COLUMN file_type TYPE VARCHAR(255)');
    
    console.log('✅ Successfully updated file_type column from VARCHAR(50) to VARCHAR(255)');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already') || error.code === '42710') {
      console.log('✅ Column is already the correct size');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Wait for database connection
async function waitForDatabase() {
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT NOW()');
      return true;
    } catch (error) {
      if (i < 9) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}

if (require.main === module) {
  waitForDatabase()
    .then(() => fixFileType())
    .catch(error => {
      console.error('Database connection error:', error);
      process.exit(1);
    });
}

module.exports = fixFileType;




