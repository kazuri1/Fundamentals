import { describe, it, expect, beforeAll } from "vitest";
import { TeachingOrchestrator } from "../packages/teaching-engine/src/index.js";
import { MasteryCalculator } from "../packages/mastery-engine/src/index.js";
import { ProjectIntelligenceEngine } from "../packages/project-intelligence/src/index.js";
import { ConceptSchema, Evidence } from "../packages/shared/src/index.js";
import * as fs from "fs";
import * as path from "path";

describe("Real User Journeys — End-to-End Simulation", () => {
  // Mock in-memory evidence store for the user session
  let learnerEvidence: Evidence[] = [];
  let binaryConcept: any;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), "content/architecture/binary-representation/concept.json"),
      "utf-8"
    );
    binaryConcept = ConceptSchema.parse(JSON.parse(raw));
  });

  // =========================================================================
  // JOURNEY 1: The First-Principles Socratic Learning Journey (§16 MVP Spec)
  // =========================================================================
  describe("Journey 1: Structured Socratic Learning from First Principles", () => {
    it("Step 1: User starts with zero evidence -> State is 'not_started'", () => {
      const state = MasteryCalculator.computeState(learnerEvidence);
      expect(state).toBe("not_started");
    });

    it("Step 2: AI requests first-principles session plan for the concept", () => {
      const plan = TeachingOrchestrator.generateSessionPlan(binaryConcept, "problem", []);

      // Verify the pedagogical rules ensure true first-principles teaching
      expect(plan.conceptId).toBe("concept_arch_bin_001");
      expect(plan.currentStep).toBe("problem");
      expect(plan.protocolRules).toContain(
        "SOCRATIC REASONING: Ask questions that guide the learner to derive the answer; do not give the direct answer first."
      );
      expect(plan.protocolRules).toContain(
        "FIRST PRINCIPLES: Ground all concepts in physical or mathematical reality (e.g. transistors, circuits, arithmetic) rather than syntax."
      );
    });

    it("Step 3: User attempts derivation and experiment, then answers prediction check (Deterministic)", () => {
      // User calculates 8-bit two's complement for -5: 11111011
      const deterministicEvidence: Evidence = {
        userId: "user_alex",
        conceptId: binaryConcept.id,
        step: "assessment",
        dimension: "prediction",
        assistance: "independent",
        taskPrompt: "What is decimal -5 represented as an 8-bit signed two's complement integer in binary?",
        learnerSubmission: "11111011",
        passed: true,
        feedback: "Correct! The calculation matches hardware two's complement mechanics.",
        timestamp: new Date().toISOString()
      };

      learnerEvidence.push(deterministicEvidence);

      // Verify state transitions to 'practising' (one proof is not enough for mastery)
      const state = MasteryCalculator.computeState(learnerEvidence);
      expect(state).toBe("practising");
    });

    it("Step 4: User provides conceptual explanation (Sign-magnitude vs Two's Complement)", () => {
      // User explains why hardware designers prefer two's complement
      const conceptualEvidence: Evidence = {
        userId: "user_alex",
        conceptId: binaryConcept.id,
        step: "assessment",
        dimension: "conceptual_understanding",
        assistance: "ai_generated_verified",
        taskPrompt: "Explain why hardware designers prefer two's complement over sign-magnitude representation.",
        learnerSubmission: "Two's complement avoids dual-zero representation and allows hardware adders to subtract without extra circuitry.",
        passed: true,
        feedback: "Conceptual explanation verified against rubric criteria.",
        timestamp: new Date().toISOString()
      };

      learnerEvidence.push(conceptualEvidence);

      // With BOTH practical/prediction AND conceptual proof, state transitions to 'demonstrated'
      const state = MasteryCalculator.computeState(learnerEvidence);
      expect(state).toBe("demonstrated");
    });

    it("Step 5: User completes delayed retention check -> State transitions to 'mastered'", () => {
      // Retention check 7 days later
      const retentionEvidence: Evidence = {
        userId: "user_alex",
        conceptId: binaryConcept.id,
        step: "assessment",
        dimension: "retention",
        assistance: "independent",
        taskPrompt: "Retention check: What is 127 + 1 in 8-bit signed two's complement?",
        learnerSubmission: "-128",
        passed: true,
        feedback: "Retention verified after retention interval.",
        timestamp: new Date().toISOString()
      };

      learnerEvidence.push(retentionEvidence);

      // Now with (1) Deterministic + (2) Conceptual + (3) Retention proof:
      const state = MasteryCalculator.computeState(learnerEvidence);
      expect(state).toBe("mastered");
    });
  });

  // =========================================================================
  // JOURNEY 2: The Vibe-Coder Project Intelligence Journey (Section 7 Spec)
  // =========================================================================
  describe("Journey 2: Vibe-Coding Context Analysis & Socratic Hook", () => {
    it("Step 1: User is vibe-coding Next.js auth & cookie mutations in an unfamiliar repo", () => {
      const vibeCodedSnippet = `
        // app/actions/auth.ts
        'use server'
        import { cookies } from 'next/headers'
        
        export async function handleLogin(data: FormData) {
          const token = generateSession();
          cookies().set('session', token, { httpOnly: true });
        }
      `;

      // Project Intelligence scans the snippet
      const analysis = ProjectIntelligenceEngine.analyzeContext(vibeCodedSnippet, learnerEvidence);

      // Detected tech stack
      expect(analysis.detectedTechnologies).toContain("nextjs");

      // Relevant CS foundations identified
      expect(analysis.relevantConceptIds).toEqual(
        expect.arrayContaining([
          "concept_web_hydration_001",
          "concept_arch_cs_001",
          "concept_net_http_001"
        ])
      );

      // User has not studied HTTP or Client-Server yet -> flagged as missing
      expect(analysis.missingFoundations).toContain("concept_arch_cs_001");
      expect(analysis.missingFoundations).toContain("concept_net_http_001");

      // Verify Socratic hook generated instead of a generic lecture
      const hook = analysis.recommendations.find(r => r.conceptId === "concept_arch_cs_001");
      expect(hook).toBeDefined();
      expect(hook?.socraticHook).toContain(
        "Why can you not pass a JavaScript function, database instance, or class instance directly across a Server Action boundary?"
      );
    });

    it("Step 2: User answers Socratic hook and demonstrates Client-Server boundary", () => {
      // User derives that Server Actions serialize data over HTTP JSON boundaries
      const clientServerEvidence: Evidence = {
        userId: "user_alex",
        conceptId: "concept_arch_cs_001",
        step: "assessment",
        dimension: "conceptual_understanding",
        assistance: "ai_generated_verified",
        taskPrompt: "Why can Server Actions only pass serializable data?",
        learnerSubmission: "Because the server and browser run in completely separate processes and machines; objects must be serialized to JSON over HTTP.",
        passed: true,
        timestamp: new Date().toISOString()
      };

      learnerEvidence.push(clientServerEvidence);

      // Re-run project analysis now that user demonstrated client-server mechanics
      const updatedAnalysis = ProjectIntelligenceEngine.analyzeContext(
        "export async function action() { 'use server' }",
        learnerEvidence
      );

      // Client-server foundation is now marked as demonstrated!
      expect(updatedAnalysis.demonstratedFoundations).toContain("concept_arch_cs_001");
      expect(updatedAnalysis.missingFoundations).not.toContain("concept_arch_cs_001");
    });
  });
});