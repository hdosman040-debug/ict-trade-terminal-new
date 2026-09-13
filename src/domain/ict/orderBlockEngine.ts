import { MarketCandle, OrderBlock } from '../../types/domain';

export class OrderBlockEngine {
  /**
   * Detects Order Blocks using ONLY revealed candles (0..N).
   * ZERO LOOKAHEAD GUARANTEE.
   *
   * Bullish OB: The down-close candle (close < open) immediately preceding an aggressive displacement up.
   * Bearish OB: The up-close candle (close > open) immediately preceding an aggressive displacement down.
   */
  public static detectOrderBlocks(revealedCandles: MarketCandle[], timeframe = 'M5'): OrderBlock[] {
    if (!revealedCandles || revealedCandles.length < 4) return [];

    const blocks: OrderBlock[] = [];
    const scanStart = Math.max(1, revealedCandles.length - 300);

    for (let i = scanStart; i < revealedCandles.length - 1; i++) {
      const obCandle = revealedCandles[i];
      const nextCandle = revealedCandles[i + 1];

      const nextBody = Math.abs(nextCandle.close - nextCandle.open);
      const obBody = Math.abs(obCandle.close - obCandle.open) || 1;

      // Bullish OB check
      if (obCandle.close < obCandle.open && nextCandle.close > nextCandle.open && nextBody >= 1.5 * obBody) {
        blocks.push({
          id: `ob_bull_${obCandle.time}`,
          direction: 'bullish',
          high: obCandle.high,
          low: obCandle.low,
          formedAt: obCandle.time,
          formedIndex: i,
          timeframe,
          mitigated: false,
        });
      }

      // Bearish OB check
      if (obCandle.close > obCandle.open && nextCandle.close < nextCandle.open && nextBody >= 1.5 * obBody) {
        blocks.push({
          id: `ob_bear_${obCandle.time}`,
          direction: 'bearish',
          high: obCandle.high,
          low: obCandle.low,
          formedAt: obCandle.time,
          formedIndex: i,
          timeframe,
          mitigated: false,
        });
      }
    }

    // Check mitigation by subsequent revealed candles
    for (const ob of blocks) {
      for (let j = ob.formedIndex + 2; j < revealedCandles.length; j++) {
        const testCandle = revealedCandles[j];
        if (ob.direction === 'bullish') {
          if (testCandle.low <= ob.high) {
            ob.mitigated = true;
            ob.mitigationTime = testCandle.time;
          }
        } else {
          if (testCandle.high >= ob.low) {
            ob.mitigated = true;
            ob.mitigationTime = testCandle.time;
          }
        }
      }
    }

    return blocks;
  }
}
