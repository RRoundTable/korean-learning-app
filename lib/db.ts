import { createClient } from '@libsql/client';

// Lazy initialization of database client
let _db: ReturnType<typeof createClient> | null = null;

function getDatabaseClient() {
  if (!_db) {
    const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
    const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

    if (!TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL environment variable is required');
    }

    _db = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

// Export database client with lazy initialization
export const db = {
  execute: (...args: any[]) => getDatabaseClient().execute(...args),
  batch: (...args: any[]) => getDatabaseClient().batch(...args),
  transaction: (...args: any[]) => getDatabaseClient().transaction(...args),
  close: () => getDatabaseClient().close(),
};

// Helper function to get database client
export const getDb = () => db;

// Helper function to check if we're in development
export const isDevelopment = () => process.env.NODE_ENV === 'development';

// Helper function to check if we're in production
export const isProduction = () => process.env.NODE_ENV === 'production';
