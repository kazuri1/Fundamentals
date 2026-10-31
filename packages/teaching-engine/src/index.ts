import { Concept, LearningStep, MasteryDimension } from "@fundaments/shared";

export interface SessionPlan {
  conceptId: string;
  conceptName: string;
  currentStep: LearningStep;
  missingPrerequisites: string[];
  protocolRules: string[];
  stepObjective: string;
  assessmentRubric?: {
    deterministicChecks: Array<{ prompt: string; expectedAnswer: string | number }>;
    freeTextPrompts: Array<{ prompt: string; rubricCriteria: string[] }>;
  };
}

export class TeachingOrchestrator {
  /**
   * Constructs the structured first-principles session plan for the harness model
   */
  static generateSessionPlan(
    concept: Concept,
    step: LearningStep = "problem",
    demonstratedConcepts: string[] = []
  ): SessionPlan {
    const missingPrerequisites = concept.prerequisites.filter(
      (prereq) => !demonstratedConcepts.includes(prereq)
    );

    const protocolRules = [
      "SOCRATIC REASONING: Ask questions that guide the learner to derive the answer; do not give the direct answer first.",
      "FIRST PRINCIPLES: Ground all concepts in physical or mathematical reality (e.g. transistors, circuits, arithmetic) rather than syntax.",
      "EXPERIMENTATION: Prompt the user to test behavior directly in code or terminal before concluding the session.",
      "OBJECTIVE CHECK: Verify the learner can predict edge-case behavior (e.g. overflow, boundary conditions)."
    ];

    let stepObjective = "";
    switch (step) {
      case "problem":
        stepObjective = "Frame the engineering problem clearly: Why does this concept exist, and what problem does it solve?";
        break;
      case "derivation":
        stepObjective = "Guide the learner to reason toward the solution without naming or revealing the finalized standard mechanism immediately.";
        break;
      case "mental_model":
        stepObjective = "Consolidate the mental model and explain the internal mechanics in rigorous, precise terms.";
        break;
      case "experiment":
        stepObjective = "Provide a concrete, hands-on simulation or bitwise experiment for the learner to run locally.";
        break;
      case "assessment":
        stepObjective = "Conduct the mastery assessment using deterministic and conceptual checks.";
        break;
      default:
        stepObjective = "Guide the learner through the foundational concept.";
    }

    return {
      conceptId: concept.id,
      conceptName: concept.name,
      currentStep: step,
      missingPrerequisites,
      protocolRules,
      stepObjective,
      assessmentRubric: {
        deterministicChecks: [
          {
            prompt: "What is decimal -5 represented as an 8-bit signed two's complement integer in binary?",
            expectedAnswer: "11111011"
          },
          {
            prompt: "If an 8-bit signed integer has the binary value 01111111 (decimal 127) and we add 1, what decimal value does it represent in two's complement?",
            expectedAnswer: -128
          }
        ],
        freeTextPrompts: [
          {
            prompt: "Explain why hardware designers prefer two's complement over sign-magnitude representation.",
            rubricCriteria: [
              "Mentions zero representation (only one representation of 0, unlike +0 and -0 in sign-magnitude)",
              "Explains that standard binary addition circuits can handle both addition and subtraction with no special ALU hardware changes"
            ]
          }
        ]
      }
    };
  }
}