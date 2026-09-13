import { QualityScore, SetupState } from '../../types/domain';

export class QualityEngine {
  /**
   * Evaluates rule compliance for the setup.
   * This is strictly a MEASUREMENT OF RULE ADHERENCE, NOT A WIN PROBABILITY.
   */
  public static calculateQuality(setup: SetupState): QualityScore {
    const checks = [
      { name: 'NY Trading Window / HTF Context', passed: setup.htfContext, weight: 1 },
      { name: 'Liquidity Identified', passed: setup.liquidityIdentified, weight: 1 },
      { name: 'Liquidity Swept', passed: setup.liquiditySwept, weight: 1 },
      { name: 'Reclaim / Close Back Inside', passed: setup.reclaimConfirmed, weight: 1 },
      { name: 'M5/M1 Displacement Confirmed', passed: setup.displacementConfirmed, weight: 1 },
      { name: 'Market Structure Shift (MSS)', passed: setup.mssConfirmed, weight: 1 },
      { name: 'Retracement Occurred', passed: setup.retracementConfirmed, weight: 1 },
      { name: 'Entry Zone Touched (FVG / OB)', passed: setup.entryZoneTouched, weight: 1 },
    ];

    const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
    const maxScore = checks.length;

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
    if (score === 8) grade = 'A+';
    else if (score === 7) grade = 'A';
    else if (score === 6) grade = 'B';
    else if (score === 5) grade = 'C';
    else grade = 'D';

    return {
      score,
      maxScore,
      grade,
      details: checks,
    };
  }
}
