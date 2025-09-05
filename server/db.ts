import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? "DATABASE_URL environment variable is required for production deployment. Please configure your database connection in the deployment settings."
    : "DATABASE_URL must be set. Did you forget to provision a database?";
  throw new Error(errorMessage);
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });