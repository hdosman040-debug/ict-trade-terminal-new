import { MarketCandle, Trade, TradeOutcome } from '../../types/domain';

export class TradeResultEngine {
  /**
   * Calculates trade resolution and excursion metrics from future candles.
   * Only called when the future is being replayed or revealed!
   */
  public static evaluateTradeOutcome(
    trade: Trade,
    revealedCandles: MarketCandle[],
    startIndex: number
  ): NonNullable<Trade['result']> {
    const isLong = trade.direction === 'BUY';
    const entry = trade.execution.entryPrice;
    const sl = trade.execution.stopLoss;
    const tp = trade.execution.takeProfit;
    const riskPoints = Math.abs(entry - sl) || 1;

    let outcome: TradeOutcome = 'OPEN';
    let exitPrice = entry;
    let exitTimestamp = trade.execution.entryTimestamp;
    let exitReplayIndex = startIndex;
    let candlesToClose = 0;

    let maxFavorablePoints = 0;
    let maxAdversePoints = 0;

    // Scan future candles starting after entry
    for (let i = startIndex; i < revealedCandles.length; i++) {
      const c = revealedCandles[i];
      candlesToClose++;

      // Track excursion
      if (isLong) {
        const favorableExcursion = Math.max(0, c.high - entry);
        const adverseExcursion = Math.max(0, entry - c.low);
        if (favorableExcursion > maxFavorablePoints) maxFavorablePoints = favorableExcursion;
        if (adverseExcursion > maxAdversePoints) maxAdversePoints = adverseExcursion;

        // Long SL check (hit if low <= sl)
        // Long TP check (hit if high >= tp)
        const slHit = c.low <= sl;
        const tpHit = c.high >= tp;

        if (slHit && tpHit) {
          // Both SL and TP breached in the same candle.
          // Check opening price to determine whether one boundary was hit on a gap:
          if (c.open <= sl) {
            outcome = 'LOSS';
            exitPrice = c.open; // Adverse opening gap through SL
          } else if (c.open >= tp) {
            outcome = 'WIN';
            exitPrice = c.open; // Favorable opening gap through TP
          } else {
            // Intrabar sequence is ambiguous from OHLC alone.
            // Under rigorous institutional backtesting principles, apply conservative worst-case: Stop Loss hit first.
            outcome = 'LOSS';
            exitPrice = sl;
          }
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        } else if (slHit) {
          outcome = 'LOSS';
          // If bar opened below SL, execution slipped to opening price
          exitPrice = c.open < sl ? c.open : sl;
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        } else if (tpHit) {
          outcome = 'WIN';
          // If bar opened above TP, fill at opening price or target
          exitPrice = c.open > tp ? c.open : tp;
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        }
      } else {
        // Short trade
        const favorableExcursion = Math.max(0, entry - c.low);
        const adverseExcursion = Math.max(0, c.high - entry);
        if (favorableExcursion > maxFavorablePoints) maxFavorablePoints = favorableExcursion;
        if (adverseExcursion > maxAdversePoints) maxAdversePoints = adverseExcursion;

        const slHit = c.high >= sl;
        const tpHit = c.low <= tp;

        if (slHit && tpHit) {
          // Both SL and TP breached in the same candle.
          if (c.open >= sl) {
            outcome = 'LOSS';
            exitPrice = c.open; // Adverse opening gap through SL
          } else if (c.open <= tp) {
            outcome = 'WIN';
            exitPrice = c.open; // Favorable opening gap through TP
          } else {
            // Intrabar sequence ambiguous: apply conservative worst-case rule (SL hit first)
            outcome = 'LOSS';
            exitPrice = sl;
          }
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        } else if (slHit) {
          outcome = 'LOSS';
          // If bar opened above SL, execution slipped to opening price
          exitPrice = c.open > sl ? c.open : sl;
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        } else if (tpHit) {
          outcome = 'WIN';
          exitPrice = c.open < tp ? c.open : tp;
          exitTimestamp = c.time;
          exitReplayIndex = i;
          break;
        }
      }
    }

    // Calculate R and PnL
    let resultR = 0;
    let pnl = 0;

    if (outcome === 'WIN') {
      resultR = trade.execution.rr;
      pnl = trade.execution.riskAmount * resultR;
    } else if (outcome === 'LOSS') {
      resultR = -1.0;
      pnl = -trade.execution.riskAmount;
    } else {
      // Trade still open: calculate unrealized
      const lastCandle = revealedCandles[revealedCandles.length - 1];
      const currentPrice = lastCandle ? lastCandle.close : entry;
      const unrealizedPoints = isLong ? currentPrice - entry : entry - currentPrice;
      resultR = Math.round((unrealizedPoints / riskPoints) * 100) / 100;
      pnl = resultR * trade.execution.riskAmount;
      exitPrice = currentPrice;
      exitTimestamp = lastCandle ? lastCandle.time : exitTimestamp;
    }

    const mfeR = Math.round((maxFavorablePoints / riskPoints) * 100) / 100;
    const maeR = Math.round((maxAdversePoints / riskPoints) * 100) / 100;
    const timeToCloseMinutes = Math.max(0, Math.round((exitTimestamp - trade.execution.entryTimestamp) / 60));

    return {
      outcome,
      exitPrice,
      exitTimestamp,
      exitReplayIndex,
      resultR: Math.round(resultR * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      mfe: Math.round(maxFavorablePoints * 100) / 100,
      mfeR,
      mae: Math.round(maxAdversePoints * 100) / 100,
      maeR,
      timeToCloseMinutes,
      candlesToClose,
    };
  }
}
