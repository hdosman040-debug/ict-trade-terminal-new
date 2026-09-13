import {
  FairValueGap,
  LiquidityLevel,
  MarketCandle,
  MarketContext,
  MarketStructureShift,
  OrderBlock,
  SetupState,
} from '../../types/domain';
import { DisplacementEngine } from './displacementEngine';
import { FVGEngine } from './fvgEngine';
import { LiquidityEngine } from './liquidityEngine';
import { MSSEngine } from './mssEngine';
import { OrderBlockEngine } from './orderBlockEngine';

export class SetupEngine {
  /**
   * Evaluates the complete ICT setup sequence using ONLY revealed candles (0..N).
   * ZERO LOOKAHEAD GUARANTEE.
   */
  public static evaluateSetup(
    revealedCandles: MarketCandle[],
    context: MarketContext
  ): SetupState {
    if (!revealedCandles || revealedCandles.length < 5) {
      return {
        htfContext: false,
        liquidityIdentified: false,
        liquiditySwept: false,
        reclaimConfirmed: false,
        displacementConfirmed: false,
        mssConfirmed: false,
        retracementConfirmed: false,
        entryZoneTouched: false,
        entryModelSelected: false,
        isActionable: false,
        missingConditions: ['Insufficient revealed candles'],
      };
    }

    // 1. HTF Context check
    const htfContext = context.tradingWindow === 'ACTIVE_WINDOW' || context.tradingWindow === 'BEFORE_WINDOW';

    // 2. Liquidity levels
    const liquidityLevels = LiquidityEngine.evaluateLiquidity(revealedCandles, {
      pdh: context.pdh,
      pdl: context.pdl,
      asiaHigh: context.asiaHigh,
      asiaLow: context.asiaLow,
      londonHigh: context.londonHigh,
      londonLow: context.londonLow,
    });

    const liquidityIdentified = liquidityLevels.length > 0;

    // Find the most recently swept level
    const sweptLevels = liquidityLevels
      .filter((l) => l.status === 'SWEPT' || l.status === 'RECLAIMED')
      .sort((a, b) => (b.sweptAt || 0) - (a.sweptAt || 0));

    const targetLiquidity = sweptLevels[0];
    const liquiditySwept = Boolean(targetLiquidity);

    // 3. Reclaim check
    const reclaimConfirmed = targetLiquidity ? targetLiquidity.status === 'RECLAIMED' : false;

    // 4. Displacement check
    const displacement = DisplacementEngine.evaluateDisplacement(revealedCandles);
    const displacementConfirmed = displacement.confirmed;

    // 5. Market Structure Shift (MSS)
    const mss = MSSEngine.detectMSS(
      revealedCandles,
      context.timeframe,
      targetLiquidity?.sweptAt,
      targetLiquidity?.direction
    );
    const mssConfirmed = Boolean(mss);

    // 6. Fair Value Gaps and Order Blocks
    const fvgs = FVGEngine.detectFVGs(revealedCandles, context.timeframe);
    const orderBlocks = OrderBlockEngine.detectOrderBlocks(revealedCandles, context.timeframe);

    // Active FVG matching direction
    const expectedDir = targetLiquidity?.direction === 'LOW' ? 'bullish' : 'bearish';
    const candidateFVGs = fvgs
      .filter((f) => f.direction === expectedDir && (!targetLiquidity || f.formedAt >= (targetLiquidity.sweptAt || 0)))
      .sort((a, b) => b.formedAt - a.formedAt);

    const activeFVG = candidateFVGs[0];

    // Active OB
    const candidateOBs = orderBlocks
      .filter((o) => o.direction === expectedDir && (!targetLiquidity || o.formedAt >= (targetLiquidity.sweptAt || 0)))
      .sort((a, b) => b.formedAt - a.formedAt);

    const activeOrderBlock = candidateOBs[0];

    // 7. Retracement & Entry Zone Touched
    let retracementConfirmed = false;
    let entryZoneTouched = false;

    if (activeFVG) {
      if (activeFVG.mitigated) {
        retracementConfirmed = true;
        entryZoneTouched = true;
      }
    } else if (activeOrderBlock) {
      if (activeOrderBlock.mitigated) {
        retracementConfirmed = true;
        entryZoneTouched = true;
      }
    }

    const entryModelSelected = Boolean(activeFVG || activeOrderBlock);

    // Determine missing conditions
    const missingConditions: string[] = [];
    if (!htfContext) missingConditions.push('Trading Window not active (09:45–12:00 NY)');
    if (!liquidityIdentified) missingConditions.push('No key liquidity identified');
    if (!liquiditySwept) missingConditions.push('Liquidity sweep pending');
    if (!reclaimConfirmed) missingConditions.push('Close back inside liquidity level pending');
    if (!displacementConfirmed) missingConditions.push('Energetic displacement candle pending');
    if (!mssConfirmed) missingConditions.push('M1/M5 Market Structure Shift (MSS) pending');
    if (!retracementConfirmed) missingConditions.push('Retracement into discount/premium pending');
    if (!entryZoneTouched) missingConditions.push('FVG or Order Block touch pending');

    const isActionable =
      htfContext &&
      liquiditySwept &&
      reclaimConfirmed &&
      displacementConfirmed &&
      mssConfirmed &&
      retracementConfirmed &&
      entryZoneTouched;

    return {
      htfContext,
      liquidityIdentified,
      liquiditySwept,
      reclaimConfirmed,
      displacementConfirmed,
      mssConfirmed,
      retracementConfirmed,
      entryZoneTouched,
      entryModelSelected,
      targetLiquidity,
      activeFVG,
      activeOrderBlock,
      activeMSS: mss || undefined,
      activeDisplacement: displacement,
      isActionable,
      missingConditions,
    };
  }
}
