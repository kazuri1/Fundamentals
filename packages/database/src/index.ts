import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as curriculumSchema from "./schema/curriculum.js";
import * as learnerSchema from "./schema/learner.js";
import * as path from "path";
import * as fs from "fs";

export const schema = {
  ...curriculumSchema,
  ...learnerSchema,
};

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, "fundaments.db");

const client = createClient({
  url: `file:${DB_PATH.replace(/\\/g, "/")}`
});

export const db = drizzle(client, { schema });

// Auto-migration helper for development
export async function initDatabase() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      domain_id TEXT NOT NULL,
      name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      description TEXT NOT NULL,
      learning_objectives TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS concept_edges (
      id TEXT PRIMARY KEY,
      from_concept_id TEXT NOT NULL,
      to_concept_id TEXT NOT NULL,
      type TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS learning_evidence (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      step TEXT NOT NULL,
      dimension TEXT NOT NULL,
      assistance TEXT NOT NULL,
      task_prompt TEXT NOT NULL,
      learner_submission TEXT NOT NULL,
      passed INTEGER NOT NULL,
      score INTEGER,
      feedback TEXT,
      timestamp TEXT NOT NULL
    );
  `);
}