import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is not defined in environment variables');
  // We don't exit here to allow app to start even if DB is not ready yet,
  // but in production this should probably crash.
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
