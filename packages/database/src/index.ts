import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as curriculumSchema from "./schema/curriculum.js";
import * as learnerSchema from "./schema/learner.js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local or .env from root workspace
const rootEnvLocal = path.resolve(process.cwd(), ".env.local");
const rootEnv = path.resolve(process.cwd(), ".env");

if (fs.existsSync(rootEnvLocal)) {
  dotenv.config({ path: rootEnvLocal });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}

export const schema = {
  ...curriculumSchema,
  ...learnerSchema,
};

let connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL || "";

// Normalize connection: use port 5432 and encode password if needed
try {
  if (connectionString) {
    const parsed = new URL(connectionString);
    if (parsed.port === "6543") {
      parsed.port = "5432";
    }
    if (parsed.password) {
      parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    }
    connectionString = parsed.toString();
  }
} catch (e) {}

const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});

export const db = drizzle(client, { schema });

// Auto-migration & RLS configuration for Supabase Postgres
export async function initDatabase() {
  if (!connectionString) {
    throw new Error("Cannot initialize database: DATABASE_URL is missing.");
  }

  await client`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      description TEXT NOT NULL,
      learning_objectives TEXT NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS concept_edges (
      id TEXT PRIMARY KEY,
      from_concept_id TEXT NOT NULL REFERENCES concepts(id),
      to_concept_id TEXT NOT NULL REFERENCES concepts(id),
      type TEXT NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS learning_evidence (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      step TEXT NOT NULL,
      dimension TEXT NOT NULL,
      assistance TEXT NOT NULL,
      task_prompt TEXT NOT NULL,
      learner_submission TEXT NOT NULL,
      passed BOOLEAN NOT NULL,
      score INTEGER,
      feedback TEXT,
      timestamp TEXT NOT NULL
    );
  `;

  // Ensure Row-Level Security (RLS) is enabled across all tables
  await client`ALTER TABLE IF EXISTS public.domains ENABLE ROW LEVEL SECURITY;`;
  await client`ALTER TABLE IF EXISTS public.concepts ENABLE ROW LEVEL SECURITY;`;
  await client`ALTER TABLE IF EXISTS public.concept_edges ENABLE ROW LEVEL SECURITY;`;
  await client`ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;`;
  await client`ALTER TABLE IF EXISTS public.learning_evidence ENABLE ROW LEVEL SECURITY;`;
}