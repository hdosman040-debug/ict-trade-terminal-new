import {
  DayOfWeekPerformance,
  PerformanceMetrics,
  RuleFollowingComparison,
  SessionBucketPerformance,
  SetupSliceAnalytics,
  TradingEdgeSynthesis,
} from '../../types/analytics';
import { EntryModel, Instrument, LiquidityType, SessionName, Trade } from '../../types/domain';
import { getNYTimeDetails } from '../timezone/nyTimezone';

export class AnalyticsEngine {
  public static calculatePerformance(trades: Trade[]): PerformanceMetrics {
    const closedTrades = trades.filter((t) => t.result && t.result.outcome !== 'OPEN');

    if (closedTrades.length === 0) {
      return {
        totalTrades: trades.length,
        wins: 0,
        losses: 0,
        breakevens: 0,
        openTrades: trades.filter((t) => !t.result || t.result.outcome === 'OPEN').length,
        winRate: 0,
        lossRate: 0,
        averageWinR: 0,
        averageLossR: 0,
        expectancyR: 0,
        profitFactor: 0,
        totalR: 0,
        netPnl: 0,
        maxDrawdownR: 0,
        maxDrawdownPercent: 0,
        averageR: 0,
        largestWinR: 0,
        largestLossR: 0,
        averageMfeR: 0,
        averageMaeR: 0,
        averageTimeToCloseMinutes: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalWinR = 0;
    let totalLossR = 0;
    let totalR = 0;
    let netPnl = 0;
    let largestWinR = 0;
    let largestLossR = 0;
    let totalMfeR = 0;
    let totalMaeR = 0;
    let totalMinutes = 0;

    let peakR = 0;
    let maxDrawdownR = 0;
    let runningR = 0;

    for (const t of closedTrades) {
      const r = t.result!.resultR;
      const pnl = t.result!.pnl;

      totalR += r;
      netPnl += pnl;
      totalMfeR += t.result!.mfeR || 0;
      totalMaeR += t.result!.maeR || 0;
      totalMinutes += t.result!.timeToCloseMinutes || 0;

      runningR += r;
      if (runningR > peakR) {
        peakR = runningR;
      }
      const dd = peakR - runningR;
      if (dd > maxDrawdownR) {
        maxDrawdownR = dd;
      }

      if (t.result!.outcome === 'WIN') {
        wins++;
        totalWinR += r;
        if (r > largestWinR) largestWinR = r;
      } else if (t.result!.outcome === 'LOSS') {
        losses++;
        totalLossR += Math.abs(r);
        if (r < largestLossR) largestLossR = r;
      } else if (t.result!.outcome === 'BREAKEVEN') {
        breakevens++;
      }
    }

    const totalDecided = wins + losses;
    const winRate = totalDecided > 0 ? Math.round((wins / totalDecided) * 1000) / 10 : 0;
    const lossRate = totalDecided > 0 ? Math.round((losses / totalDecided) * 1000) / 10 : 0;

    const avgWinR = wins > 0 ? totalWinR / wins : 0;
    const avgLossR = losses > 0 ? -(totalLossR / losses) : 0;

    // Expectancy = (WinRate * AvgWin) + (LossRate * AvgLoss) where loss is negative
    const winRateFrac = winRate / 100;
    const lossRateFrac = lossRate / 100;
    const expectancyR = winRateFrac * avgWinR + lossRateFrac * avgLossR;

    const profitFactor = totalLossR > 0 ? totalWinR / totalLossR : totalWinR > 0 ? 99.9 : 0;

    return {
      totalTrades: trades.length,
      wins,
      losses,
      breakevens,
      openTrades: trades.length - closedTrades.length,
      winRate,
      lossRate,
      averageWinR: Math.round(avgWinR * 100) / 100,
      averageLossR: Math.round(avgLossR * 100) / 100,
      expectancyR: Math.round(expectancyR * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      totalR: Math.round(totalR * 100) / 100,
      netPnl: Math.round(netPnl * 100) / 100,
      maxDrawdownR: Math.round(maxDrawdownR * 100) / 100,
      maxDrawdownPercent: 0,
      averageR: Math.round((totalR / closedTrades.length) * 100) / 100,
      largestWinR: Math.round(largestWinR * 100) / 100,
      largestLossR: Math.round(largestLossR * 100) / 100,
      averageMfeR: Math.round((totalMfeR / closedTrades.length) * 100) / 100,
      averageMaeR: Math.round((totalMaeR / closedTrades.length) * 100) / 100,
      averageTimeToCloseMinutes: Math.round(totalMinutes / closedTrades.length),
    };
  }

  public static compareRuleFollowing(trades: Trade[]): RuleFollowingComparison {
    const compliantTrades = trades.filter((t) => t.quality.ruleFollowing);
    const brokenTrades = trades.filter((t) => !t.quality.ruleFollowing);

    const compPerf = this.calculatePerformance(compliantTrades);
    const brokenPerf = this.calculatePerformance(brokenTrades);

    return {
      ruleFollowing: {
        trades: compliantTrades.length,
        winRate: compPerf.winRate,
        totalR: compPerf.totalR,
        expectancyR: compPerf.expectancyR,
        profitFactor: compPerf.profitFactor,
      },
      ruleBreaking: {
        trades: brokenTrades.length,
        winRate: brokenPerf.winRate,
        totalR: brokenPerf.totalR,
        expectancyR: brokenPerf.expectancyR,
        profitFactor: brokenPerf.profitFactor,
      },
      edgeDeltaR: Math.round((compPerf.expectancyR - brokenPerf.expectancyR) * 100) / 100,
    };
  }

  public static analyzeSetups(trades: Trade[], property: 'entryModel' | 'liquidityType' | 'instrument'): SetupSliceAnalytics[] {
    const groups = new Map<string, Trade[]>();

    for (const t of trades) {
      let key = '';
      if (property === 'entryModel') key = t.setup.entryModel;
      else if (property === 'liquidityType') key = t.setup.liquidityType;
      else if (property === 'instrument') key = t.instrument;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    const results: SetupSliceAnalytics[] = [];
    groups.forEach((groupTrades, name) => {
      const perf = this.calculatePerformance(groupTrades);
      results.push({
        name,
        count: groupTrades.length,
        winRate: perf.winRate,
        totalR: perf.totalR,
        expectancyR: perf.expectancyR,
        avgWinR: perf.averageWinR,
        avgLossR: perf.averageLossR,
      });
    });

    return results.sort((a, b) => b.totalR - a.totalR);
  }

  public static analyzeDaysOfWeek(trades: Trade[]): DayOfWeekPerformance[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map((day) => {
      const dayTrades = trades.filter((t) => t.dayOfWeek === day);
      const perf = this.calculatePerformance(dayTrades);
      return {
        day,
        trades: dayTrades.length,
        winRate: perf.winRate,
        totalR: perf.totalR,
        expectancyR: perf.expectancyR,
      };
    });
  }

  public static analyzeSessionBuckets(trades: Trade[]): SessionBucketPerformance[] {
    const buckets = [
      { name: '09:45–10:15', startM: 9 * 60 + 45, endM: 10 * 60 + 15 },
      { name: '10:15–10:45', startM: 10 * 60 + 15, endM: 10 * 60 + 45 },
      { name: '10:45–11:15', startM: 10 * 60 + 45, endM: 11 * 60 + 15 },
      { name: '11:15–12:00', startM: 11 * 60 + 15, endM: 12 * 60 },
    ];

    return buckets.map((b) => {
      const bucketTrades = trades.filter((t) => {
        const { totalMinutesFromMidnight } = getNYTimeDetails(t.timestamp);
        return totalMinutesFromMidnight >= b.startM && totalMinutesFromMidnight < b.endM;
      });
      const perf = this.calculatePerformance(bucketTrades);
      return {
        timeBucket: b.name,
        trades: bucketTrades.length,
        totalR: perf.totalR,
        winRate: perf.winRate,
        expectancyR: perf.expectancyR,
      };
    });
  }

  public static synthesizeTradingEdge(trades: Trade[]): TradingEdgeSynthesis {
    const sampleSize = trades.length;
    const minSample = 30;
    const hasSufficientSample = sampleSize >= minSample;

    const overall = this.calculatePerformance(trades);
    const ruleComp = this.compareRuleFollowing(trades);

    const instrumentSlices = this.analyzeSetups(trades, 'instrument');
    const entryModelSlices = this.analyzeSetups(trades, 'entryModel');
    const liqSlices = this.analyzeSetups(trades, 'liquidityType');
    const daySlices = this.analyzeDaysOfWeek(trades).sort((a, b) => b.totalR - a.totalR);

    const bestInstrument = instrumentSlices[0]?.name as Instrument | undefined;
    const bestEntryModel = entryModelSlices[0]?.name as EntryModel | undefined;
    const bestLiquidityType = liqSlices[0]?.name as LiquidityType | undefined;
    const bestDayOfWeek = daySlices[0]?.day;

    let summary = '';
    if (!hasSufficientSample) {
      summary = `Sample size (${sampleSize} trades) is currently insufficient for statistical significance. Complete at least ${minSample} backtested trades to reliably validate your statistical edge.`;
    } else {
      summary = `Your strongest empirical edge is found on ${bestInstrument || 'US30'} during ${bestDayOfWeek || 'Wednesday'} with ${bestLiquidityType || 'SSL'} sweeps entering via ${bestEntryModel || 'FVG'}, yielding an expectancy of +${overall.expectancyR}R when following rules.`;
    }

    return {
      hasSufficientSample,
      sampleSize,
      minimumRecommendedSample: minSample,
      bestInstrument,
      bestSession: 'NY_AM',
      bestSetupDescription: `${bestLiquidityType || 'SSL'} Sweep -> MSS -> ${bestEntryModel || 'FVG'}`,
      bestDayOfWeek,
      bestTimeWindow: '09:45–10:30',
      bestEntryModel,
      bestLiquidityType,
      overallExpectancyR: overall.expectancyR,
      ruleFollowingExpectancyR: ruleComp.ruleFollowing.expectancyR,
      ruleBreakingExpectancyR: ruleComp.ruleBreaking.expectancyR,
      edgeSummaryText: summary,
    };
  }
}
