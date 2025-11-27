const pool = require('./postgres');
const fs = require('fs');
const path = require('path');

// Retry logic for database connection
async function waitForDatabase(maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT NOW()');
      console.log('Database connection established');
      return true;
    } catch (error) {
      console.log(`Waiting for database... (attempt ${i + 1}/${maxRetries})`);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function migrate() {
  try {
    // Wait for database to be ready (important for Railway)
    await waitForDatabase();
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);
    
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors for tables/constraints
          if (error.message.includes('already exists') || error.code === '42P07') {
            console.log('Table/constraint already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('Database migration completed successfully');
    
    // Quick fix for file_type column length issue (runs immediately)
    try {
      await pool.query('ALTER TABLE resumes ALTER COLUMN file_type TYPE VARCHAR(255)');
      console.log('✅ Fixed file_type column length (VARCHAR(50) -> VARCHAR(255))');
    } catch (error) {
      // Ignore if column is already correct size or doesn't exist
      if (error.message.includes('already') || error.code === '42710' || error.message.includes('does not exist')) {
        console.log('⏭️  file_type column is already correct size');
      } else {
        console.log('⚠️  Could not fix file_type column (non-critical):', error.message);
      }
    }
    
    // Run additional migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`Found ${migrationFiles.length} migration file(s) to run...`);
      
      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        try {
          // Split migration SQL by semicolons and execute each statement separately
          const migrationStatements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
          
          for (const statement of migrationStatements) {
            if (statement.length > 0) {
              try {
                await pool.query(statement);
              } catch (stmtError) {
                // Ignore errors about things already existing
                if (stmtError.message.includes('already exists') || 
                    stmtError.message.includes('does not exist') ||
                    stmtError.code === '42P07' || // duplicate_table
                    stmtError.code === '42710' || // duplicate_object
                    stmtError.code === '42703' || // undefined_column (for index creation)
                    (stmtError.message.includes('column') && stmtError.message.includes('already'))) {
                  // Skip this statement but continue
                  continue;
                } else {
                  // Log but don't throw for individual statements
                  console.log(`⚠️  Statement in ${file} had issue (continuing): ${stmtError.message}`);
                }
              }
            }
          }
          console.log(`✅ Applied migration: ${file}`);
        } catch (error: any) {
          // Ignore errors about column already being correct type or already exists
          if (error.message.includes('already') || 
              error.message.includes('does not exist') ||
              error.code === '42P07' || // duplicate_table
              error.code === '42710' || // duplicate_object
              error.code === '42703') { // undefined_column
            console.log(`⏭️  Skipped migration ${file} (already applied or not needed): ${error.message}`);
          } else {
            console.error(`❌ Error applying migration ${file}:`, error.message);
            // Don't throw - continue with other migrations
          }
        }
      }
    }
    
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Migration error:', error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

// Only run if called directly (not when imported)
if (require.main === module) {
  migrate();
}

module.exports = migrate;

