import React, { useState } from 'react';
import { Trade } from '../../types/domain';
import { formatPrice } from '../../domain/marketData/instruments';
import {
  BookOpen,
  Filter,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface TradeJournalViewProps {
  trades: Trade[];
  onDeleteTrade: (id: string) => void;
  onExportTrades: () => void;
  onImportTrades: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TradeJournalView: React.FC<TradeJournalViewProps> = ({
  trades,
  onDeleteTrade,
  onExportTrades,
  onImportTrades,
}) => {
  const [filterInstrument, setFilterInstrument] = useState<string>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [filterRuleFollowing, setFilterRuleFollowing] = useState<string>('ALL');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const filteredTrades = trades.filter((t) => {
    if (filterInstrument !== 'ALL' && t.instrument !== filterInstrument) return false;
    if (filterOutcome !== 'ALL' && t.result?.outcome !== filterOutcome) return false;
    if (filterRuleFollowing === 'YES' && !t.quality.ruleFollowing) return false;
    if (filterRuleFollowing === 'NO' && t.quality.ruleFollowing) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 text-xs font-mono p-4 space-y-4 overflow-y-auto">
      {/* Top Header & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            Trade Journal & Playbook Records
          </h2>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Structured post-trade empirical documentation and execution quality logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={onImportTrades}
            />
          </label>

          <button
            onClick={onExportTrades}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Playbook ({trades.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
        <span className="flex items-center gap-1 text-slate-400 font-bold">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </span>

        {/* Instrument */}
        <select
          value={filterInstrument}
          onChange={(e) => setFilterInstrument(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300"
        >
          <option value="ALL">All Instruments</option>
          <option value="US30">US30</option>
          <option value="NAS100">NAS100</option>
          <option value="XAUUSD">XAUUSD</option>
        </select>

        {/* Outcome */}
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300"
        >
          <option value="ALL">All Outcomes</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="BREAKEVEN">BREAKEVEN</option>
          <option value="OPEN">OPEN</option>
        </select>

        {/* Rule-Following */}
        <select
          value={filterRuleFollowing}
          onChange={(e) => setFilterRuleFollowing(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300"
        >
          <option value="ALL">All Discipline Rules</option>
          <option value="YES">Rule-Following Only</option>
          <option value="NO">Rule-Breaking (Impulsive)</option>
        </select>

        <span className="ml-auto text-slate-500">
          Showing <strong className="text-sky-400">{filteredTrades.length}</strong> of {trades.length} trades
        </span>
      </div>

      {/* Trades Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Date / Session</th>
                <th className="py-2.5 px-3 font-semibold">Pair</th>
                <th className="py-2.5 px-3 font-semibold">Dir</th>
                <th className="py-2.5 px-3 font-semibold">Setup / Model</th>
                <th className="py-2.5 px-3 font-semibold">Entry / SL / TP</th>
                <th className="py-2.5 px-3 font-semibold">R:R</th>
                <th className="py-2.5 px-3 font-semibold">Compliance</th>
                <th className="py-2.5 px-3 font-semibold">Result (R)</th>
                <th className="py-2.5 px-3 font-semibold">MFE / MAE</th>
                <th className="py-2.5 px-3 font-semibold">Psychology</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-500">
                    No journal entries matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => {
                  const isWin = trade.result?.outcome === 'WIN';
                  const isLoss = trade.result?.outcome === 'LOSS';
                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-300">
                        #{String(trade.tradeNumber).padStart(3, '0')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div>{trade.date}</div>
                        <div className="text-[10px] text-slate-500">
                          {trade.dayOfWeek} • {trade.session}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {trade.instrument}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            trade.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {trade.direction === 'BUY' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{trade.setup.entryModel}</div>
                        <div className="text-[10px] text-amber-400">
                          {trade.setup.liquidityType} Sweep
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        <div>E: {formatPrice(trade.execution.entryPrice, trade.instrument)}</div>
                        <div className="text-rose-400">
                          SL: {formatPrice(trade.execution.stopLoss, trade.instrument)}
                        </div>
                        <div className="text-emerald-400">
                          TP: {formatPrice(trade.execution.takeProfit, trade.instrument)}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-300">
                        1 : {trade.execution.rr}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.quality.ruleFollowing
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {trade.quality.score}/8 ({trade.quality.grade})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        {trade.result ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isWin
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isLoss
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {trade.result.resultR > 0 ? `+${trade.result.resultR}R` : `${trade.result.resultR}R`}
                          </span>
                        ) : (
                          <span className="text-slate-500">OPEN</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-400">
                        <div>MFE: +{trade.result?.mfeR || 0}R</div>
                        <div>MAE: -{trade.result?.maeR || 0}R</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-300">
                        <div>{trade.psychology.preTradeState}</div>
                        <div className="text-[10px] text-slate-500">
                          {trade.psychology.followedPlan ? '✓ Followed Plan' : '✗ Impulsive'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTrade(trade.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div>
                <span className="text-xs text-sky-400 uppercase font-mono">Trade Detail Record</span>
                <h3 className="text-base font-bold text-white">
                  #{String(selectedTrade.tradeNumber).padStart(3, '0')} — {selectedTrade.instrument} ({selectedTrade.direction})
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Snapshot image if saved */}
              {selectedTrade.screenshot?.dataUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <img
                    src={selectedTrade.screenshot.dataUrl}
                    alt="Chart snapshot"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Execution & Result Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Outcome</span>
                  <strong className={selectedTrade.result?.outcome === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedTrade.result?.outcome} ({selectedTrade.result?.resultR}R)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Realized P&L</span>
                  <strong className="text-white">${selectedTrade.result?.pnl || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MFE (Favorable)</span>
                  <strong className="text-emerald-400">+{selectedTrade.result?.mfeR}R</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MAE (Adverse)</span>
                  <strong className="text-rose-400">-{selectedTrade.result?.maeR}R</strong>
                </div>
              </div>

              {/* Trader Reflection Notes */}
              <div className="space-y-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-sky-400 block font-bold">Why did I take this trade?</span>
                  <p className="text-slate-300 text-xs mt-0.5">{selectedTrade.notes.whyTaken || 'No notes'}</p>
                </div>
                {selectedTrade.notes.whatHappened && (
                  <div>
                    <span className="text-[10px] text-amber-400 block font-bold">What happened after entry?</span>
                    <p className="text-slate-300 text-xs mt-0.5">{selectedTrade.notes.whatHappened}</p>
                  </div>
                )}
                {selectedTrade.notes.whatLearned && (
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-bold">What did I learn?</span>
                    <p className="text-slate-300 text-xs mt-0.5">{selectedTrade.notes.whatLearned}</p>
                  </div>
                )}
              </div>

              {/* Psychology Record */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Pre-Trade Emotional State</span>
                  <strong className="text-sky-300">{selectedTrade.psychology.preTradeState}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Followed Plan</span>
                  <strong className={selectedTrade.psychology.followedPlan ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedTrade.psychology.followedPlan ? 'YES' : 'NO'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Would Take Again?</span>
                  <strong className={selectedTrade.psychology.wouldTakeAgain ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedTrade.psychology.wouldTakeAgain ? 'YES' : 'NO'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
