import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const learningEvidence = sqliteTable("learning_evidence", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  conceptId: text("concept_id").notNull(),
  step: text("step").notNull(),
  dimension: text("dimension").notNull(),
  assistance: text("assistance").notNull(),
  taskPrompt: text("task_prompt").notNull(),
  learnerSubmission: text("learner_submission").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  timestamp: text("timestamp").notNull(),
});