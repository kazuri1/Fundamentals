import { Concept, Evidence } from "@fundaments/shared";
import { KnowledgeGraphEngine, ProjectRoadmap } from "@fundaments/knowledge-graph";

export interface ProjectAnalysisResult {
  detectedTechnologies: string[];
  relevantConceptIds: string[];
  demonstratedFoundations: string[];
  missingFoundations: string[];
  recommendations: Array<{
    conceptId: string;
    conceptName: string;
    reason: string;
    socraticHook: string;
  }>;
}

const TECHNOLOGY_FOUNDATIONS_MAP: Record<
  string,
  {
    keywords: string[];
    concepts: Array<{ conceptId: string; conceptName: string; reason: string; socraticHook: string }>;
  }
> = {
  nextjs: {
    keywords: ["next", "next/headers", "use server", "use client", "page.tsx", "layout.tsx", "server action"],
    concepts: [
      {
        conceptId: "concept_web_hydration_001",
        conceptName: "SSR, HTML Streaming & DOM Hydration",
        reason: "Detected Next.js Server Components / Actions crossing server and client boundaries.",
        socraticHook: "When you see a hydration mismatch, what is the exact difference between the HTML streamed from Node and what React renders in the browser?"
      },
      {
        conceptId: "concept_arch_cs_001",
        conceptName: "Client-Server Execution Boundary & Serialization",
        reason: "Next.js Server Actions and props cross machine and process boundaries.",
        socraticHook: "Why can you not pass a JavaScript function, database instance, or class instance directly across a Server Action boundary?"
      },
      {
        conceptId: "concept_net_http_001",
        conceptName: "HTTP & Stateless Client-Server Communication",
        reason: "Cookie and header management across stateless HTTP request cycles.",
        socraticHook: "How do Server Actions and cookies manage user sessions if HTTP requests are fundamentally stateless?"
      }
    ]
  },
  react: {
    keywords: ["react", "usestate", "useeffect", "jsx"],
    concepts: [
      {
        conceptId: "concept_web_hydration_001",
        conceptName: "SSR, HTML Streaming & DOM Hydration",
        reason: "React DOM mounting and reconciliation.",
        socraticHook: "How does the virtual DOM reconcile against raw HTML elements received over the wire?"
      }
    ]
  },
  prisma: {
    keywords: ["prisma", "@prisma/client", "prismaclient"],
    concepts: [
      {
        conceptId: "concept_db_tx_001",
        conceptName: "Relational Transactions, ACID & Connection Pooling",
        reason: "ORM database query execution and connection lifecycle.",
        socraticHook: "If two users execute a database mutation at the same millisecond, what database mechanism prevents a dirty read?"
      },
      {
        conceptId: "concept_db_idx_001",
        conceptName: "B-Tree Database Indexing & Disk I/O",
        reason: "Database querying over tables without understanding indexing costs.",
        socraticHook: "Why does a SELECT query degrade exponentially on 100,000 rows without a B-Tree index?"
      }
    ]
  },
  postgres: {
    keywords: ["postgres", "postgresql", "supabase", "drizzle-orm", "drizzle"],
    concepts: [
      {
        conceptId: "concept_db_tx_001",
        conceptName: "Relational Transactions, ACID & Connection Pooling",
        reason: "Direct relational database operations, connection pooler configuration, and transactions.",
        socraticHook: "Why do serverless cloud functions require a transaction pooler (port 6543) instead of direct connections (port 5432)?"
      },
      {
        conceptId: "concept_db_idx_001",
        conceptName: "B-Tree Database Indexing & Disk I/O",
        reason: "Relational table indexing and sequential scan avoidance.",
        socraticHook: "What is an index B-Tree, and how does it balance disk page reads during query execution?"
      }
    ]
  }
};

export class ProjectIntelligenceEngine {
  static analyzeContext(
    contextText: string,
    learnerEvidence: Evidence[]
  ): ProjectAnalysisResult {
    const textLower = contextText.toLowerCase();
    const detectedTechnologies: string[] = [];
    const matchedConcepts: Array<{ conceptId: string; conceptName: string; reason: string; socraticHook: string }> = [];

    for (const [techKey, data] of Object.entries(TECHNOLOGY_FOUNDATIONS_MAP)) {
      const isMatched = data.keywords.some((kw) => textLower.includes(kw));
      if (isMatched) {
        detectedTechnologies.push(techKey);
        for (const c of data.concepts) {
          if (!matchedConcepts.some((m) => m.conceptId === c.conceptId)) {
            matchedConcepts.push(c);
          }
        }
      }
    }

    const demonstratedConceptIds = new Set(
      learnerEvidence.filter((e) => e.passed).map((e) => e.conceptId)
    );

    const relevantConceptIds = matchedConcepts.map((c) => c.conceptId);
    const demonstratedFoundations = relevantConceptIds.filter((id) =>
      demonstratedConceptIds.has(id)
    );
    const missingFoundations = relevantConceptIds.filter(
      (id) => !demonstratedConceptIds.has(id)
    );

    const recommendations = matchedConcepts.filter((c) =>
      missingFoundations.includes(c.conceptId)
    );

    return {
      detectedTechnologies,
      relevantConceptIds,
      demonstratedFoundations,
      missingFoundations,
      recommendations
    };
  }

  /**
   * Compiles the full personalized roadmap with time estimates down to bedrock
   */
  static compileProjectRoadmap(
    projectName: string,
    contextText: string,
    allCurriculumConcepts: Concept[],
    learnerEvidence: Evidence[]
  ): ProjectRoadmap {
    const analysis = this.analyzeContext(contextText, learnerEvidence);
    const graphEngine = new KnowledgeGraphEngine(allCurriculumConcepts);

    const demonstratedSet = new Set(
      learnerEvidence.filter((e) => e.passed).map((e) => e.conceptId)
    );

    const contextReasons: Record<string, string> = {};
    for (const rec of analysis.recommendations) {
      contextReasons[rec.conceptId] = rec.reason;
    }

    return graphEngine.generateRoadmap(
      projectName,
      analysis.relevantConceptIds,
      demonstratedSet,
      contextReasons
    );
  }
}