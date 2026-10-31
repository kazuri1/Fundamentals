import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const rootEnvLocal = path.resolve(process.cwd(), "../../.env.local");
if (fs.existsSync(rootEnvLocal)) {
  dotenv.config({ path: rootEnvLocal });
}

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || ""
  }
});