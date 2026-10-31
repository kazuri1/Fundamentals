import { Evidence } from "@fundaments/shared";

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

// Tech signatures & keywords mapping
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
        conceptName: "Relational Transactions & Connection Pooling",
        reason: "ORM database query execution and connection lifecycle.",
        socraticHook: "If two users execute a database mutation at the same millisecond, what database mechanism prevents a dirty read?"
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
}