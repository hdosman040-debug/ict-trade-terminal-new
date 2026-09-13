import { Trade } from '../../types/domain';

export interface TradeFilters {
  instrument?: string;
  entryModel?: string;
  outcome?: string;
  ruleFollowing?: boolean;
  dateStart?: string;
  dateEnd?: string;
}

export interface TradeRepository {
  create(trade: Trade): Promise<Trade>;
  update(trade: Trade): Promise<Trade>;
  getById(id: string): Promise<Trade | null>;
  list(filters?: TradeFilters): Promise<Trade[]>;
  delete(id: string): Promise<void>;
  exportJSON(): Promise<string>;
  importJSON(jsonString: string): Promise<number>;
  clear(): Promise<void>;
}

const TRADES_STORAGE_KEY = 'ict_trade_records_v1';

export class LocalTradeRepository implements TradeRepository {
  private cache: Trade[] | null = null;

  private loadFromStorage(): Trade[] {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(TRADES_STORAGE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw);
        return this.cache!;
      }
    } catch (e) {
      console.error('Failed to load trades from storage', e);
    }
    this.cache = [];
    return this.cache;
  }

  private saveToStorage(trades: Trade[]): void {
    this.cache = trades;
    try {
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    } catch (e) {
      console.error('Failed to save trades to storage', e);
    }
  }

  async create(trade: Trade): Promise<Trade> {
    const trades = this.loadFromStorage();
    const existingIndex = trades.findIndex((t) => t.id === trade.id);
    if (existingIndex >= 0) {
      trades[existingIndex] = trade;
    } else {
      trades.push(trade);
    }
    this.saveToStorage(trades);
    return trade;
  }

  async update(trade: Trade): Promise<Trade> {
    return this.create(trade);
  }

  async getById(id: string): Promise<Trade | null> {
    const trades = this.loadFromStorage();
    return trades.find((t) => t.id === id) || null;
  }

  async list(filters?: TradeFilters): Promise<Trade[]> {
    let trades = [...this.loadFromStorage()];

    if (filters) {
      if (filters.instrument) {
        trades = trades.filter((t) => t.instrument === filters.instrument);
      }
      if (filters.entryModel) {
        trades = trades.filter((t) => t.setup.entryModel === filters.entryModel);
      }
      if (filters.outcome) {
        trades = trades.filter((t) => t.result?.outcome === filters.outcome);
      }
      if (filters.ruleFollowing !== undefined) {
        trades = trades.filter((t) => t.quality.ruleFollowing === filters.ruleFollowing);
      }
    }

    return trades.sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(id: string): Promise<void> {
    const trades = this.loadFromStorage().filter((t) => t.id !== id);
    this.saveToStorage(trades);
  }

  async exportJSON(): Promise<string> {
    const trades = this.loadFromStorage();
    return JSON.stringify(trades, null, 2);
  }

  async importJSON(jsonString: string): Promise<number> {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error('Invalid JSON: expected array of trades.');
    this.saveToStorage(parsed);
    return parsed.length;
  }

  async clear(): Promise<void> {
    this.saveToStorage([]);
  }

  /**
   * Seeds initial realistic backtested trades across US30, NAS100, and XAUUSD
   * to demonstrate rule-following vs rule-breaking analytics.
   */
  async seedDemoTradesIfEmpty(): Promise<void> {
    const current = this.loadFromStorage();
    if (current.length > 0) return;

    const sampleTrades: Trade[] = [
      {
        id: 'trade_sample_001',
        tradeNumber: 1,
        instrument: 'US30',
        date: '2024-05-10',
        timestamp: 1715349900,
        session: 'NY_AM',
        dayOfWeek: 'Friday',
        direction: 'BUY',
        marketContext: {
          htfBias: 'BULLISH',
          structure: 'BULLISH',
          premiumDiscount: 'DISCOUNT',
          pdh: 39550,
          pdl: 39280,
          sessionLiquidity: {
            asiaHigh: 39430,
            asiaLow: 39360,
            londonHigh: 39480,
            londonLow: 39330,
          },
        },
        setup: {
          liquidityType: 'SSL',
          liquiditySwept: true,
          sweepPrice: 39310,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'FVG',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 39380,
          stopLoss: 39330,
          takeProfit: 39480,
          riskAmount: 50,
          riskPercent: 1.0,
          rr: 2.0,
          positionSize: 1.0,
          entryReplayIndex: 124,
          entryTimestamp: 1715349900,
        },
        result: {
          outcome: 'WIN',
          exitPrice: 39480,
          exitTimestamp: 1715354400,
          exitReplayIndex: 139,
          resultR: 2.0,
          pnl: 100,
          mfe: 120,
          mfeR: 2.4,
          mae: 10,
          maeR: 0.2,
          timeToCloseMinutes: 75,
          candlesToClose: 15,
        },
        quality: {
          score: 8,
          maxScore: 8,
          grade: 'A+',
          ruleFollowing: true,
        },
        confidence: 5,
        psychology: {
          preTradeState: 'Calm',
          followedPlan: true,
          wasImpulsive: false,
          wouldTakeAgain: true,
        },
        notes: {
          whyTaken: 'Clean London Low sweep at 09:50, closed back inside followed by aggressive M5 displacement breaking swing high.',
          whatHappened: 'Market tapped the 50% equilibrium of the Bullish FVG and expanded cleanly towards London High target.',
          whatLearned: 'Patience for the reclaim prevented early stopout on the initial wick.',
        },
      },
      {
        id: 'trade_sample_002',
        tradeNumber: 2,
        instrument: 'US30',
        date: '2024-05-08',
        timestamp: 1715177100,
        session: 'NY_AM',
        dayOfWeek: 'Wednesday',
        direction: 'SELL',
        marketContext: {
          htfBias: 'BEARISH',
          structure: 'BEARISH',
          premiumDiscount: 'PREMIUM',
          pdh: 39220,
          pdl: 38850,
          sessionLiquidity: {
            asiaHigh: 39140,
            asiaLow: 39010,
            londonHigh: 39190,
            londonLow: 39040,
          },
        },
        setup: {
          liquidityType: 'BSL',
          liquiditySwept: true,
          sweepPrice: 39235,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'FVG',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 39180,
          stopLoss: 39240,
          takeProfit: 39060,
          riskAmount: 50,
          riskPercent: 1.0,
          rr: 2.0,
          positionSize: 0.83,
          entryReplayIndex: 122,
          entryTimestamp: 1715177100,
        },
        result: {
          outcome: 'WIN',
          exitPrice: 39060,
          exitTimestamp: 1715180400,
          exitReplayIndex: 133,
          resultR: 2.0,
          pnl: 100,
          mfe: 140,
          mfeR: 2.33,
          mae: 15,
          maeR: 0.25,
          timeToCloseMinutes: 55,
          candlesToClose: 11,
        },
        quality: {
          score: 8,
          maxScore: 8,
          grade: 'A+',
          ruleFollowing: true,
        },
        confidence: 4,
        psychology: {
          preTradeState: 'Focused',
          followedPlan: true,
          wasImpulsive: false,
          wouldTakeAgain: true,
        },
        notes: {
          whyTaken: 'PDH swept during Judas swing. Strong displacement candle leaving FVG.',
          whatHappened: 'Target hit within an hour.',
          whatLearned: 'Trust the higher timeframe bias.',
        },
      },
      {
        id: 'trade_sample_003',
        tradeNumber: 3,
        instrument: 'NAS100',
        date: '2024-05-14',
        timestamp: 1715695500,
        session: 'NY_AM',
        dayOfWeek: 'Tuesday',
        direction: 'SELL',
        marketContext: {
          htfBias: 'BEARISH',
          structure: 'BEARISH',
          premiumDiscount: 'PREMIUM',
          pdh: 18360,
          pdl: 18180,
          sessionLiquidity: {
            asiaHigh: 18310,
            asiaLow: 18240,
            londonHigh: 18340,
            londonLow: 18260,
          },
        },
        setup: {
          liquidityType: 'BSL',
          liquiditySwept: true,
          sweepPrice: 18365,
          reclaimConfirmed: true,
          displacementConfirmed: true,
          mssConfirmed: true,
          retracementConfirmed: true,
          entryZoneTouched: true,
          entryModel: 'ORDER_BLOCK',
          setupSequenceCompleted: true,
        },
        execution: {
          entryPrice: 18335,
          stopLoss: 18365,
          takeProfit: 18260,
          riskAmount: 50,
          riskPercent: 1.0,
          rr: 2.5,
          positionSize: 1.67,
          entryReplayIndex: 125,
          entryTimestamp: 1715695500,
        },
        result: {
          outcome: 'WIN',
          exitPrice: 18260,
          exitTimestamp: 1715700000,
          exitReplayIndex: 140,
          resultR: 2.5,
          pnl: 125,
          mfe: 85,
          mfeR: 2.83,
          mae: 8,
          maeR: 0.27,
          timeToCloseMinutes: 75,
          candlesToClose: 15,
        },
        quality: {
          score: 8,
          maxScore: 8,
          grade: 'A+',
          ruleFollowing: true,
        },
        confidence: 5,
        psychology: {
          preTradeState: 'Calm',
          followedPlan: true,
          wasImpulsive: false,
          wouldTakeAgain: true,
        },
        notes: {
          whyTaken: 'Order Block tap after clear MSS shift.',
          whatHappened: 'Smooth run down to sell-side liquidity.',
          whatLearned: 'Order Blocks coupled with FVG provide high certainty.',
        },
      },
      {
        id: 'trade_sample_004',
        tradeNumber: 4,
        instrument: 'US30',
        date: '2024-05-02',
        timestamp: 1714660800,
        session: 'NY_AM',
        dayOfWeek: 'Thursday',
        direction: 'BUY',
        marketContext: {
          htfBias: 'BEARISH',
          structure: 'BEARISH',
          premiumDiscount: 'PREMIUM',
          pdh: 38900,
          pdl: 38500,
        },
        setup: {
          liquidityType: 'SSL',
          liquiditySwept: false,
          sweepPrice: 0,
          reclaimConfirmed: false,
          displacementConfirmed: false,
          mssConfirmed: false,
          retracementConfirmed: false,
          entryZoneTouched: false,
          entryModel: 'FVG',
          setupSequenceCompleted: false,
        },
        execution: {
          entryPrice: 38800,
          stopLoss: 38750,
          takeProfit: 38920,
          riskAmount: 50,
          riskPercent: 1.0,
          rr: 2.4,
          positionSize: 1.0,
          entryReplayIndex: 120,
          entryTimestamp: 1714660800,
        },
        result: {
          outcome: 'LOSS',
          exitPrice: 38750,
          exitTimestamp: 1714662600,
          exitReplayIndex: 126,
          resultR: -1.0,
          pnl: -50,
          mfe: 12,
          mfeR: 0.24,
          mae: 50,
          maeR: 1.0,
          timeToCloseMinutes: 30,
          candlesToClose: 6,
        },
        quality: {
          score: 4,
          maxScore: 8,
          grade: 'D',
          ruleFollowing: false,
          missingRules: ['No liquidity swept', 'No MSS', 'Counter-trend in Premium'],
        },
        confidence: 2,
        psychology: {
          preTradeState: 'FOMO',
          followedPlan: false,
          wasImpulsive: true,
          wouldTakeAgain: false,
        },
        notes: {
          whyTaken: 'Entered impulsively because market seemed to be moving up fast.',
          whatHappened: 'Stopped out quickly as market continued higher-timeframe downtrend.',
          whatLearned: 'Rule-breaking under FOMO almost always results in a -1R loss.',
        },
      },
    ];

    this.saveToStorage(sampleTrades);
  }
}

export const defaultTradeRepository = new LocalTradeRepository();
