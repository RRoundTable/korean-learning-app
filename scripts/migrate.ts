import { config } from 'dotenv';
import { db } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.local' });

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // Check if migrations table exists
    try {
      await db.execute('SELECT 1 FROM migrations LIMIT 1');
    } catch (error) {
      // Create migrations table if it doesn't exist
      console.log('Creating migrations table...');
      await db.execute(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY,
          filename TEXT NOT NULL UNIQUE,
          executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Get list of migration files
    const migrationFiles = [
      '001_initial_schema.sql',
      '003_add_initial_message_to_scenarios.sql',
      '004_new_migration.sql'
    ];

    for (const filename of migrationFiles) {
      // Check if migration already executed
      const existing = await db.execute({
        sql: 'SELECT 1 FROM migrations WHERE filename = ?',
        args: [filename]
      });

      if (existing.rows.length > 0) {
        console.log(`Migration ${filename} already executed, skipping...`);
        continue;
      }

      console.log(`Executing migration: ${filename}`);
      
      // Read and execute migration file
      const migrationPath = join(__dirname, '..', 'migrations', filename);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(statement);
        }
      }

      // Record migration as executed
      await db.execute({
        sql: 'INSERT INTO migrations (filename) VALUES (?)',
        args: [filename]
      });

      console.log(`Migration ${filename} completed successfully`);
    }

    console.log('All migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migrations failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
