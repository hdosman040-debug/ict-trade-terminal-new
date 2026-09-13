import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FastForward,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { ReplayMode, ReplaySpeed, ReplayState } from '../../types/domain';
import { formatNYDateTime, getTradingWindowStatus } from '../../domain/timezone/nyTimezone';

interface ReplayControlsProps {
  replayState: ReplayState;
  onPlayToggle: () => void;
  onNextCandle: () => void;
  onPrevCandle: () => void;
  onFirstCandle: () => void;
  onLastCandle: () => void;
  onReset: () => void;
  onJumpToSetup: () => void;
  onSetSpeed: (speed: ReplaySpeed) => void;
  onSetMode: (mode: ReplayMode) => void;
  onToggleRevealFuture: () => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  replayState,
  onPlayToggle,
  onNextCandle,
  onPrevCandle,
  onFirstCandle,
  onLastCandle,
  onReset,
  onJumpToSetup,
  onSetSpeed,
  onSetMode,
  onToggleRevealFuture,
}) => {
  const currentCandle = replayState.revealedCandles[replayState.currentIndex] || null;
  const currentTimestamp = currentCandle ? currentCandle.time : 0;
  const windowStatus = currentTimestamp ? getTradingWindowStatus(currentTimestamp) : 'BEFORE_WINDOW';

  const revealedCount = replayState.revealedCandles.length;
  const totalCount = replayState.totalCandles;
  const hiddenCount = Math.max(0, totalCount - revealedCount);
  const progressPercent = totalCount > 0 ? Math.round((revealedCount / totalCount) * 100) : 0;

  const speeds: ReplaySpeed[] = [0.25, 0.5, 1, 2, 5, 10];

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
      {/* Top Bar: Progress & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            {currentTimestamp ? formatNYDateTime(currentTimestamp) : 'No Data'}
          </span>

          {/* Window Badge */}
          {windowStatus === 'ACTIVE_WINDOW' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NY AM ACTIVE (09:45–12:00)
            </span>
          ) : windowStatus === 'BEFORE_WINDOW' ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
              PRE-WINDOW
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              POST-WINDOW
            </span>
          )}

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            {(['blind', 'trade', 'normal'] as ReplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetMode(mode)}
                className={`px-2 py-0.5 text-[11px] rounded uppercase font-mono transition-colors ${
                  replayState.replayMode === mode
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Revealed vs Hidden count */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>
            Visible: <strong className="text-sky-400">{revealedCount}</strong>
          </span>
          <span>
            Hidden: <strong className={hiddenCount > 0 ? 'text-amber-400' : 'text-slate-600'}>{hiddenCount}</strong>
          </span>
          <span>
            Total: <strong className="text-slate-300">{totalCount}</strong>
          </span>

          {/* Blind Reveal Future Toggle */}
          {replayState.isBlind && (
            <button
              onClick={onToggleRevealFuture}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
                replayState.futureRevealed
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {replayState.futureRevealed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide Future
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Reveal Future
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Timeline Bar */}
      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-sky-500 h-full transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Control Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Playback step buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onFirstCandle}
            title="First Candle"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPrevCandle}
            title="Previous Candle (Left Arrow)"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayToggle}
            title="Play/Pause (Space)"
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              replayState.isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {replayState.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Play
              </>
            )}
          </button>

          <button
            onClick={onNextCandle}
            title="Next Candle (Right Arrow)"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onLastCandle}
            title="Last Candle"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            title="Reset Replay"
            className="flex items-center gap-1 px-2 py-1.5 ml-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={onJumpToSetup}
            title="Fast Forward to Next Setup Candlestick"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 hover:bg-sky-900 text-xs transition-colors ml-1"
          >
            <FastForward className="w-3.5 h-3.5" />
            Next Setup
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1 font-mono text-[11px]">Speed:</span>
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] rounded font-mono transition-colors ${
                  replayState.speed === s
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
