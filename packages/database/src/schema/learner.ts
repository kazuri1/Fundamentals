import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const learningEvidence = pgTable("learning_evidence", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  conceptId: text("concept_id").notNull(),
  step: text("step").notNull(),
  dimension: text("dimension").notNull(),
  assistance: text("assistance").notNull(),
  taskPrompt: text("task_prompt").notNull(),
  learnerSubmission: text("learner_submission").notNull(),
  passed: boolean("passed").notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  timestamp: text("timestamp").notNull(),
});