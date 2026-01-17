import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization for the database connection
// This prevents errors during build time when DATABASE_URL is not available
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please add it to your Vercel project settings or .env.local file.'
    );
  }

  const sql: NeonQueryFunction<false, false> = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
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
