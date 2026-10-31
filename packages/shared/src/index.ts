import { z } from "zod";

// --- Node States & Edge Types ---
export const NodeStateEnum = z.enum([
  "not_started",
  "available",
  "learning",
  "practising",
  "demonstrated",
  "mastered",
  "needs_revision",
]);
export type NodeState = z.infer<typeof NodeStateEnum>;

export const EdgeTypeEnum = z.enum([
  "PREREQUISITE_OF",
  "BUILDS_ON",
  "APPLIED_IN",
  "RELATED_TO",
  "CONTRASTS_WITH",
]);
export type EdgeType = z.infer<typeof EdgeTypeEnum>;

// --- Mastery Dimensions ---
export const MasteryDimensionEnum = z.enum([
  "conceptual_understanding",
  "mechanistic_understanding",
  "prediction",
  "derivation",
  "practical_application",
  "transfer",
  "retention",
]);
export type MasteryDimension = z.infer<typeof MasteryDimensionEnum>;

// --- AI Assistance Classifications ---
export const AIAssistanceEnum = z.enum([
  "independent",
  "ai_assisted",
  "ai_generated_verified",
  "ai_generated_unverified",
]);
export type AIAssistance = z.infer<typeof AIAssistanceEnum>;

// --- Learning Loop Steps ---
export const LearningStepEnum = z.enum([
  "problem",
  "historical_context",
  "derivation",
  "mental_model",
  "internal_mechanics",
  "experiment",
  "assessment",
  "reflection",
]);
export type LearningStep = z.infer<typeof LearningStepEnum>;

// --- Concept Canonical Schema ---
export const ConceptSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  domain: z.string(),
  difficulty: z.enum(["introductory", "foundational", "intermediate", "advanced"]),
  description: z.string(),
  learning_objectives: z.array(z.string()),
  prerequisites: z.array(z.string()).default([]),
});
export type Concept = z.infer<typeof ConceptSchema>;

// --- Learning Evidence Schema ---
export const EvidenceSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  conceptId: z.string(),
  step: LearningStepEnum,
  dimension: MasteryDimensionEnum,
  assistance: AIAssistanceEnum,
  taskPrompt: z.string(),
  learnerSubmission: z.string(),
  evaluationRubricId: z.string().optional(),
  passed: z.boolean(),
  score: z.number().min(0).max(1).optional(),
  feedback: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;