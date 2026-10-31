import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const domains = pgTable("domains", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const concepts = pgTable("concepts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  domainId: text("domain_id").notNull().references(() => domains.id),
  name: text("name").notNull(),
  difficulty: text("difficulty").notNull(),
  description: text("description").notNull(),
  learningObjectives: text("learning_objectives").notNull(), // JSON array string
});

export const conceptEdges = pgTable("concept_edges", {
  id: text("id").primaryKey(),
  fromConceptId: text("from_concept_id").notNull().references(() => concepts.id),
  toConceptId: text("to_concept_id").notNull().references(() => concepts.id),
  type: text("type").notNull(), // PREREQUISITE_OF, BUILDS_ON, APPLIED_IN, etc.
});