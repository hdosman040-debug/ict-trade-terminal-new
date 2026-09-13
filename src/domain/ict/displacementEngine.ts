import { DisplacementInfo, MarketCandle } from '../../types/domain';

export class DisplacementEngine {
  /**
   * Evaluates displacement on revealed candles (0..N).
   * Configurable multiplier: body must exceed 1.4x of average recent candle body,
   * with close near the extreme of the candle (closing in top/bottom 25% of range).
   */
  public static evaluateDisplacement(
    revealedCandles: MarketCandle[],
    lookback = 10,
    multiplier = 1.4
  ): DisplacementInfo {
    if (!revealedCandles || revealedCandles.length < 3) {
      return { confirmed: false };
    }

    const n = revealedCandles.length;
    // Check the last 1-3 candles for displacement
    const recentCandle = revealedCandles[n - 1];

    // Compute average body size of previous 10 candles
    const sampleSize = Math.min(lookback, n - 1);
    let totalBody = 0;
    for (let i = n - 1 - sampleSize; i < n - 1; i++) {
      totalBody += Math.abs(revealedCandles[i].close - revealedCandles[i].open);
    }
    const avgBodySize = totalBody / sampleSize || 1;

    // Check last 2 candles
    for (let idx = Math.max(1, n - 2); idx < n; idx++) {
      const c = revealedCandles[idx];
      const body = Math.abs(c.close - c.open);
      const range = c.high - c.low;
      const relativeStrength = body / avgBodySize;

      const isBullish = c.close > c.open;
      const isBearish = c.close < c.open;

      // Close near extreme: top 25% for bullish, bottom 25% for bearish
      const closePosition = range > 0 ? (c.close - c.low) / range : 0.5;
      const strongClose = isBullish ? closePosition >= 0.7 : closePosition <= 0.3;

      if (relativeStrength >= multiplier && strongClose) {
        return {
          confirmed: true,
          candleTime: c.time,
          bodySize: body,
          avgBodySize,
          direction: isBullish ? 'bullish' : 'bearish',
          relativeStrength: Math.round(relativeStrength * 10) / 10,
        };
      }
    }

    return {
      confirmed: false,
      avgBodySize,
    };
  }
}
