import React, { useState } from 'react';
import {
  EmotionalState,
  EntryModel,
  Instrument,
  MarketContext,
  QualityScore,
  RiskDecision,
  RiskSettings,
  SetupState,
  TradeDirection,
} from '../../types/domain';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DecisionCheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  instrument: Instrument;
  context: MarketContext;
  setup: SetupState;
  quality: QualityScore;
  riskSettings: RiskSettings;
  riskDecision: RiskDecision;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  onChangeDirection: (dir: TradeDirection) => void;
  onChangePrice: (type: 'entry' | 'sl' | 'tp', val: number) => void;
  onTakeTrade: (params: {
    entryModel: EntryModel;
    confidence: 1 | 2 | 3 | 4 | 5;
    psychology: EmotionalState;
    whyTaken: string;
  }) => void;
  onSkipTrade: (reason: string) => void;
}

export const DecisionCheckpointModal: React.FC<DecisionCheckpointModalProps> = ({
  isOpen,
  onClose,
  instrument,
  context,
  setup,
  quality,
  riskDecision,
  direction,
  entryPrice,
  stopLoss,
  takeProfit,
  onChangeDirection,
  onChangePrice,
  onTakeTrade,
  onSkipTrade,
}) => {
  const [selectedModel, setSelectedModel] = useState<EntryModel>(
    setup.entryModel ?? 'FVG'
  );
  const [confidence, setConfidence] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [psychologyState, setPsychologyState] = useState<EmotionalState>('Calm');
  const [whyTaken, setWhyTaken] = useState('');
  const [skipReason, setSkipReason] = useState('Setup incomplete or R:R below plan.');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
              Replay Decision Checkpoint
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Evaluate ICT Setup: {instrument}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                quality.grade === 'A+' || quality.grade === 'A'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              Compliance {quality.score}/{quality.maxScore} ({quality.grade})
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Grid: Context & Setup Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">HTF Bias</span>
              <strong className={context.htfBias === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>
                {context.htfBias}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Your Liquidity</span>
              <strong className="text-amber-300">
                {setup.liquidityType ?? 'Not selected'}
              </strong>
              {setup.sweepPrice !== undefined && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Sweep: {setup.sweepPrice}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Dealing Range</span>
              <strong className="text-sky-300">{context.currentZone}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Session Window</span>
              <strong className="text-emerald-400">{context.tradingWindow}</strong>
            </div>
          </div>

          {/* Setup Sequence Checklist Status */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-2">Sequential ICT Rules Met:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {quality.details.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  {d.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className={d.passed ? 'text-slate-300' : 'text-slate-500 line-through'}>
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Geometry: Direction, Entry, SL, TP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Direction:</span>
                <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onChangeDirection('BUY')}
                    className={`px-3 py-1 text-xs rounded font-bold transition-colors ${
                      direction === 'BUY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDirection('SELL')}
                    className={`px-3 py-1 text-xs rounded font-bold transition-colors ${
                      direction === 'SELL'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SELL (Short)
                  </button>
                </div>

                <div className="ml-auto">
                  <span className="text-xs font-mono text-slate-400 mr-2">Model:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as EntryModel)}
                    className="bg-slate-950 border border-slate-800 text-xs rounded px-2 py-1 text-sky-400 font-mono"
                  >
                    <option value="FVG">Fair Value Gap</option>
                    <option value="ORDER_BLOCK">Order Block</option>
                  </select>
                </div>
              </div>

              {/* Numerical Price Inputs */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-sky-400 block mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => onChangePrice('entry', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => onChangePrice('sl', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 block mb-1">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => onChangePrice('tp', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Risk Calculation Results Box */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Calculated R:R:</span>
                <strong className={riskDecision.rrRatio >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                  1 : {riskDecision.rrRatio}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Risk / Reward Points:</span>
                <span className="text-white">
                  {riskDecision.riskPoints} pts / {riskDecision.rewardPoints} pts
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Risk Amount ($):</span>
                <span className="text-white">${riskDecision.riskAmount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Position Size (Lots):</span>
                <strong className="text-sky-400">{riskDecision.calculatedPositionSize} lots</strong>
              </div>

              {/* Permitted vs Blocked */}
              <div className="pt-2 border-t border-slate-800/80">
                {riskDecision.permitted ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>TRADE PERMITTED BY RISK PLAN</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 text-rose-400 text-[11px]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>RISK RESTRICTION:</strong>
                      {riskDecision.reasons.map((r) => (
                        <div key={r} className="text-[10px] text-rose-300">
                          • {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confidence & Psychology */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Pre-Trade Psychological State:</label>
              <select
                value={psychologyState}
                onChange={(e) => setPsychologyState(e.target.value as EmotionalState)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
              >
                {(['Calm', 'Focused', 'FOMO', 'Fear', 'Revenge', 'Boredom', 'Confident', 'Uncertain'] as EmotionalState[]).map(
                  (st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Confidence Rating (1 - 5):</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setConfidence(num as any)}
                    className={`flex-1 py-1 rounded font-bold font-mono transition-colors ${
                      confidence === num ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trade Hypothesis */}
          <div className="text-xs">
            <label className="text-slate-400 block mb-1">Why am I taking this trade? (Hypothesis):</label>
            <textarea
              rows={2}
              value={whyTaken}
              onChange={(e) => setWhyTaken(e.target.value)}
              placeholder="Describe market setup, liquidity sweep, and target expectation..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 text-xs font-mono"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onSkipTrade(skipReason);
                onClose();
              }}
              className="px-4 py-2 rounded text-xs font-mono bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              [ SKIP TRADE ]
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!riskDecision.permitted}
              onClick={() => {
                onTakeTrade({
                  entryModel: selectedModel,
                  confidence,
                  psychology: psychologyState,
                  whyTaken,
                });
                onClose();
              }}
              className={`px-5 py-2 rounded text-xs font-bold font-mono shadow-lg transition-colors ${
                riskDecision.permitted
                  ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              [ TAKE TRADE & REVEAL ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
