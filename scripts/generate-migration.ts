import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function generateMigration() {
  console.log('Generating new migration...');

  try {
    // Ensure migrations directory exists
    const migrationsDir = join(__dirname, '..', 'migrations');
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Get existing migration files to determine next number
    const existingFiles = require('fs').readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    const nextNumber = existingFiles.length > 0 
      ? Math.max(...existingFiles.map((file: string) => 
          parseInt(file.split('_')[0]) || 0
        )) + 1
      : 1;

    const migrationNumber = nextNumber.toString().padStart(3, '0');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const migrationName = process.argv[2] || 'new_migration';
    
    const fileName = `${migrationNumber}_${migrationName}.sql`;
    const filePath = join(migrationsDir, fileName);

    // Create migration template
    const template = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}
-- Description: Add your migration description here

-- Example:
-- CREATE TABLE example_table (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- Add your SQL statements here
`;

    writeFileSync(filePath, template);
    
    console.log(`✅ Migration created: ${fileName}`);
    console.log(`📁 Location: ${filePath}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Edit the migration file with your SQL statements');
    console.log('2. Run: pnpm run db:migrate:dev');
    
  } catch (error) {
    console.error('Error generating migration:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  try {
    generateMigration();
    console.log('Migration generation completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration generation failed:', error);
    process.exit(1);
  }
}

export { generateMigration };
