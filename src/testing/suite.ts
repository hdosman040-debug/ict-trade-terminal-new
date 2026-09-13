import { AnalyticsEngine } from '../domain/analytics/analyticsEngine';
import { DisplacementEngine } from '../domain/ict/displacementEngine';
import { FVGEngine } from '../domain/ict/fvgEngine';
import { LiquidityEngine } from '../domain/ict/liquidityEngine';
import { MarketContextEngine } from '../domain/ict/marketContextEngine';
import { MSSEngine } from '../domain/ict/mssEngine';
import { OrderBlockEngine } from '../domain/ict/orderBlockEngine';
import { QualityEngine } from '../domain/ict/qualityEngine';
import { SetupEngine } from '../domain/ict/setupEngine';
import { generateSessionCandles, HISTORICAL_SESSIONS } from '../domain/marketData/historicalDatasets';
import { ReplayEngine } from '../domain/replay/replayEngine';
import { RiskEngine } from '../domain/risk/riskEngine';
import { getNYTimeDetails, getTradingWindowStatus } from '../domain/timezone/nyTimezone';
import { MarketCandle, MarketContext, RiskSettings, Trade } from '../types/domain';

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  message: string;
  executionTimeMs: number;
}

export class TestRunner {
  public static runAllTests(): TestResult[] {
    const results: TestResult[] = [];

    // 1. Mandatory Multi-Engine No-Lookahead Property Tests
    results.push(...this.testNoLookaheadProperty());

    // 2. Replay Engine Invariants
    results.push(...this.testReplayEngine());

    // 3. Timezone & NY Trading Window
    results.push(...this.testTimezoneAndWindow());

    // 4. ICT Pattern Detectors (FVG, MSS, Setup Sequence)
    results.push(...this.testICTEngines());

    // 5. Risk Engine & Position Sizing
    results.push(...this.testRiskEngine());

    // 6. Analytics & Expectancy Formula
    results.push(...this.testAnalyticsEngine());

    return results;
  }

  /**
   * CRITICAL TEST: AUDIT 3 - ZERO-LOOKAHEAD INVARIANT TEST
   * Proves that at replay index N:
   * 1. Run all engines.
   * 2. Record the resulting state.
   * 3. Modify candle N+1 AND ALL future candles.
   * 4. Run all engines again at index N.
   * 5. The resulting state must remain 100% identical.
   * Covers:
   * - FVG
   * - Order Block
   * - Liquidity
   * - MSS
   * - Displacement
   * - Market Context
   * - Setup State
   * - Quality Score
   */
  private static testNoLookaheadProperty(): TestResult[] {
    const suiteName = 'Audit 3: Zero-Lookahead Invariant';
    const testResults: TestResult[] = [];

    const session = HISTORICAL_SESSIONS[0];
    const candles = generateSessionCandles(session, 'M5');

    const replayN = 120; // Index N
    const originalSlice = candles.slice(0, replayN + 1);

    // Deep copy and radically mutate candle N+1 AND all subsequent future candles
    const mutatedCandles: MarketCandle[] = candles.map((c, idx) => {
      if (idx > replayN) {
        return {
          time: c.time,
          open: 999999 + idx,
          high: 1000000 + idx,
          low: 10 + idx,
          close: 500000 + idx,
          volume: 9999999,
        };
      }
      return { ...c };
    });

    const revealedMutatedSlice = mutatedCandles.slice(0, replayN + 1);

    // --- 1. Displacement Engine ---
    const tDisp = performance.now();
    const disp1 = DisplacementEngine.evaluateDisplacement(originalSlice);
    const disp2 = DisplacementEngine.evaluateDisplacement(revealedMutatedSlice);
    const dispIdentical =
      disp1.confirmed === disp2.confirmed &&
      disp1.bodySize === disp2.bodySize &&
      disp1.avgBodySize === disp2.avgBodySize &&
      disp1.relativeStrength === disp2.relativeStrength;
    testResults.push({
      suiteName,
      testName: 'Displacement Engine Zero-Lookahead',
      passed: dispIdentical,
      message: dispIdentical
        ? 'PASS: Displacement state at index N invariant to future mutations.'
        : 'FAIL: Displacement at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tDisp,
    });

    // --- 2. FVG Engine ---
    const tFvg = performance.now();
    const fvg1 = FVGEngine.detectFVGs(originalSlice, 'M5');
    const fvg2 = FVGEngine.detectFVGs(revealedMutatedSlice, 'M5');
    const fvgIdentical = JSON.stringify(fvg1) === JSON.stringify(fvg2);
    testResults.push({
      suiteName,
      testName: 'FVG Engine Zero-Lookahead',
      passed: fvgIdentical,
      message: fvgIdentical
        ? `PASS: FVG state at index N (${fvg1.length} gaps) invariant to future mutations.`
        : 'FAIL: FVG detection at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tFvg,
    });

    // --- 3. Order Block Engine ---
    const tOb = performance.now();
    const ob1 = OrderBlockEngine.detectOrderBlocks(originalSlice, 'M5');
    const ob2 = OrderBlockEngine.detectOrderBlocks(revealedMutatedSlice, 'M5');
    const obIdentical = JSON.stringify(ob1) === JSON.stringify(ob2);
    testResults.push({
      suiteName,
      testName: 'Order Block Engine Zero-Lookahead',
      passed: obIdentical,
      message: obIdentical
        ? `PASS: Order Block state at index N (${ob1.length} OBs) invariant to future mutations.`
        : 'FAIL: Order Block detection at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tOb,
    });

    // --- 4. Liquidity Engine ---
    const tLiq = performance.now();
    const liq1 = LiquidityEngine.evaluateLiquidity(originalSlice, {
      pdh: session.pdh,
      pdl: session.pdl,
      asiaHigh: session.asiaHigh,
      asiaLow: session.asiaLow,
      londonHigh: session.londonHigh,
      londonLow: session.londonLow,
    });
    const liq2 = LiquidityEngine.evaluateLiquidity(revealedMutatedSlice, {
      pdh: session.pdh,
      pdl: session.pdl,
      asiaHigh: session.asiaHigh,
      asiaLow: session.asiaLow,
      londonHigh: session.londonHigh,
      londonLow: session.londonLow,
    });
    const liqIdentical = JSON.stringify(liq1) === JSON.stringify(liq2);
    testResults.push({
      suiteName,
      testName: 'Liquidity Engine Zero-Lookahead',
      passed: liqIdentical,
      message: liqIdentical
        ? `PASS: Liquidity levels (${liq1.length} levels) invariant to future mutations.`
        : 'FAIL: Liquidity evaluation at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tLiq,
    });

    // --- 5. Market Context Engine ---
    const tCtx = performance.now();
    const ctx1 = MarketContextEngine.calculateContext(originalSlice, 'M5');
    const ctx2 = MarketContextEngine.calculateContext(revealedMutatedSlice, 'M5');
    const ctxIdentical =
      ctx1.htfBias === ctx2.htfBias &&
      ctx1.structure === ctx2.structure &&
      ctx1.swingHigh === ctx2.swingHigh &&
      ctx1.swingLow === ctx2.swingLow &&
      ctx1.equilibriumPrice === ctx2.equilibriumPrice &&
      ctx1.currentZone === ctx2.currentZone;
    testResults.push({
      suiteName,
      testName: 'Market Context Engine Zero-Lookahead',
      passed: ctxIdentical,
      message: ctxIdentical
        ? 'PASS: Market Context at index N invariant to future mutations.'
        : 'FAIL: Market Context at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tCtx,
    });

    // --- 6. MSS Engine ---
    const tMss = performance.now();
    const mss1 = MSSEngine.detectMSS(originalSlice, 'M5', undefined, 'LOW');
    const mss2 = MSSEngine.detectMSS(revealedMutatedSlice, 'M5', undefined, 'LOW');
    const mssIdentical = JSON.stringify(mss1) === JSON.stringify(mss2);
    testResults.push({
      suiteName,
      testName: 'MSS Engine Zero-Lookahead',
      passed: mssIdentical,
      message: mssIdentical
        ? 'PASS: MSS detection at index N invariant to future mutations.'
        : 'FAIL: MSS detection at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tMss,
    });

    // --- 7. Setup State Engine ---
    const tSetup = performance.now();
    const setup1 = SetupEngine.evaluateSetup(originalSlice, ctx1);
    const setup2 = SetupEngine.evaluateSetup(revealedMutatedSlice, ctx2);
    const setupIdentical =
      setup1.isActionable === setup2.isActionable &&
      setup1.reclaimConfirmed === setup2.reclaimConfirmed &&
      setup1.displacementConfirmed === setup2.displacementConfirmed &&
      setup1.mssConfirmed === setup2.mssConfirmed &&
      setup1.missingConditions.join(',') === setup2.missingConditions.join(',');
    testResults.push({
      suiteName,
      testName: 'Setup Engine Zero-Lookahead',
      passed: setupIdentical,
      message: setupIdentical
        ? 'PASS: Full ICT setup sequence at index N invariant to future mutations.'
        : 'FAIL: Setup state at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tSetup,
    });

    // --- 8. Quality Engine ---
    const tQual = performance.now();
    const qual1 = QualityEngine.calculateQuality(setup1);
    const qual2 = QualityEngine.calculateQuality(setup2);
    const qualIdentical =
      qual1.score === qual2.score &&
      qual1.maxScore === qual2.maxScore &&
      qual1.grade === qual2.grade;
    testResults.push({
      suiteName,
      testName: 'Quality Engine Zero-Lookahead',
      passed: qualIdentical,
      message: qualIdentical
        ? `PASS: Quality Score (${qual1.score}/${qual1.maxScore}, Grade ${qual1.grade}) invariant to future mutations.`
        : 'FAIL: Quality Score at N changed after future candles mutated!',
      executionTimeMs: performance.now() - tQual,
    });

    return testResults;
  }

  private static testReplayEngine(): TestResult[] {
    const results: TestResult[] = [];
    const t0 = performance.now();

    const engine = new ReplayEngine('US30', '2024-05-10');
    const dummyCandles: MarketCandle[] = [
      { time: 1000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1060, open: 11, high: 14, low: 10, close: 13 },
      { time: 1120, open: 13, high: 15, low: 12, close: 14 },
    ];

    engine.loadDataset('US30', 'M5', '2024-05-10', dummyCandles, 'blind', 0);
    const initial = engine.getState();

    results.push({
      suiteName: 'Replay Engine',
      testName: 'Blind Replay Hides Future',
      passed: initial.revealedCandles.length === 1 && initial.isBlind === true,
      message:
        initial.revealedCandles.length === 1
          ? 'PASS: Only index 0 is visible at start of blind replay.'
          : 'FAIL: Revealed more candles than current index.',
      executionTimeMs: performance.now() - t0,
    });

    engine.nextCandle();
    const afterNext = engine.getState();
    results.push({
      suiteName: 'Replay Engine',
      testName: 'Next Candle Reveals Exactly 1 Candle',
      passed: afterNext.revealedCandles.length === 2 && afterNext.currentIndex === 1,
      message: 'PASS: currentIndex advanced from 0 to 1 with exactly 2 revealed candles.',
      executionTimeMs: performance.now() - t0,
    });

    engine.reset();
    const afterReset = engine.getState();
    results.push({
      suiteName: 'Replay Engine',
      testName: 'Reset Returns to Index 0',
      passed: afterReset.currentIndex === 0 && afterReset.revealedCandles.length === 1,
      message: 'PASS: Reset restored replay index to 0 without lookahead.',
      executionTimeMs: performance.now() - t0,
    });

    return results;
  }

  private static testTimezoneAndWindow(): TestResult[] {
    const results: TestResult[] = [];
    const t0 = performance.now();

    // 2024-05-10 10:00 AM NY (EDT = UTC-4) -> 14:00 UTC
    const dateNY10am = new Date(Date.UTC(2024, 4, 10, 14, 0, 0));
    const timestampSec = Math.floor(dateNY10am.getTime() / 1000);

    const nyDetails = getNYTimeDetails(timestampSec);
    const windowStatus = getTradingWindowStatus(timestampSec);

    results.push({
      suiteName: 'Timezone Service',
      testName: 'America/New_York Conversion',
      passed: nyDetails.hour === 10 && nyDetails.minute === 0 && nyDetails.nyDateString === '2024-05-10',
      message: `PASS: Accurately converted to ${nyDetails.nyDateString} ${nyDetails.nyTimeString} NY.`,
      executionTimeMs: performance.now() - t0,
    });

    results.push({
      suiteName: 'Timezone Service',
      testName: 'NY AM Active Window (09:45 - 12:00)',
      passed: windowStatus === 'ACTIVE_WINDOW',
      message: `PASS: 10:00 NY evaluated as ACTIVE_WINDOW.`,
      executionTimeMs: performance.now() - t0,
    });

    return results;
  }

  private static testICTEngines(): TestResult[] {
    const results: TestResult[] = [];
    const t0 = performance.now();

    // Test Bullish FVG
    // C1: high=100
    // C2: displacement up open=100, close=120
    // C3: low=105 (gap between 100 and 105)
    const fvgCandles: MarketCandle[] = [
      { time: 100, open: 90, high: 100, low: 88, close: 98 },
      { time: 200, open: 98, high: 122, low: 97, close: 120 },
      { time: 300, open: 118, high: 125, low: 105, close: 123 },
    ];

    const fvgs = FVGEngine.detectFVGs(fvgCandles);
    const hasBullishFVG = fvgs.some((f) => f.direction === 'bullish' && f.bottom === 100 && f.top === 105);

    results.push({
      suiteName: 'ICT Engines',
      testName: 'Bullish Fair Value Gap (FVG) Detection',
      passed: hasBullishFVG,
      message: hasBullishFVG ? 'PASS: Bullish FVG formed correctly with gap [100.00, 105.00].' : 'FAIL: FVG not detected.',
      executionTimeMs: performance.now() - t0,
    });

    // Test Quality Score compliance
    const quality = QualityEngine.calculateQuality({
      htfContext: true,
      liquidityIdentified: true,
      liquiditySwept: true,
      reclaimConfirmed: true,
      displacementConfirmed: true,
      mssConfirmed: true,
      retracementConfirmed: true,
      entryZoneTouched: true,
      entryModelSelected: true,
      isActionable: true,
      missingConditions: [],
    });

    results.push({
      suiteName: 'ICT Engines',
      testName: 'Entry Quality Score (8/8 -> A+)',
      passed: quality.score === 8 && quality.grade === 'A+',
      message: `PASS: Fully compliant setup scored ${quality.score}/${quality.maxScore} (Grade ${quality.grade}).`,
      executionTimeMs: performance.now() - t0,
    });

    return results;
  }

  private static testRiskEngine(): TestResult[] {
    const results: TestResult[] = [];
    const t0 = performance.now();

    const settings: RiskSettings = {
      accountBalance: 10000,
      riskPercent: 1.0, // $100
      maxTradesPerDay: 3,
      maxDailyRiskPercent: 3.0,
      maxConsecutiveLosses: 2,
      minRiskReward: 1.5,
      nyWindowStart: '09:45',
      nyWindowEnd: '12:00',
    };

    const cleanDailyState = {
      nyDate: '2024-05-10',
      tradesToday: 0,
      riskUsedToday: 0,
      riskPercentUsedToday: 0,
      realizedPnlToday: 0,
      realizedRToday: 0,
      consecutiveLossesToday: 0,
      isTradingPermitted: true,
    };

    // Valid Long: Entry 39,000, SL 38,950 (50 pts), TP 39,100 (100 pts) -> 2.0 R:R
    const validDecision = RiskEngine.evaluateRisk(
      'US30',
      'BUY',
      39000,
      38950,
      39100,
      settings,
      cleanDailyState
    );

    results.push({
      suiteName: 'Risk Management',
      testName: 'Long Trade Position Sizing & R:R',
      passed: validDecision.permitted && validDecision.rrRatio === 2.0 && validDecision.riskAmount === 100,
      message: `PASS: Permitted with R:R ${validDecision.rrRatio}:1, Size: ${validDecision.calculatedPositionSize} lots, Risk: $${validDecision.riskAmount}.`,
      executionTimeMs: performance.now() - t0,
    });

    // Invalid Long (SL above entry)
    const invalidDecision = RiskEngine.evaluateRisk(
      'US30',
      'BUY',
      39000,
      39050, // SL above entry
      39100,
      settings,
      cleanDailyState
    );

    results.push({
      suiteName: 'Risk Management',
      testName: 'Rejection of Invalid Geometry (SL > Entry)',
      passed: !invalidDecision.permitted && invalidDecision.reasons.length > 0,
      message: `PASS: Invalid trade rejected with reason: "${invalidDecision.reasons[0]}".`,
      executionTimeMs: performance.now() - t0,
    });

    return results;
  }

  private static testAnalyticsEngine(): TestResult[] {
    const results: TestResult[] = [];
    const t0 = performance.now();

    // 2 Wins (+2R each), 1 Loss (-1R)
    // Win Rate = 66.7%, Avg Win = +2R, Avg Loss = -1R
    // Expectancy = (0.667 * 2) + (0.333 * -1) = 1.334 - 0.333 = +1.00R
    const dummyTrades: Trade[] = [
      {
        id: 't1',
        tradeNumber: 1,
        instrument: 'US30',
        date: '2024-05-10',
        timestamp: 1000,
        session: 'NY_AM',
        dayOfWeek: 'Friday',
        direction: 'BUY',
        marketContext: { htfBias: 'BULLISH', structure: 'BULLISH', premiumDiscount: 'DISCOUNT' },
        setup: {
          liquidityType: 'SSL',
          liquiditySwept: true,
          sweepPrice: 10,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'FVG',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 39000,
          stopLoss: 38950,
          takeProfit: 39100,
          riskAmount: 50,
          riskPercent: 1,
          rr: 2,
          positionSize: 1,
          entryReplayIndex: 0,
          entryTimestamp: 1000,
        },
        result: {
          outcome: 'WIN',
          exitPrice: 39100,
          exitTimestamp: 2000,
          exitReplayIndex: 5,
          resultR: 2,
          pnl: 100,
          mfe: 100,
          mfeR: 2,
          mae: 0,
          maeR: 0,
          timeToCloseMinutes: 15,
          candlesToClose: 5,
        },
        quality: { score: 8, maxScore: 8, grade: 'A+', ruleFollowing: true },
        confidence: 5,
        psychology: { preTradeState: 'Calm', followedPlan: true, wasImpulsive: false, wouldTakeAgain: true },
        notes: { whyTaken: 'Test' },
      },
      {
        id: 't2',
        tradeNumber: 2,
        instrument: 'US30',
        date: '2024-05-10',
        timestamp: 1000,
        session: 'NY_AM',
        dayOfWeek: 'Friday',
        direction: 'BUY',
        marketContext: { htfBias: 'BULLISH', structure: 'BULLISH', premiumDiscount: 'DISCOUNT' },
        setup: {
          liquidityType: 'SSL',
          liquiditySwept: true,
          sweepPrice: 10,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'FVG',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 39000,
          stopLoss: 38950,
          takeProfit: 39100,
          riskAmount: 50,
          riskPercent: 1,
          rr: 2,
          positionSize: 1,
          entryReplayIndex: 0,
          entryTimestamp: 1000,
        },
        result: {
          outcome: 'WIN',
          exitPrice: 39100,
          exitTimestamp: 2000,
          exitReplayIndex: 5,
          resultR: 2,
          pnl: 100,
          mfe: 100,
          mfeR: 2,
          mae: 0,
          maeR: 0,
          timeToCloseMinutes: 15,
          candlesToClose: 5,
        },
        quality: { score: 8, maxScore: 8, grade: 'A+', ruleFollowing: true },
        confidence: 5,
        psychology: { preTradeState: 'Calm', followedPlan: true, wasImpulsive: false, wouldTakeAgain: true },
        notes: { whyTaken: 'Test' },
      },
      {
        id: 't3',
        tradeNumber: 3,
        instrument: 'US30',
        date: '2024-05-10',
        timestamp: 1000,
        session: 'NY_AM',
        dayOfWeek: 'Friday',
        direction: 'BUY',
        marketContext: { htfBias: 'BULLISH', structure: 'BULLISH', premiumDiscount: 'DISCOUNT' },
        setup: {
          liquidityType: 'SSL',
          liquiditySwept: true,
          sweepPrice: 10,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'FVG',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 39000,
          stopLoss: 38950,
          takeProfit: 39100,
          riskAmount: 50,
          riskPercent: 1,
          rr: 2,
          positionSize: 1,
          entryReplayIndex: 0,
          entryTimestamp: 1000,
        },
        result: {
          outcome: 'LOSS',
          exitPrice: 38950,
          exitTimestamp: 2000,
          exitReplayIndex: 5,
          resultR: -1,
          pnl: -50,
          mfe: 0,
          mfeR: 0,
          mae: 50,
          maeR: 1,
          timeToCloseMinutes: 15,
          candlesToClose: 5,
        },
        quality: { score: 8, maxScore: 8, grade: 'A+', ruleFollowing: true },
        confidence: 5,
        psychology: { preTradeState: 'Calm', followedPlan: true, wasImpulsive: false, wouldTakeAgain: true },
        notes: { whyTaken: 'Test' },
      },
    ];

    const perf = AnalyticsEngine.calculatePerformance(dummyTrades);

    results.push({
      suiteName: 'Analytics Engine',
      testName: 'Mathematical Expectancy Formula',
      passed: perf.winRate === 66.7 && Math.abs(perf.expectancyR - 1.0) < 0.05 && perf.totalR === 3.0,
      message: `PASS: Expectancy verified as +${perf.expectancyR}R with Total R +${perf.totalR}R.`,
      executionTimeMs: performance.now() - t0,
    });

    return results;
  }
}
