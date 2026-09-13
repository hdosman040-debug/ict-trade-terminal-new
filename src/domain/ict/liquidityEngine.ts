import { LiquidityLevel, MarketCandle } from '../../types/domain';

export class LiquidityEngine {
  /**
   * Tracks and evaluates liquidity levels using ONLY revealed candles (0..N).
   *
   * Replay rule:
   * - No candle beyond revealedCandles.length - 1 is ever inspected.
   * - Swing liquidity uses confirmed 5-candle pivots.
   * - A level can only be swept by a candle occurring after that level.
   * - Reclaim can only occur on a candle after the sweep candle.
   */
  public static evaluateLiquidity(
    revealedCandles: MarketCandle[],
    knownLevels: {
      pdh?: number;
      pdl?: number;
      asiaHigh?: number;
      asiaLow?: number;
      londonHigh?: number;
      londonLow?: number;
    }
  ): LiquidityLevel[] {
    if (!revealedCandles || revealedCandles.length === 0) return [];

    const levels: LiquidityLevel[] = [];
    const firstTime = revealedCandles[0].time;

    // 1. Session benchmarks.
    // These are supplied by MarketContextEngine as levels already known
    // to the current replay context.
    if (knownLevels.pdh !== undefined) {
      levels.push({
        id: 'liq_pdh',
        type: 'PDH',
        price: knownLevels.pdh,
        formedAt: firstTime,
        direction: 'HIGH',
        status: 'IDENTIFIED',
        label: 'PDH (Prev Day High)',
      });
    }

    if (knownLevels.pdl !== undefined) {
      levels.push({
        id: 'liq_pdl',
        type: 'PDL',
        price: knownLevels.pdl,
        formedAt: firstTime,
        direction: 'LOW',
        status: 'IDENTIFIED',
        label: 'PDL (Prev Day Low)',
      });
    }

    if (knownLevels.asiaHigh !== undefined) {
      levels.push({
        id: 'liq_asia_h',
        type: 'AsiaHigh',
        price: knownLevels.asiaHigh,
        formedAt: firstTime,
        direction: 'HIGH',
        status: 'IDENTIFIED',
        label: 'Asia High',
      });
    }

    if (knownLevels.asiaLow !== undefined) {
      levels.push({
        id: 'liq_asia_l',
        type: 'AsiaLow',
        price: knownLevels.asiaLow,
        formedAt: firstTime,
        direction: 'LOW',
        status: 'IDENTIFIED',
        label: 'Asia Low',
      });
    }

    if (knownLevels.londonHigh !== undefined) {
      levels.push({
        id: 'liq_london_h',
        type: 'LondonHigh',
        price: knownLevels.londonHigh,
        formedAt: firstTime,
        direction: 'HIGH',
        status: 'IDENTIFIED',
        label: 'London High',
      });
    }

    if (knownLevels.londonLow !== undefined) {
      levels.push({
        id: 'liq_london_l',
        type: 'LondonLow',
        price: knownLevels.londonLow,
        formedAt: firstTime,
        direction: 'LOW',
        status: 'IDENTIFIED',
        label: 'London Low',
      });
    }

    // 2. Identify significant swing highs/lows from revealed candles.
    //
    // A 5-candle pivot requires two candles on each side.
    // Therefore a pivot is only identifiable once both right-side
    // confirmation candles have already been revealed.
    const scanLookback = 500;
    const startIndex = Math.max(2, revealedCandles.length - scanLookback);

    for (let i = startIndex; i < revealedCandles.length - 2; i++) {
      const c = revealedCandles[i];
      const prev1 = revealedCandles[i - 1];
      const prev2 = revealedCandles[i - 2];
      const next1 = revealedCandles[i + 1];
      const next2 = revealedCandles[i + 2];

      // Swing High = buy-side liquidity.
      if (
        c.high > prev1.high &&
        c.high > prev2.high &&
        c.high > next1.high &&
        c.high > next2.high
      ) {
        levels.push({
          id: `liq_bsl_${c.time}`,
          type: 'BSL',
          price: c.high,
          formedAt: c.time,
          direction: 'HIGH',
          status: 'IDENTIFIED',
          label: 'BSL (Swing H)',
        });
      }

      // Swing Low = sell-side liquidity.
      if (
        c.low < prev1.low &&
        c.low < prev2.low &&
        c.low < next1.low &&
        c.low < next2.low
      ) {
        levels.push({
          id: `liq_ssl_${c.time}`,
          type: 'SSL',
          price: c.low,
          formedAt: c.time,
          direction: 'LOW',
          status: 'IDENTIFIED',
          label: 'SSL (Swing L)',
        });
      }
    }

    // 3. Evaluate each level independently.
    //
    // IMPORTANT:
    // Do not use the global `startIndex` here.
    // A session level may have been formed before the last 500 candles
    // but can still be swept inside the currently revealed data.
    for (const level of levels) {
      let sweepIndex = -1;

      // A sweep must occur AFTER the level was formed.
      for (let i = 0; i < revealedCandles.length; i++) {
        const c = revealedCandles[i];

        if (c.time <= level.formedAt) continue;

        if (level.direction === 'HIGH') {
          if (c.high > level.price) {
            level.status = 'SWEPT';
            level.sweptAt = c.time;
            level.sweptPrice = c.high;
            sweepIndex = i;
            break;
          }
        } else {
          if (c.low < level.price) {
            level.status = 'SWEPT';
            level.sweptAt = c.time;
            level.sweptPrice = c.low;
            sweepIndex = i;
            break;
          }
        }
      }

      // No sweep means there cannot be a reclaim.
      if (sweepIndex === -1) continue;

      // 4. Reclaim must occur strictly AFTER the sweep candle.
      for (let i = sweepIndex + 1; i < revealedCandles.length; i++) {
        const c = revealedCandles[i];

        if (level.direction === 'HIGH') {
          // Price swept above BSL and subsequently closed back below it.
          if (c.close < level.price) {
            level.status = 'RECLAIMED';
            level.reclaimedAt = c.time;
            break;
          }
        } else {
          // Price swept below SSL and subsequently closed back above it.
          if (c.close > level.price) {
            level.status = 'RECLAIMED';
            level.reclaimedAt = c.time;
            break;
          }
        }
      }
    }

    return levels;
  }
}
