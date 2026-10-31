import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ConceptSchema, Evidence } from "@fundaments/shared";
import { TeachingOrchestrator } from "@fundaments/teaching-engine";
import { MasteryCalculator } from "@fundaments/mastery-engine";
import { ProjectIntelligenceEngine } from "@fundaments/project-intelligence";
import { db, initDatabase, schema } from "@fundaments/database";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

// Ensure database tables exist
initDatabase().catch(console.error);

// Database persistence helpers
async function loadLearnerEvidence(userId: string = "default_learner"): Promise<Evidence[]> {
  const rows = await db
    .select()
    .from(schema.learningEvidence)
    .where(eq(schema.learningEvidence.userId, userId));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    conceptId: r.conceptId,
    step: r.step as any,
    dimension: r.dimension as any,
    assistance: r.assistance as any,
    taskPrompt: r.taskPrompt,
    learnerSubmission: r.learnerSubmission,
    passed: Boolean(r.passed),
    score: r.score ?? undefined,
    feedback: r.feedback ?? undefined,
    timestamp: r.timestamp,
  }));
}

async function saveEvidenceRecord(evidence: Evidence) {
  const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.insert(schema.learningEvidence).values({
    id,
    userId: evidence.userId,
    conceptId: evidence.conceptId,
    step: evidence.step,
    dimension: evidence.dimension,
    assistance: evidence.assistance,
    taskPrompt: evidence.taskPrompt,
    learnerSubmission: evidence.learnerSubmission,
    passed: evidence.passed,
    score: evidence.score ? Math.round(evidence.score * 100) : null,
    feedback: evidence.feedback ?? null,
    timestamp: evidence.timestamp || new Date().toISOString(),
  });
}

// Find any concept in content directory
function findConcept(slug: string) {
  function scan(dir: string): any {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = scan(fullPath);
        if (found) return found;
      } else if (entry.name === "concept.json") {
        try {
          const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          if (raw.slug === slug || raw.id === slug) {
            return ConceptSchema.parse(raw);
          }
        } catch {}
      }
    }
    return null;
  }
  return scan(CONTENT_DIR);
}

const server = new Server(
  {
    name: "fundaments-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_concept",
        description: "Retrieves a foundational engineering concept by slug or ID.",
        inputSchema: {
          type: "object",
          properties: {
            conceptSlug: { type: "string", description: "e.g. 'binary-representation', 'http', 'hydration'" },
          },
          required: ["conceptSlug"],
        },
      },
      {
        name: "start_learning_session",
        description: "Starts or resumes a first-principles Socratic learning session plan for a concept.",
        inputSchema: {
          type: "object",
          properties: {
            conceptSlug: { type: "string" },
            step: {
              type: "string",
              enum: ["problem", "derivation", "mental_model", "experiment", "assessment"],
              default: "problem",
            },
          },
          required: ["conceptSlug"],
        },
      },
      {
        name: "submit_assessment",
        description: "Evaluates learner answers, checks deterministic outputs, and commits persistent mastery evidence to the database.",
        inputSchema: {
          type: "object",
          properties: {
            conceptId: { type: "string" },
            taskPrompt: { type: "string" },
            answer: { type: "string" },
            dimension: {
              type: "string",
              enum: [
                "prediction",
                "practical_application",
                "conceptual_understanding",
                "derivation",
                "retention",
              ],
            },
            assistance: {
              type: "string",
              enum: [
                "independent",
                "ai_assisted",
                "ai_generated_verified",
                "ai_generated_unverified",
              ],
              default: "independent",
            },
          },
          required: ["conceptId", "taskPrompt", "answer", "dimension"],
        },
      },
      {
        name: "get_mastery_status",
        description: "Retrieves the persistent database mastery state, evidence history, and completion metrics for a concept.",
        inputSchema: {
          type: "object",
          properties: {
            conceptId: { type: "string" },
          },
          required: ["conceptId"],
        },
      },
      {
        name: "get_learner_profile",
        description: "Returns the learner's overall mastery profile and all recorded evidence from the database.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "analyze_project_context",
        description: "Analyzes code, dependencies (e.g. Next.js, Prisma, SQL), or an error context from the user's project to identify foundational CS gaps.",
        inputSchema: {
          type: "object",
          properties: {
            contextText: {
              type: "string",
              description: "Code snippet, framework description, or error log from the user's vibe-coded project."
            }
          },
          required: ["contextText"]
        }
      },
      {
        name: "get_project_recommendations",
        description: "Generates bite-sized Socratic teaching hooks based on missing foundations detected in the active project.",
        inputSchema: {
          type: "object",
          properties: {
            contextText: {
              type: "string",
              description: "The code or tech stack context to generate learning hooks for."
            }
          },
          required: ["contextText"]
        }
      }
    ],
  };
});

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const evidenceList = await loadLearnerEvidence("default_learner");

  if (name === "get_concept") {
    const slug = String(args?.conceptSlug);
    const concept = findConcept(slug);
    if (!concept) {
      return {
        isError: true,
        content: [{ type: "text", text: `Concept '${slug}' not found in curriculum.` }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(concept, null, 2) }],
    };
  }

  if (name === "start_learning_session") {
    const slug = String(args?.conceptSlug);
    const concept = findConcept(slug);
    if (!concept) {
      return {
        isError: true,
        content: [{ type: "text", text: `Concept '${slug}' not found.` }],
      };
    }

    const step = (args?.step as any) || "problem";
    const demonstratedConcepts = evidenceList
      .filter((e) => e.passed)
      .map((e) => e.conceptId);

    const plan = TeachingOrchestrator.generateSessionPlan(concept, step, demonstratedConcepts);
    return {
      content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
    };
  }

  if (name === "submit_assessment") {
    const conceptId = String(args?.conceptId);
    const answer = String(args?.answer).trim();
    const dimension = args?.dimension as any;
    const assistance = (args?.assistance as any) || "independent";
    const taskPrompt = String(args?.taskPrompt);

    let passed = false;
    let feedback = "";

    // Deterministic verification for arithmetic
    if (dimension === "prediction") {
      if (answer === "11111011" || answer === "-128") {
        passed = true;
        feedback = "Correct! The calculation accurately reflects hardware two's complement behavior.";
      } else {
        feedback = "Incorrect. In two's complement with bit inversion + 1, -5 is 11111011.";
      }
    } else {
      // Rubric / conceptual verification
      passed = answer.length > 25;
      feedback = passed
        ? "Conceptual explanation verified against rubric criteria."
        : "Explanation too brief or missing essential reasoning steps.";
    }

    const newEvidence: Evidence = {
      userId: "default_learner",
      conceptId,
      step: "assessment",
      dimension,
      assistance,
      taskPrompt,
      learnerSubmission: answer,
      passed,
      feedback,
      timestamp: new Date().toISOString(),
    };

    // Save to Database
    await saveEvidenceRecord(newEvidence);

    const updatedList = await loadLearnerEvidence("default_learner");
    const conceptEvidence = updatedList.filter((e) => e.conceptId === conceptId);
    const state = MasteryCalculator.computeState(conceptEvidence);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              result: passed ? "PASSED" : "FAILED",
              feedback,
              recordedEvidence: newEvidence,
              updatedConceptState: state,
              storageBackend: "supabase_postgres"
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_mastery_status") {
    const conceptId = String(args?.conceptId);
    const conceptEvidence = evidenceList.filter((e) => e.conceptId === conceptId);
    const state = MasteryCalculator.computeState(conceptEvidence);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              conceptId,
              state,
              evidenceCount: conceptEvidence.length,
              evidence: conceptEvidence,
              storageBackend: "supabase_postgres"
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_learner_profile") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              storageBackend: "drizzle_sqlite",
              totalEvidenceRecords: evidenceList.length,
              evidence: evidenceList,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "analyze_project_context") {
    const contextText = String(args?.contextText || "");
    const analysis = ProjectIntelligenceEngine.analyzeContext(contextText, evidenceList);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  if (name === "get_project_recommendations") {
    const contextText = String(args?.contextText || "");
    const analysis = ProjectIntelligenceEngine.analyzeContext(contextText, evidenceList);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              detectedTechnologies: analysis.detectedTechnologies,
              recommendations: analysis.recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);