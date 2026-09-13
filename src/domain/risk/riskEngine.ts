import {
  DailyRiskState,
  Instrument,
  RiskDecision,
  RiskSettings,
  Trade,
  TradeDirection,
} from '../../types/domain';
import { INSTRUMENT_SPECS } from '../marketData/instruments';

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  accountBalance: 100000,
  riskPercent: 1.0,
  maxDailyRiskPercent: 3.0,
  maxTradesPerDay: 3,
  maxConsecutiveLosses: 2,
  minRiskReward: 1.5,
  nyWindowStart: '09:45',
  nyWindowEnd: '12:00',
};

export class RiskEngine {
  public static calculateDailyRiskState(trades: Trade[], currentDate: string = '2024-05-10'): DailyRiskState {
    const todayTrades = trades.filter((t) => t.date === currentDate);

    let consecutiveLosses = 0;
    for (let i = todayTrades.length - 1; i >= 0; i--) {
      if (todayTrades[i].result?.outcome === 'LOSS') {
        consecutiveLosses++;
      } else if (todayTrades[i].result?.outcome === 'WIN') {
        break;
      }
    }

    const riskUsedToday = todayTrades.reduce((acc, t) => acc + (t.execution.riskAmount || 0), 0);
    const riskPercentUsedToday = todayTrades.reduce((acc, t) => acc + (t.execution.riskPercent || 1), 0);
    const realizedPnlToday = todayTrades.reduce((acc, t) => acc + (t.result?.pnl || 0), 0);
    const realizedRToday = todayTrades.reduce((acc, t) => acc + (t.result?.resultR || 0), 0);

    return {
      nyDate: currentDate,
      tradesToday: todayTrades.length,
      riskUsedToday,
      riskPercentUsedToday,
      realizedPnlToday,
      realizedRToday,
      consecutiveLossesToday: consecutiveLosses,
      isTradingPermitted: true,
    };
  }

  public static evaluateRisk(
    instrument: Instrument,
    direction: TradeDirection,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number,
    settings: RiskSettings,
    dailyState: DailyRiskState
  ): RiskDecision {
    const reasons: string[] = [];
    const spec = INSTRUMENT_SPECS[instrument];

    // 1. Price validation
    if (direction === 'BUY') {
      if (stopLoss >= entryPrice) {
        reasons.push(`Long trade invalid: Stop loss (${stopLoss}) must be strictly below Entry (${entryPrice}).`);
      }
      if (takeProfit <= entryPrice) {
        reasons.push(`Long trade invalid: Take profit (${takeProfit}) must be strictly above Entry (${entryPrice}).`);
      }
    } else {
      if (stopLoss <= entryPrice) {
        reasons.push(`Short trade invalid: Stop loss (${stopLoss}) must be strictly above Entry (${entryPrice}).`);
      }
      if (takeProfit >= entryPrice) {
        reasons.push(`Short trade invalid: Take profit (${takeProfit}) must be strictly below Entry (${entryPrice}).`);
      }
    }

    const riskPoints = Math.abs(entryPrice - stopLoss);
    const rewardPoints = Math.abs(takeProfit - entryPrice);

    if (riskPoints <= 0) {
      reasons.push('Risk distance cannot be zero or negative.');
    }

    const rrRatio = riskPoints > 0 ? Math.round((rewardPoints / riskPoints) * 100) / 100 : 0;

    // 2. Minimum R:R rule
    if (rrRatio < settings.minRiskReward) {
      reasons.push(`R:R ratio (${rrRatio}:1) is below your minimum plan threshold (${settings.minRiskReward}:1).`);
    }

    // 3. Daily risk controls
    if (dailyState.tradesToday >= settings.maxTradesPerDay) {
      reasons.push(`Maximum daily trades reached (${dailyState.tradesToday}/${settings.maxTradesPerDay}).`);
    }

    if (dailyState.consecutiveLossesToday >= settings.maxConsecutiveLosses) {
      reasons.push(
        `Consecutive daily loss circuit-breaker triggered (${dailyState.consecutiveLossesToday} losses).`
      );
    }

    const riskAmount = (settings.accountBalance * settings.riskPercent) / 100;
    const projectedDailyRiskPercent =
      dailyState.riskPercentUsedToday + settings.riskPercent;

    if (projectedDailyRiskPercent > settings.maxDailyRiskPercent) {
      reasons.push(
        `Daily risk limit would be exceeded (${projectedDailyRiskPercent.toFixed(1)}% > max ${settings.maxDailyRiskPercent}%).`
      );
    }

    // 4. Instrument-aware position sizing
    // Formula: Risk Amount ($) = Position Size (lots) * Risk Points * Pip/Point Value per 1 unit * Contract Size
    let calculatedPositionSize = 0;
    if (riskPoints > 0 && spec) {
      const pointValuePerLot = spec.pipOrPointValue * spec.contractSize;
      const dollarRiskPerLot = riskPoints * pointValuePerLot;
      if (dollarRiskPerLot > 0) {
        const rawLots = riskAmount / dollarRiskPerLot;
        // Round to 2 decimal places (standard micro-lots)
        calculatedPositionSize = Math.max(0.01, Math.round(rawLots * 100) / 100);
      }
    }

    const potentialReward = riskAmount * rrRatio;
    const permitted = reasons.length === 0;

    return {
      permitted,
      reasons,
      calculatedPositionSize,
      riskAmount: Math.round(riskAmount * 100) / 100,
      potentialReward: Math.round(potentialReward * 100) / 100,
      rrRatio,
      riskPoints: Math.round(riskPoints * 100) / 100,
      rewardPoints: Math.round(rewardPoints * 100) / 100,
    };
  }
}
