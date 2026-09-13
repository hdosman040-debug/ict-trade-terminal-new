// Analytics domain types
import { Instrument, EntryModel, LiquidityType, SessionName } from './domain';

export interface PerformanceMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  openTrades: number;
  winRate: number; // in % (0 - 100)
  lossRate: number;
  averageWinR: number;
  averageLossR: number;
  expectancyR: number; // (WinRate * AvgWin) + (LossRate * AvgLoss) where Loss is negative
  profitFactor: number;
  totalR: number;
  netPnl: number;
  maxDrawdownR: number;
  maxDrawdownPercent: number;
  averageR: number;
  largestWinR: number;
  largestLossR: number;
  averageMfeR: number;
  averageMaeR: number;
  averageTimeToCloseMinutes: number;
}

export interface SetupSliceAnalytics {
  name: string;
  count: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
  avgWinR: number;
  avgLossR: number;
}

export interface RuleFollowingComparison {
  ruleFollowing: {
    trades: number;
    winRate: number;
    totalR: number;
    expectancyR: number;
    profitFactor: number;
  };
  ruleBreaking: {
    trades: number;
    winRate: number;
    totalR: number;
    expectancyR: number;
    profitFactor: number;
  };
  edgeDeltaR: number; // ruleFollowing.expectancy - ruleBreaking.expectancy
}

export interface TradingEdgeSynthesis {
  hasSufficientSample: boolean;
  sampleSize: number;
  minimumRecommendedSample: number; // e.g. 30
  bestInstrument?: Instrument;
  bestSession?: SessionName;
  bestSetupDescription?: string;
  bestDayOfWeek?: string;
  bestTimeWindow?: string;
  bestEntryModel?: EntryModel;
  bestLiquidityType?: LiquidityType;
  overallExpectancyR: number;
  ruleFollowingExpectancyR: number;
  ruleBreakingExpectancyR: number;
  edgeSummaryText: string;
}

export interface SessionBucketPerformance {
  timeBucket: string; // e.g. '09:45–10:15'
  trades: number;
  totalR: number;
  winRate: number;
  expectancyR: number;
}

export interface DayOfWeekPerformance {
  day: string; // 'Monday', 'Tuesday', etc.
  trades: number;
  winRate: number;
  totalR: number;
  expectancyR: number;
}
