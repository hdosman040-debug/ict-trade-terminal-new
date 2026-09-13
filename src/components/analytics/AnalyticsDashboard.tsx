import React from 'react';
import { AnalyticsEngine } from '../../domain/analytics/analyticsEngine';
import { Trade } from '../../types/domain';
import {
  TrendingUp,
  BarChart3,
  Award,
  ShieldAlert,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  trades: Trade[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ trades }) => {
  const metrics = AnalyticsEngine.calculatePerformance(trades);
  const edge = AnalyticsEngine.synthesizeTradingEdge(trades);
  const ruleComp = AnalyticsEngine.compareRuleFollowing(trades);
  const entryModelSlices = AnalyticsEngine.analyzeSetups(trades, 'entryModel');
  const liqSlices = AnalyticsEngine.analyzeSetups(trades, 'liquidityType');
  const daySlices = AnalyticsEngine.analyzeDaysOfWeek(trades);
  const sessionBuckets = AnalyticsEngine.analyzeSessionBuckets(trades);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 text-xs font-mono p-4 space-y-4 overflow-y-auto">
      {/* Top Banner: Edge Discovery Synthesis */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 p-5 rounded-xl border border-sky-900/40 shadow-lg relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold uppercase tracking-wider border border-sky-500/30">
                Trader Edge Intelligence
              </span>
              {!edge.hasSufficientSample && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  <ShieldAlert className="w-3 h-3" />
                  Sample: {edge.sampleSize}/{edge.minimumRecommendedSample} trades (Preliminary)
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-400" />
              Your Measurable Trading Edge
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-3xl leading-relaxed">
              {edge.edgeSummaryText}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-right min-w-[160px]">
            <span className="text-[10px] text-slate-400 block">Overall Expectancy</span>
            <span
              className={`text-2xl font-bold ${
                metrics.expectancyR > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.expectancyR > 0 ? `+${metrics.expectancyR}R` : `${metrics.expectancyR}R`}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Per Executed Trade</span>
          </div>
        </div>

        {/* Top Edge Characteristics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Instrument</span>
            <strong className="text-sky-400">{edge.bestInstrument || 'US30'}</strong>
          </div>
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Session</span>
            <strong className="text-sky-400">NY AM Window</strong>
          </div>
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Day</span>
            <strong className="text-sky-400">{edge.bestDayOfWeek || 'Wednesday'}</strong>
          </div>
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Time Window</span>
            <strong className="text-sky-400">{edge.bestTimeWindow}</strong>
          </div>
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Entry Model</span>
            <strong className="text-sky-400">{edge.bestEntryModel || 'FVG'}</strong>
          </div>
          <div className="bg-slate-950/60 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Best Liquidity</span>
            <strong className="text-sky-400">{edge.bestLiquidityType || 'SSL'}</strong>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Total Closed</span>
          <strong className="text-lg text-white">{metrics.wins + metrics.losses + metrics.breakevens}</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {metrics.wins}W / {metrics.losses}L / {metrics.breakevens}BE
          </span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Win Rate</span>
          <strong className="text-lg text-emerald-400">{metrics.winRate}%</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Loss Rate: {metrics.lossRate}%
          </span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Profit Factor</span>
          <strong className="text-lg text-white">{metrics.profitFactor}</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Gross Win/Loss</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Total Accumulated R</span>
          <strong
            className={`text-lg ${
              metrics.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.totalR >= 0 ? `+${metrics.totalR}R` : `${metrics.totalR}R`}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Avg: {metrics.averageR}R/trade</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Avg Win / Loss</span>
          <div className="text-xs font-bold mt-1">
            <span className="text-emerald-400">+{metrics.averageWinR}R</span> /{' '}
            <span className="text-rose-400">{metrics.averageLossR}R</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Asymmetry Ratio</span>
        </div>

        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Max Drawdown (R)</span>
          <strong className="text-lg text-amber-400">-{metrics.maxDrawdownR}R</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Peak to Trough</span>
        </div>
      </div>

      {/* CORE INSIGHT: Rule-Following vs Rule-Breaking Analytics */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Rule-Following vs. Rule-Breaking Discipline Analysis
            </h3>
          </div>
          <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/30">
            Discipline Delta: +{ruleComp.edgeDeltaR}R Expectancy Edge
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Compliant Box */}
          <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Rule-Following Trades
              </span>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                {ruleComp.ruleFollowing.trades} Trades
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/40 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Win Rate</span>
                <strong className="text-sm text-emerald-300">{ruleComp.ruleFollowing.winRate}%</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Expectancy</span>
                <strong className="text-sm text-emerald-400">
                  +{ruleComp.ruleFollowing.expectancyR}R
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total R</span>
                <strong className="text-sm text-emerald-300">
                  +{ruleComp.ruleFollowing.totalR}R
                </strong>
              </div>
            </div>
          </div>

          {/* Non-compliant Box */}
          <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 uppercase text-[11px] flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                Rule-Breaking (Impulsive) Trades
              </span>
              <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                {ruleComp.ruleBreaking.trades} Trades
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-900/40 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Win Rate</span>
                <strong className="text-sm text-rose-300">{ruleComp.ruleBreaking.winRate}%</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Expectancy</span>
                <strong className="text-sm text-rose-400">
                  {ruleComp.ruleBreaking.expectancyR}R
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total R</span>
                <strong className="text-sm text-rose-300">
                  {ruleComp.ruleBreaking.totalR}R
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setups Breakdown: Entry Model & Liquidity Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Entry Model Breakdown */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Performance by Entry Model (FVG vs Order Block)
          </h3>
          <div className="space-y-1.5">
            {entryModelSlices.map((item) => (
              <div
                key={item.name}
                className="bg-slate-950 p-2.5 rounded border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <strong className="text-white block">{item.name}</strong>
                  <span className="text-[10px] text-slate-400">{item.count} trades</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold block">{item.winRate}% Win</span>
                  <span className="text-[10px] text-sky-400">Exp: +{item.expectancyR}R</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day of Week Breakdown */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            Performance by Day of Week
          </h3>
          <div className="space-y-1.5">
            {daySlices.map((item) => (
              <div
                key={item.day}
                className="bg-slate-950 p-2 rounded border border-slate-800/80 flex items-center justify-between"
              >
                <span className="text-white font-semibold">{item.day}</span>
                <span className="text-slate-400 text-[10px]">{item.trades} trades</span>
                <span className="text-emerald-400">{item.winRate}% W</span>
                <strong className={item.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {item.totalR >= 0 ? `+${item.totalR}R` : `${item.totalR}R`}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NY AM Session Time Buckets */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          NY AM Window Micro-Time Buckets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sessionBuckets.map((b) => (
            <div key={b.timeBucket} className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">{b.timeBucket}</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-slate-300">{b.trades} trades</span>
                <strong
                  className={`text-sm ${
                    b.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {b.totalR >= 0 ? `+${b.totalR}R` : `${b.totalR}R`}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
