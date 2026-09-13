import { Instrument, MarketCandle } from '../../types/domain';
import { getNYTimeDetails } from '../timezone/nyTimezone';

export interface HistoricalSessionConfig {
  instrument: Instrument;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  name: string;
  pdh: number;
  pdl: number;
  asiaHigh: number;
  asiaLow: number;
  londonHigh: number;
  londonLow: number;
  setupSummary: string;
}

export const HISTORICAL_SESSIONS: HistoricalSessionConfig[] = [
  {
    instrument: 'US30',
    date: '2024-05-10',
    dayOfWeek: 'Friday',
    name: 'US30 - Friday NY AM SSL Sweep & Bullish Reversal',
    pdh: 39550,
    pdl: 39280,
    asiaHigh: 39430,
    asiaLow: 39360,
    londonHigh: 39480,
    londonLow: 39330,
    setupSummary: 'SSL Sweep (London Low 39,330) -> Reclaim -> M5 Displacement -> MSS -> FVG Retracement -> +2R Win',
  },
  {
    instrument: 'US30',
    date: '2024-05-08',
    dayOfWeek: 'Wednesday',
    name: 'US30 - Wednesday NY AM BSL Sweep & Bearish Shift',
    pdh: 39220,
    pdl: 38850,
    asiaHigh: 39140,
    asiaLow: 39010,
    londonHigh: 39190,
    londonLow: 39040,
    setupSummary: 'BSL Sweep (PDH 39,220) -> Reclaim -> Bearish Displacement -> MSS -> FVG Tap -> +2.5R Win',
  },
  {
    instrument: 'NAS100',
    date: '2024-05-14',
    dayOfWeek: 'Tuesday',
    name: 'NAS100 - Tuesday NY AM BSL Run & Bearish MSS',
    pdh: 18360,
    pdl: 18180,
    asiaHigh: 18310,
    asiaLow: 18240,
    londonHigh: 18340,
    londonLow: 18260,
    setupSummary: 'BSL Sweep (18,360) -> Bearish Displacement -> MSS at 18,315 -> FVG Entry -> Target SSL 18,220',
  },
  {
    instrument: 'NAS100',
    date: '2024-05-16',
    dayOfWeek: 'Thursday',
    name: 'NAS100 - Thursday NY AM Asia Low Sweep & Continuation',
    pdh: 18550,
    pdl: 18340,
    asiaHigh: 18490,
    asiaLow: 18410,
    londonHigh: 18510,
    londonLow: 18430,
    setupSummary: 'Asia Low Sweep (18,410) -> Bullish Displacement -> FVG Retracement -> Run to PDH 18,550',
  },
  {
    instrument: 'XAUUSD',
    date: '2024-05-15',
    dayOfWeek: 'Wednesday',
    name: 'XAUUSD - Wednesday NY AM London Low Sweep Reversal',
    pdh: 2362.0,
    pdl: 2338.0,
    asiaHigh: 2355.0,
    asiaLow: 2346.0,
    londonHigh: 2358.5,
    londonLow: 2341.0,
    setupSummary: 'London Low Sweep (2,341.00 down to 2,338.20) -> Strong Bullish Displacement -> MSS -> FVG Tap -> Run to 2,360.00',
  },
];

/**
 * Generates high-fidelity 5-minute (M5) and 1-minute (M1) historical candles for a session.
 * The candle progression is 100% deterministic and embeds realistic ICT microstructure:
 * - Asia consolidation
 * - London breakout and liquidity build
 * - Pre-NY pullback
 * - NY AM Open (09:30) volatility injection
 * - Liquidity Sweep (around 09:45-10:00)
 * - Reclaim & Displacement
 * - Market Structure Shift (MSS)
 * - Fair Value Gap (FVG) / Order Block formation
 * - Retracement into the FVG zone
 * - Continuation toward opposing liquidity
 */
export function generateSessionCandles(
  config: HistoricalSessionConfig,
  timeframe: 'M5' | 'M1' | 'M15' = 'M5'
): MarketCandle[] {
  const [year, month, day] = config.date.split('-').map(Number);
  // Base time at 00:00 NY time
  // Using standard offset for EDT (UTC-4 in May)
  const baseDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0)); // 00:00 NY = 04:00 UTC
  const baseTime = Math.floor(baseDate.getTime() / 1000);

  const stepMinutes = timeframe === 'M1' ? 1 : timeframe === 'M15' ? 15 : 5;
  const totalSteps = Math.floor((24 * 60) / stepMinutes);

  const candles: MarketCandle[] = [];

  // Deterministic spline anchor points based on ICT profile
  const isBullishSetup = config.setupSummary.includes('Bullish') || config.setupSummary.includes('SSL');

  let currentPrice = isBullishSetup
    ? (config.asiaHigh + config.asiaLow) / 2
    : (config.asiaHigh + config.asiaLow) / 2;

  // Let's create key target trajectory points across the day (in minutes from midnight NY)
  // 00:00 (0m): Initial Asia mid
  // 03:00 (180m): London Low / High test
  // 05:00 (300m): London expansion
  // 08:30 (510m): Pre-NY news/opening
  // 09:30 (570m): NY Open Judas swing start
  // 09:50 (590m): Liquidity Sweep extreme (SSL or BSL)
  // 10:00 (600m): Reclaim & start of displacement
  // 10:10 (610m): Displacement peak & MSS
  // 10:20 (620m): Retracement into FVG
  // 10:35 (635m): Continuation expansion
  // 11:30 (690m): Target reached (opposing liquidity)
  // 12:00 (720m): NY AM Close consolidation

  const getTargetPrice = (minutes: number): { target: number; volatility: number } => {
    const scale = config.instrument === 'US30' ? 1 : config.instrument === 'NAS100' ? 0.3 : 0.05;

    if (minutes < 180) {
      // Asia session range
      const ratio = minutes / 180;
      return {
        target: config.asiaLow + (config.asiaHigh - config.asiaLow) * (0.4 + 0.2 * Math.sin(ratio * Math.PI * 4)),
        volatility: 12 * scale,
      };
    } else if (minutes < 360) {
      // London session
      if (isBullishSetup) {
        // London drifts down to create London Low near 39330 / 2341
        return { target: config.londonLow + 20 * scale * Math.cos((minutes - 180) / 40), volatility: 18 * scale };
      } else {
        // London drifts up to create London High
        return { target: config.londonHigh - 15 * scale * Math.cos((minutes - 180) / 40), volatility: 18 * scale };
      }
    } else if (minutes < 570) {
      // Pre-NY consolidation
      const mid = (config.asiaHigh + config.londonLow) / 2;
      return { target: mid + 10 * scale * Math.sin(minutes / 20), volatility: 15 * scale };
    } else if (minutes <= 590) {
      // 09:30 to 09:50 - The Sweep (Judas Run)
      const progress = (minutes - 570) / 20; // 0 to 1
      if (isBullishSetup) {
        // Run stops BELOW London Low / Asia Low to sweep SSL
        const sweepLow = config.londonLow - 30 * scale;
        return { target: (config.londonLow + 20 * scale) * (1 - progress) + sweepLow * progress, volatility: 25 * scale };
      } else {
        // Run stops ABOVE London High / PDH to sweep BSL
        const sweepHigh = config.londonHigh + 25 * scale;
        return { target: (config.londonHigh - 20 * scale) * (1 - progress) + sweepHigh * progress, volatility: 25 * scale };
      }
    } else if (minutes <= 600) {
      // 09:50 to 10:00 - Reclaim level
      const progress = (minutes - 590) / 10;
      if (isBullishSetup) {
        const sweepLow = config.londonLow - 30 * scale;
        const reclaimPrice = config.londonLow + 25 * scale;
        return { target: sweepLow * (1 - progress) + reclaimPrice * progress, volatility: 30 * scale };
      } else {
        const sweepHigh = config.londonHigh + 25 * scale;
        const reclaimPrice = config.londonHigh - 25 * scale;
        return { target: sweepHigh * (1 - progress) + reclaimPrice * progress, volatility: 30 * scale };
      }
    } else if (minutes <= 615) {
      // 10:00 to 10:15 - Strong Displacement & MSS Break
      const progress = (minutes - 600) / 15;
      if (isBullishSetup) {
        const start = config.londonLow + 25 * scale;
        const mssTarget = config.asiaHigh + 20 * scale; // breaks previous swing
        return { target: start * (1 - progress) + mssTarget * progress, volatility: 35 * scale };
      } else {
        const start = config.londonHigh - 25 * scale;
        const mssTarget = config.asiaLow - 20 * scale;
        return { target: start * (1 - progress) + mssTarget * progress, volatility: 35 * scale };
      }
    } else if (minutes <= 630) {
      // 10:15 to 10:30 - Retracement into Fair Value Gap (Entry Window!)
      const progress = (minutes - 615) / 15;
      if (isBullishSetup) {
        const peak = config.asiaHigh + 20 * scale;
        const fvgTouch = (config.londonLow + config.asiaHigh) / 2; // retraces ~50% into FVG
        return { target: peak * (1 - progress) + fvgTouch * progress, volatility: 15 * scale };
      } else {
        const trough = config.asiaLow - 20 * scale;
        const fvgTouch = (config.londonHigh + config.asiaLow) / 2;
        return { target: trough * (1 - progress) + fvgTouch * progress, volatility: 15 * scale };
      }
    } else if (minutes <= 700) {
      // 10:30 to 11:40 - Expansion run towards target
      const progress = (minutes - 630) / 70;
      if (isBullishSetup) {
        const fvgEntry = (config.londonLow + config.asiaHigh) / 2;
        const finalTarget = config.pdh;
        return { target: fvgEntry * (1 - progress) + finalTarget * progress, volatility: 25 * scale };
      } else {
        const fvgEntry = (config.londonHigh + config.asiaLow) / 2;
        const finalTarget = config.pdl;
        return { target: fvgEntry * (1 - progress) + finalTarget * progress, volatility: 25 * scale };
      }
    } else {
      // 11:40 to 16:00 - Consolidation at target
      const target = isBullishSetup ? config.pdh : config.pdl;
      return { target: target + 10 * scale * Math.sin(minutes / 30), volatility: 12 * scale };
    }
  };

  // Build deterministic pseudorandom candles based on target price curves
  let seed = year * 10000 + month * 100 + day;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < totalSteps; i++) {
    const minutes = i * stepMinutes;
    const time = baseTime + minutes * 60;

    const { target, volatility } = getTargetPrice(minutes);
    const stepVolatility = volatility * Math.sqrt(stepMinutes / 5);

    // Realistic open from previous close
    const open = i === 0 ? target : candles[i - 1].close;

    // Movement towards target plus noise
    const pull = (target - open) * 0.45;
    const noise = (pseudoRandom() - 0.5) * stepVolatility * 1.5;
    const close = open + pull + noise;

    const highExcursion = pseudoRandom() * stepVolatility * 1.2;
    const lowExcursion = pseudoRandom() * stepVolatility * 1.2;

    const high = Math.max(open, close) + highExcursion;
    const low = Math.min(open, close) - lowExcursion;

    const volume = Math.floor(200 + pseudoRandom() * 800 + (minutes >= 570 && minutes <= 720 ? 1500 : 0));

    // Rounding based on instrument
    const digits = config.instrument === 'US30' ? 0 : 2;
    const factor = Math.pow(10, digits);

    const candle: MarketCandle = {
      time,
      open: Math.round(open * factor) / factor,
      high: Math.round(high * factor) / factor,
      low: Math.round(low * factor) / factor,
      close: Math.round(close * factor) / factor,
      volume,
    };

    candles.push(candle);
  }

  return candles;
}
