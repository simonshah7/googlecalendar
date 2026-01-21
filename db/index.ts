import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization for the database connection
// This prevents errors during build time when DATABASE_URL is not available
let _db: NeonHttpDatabase<typeof schema> | null = null;
let _neonSql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please add it to your Vercel project settings or .env.local file.'
    );
  }

  _neonSql = neon(databaseUrl);
  _db = drizzle(_neonSql, { schema });
  return _db;
}

// Get the raw Neon SQL function for direct queries
// The Neon client's tagged template handles JavaScript null properly
export function getNeonSql(): NeonQueryFunction<false, false> {
  if (_neonSql) return _neonSql;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please add it to your Vercel project settings or .env.local file.'
    );
  }

  _neonSql = neon(databaseUrl);
  return _neonSql;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

// Re-export schema for convenience
export * from './schema';
