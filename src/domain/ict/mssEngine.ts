import { MarketCandle, MarketStructureShift } from '../../types/domain';

export class MSSEngine {
  /**
   * Detects Market Structure Shift (MSS) using ONLY revealed candles (0..N).
   * MSS is the break of the key opposing minor/intermediate swing point that generated
   * the run into the liquidity sweep. It confirms a structural shift in order flow.
   */
  public static detectMSS(
    revealedCandles: MarketCandle[],
    timeframe: string,
    lastSweepTime?: number,
    sweepDirection?: 'HIGH' | 'LOW'
  ): MarketStructureShift | null {
    if (!revealedCandles || revealedCandles.length < 5) return null;

    const n = revealedCandles.length;

    // Find the opposing swing pivot formed before the sweep
    if (sweepDirection === 'LOW') {
      // Bullish MSS: Price swept SSL (lows), now breaking above the most recent swing high
      let keySwingHighPrice = -Infinity;
      let keySwingHighTime = 0;

      // Look back through candles prior to or around the sweep
      const searchStart = Math.max(0, n - 25);
      for (let i = searchStart; i < n - 2; i++) {
        const c = revealedCandles[i];
        const prev = revealedCandles[i - 1];
        const next = revealedCandles[i + 1];
        if (prev && next && c.high > prev.high && c.high > next.high) {
          if (c.high > keySwingHighPrice) {
            keySwingHighPrice = c.high;
            keySwingHighTime = c.time;
          }
        }
      }

      // Check if recent candles closed above this key opposing swing high
      if (keySwingHighPrice > -Infinity) {
        for (let i = Math.max(0, n - 6); i < n; i++) {
          const c = revealedCandles[i];
          if (c.close > keySwingHighPrice && (!lastSweepTime || c.time >= lastSweepTime)) {
            return {
              id: `mss_bull_${c.time}`,
              direction: 'bullish',
              brokenSwingPrice: keySwingHighPrice,
              brokenSwingTime: keySwingHighTime,
              confirmedTime: c.time,
              displacementCandleTime: c.time,
              timeframe,
            };
          }
        }
      }
    } else if (sweepDirection === 'HIGH') {
      // Bearish MSS: Price swept BSL (highs), now breaking below the most recent swing low
      let keySwingLowPrice = Infinity;
      let keySwingLowTime = 0;

      const searchStart = Math.max(0, n - 25);
      for (let i = searchStart; i < n - 2; i++) {
        const c = revealedCandles[i];
        const prev = revealedCandles[i - 1];
        const next = revealedCandles[i + 1];
        if (prev && next && c.low < prev.low && c.low < next.low) {
          if (c.low < keySwingLowPrice) {
            keySwingLowPrice = c.low;
            keySwingLowTime = c.time;
          }
        }
      }

      if (keySwingLowPrice < Infinity) {
        for (let i = Math.max(0, n - 6); i < n; i++) {
          const c = revealedCandles[i];
          if (c.close < keySwingLowPrice && (!lastSweepTime || c.time >= lastSweepTime)) {
            return {
              id: `mss_bear_${c.time}`,
              direction: 'bearish',
              brokenSwingPrice: keySwingLowPrice,
              brokenSwingTime: keySwingLowTime,
              confirmedTime: c.time,
              displacementCandleTime: c.time,
              timeframe,
            };
          }
        }
      }
    }

    return null;
  }
}
