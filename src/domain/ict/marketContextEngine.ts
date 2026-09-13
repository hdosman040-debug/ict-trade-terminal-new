import { MarketCandle, MarketContext, PremiumDiscountZone } from '../../types/domain';
import { getNYTimeDetails, getSessionFromTimestamp, getTradingWindowStatus } from '../timezone/nyTimezone';

export interface ContextConfig {
  swingLookback: number;
}

export class MarketContextEngine {
  /**
   * Calculates ICT market context using ONLY revealed candles (indices 0..N).
   * ZERO LOOKAHEAD GUARANTEE.
   */
  public static calculateContext(
    revealedCandles: MarketCandle[],
    timeframe: string,
    sessionLevels?: {
      pdh?: number;
      pdl?: number;
      asiaHigh?: number;
      asiaLow?: number;
      londonHigh?: number;
      londonLow?: number;
    }
  ): MarketContext {
    if (!revealedCandles || revealedCandles.length === 0) {
      return {
        timeframe,
        htfBias: 'NEUTRAL',
        structure: 'RANGING',
        swingHigh: 0,
        swingLow: 0,
        equilibriumPrice: 0,
        currentZone: 'EQUILIBRIUM',
        currentSession: 'OFF_HOURS',
        tradingWindow: 'BEFORE_WINDOW',
        currentPrice: 0,
      };
    }

    const currentCandle = revealedCandles[revealedCandles.length - 1];
    const currentPrice = currentCandle.close;
    const currentSession = getSessionFromTimestamp(currentCandle.time);
    const tradingWindow = getTradingWindowStatus(currentCandle.time);

    // Calculate recent dealing range / swing high and swing low from the last 20 to 50 revealed candles
    const lookback = Math.min(revealedCandles.length, 40);
    const recentCandles = revealedCandles.slice(revealedCandles.length - lookback);

    let swingHigh = -Infinity;
    let swingLow = Infinity;

    for (const c of recentCandles) {
      if (c.high > swingHigh) swingHigh = c.high;
      if (c.low < swingLow) swingLow = c.low;
    }

    if (swingHigh === -Infinity) swingHigh = currentPrice;
    if (swingLow === Infinity) swingLow = currentPrice;

    const equilibriumPrice = (swingHigh + swingLow) / 2;

    // Premium vs Discount calculation
    let currentZone: PremiumDiscountZone = 'EQUILIBRIUM';
    const range = swingHigh - swingLow;
    if (range > 0) {
      const position = (currentPrice - swingLow) / range;
      if (position > 0.52) {
        currentZone = 'PREMIUM';
      } else if (position < 0.48) {
        currentZone = 'DISCOUNT';
      }
    }

    // Determine bias and structure from swing progression in revealed data
    let htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let structure: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';

    if (revealedCandles.length >= 10) {
      const older10 = revealedCandles.slice(-10, -5);
      const recent5 = revealedCandles.slice(-5);

      const olderAvg = older10.reduce((s, c) => s + c.close, 0) / older10.length;
      const recentAvg = recent5.reduce((s, c) => s + c.close, 0) / recent5.length;

      if (recentAvg > olderAvg) {
        htfBias = 'BULLISH';
        structure = 'BULLISH';
      } else if (recentAvg < olderAvg) {
        htfBias = 'BEARISH';
        structure = 'BEARISH';
      }
    }

    // Extract session benchmark levels dynamically from revealed candles (ZERO LOOKAHEAD)
    let pdh = sessionLevels?.pdh;
    let pdl = sessionLevels?.pdl;
    let asiaHigh = sessionLevels?.asiaHigh;
    let asiaLow = sessionLevels?.asiaLow;
    let londonHigh = sessionLevels?.londonHigh;
    let londonLow = sessionLevels?.londonLow;

    // Dynamically calculate from revealed candles if not provided
    let aHigh = -Infinity;
    let aLow = Infinity;
    let lHigh = -Infinity;
    let lLow = Infinity;

    for (const c of revealedCandles) {
      const sess = getSessionFromTimestamp(c.time);
      if (sess === 'ASIA') {
        if (c.high > aHigh) aHigh = c.high;
        if (c.low < aLow) aLow = c.low;
      } else if (sess === 'LONDON') {
        if (c.high > lHigh) lHigh = c.high;
        if (c.low < lLow) lLow = c.low;
      }
    }

    if (!asiaHigh && aHigh > -Infinity) asiaHigh = aHigh;
    if (!asiaLow && aLow < Infinity) asiaLow = aLow;
    if (!londonHigh && lHigh > -Infinity) londonHigh = lHigh;
    if (!londonLow && lLow < Infinity) londonLow = lLow;

    return {
      timeframe,
      htfBias,
      structure,
      swingHigh: Math.round(swingHigh * 100) / 100,
      swingLow: Math.round(swingLow * 100) / 100,
      equilibriumPrice: Math.round(equilibriumPrice * 100) / 100,
      currentZone,
      pdh,
      pdl,
      asiaHigh,
      asiaLow,
      londonHigh,
      londonLow,
      currentSession,
      tradingWindow,
      currentPrice,
    };
  }
}
