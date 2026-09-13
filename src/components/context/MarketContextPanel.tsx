import React from 'react';
import { Instrument, MarketContext } from '../../types/domain';
import { formatPrice } from '../../domain/marketData/instruments';
import { TrendingUp, TrendingDown, Minus, Layers, Clock } from 'lucide-react';

interface MarketContextPanelProps {
  context: MarketContext;
  instrument: Instrument;
}

export const MarketContextPanel: React.FC<MarketContextPanelProps> = ({ context, instrument }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 text-xs font-mono flex flex-col gap-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 font-bold text-sky-400">
          <Layers className="w-4 h-4" />
          Market Context ({context.timeframe})
        </span>
        <span className="text-[11px] text-slate-400">
          Price: <strong className="text-white">{formatPrice(context.currentPrice, instrument)}</strong>
        </span>
      </div>

      {/* HTF Bias & Structure */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">HTF Bias</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {context.htfBias === 'BULLISH' ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : context.htfBias === 'BEARISH' ? (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            )}
            <strong
              className={
                context.htfBias === 'BULLISH'
                  ? 'text-emerald-400'
                  : context.htfBias === 'BEARISH'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }
            >
              {context.htfBias}
            </strong>
          </div>
        </div>

        <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
          <span className="text-[10px] text-slate-500 block">Structure</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <strong className="text-slate-200">{context.structure}</strong>
          </div>
        </div>
      </div>

      {/* Dealing Range / Premium & Discount Visual Gauge */}
      <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400">Dealing Range</span>
          <span
            className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
              context.currentZone === 'DISCOUNT'
                ? 'bg-emerald-500/20 text-emerald-300'
                : context.currentZone === 'PREMIUM'
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {context.currentZone}
          </span>
        </div>

        {/* Visual Bar */}
        <div className="w-full bg-slate-900 h-2 rounded-full relative overflow-hidden flex">
          <div className="w-1/2 bg-emerald-950 border-r border-slate-700 h-full" title="Discount (Buy Zone)" />
          <div className="w-1/2 bg-rose-950 h-full" title="Premium (Sell Zone)" />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
          <span>Low: {formatPrice(context.swingLow, instrument)}</span>
          <span className="text-sky-400">Eq: {formatPrice(context.equilibriumPrice, instrument)}</span>
          <span>High: {formatPrice(context.swingHigh, instrument)}</span>
        </div>
      </div>

      {/* Benchmarks: PDH/PDL and Session Liquidity */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">PDH:</span>
          <span className="text-sky-300">{context.pdh ? formatPrice(context.pdh, instrument) : '-'}</span>
        </div>
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">PDL:</span>
          <span className="text-rose-300">{context.pdl ? formatPrice(context.pdl, instrument) : '-'}</span>
        </div>
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">London H:</span>
          <span className="text-sky-300">{context.londonHigh ? formatPrice(context.londonHigh, instrument) : '-'}</span>
        </div>
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">London L:</span>
          <span className="text-rose-300">{context.londonLow ? formatPrice(context.londonLow, instrument) : '-'}</span>
        </div>
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">Asia H:</span>
          <span className="text-sky-300">{context.asiaHigh ? formatPrice(context.asiaHigh, instrument) : '-'}</span>
        </div>
        <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60 flex justify-between">
          <span className="text-slate-500">Asia L:</span>
          <span className="text-rose-300">{context.asiaLow ? formatPrice(context.asiaLow, instrument) : '-'}</span>
        </div>
      </div>
    </div>
  );
};
