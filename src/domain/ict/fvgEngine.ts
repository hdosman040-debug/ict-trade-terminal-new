import { FairValueGap, MarketCandle } from '../../types/domain';

export class FVGEngine {
  /**
   * Identifies and tracks Fair Value Gaps using ONLY revealed candles (0..N).
   * ZERO LOOKAHEAD GUARANTEE.
   */
  public static detectFVGs(revealedCandles: MarketCandle[], timeframe = 'M5'): FairValueGap[] {
    if (!revealedCandles || revealedCandles.length < 3) return [];

    const gaps: FairValueGap[] = [];
    const scanStart = Math.max(2, revealedCandles.length - 300);

    // 3-candle sequence: Candle 1 (idx-2), Candle 2 (idx-1), Candle 3 (idx)
    for (let i = scanStart; i < revealedCandles.length; i++) {
      const c1 = revealedCandles[i - 2];
      const c2 = revealedCandles[i - 1]; // Displacement candle
      const c3 = revealedCandles[i];

      // Bullish FVG: c1.high < c3.low with bullish displacement on c2
      if (c3.low > c1.high && c2.close > c2.open) {
        gaps.push({
          id: `fvg_bull_${c2.time}`,
          direction: 'bullish',
          bottom: c1.high,
          top: c3.low,
          formedAt: c2.time,
          formedIndex: i - 1,
          timeframe,
          mitigated: false,
          candle1High: c1.high,
          candle3Low: c3.low,
        });
      }

      // Bearish FVG: c1.low > c3.high with bearish displacement on c2
      if (c3.high < c1.low && c2.close < c2.open) {
        gaps.push({
          id: `fvg_bear_${c2.time}`,
          direction: 'bearish',
          top: c1.low,
          bottom: c3.high,
          formedAt: c2.time,
          formedIndex: i - 1,
          timeframe,
          mitigated: false,
          candle1High: c3.high,
          candle3Low: c1.low,
        });
      }
    }

    // Now evaluate mitigation status using subsequent revealed candles
    for (const fvg of gaps) {
      for (let j = fvg.formedIndex + 2; j < revealedCandles.length; j++) {
        const testCandle = revealedCandles[j];
        if (fvg.direction === 'bullish') {
          // If price retraces down into the gap (testCandle.low <= fvg.top)
          if (testCandle.low <= fvg.top) {
            fvg.mitigated = true;
            fvg.mitigationTime = testCandle.time;
          }
        } else {
          // If price retraces up into the gap (testCandle.high >= fvg.bottom)
          if (testCandle.high >= fvg.bottom) {
            fvg.mitigated = true;
            fvg.mitigationTime = testCandle.time;
          }
        }
      }
    }

    return gaps;
  }
}
