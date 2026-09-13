// ICT TRADE TERMINAL - CANONICAL DOMAIN MODEL
// Centralized domain types across Replay, Context, Setup, Risk, Trade, Journal, Analytics

export type Instrument = 'US30' | 'NAS100' | 'XAUUSD';

export type HTFTimeframe = 'M30' | 'M15';
export type ExecutionTimeframe = 'M5';
export type ConfirmationTimeframe = 'M1';
export type Timeframe = HTFTimeframe | ExecutionTimeframe | ConfirmationTimeframe | 'H1' | 'D1';

export type LiquidityType =
  | 'BSL'
  | 'SSL'
  | 'PDH'
  | 'PDL'
  | 'AsiaHigh'
  | 'AsiaLow'
  | 'LondonHigh'
  | 'LondonLow';

export type EntryModel = 'FVG' | 'ORDER_BLOCK';

export type TradeOutcome = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN' | 'INVALID';

export type TradeDirection = 'BUY' | 'SELL';

export type SessionName = 'ASIA' | 'LONDON' | 'NY_AM' | 'NY_PM' | 'OFF_HOURS';

export type TradingWindowStatus = 'BEFORE_WINDOW' | 'ACTIVE_WINDOW' | 'AFTER_WINDOW';

export type PremiumDiscountZone = 'PREMIUM' | 'EQUILIBRIUM' | 'DISCOUNT';

export type ReplayMode = 'normal' | 'blind' | 'trade';

export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 5 | 10;

export interface MarketCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  // Pre-calculated or metadata
  isoTime?: string;
  nyTimeString?: string;
}

export interface InstrumentSpec {
  symbol: Instrument;
  name: string;
  pipOrPointValue: number; // e.g. 1 point = $1 (US30), 1 point = $20 or $1 (NAS100), $1 = 1 point / $100 per lot (XAUUSD)
  tickSize: number; // Minimum price step
  digits: number; // Decimal places (0 for US30, 2 for NAS100, 2 for XAUUSD)
  defaultStopDistance: number;
  contractSize: number; // Contract unit per lot
}

export interface LiquidityLevel {
  id: string;
  type: LiquidityType;
  price: number;
  formedAt: number; // timestamp
  direction: 'HIGH' | 'LOW'; // BSL / PDH is HIGH, SSL / PDL is LOW
  status: 'IDENTIFIED' | 'SWEPT' | 'RECLAIMED' | 'INVALIDATED';
  sweptAt?: number;
  sweptPrice?: number;
  reclaimedAt?: number;
  label: string;
}

export interface FairValueGap {
  id: string;
  direction: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  formedAt: number; // candle time
  formedIndex: number;
  timeframe: string;
  mitigated: boolean;
  mitigationTime?: number;
  candle1High: number;
  candle3Low: number;
}

export interface OrderBlock {
  id: string;
  direction: 'bullish' | 'bearish'; // bullish OB is the down-candle before displacement up
  high: number;
  low: number;
  formedAt: number;
  formedIndex: number;
  timeframe: string;
  mitigated: boolean;
  mitigationTime?: number;
}

export interface MarketStructureShift {
  id: string;
  direction: 'bullish' | 'bearish';
  brokenSwingPrice: number;
  brokenSwingTime: number;
  confirmedTime: number;
  displacementCandleTime: number;
  timeframe: string;
}

export interface DisplacementInfo {
  confirmed: boolean;
  candleTime?: number;
  bodySize?: number;
  avgBodySize?: number;
  direction?: 'bullish' | 'bearish';
  relativeStrength?: number; // ratio vs average
}

export interface SetupState {
  // Manual trader confirmations
  htfContext: boolean;
  liquidityIdentified: boolean;
  liquiditySwept: boolean;
  reclaimConfirmed: boolean;
  displacementConfirmed: boolean;
  mssConfirmed: boolean;
  retracementConfirmed: boolean;
  entryZoneTouched: boolean;
  entryModelSelected: boolean;

  // Manual ICT selections
  liquidityType?: LiquidityType;
  sweepPrice?: number;
  entryModel?: EntryModel;

  // Legacy automatic-detector fields.
  // Kept temporarily for compatibility while the detector layer is removed.
  targetLiquidity?: LiquidityLevel;
  activeFVG?: FairValueGap;
  activeOrderBlock?: OrderBlock;
  activeMSS?: MarketStructureShift;
  activeDisplacement?: DisplacementInfo;

  isActionable: boolean;
  missingConditions: string[];
}

export interface QualityScore {
  score: number;
  maxScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  details: {
    name: string;
    passed: boolean;
    weight: number;
  }[];
}

export interface MarketContext {
  timeframe: string;
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  structure: 'BULLISH' | 'BEARISH' | 'RANGING';
  swingHigh: number;
  swingLow: number;
  equilibriumPrice: number;
  currentZone: PremiumDiscountZone;
  pdh?: number;
  pdl?: number;
  asiaHigh?: number;
  asiaLow?: number;
  londonHigh?: number;
  londonLow?: number;
  currentSession: SessionName;
  tradingWindow: TradingWindowStatus;
  currentPrice: number;
}

export interface RiskSettings {
  accountBalance: number;
  riskPercent: number; // e.g. 1.0 (%)
  maxTradesPerDay: number;
  maxDailyRiskPercent: number; // e.g. 3.0 (%)
  maxConsecutiveLosses: number;
  minRiskReward: number; // e.g. 1.5
  nyWindowStart: string; // '09:45'
  nyWindowEnd: string; // '12:00'
}

export interface RiskDecision {
  permitted: boolean;
  reasons: string[];
  calculatedPositionSize: number; // in lots
  riskAmount: number; // in currency ($)
  potentialReward: number; // in currency ($)
  rrRatio: number;
  riskPoints: number;
  rewardPoints: number;
}

export interface DailyRiskState {
  nyDate: string;
  tradesToday: number;
  riskUsedToday: number; // in $
  riskPercentUsedToday: number;
  realizedPnlToday: number;
  realizedRToday: number;
  consecutiveLossesToday: number;
  isTradingPermitted: boolean;
}

export type EmotionalState =
  | 'Calm'
  | 'Focused'
  | 'FOMO'
  | 'Fear'
  | 'Revenge'
  | 'Boredom'
  | 'Confident'
  | 'Uncertain';

export interface TradePsychology {
  preTradeState: EmotionalState;
  followedPlan: boolean;
  wasImpulsive: boolean;
  wouldTakeAgain: boolean;
  notes?: string;
}

export interface ChartAnnotation {
  id: string;
  type: 'horizontal_line' | 'fvg_box' | 'ob_box' | 'arrow' | 'label' | 'marker';
  price?: number;
  priceEnd?: number;
  time?: number;
  timeEnd?: number;
  label?: string;
  color?: string;
}

export interface TradeScreenshot {
  id: string;
  tradeId: string;
  dataUrl: string;
  timestamp: number;
  replayIndex: number;
  annotationsCount: number;
}

export interface Trade {
  id: string;
  tradeNumber: number;
  instrument: Instrument;
  date: string; // NY Date (YYYY-MM-DD)
  timestamp: number;
  session: SessionName;
  dayOfWeek: string;
  direction: TradeDirection;

  marketContext: {
    htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    structure: 'BULLISH' | 'BEARISH' | 'RANGING';
    premiumDiscount: PremiumDiscountZone;
    pdh?: number;
    pdl?: number;
    sessionLiquidity?: {
      asiaHigh?: number;
      asiaLow?: number;
      londonHigh?: number;
      londonLow?: number;
    };
  };

  setup: {
    liquidityType: LiquidityType;
    liquiditySwept: boolean;
    sweepPrice: number;
    reclaimConfirmed: boolean;
    displacementConfirmed: boolean;
    mssConfirmed: boolean;
    retracementConfirmed: boolean;
    entryZoneTouched: boolean;
    entryModel: EntryModel;
    setupSequenceCompleted: boolean;
  };

  execution: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskAmount: number;
    riskPercent: number;
    rr: number;
    positionSize: number; // lots
    entryReplayIndex: number;
    entryTimestamp: number;
  };

  result?: {
    outcome: TradeOutcome;
    exitPrice: number;
    exitTimestamp: number;
    exitReplayIndex: number;
    resultR: number; // e.g. +2.0 or -1.0
    pnl: number; // in $
    mfe: number; // Max favorable excursion in price points
    mfeR: number; // Max favorable excursion in R
    mae: number; // Max adverse excursion in price points
    maeR: number; // Max adverse excursion in R
    timeToCloseMinutes: number;
    candlesToClose: number;
  };

  quality: {
    score: number;
    maxScore: number;
    grade: string;
    ruleFollowing: boolean; // 100% rules met vs rule-broken
    missingRules?: string[];
  };

  confidence: 1 | 2 | 3 | 4 | 5;
  psychology: TradePsychology;
  notes: {
    whyTaken: string;
    whatHappened?: string;
    whatLearned?: string;
    general?: string;
  };
  screenshot?: TradeScreenshot;
  annotations?: ChartAnnotation[];
}

export interface ReplayState {
  instrument: Instrument;
  timeframe: string;
  date: string;
  currentIndex: number;
  totalCandles: number;
  revealedCandles: MarketCandle[];
  replayMode: ReplayMode;
  isPlaying: boolean;
  speed: ReplaySpeed;
  isBlind: boolean;
  futureRevealed: boolean;
  activeTradeInProgress?: Trade;
}

export interface DatasetSummary {
  id: string;
  instrument: Instrument;
  timeframe: string;
  startDate: string;
  endDate: string;
  totalCandles: number;
  availableDates: string[];
}
