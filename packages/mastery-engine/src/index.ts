import { Evidence, NodeState } from "@fundaments/shared";

export class MasteryCalculator {
  /**
   * Computes the derived NodeState purely from verified immutable evidence records.
   * Mastered requires both practical application (deterministic) and conceptual proof.
   */
  static computeState(evidenceList: Evidence[]): NodeState {
    if (!evidenceList || evidenceList.length === 0) {
      return "not_started";
    }

    const passedEvidence = evidenceList.filter((e) => e.passed);
    if (passedEvidence.length === 0) {
      return "learning";
    }

    const hasDeterministicProof = passedEvidence.some(
      (e) => e.dimension === "prediction" || e.dimension === "practical_application"
    );

    const hasConceptualProof = passedEvidence.some(
      (e) => e.dimension === "conceptual_understanding" || e.dimension === "derivation"
    );

    const hasRetentionProof = passedEvidence.some((e) => e.dimension === "retention");

    if (hasDeterministicProof && hasConceptualProof && hasRetentionProof) {
      return "mastered";
    }

    if (hasDeterministicProof && hasConceptualProof) {
      return "demonstrated";
    }

    if (passedEvidence.length > 0) {
      return "practising";
    }

    return "learning";
  }
}