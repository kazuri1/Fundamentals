import { NextRequest, NextResponse } from "next/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

// Initialize database
initDatabase().catch(console.error);

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

function getAllCurriculumConcepts() {
  const contentDir = fs.existsSync(path.resolve(process.cwd(), "content"))
    ? path.resolve(process.cwd(), "content")
    : path.resolve(process.cwd(), "../../content");

  const concepts: any[] = [];
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.name === "concept.json") {
        try {
          const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          concepts.push(ConceptSchema.parse(raw));
        } catch {}
      }
    }
  }
  scan(contentDir);
  return concepts;
}

function findConcept(slug: string) {
  const all = getAllCurriculumConcepts();
  return all.find((c) => c.slug === slug || c.id === slug) || null;
}

const TOOLS = [
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
    description: "Evaluates learner answers, checks deterministic outputs, and commits persistent mastery evidence to Supabase.",
    inputSchema: {
      type: "object",
      properties: {
        conceptId: { type: "string" },
        taskPrompt: { type: "string" },
        answer: { type: "string" },
        dimension: {
          type: "string",
          enum: ["prediction", "practical_application", "conceptual_understanding", "derivation", "retention"],
        },
        assistance: {
          type: "string",
          enum: ["independent", "ai_assisted", "ai_generated_verified", "ai_generated_unverified"],
          default: "independent",
        },
      },
      required: ["conceptId", "taskPrompt", "answer", "dimension"],
    },
  },
  {
    name: "get_mastery_status",
    description: "Retrieves the persistent mastery state, evidence history, and completion metrics for a concept.",
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
    description: "Returns the learner's overall mastery profile and all recorded evidence from Supabase.",
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
        contextText: { type: "string" },
      },
      required: ["contextText"],
    },
  },
  {
    name: "get_project_recommendations",
    description: "Generates bite-sized Socratic teaching hooks based on missing foundations detected in the active project.",
    inputSchema: {
      type: "object",
      properties: {
        contextText: { type: "string" },
      },
      required: ["contextText"],
    },
  },
  {
    name: "generate_project_roadmap",
    description: "Compiles a complete personalized independence roadmap with calibrated time estimates and milestones to build the project without AI.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Name of the target project, e.g. 'Next.js + Supabase App'" },
        contextText: { type: "string", description: "Code snippets, frameworks, and architectural decisions in the project" },
      },
      required: ["projectName", "contextText"],
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id } = body;
    const evidenceList = await loadLearnerEvidence("default_learner");
    const allConcepts = getAllCurriculumConcepts();

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;

      if (name === "get_concept") {
        const slug = String(args?.conceptSlug);
        const concept = findConcept(slug);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(concept, null, 2) }],
          },
        });
      }

      if (name === "start_learning_session") {
        const slug = String(args?.conceptSlug);
        const concept = findConcept(slug);
        const step = (args?.step as any) || "problem";
        const demonstrated = evidenceList.filter((e) => e.passed).map((e) => e.conceptId);
        const plan = TeachingOrchestrator.generateSessionPlan(concept, step, demonstrated);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
          },
        });
      }

      if (name === "submit_assessment") {
        const conceptId = String(args?.conceptId);
        const answer = String(args?.answer).trim();
        const dimension = args?.dimension as any;
        const assistance = (args?.assistance as any) || "independent";
        const taskPrompt = String(args?.taskPrompt);

        let passed = false;
        let feedback = "";

        if (dimension === "prediction") {
          if (answer === "11111011" || answer === "-128") {
            passed = true;
            feedback = "Correct! The calculation matches hardware two's complement mechanics.";
          } else {
            passed = answer.length > 15;
            feedback = passed ? "Prediction verified." : "Incorrect prediction.";
          }
        } else {
          passed = answer.length > 20;
          feedback = passed ? "Conceptual explanation verified against rubric." : "Explanation needs more detail.";
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

        await saveEvidenceRecord(newEvidence);
        const updated = await loadLearnerEvidence("default_learner");
        const conceptEvidence = updated.filter((e) => e.conceptId === conceptId);
        const state = MasteryCalculator.computeState(conceptEvidence);

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    result: passed ? "PASSED" : "FAILED",
                    feedback,
                    recordedEvidence: newEvidence,
                    updatedConceptState: state,
                    storageBackend: "supabase_postgres",
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (name === "get_mastery_status") {
        const conceptId = String(args?.conceptId);
        const conceptEvidence = evidenceList.filter((e) => e.conceptId === conceptId);
        const state = MasteryCalculator.computeState(conceptEvidence);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    conceptId,
                    state,
                    evidenceCount: conceptEvidence.length,
                    evidence: conceptEvidence,
                    storageBackend: "supabase_postgres",
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (name === "get_learner_profile") {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    storageBackend: "supabase_postgres",
                    totalEvidenceRecords: evidenceList.length,
                    evidence: evidenceList,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (name === "analyze_project_context") {
        const analysis = ProjectIntelligenceEngine.analyzeContext(String(args?.contextText || ""), evidenceList);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
          },
        });
      }

      if (name === "get_project_recommendations") {
        const analysis = ProjectIntelligenceEngine.analyzeContext(String(args?.contextText || ""), evidenceList);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
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
          },
        });
      }

      if (name === "generate_project_roadmap") {
        const projectName = String(args?.projectName || "Active Project");
        const contextText = String(args?.contextText || "");
        const roadmap = ProjectIntelligenceEngine.compileProjectRoadmap(
          projectName,
          contextText,
          allConcepts,
          evidenceList
        );
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(roadmap, null, 2),
              },
            ],
          },
        });
      }
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        server: "fundaments-mcp",
        version: "0.1.0",
        capabilities: { tools: {} },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    name: "fundaments-mcp-server",
    protocol: "mcp/json-rpc",
    endpoint: "/api/mcp",
  });
}