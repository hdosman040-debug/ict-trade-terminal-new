import React from 'react';
import {
  EntryModel,
  LiquidityType,
  QualityScore,
  SetupState,
} from '../../types/domain';
import {
  CheckCircle2,
  CircleDot,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

type ManualBooleanField =
  | 'htfContext'
  | 'liquidityIdentified'
  | 'liquiditySwept'
  | 'reclaimConfirmed'
  | 'displacementConfirmed'
  | 'mssConfirmed'
  | 'retracementConfirmed'
  | 'entryZoneTouched'
  | 'entryModelSelected';

interface SetupStatePanelProps {
  setup: SetupState;
  quality: QualityScore;
  onChangeBoolean: (field: ManualBooleanField, value: boolean) => void;
  onChangeLiquidityType: (value: LiquidityType) => void;
  onChangeSweepPrice: (value: number | undefined) => void;
  onChangeEntryModel: (value: EntryModel) => void;
  onOpenDecisionCheckpoint: () => void;
}

const checklistItems: {
  field: ManualBooleanField;
  label: string;
}[] = [
  { field: 'htfContext', label: 'HTF context confirmed' },
  { field: 'liquidityIdentified', label: 'Liquidity identified' },
  { field: 'liquiditySwept', label: 'Liquidity sweep confirmed' },
  { field: 'reclaimConfirmed', label: 'Reclaim / close back inside' },
  { field: 'displacementConfirmed', label: 'Displacement confirmed' },
  { field: 'mssConfirmed', label: 'MSS confirmed' },
  { field: 'retracementConfirmed', label: 'Retracement occurred' },
  { field: 'entryZoneTouched', label: 'Entry zone touched' },
];

const liquidityOptions: LiquidityType[] = [
  'BSL',
  'SSL',
  'PDH',
  'PDL',
  'AsiaHigh',
  'AsiaLow',
  'LondonHigh',
  'LondonLow',
];

export const SetupStatePanel: React.FC<SetupStatePanelProps> = ({
  setup,
  quality,
  onChangeBoolean,
  onChangeLiquidityType,
  onChangeSweepPrice,
  onChangeEntryModel,
  onOpenDecisionCheckpoint,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 text-xs font-mono flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-sky-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Manual ICT Setup
        </span>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            setup.isActionable
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {setup.isActionable ? '● READY' : '○ INCOMPLETE'}
        </span>
      </div>

      {/* Quality */}
      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-500 block">
            Rule Compliance
          </span>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base font-bold text-white">
              {quality.score} / {quality.maxScore}
            </span>

            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                quality.grade === 'A+' || quality.grade === 'A'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : quality.grade === 'B'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              Grade {quality.grade}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-slate-500 block">
            Principle
          </span>
          <span className="text-[10px] text-slate-400">
            Your interpretation
          </span>
        </div>
      </div>

      {/* Manual checklist */}
      <div className="space-y-1.5 bg-slate-950/50 p-2 rounded border border-slate-800/60">

        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">
          Manual ICT Confirmation
        </div>

        {checklistItems.map((item) => {
          const confirmed = setup[item.field];

          return (
            <button
              key={item.field}
              type="button"
              onClick={() => onChangeBoolean(item.field, !confirmed)}
              className="w-full flex items-center justify-between text-left text-[11px] py-1 rounded hover:bg-slate-800/70 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {confirmed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}

                <span
                  className={
                    confirmed ? 'text-slate-200' : 'text-slate-500'
                  }
                >
                  {item.label}
                </span>
              </span>

              <span
                className={`text-[9px] font-bold ${
                  confirmed ? 'text-emerald-400' : 'text-slate-600'
                }`}
              >
                {confirmed ? 'CONFIRMED' : 'PENDING'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liquidity interpretation */}
      <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60 space-y-2">

        <div className="text-[9px] text-slate-500 uppercase tracking-wider">
          Your Liquidity Interpretation
        </div>

        <label className="block">
          <span className="text-[10px] text-slate-400 block mb-1">
            Liquidity Type
          </span>

          <select
            value={setup.liquidityType ?? ''}
            onChange={(e) =>
              onChangeLiquidityType(e.target.value as LiquidityType)
            }
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="" disabled>
              Select liquidity
            </option>

            {liquidityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] text-slate-400 block mb-1">
            Sweep Price
          </span>

          <input
            type="number"
            step="0.01"
            value={setup.sweepPrice ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              onChangeSweepPrice(
                value === '' ? undefined : Number(value)
              );
            }}
            placeholder="Price where liquidity was swept"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-sky-500"
          />
        </label>
      </div>

      {/* Entry model */}
      <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">

        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">
          Manual Entry Model
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['FVG', 'ORDER_BLOCK'] as EntryModel[]).map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => onChangeEntryModel(model)}
              className={`py-1.5 rounded border text-[10px] font-bold transition-colors ${
                setup.entryModel === model
                  ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                  : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              {model === 'ORDER_BLOCK' ? 'ORDER BLOCK' : 'FVG'}
            </button>
          ))}
        </div>
      </div>

      {/* Missing conditions */}
      {!setup.isActionable && setup.missingConditions.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/30 p-2 rounded text-[10px] text-amber-300/90 space-y-1">

          <span className="font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Still pending:
          </span>

          <ul className="list-disc list-inside space-y-0.5 text-amber-200/70">
            {setup.missingConditions.slice(0, 4).map((missing) => (
              <li key={missing}>{missing}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision checkpoint */}
      <button
        onClick={onOpenDecisionCheckpoint}
        className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-md ${
          setup.isActionable
            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 ring-2 ring-sky-400/40'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
        }`}
      >
        <span>Open Decision Checkpoint</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

    </div>
  );
};
