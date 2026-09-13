import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  EmotionalState,
  EntryModel,
  Instrument,
  MarketCandle,
  ReplayMode,
  ReplaySpeed,
  ReplayState,
  RiskSettings,
  SetupState,
  Trade,
  TradeDirection,
} from './types/domain';
import { DEFAULT_RISK_SETTINGS, RiskEngine } from './domain/risk/riskEngine';
import { LocalMarketDataProvider } from './domain/marketData/defaultProvider';
import { ReplayEngine } from './domain/replay/replayEngine';
import { MarketContextEngine } from './domain/ict/marketContextEngine';
import { QualityEngine } from './domain/ict/qualityEngine';
import { TradeResultEngine } from './domain/trade/tradeResultEngine';
import { LocalTradeRepository } from './domain/storage/tradeRepository';
import { formatPrice } from './domain/marketData/instruments';

// Subcomponents
import { MarketChart } from './components/chart/MarketChart';
import { ReplayControls } from './components/replay/ReplayControls';
import { MarketContextPanel } from './components/context/MarketContextPanel';
import { SetupStatePanel } from './components/setup/SetupStatePanel';
import { DecisionCheckpointModal } from './components/replay/DecisionCheckpointModal';
import { TradeJournalView } from './components/journal/TradeJournalView';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { DataManagerModal } from './components/data/DataManagerModal';
import { DiagnosticsModal } from './components/diagnostics/DiagnosticsModal';
import { SettingsModal } from './components/settings/SettingsModal';

// Icons
import {
  Play,
  BookOpen,
  BarChart3,
  Database,
  ShieldCheck,
  Settings as SettingsIcon,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'replay' | 'journal' | 'analytics'>('replay');

  // Active Instrument & Session
  const [instrument, setInstrument] = useState<Instrument>('US30');
  const [selectedDate, setSelectedDate] = useState<string>('2024-05-10');
  const [timeframe, setTimeframe] = useState<string>('M5');

  // Settings & Risk Config
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);

  // Singletons
  const marketDataProvider = useMemo(() => new LocalMarketDataProvider(), []);
  const tradeRepository = useMemo(() => new LocalTradeRepository(), []);
  const replayEngine = useMemo(() => new ReplayEngine('US30', '2024-05-10'), []);

  // Replay State
  const [replayState, setReplayState] = useState<ReplayState>(replayEngine.getState());

  // Stored Trades
  const [trades, setTrades] = useState<Trade[]>([]);

  // Trade plan in staging
  const [tradeDirection, setTradeDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState<number>(39450);
  const [stopLoss, setStopLoss] = useState<number>(39380);
  const [takeProfit, setTakeProfit] = useState<number>(39600);

  // Manual ICT setup state.
  // The trader confirms ICT conditions; the application does not detect them.
  const [manualSetup, setManualSetup] = useState<SetupState>({
    htfContext: false,
    liquidityIdentified: false,
    liquiditySwept: false,
    reclaimConfirmed: false,
    displacementConfirmed: false,
    mssConfirmed: false,
    retracementConfirmed: false,
    entryZoneTouched: false,
    entryModelSelected: false,
    isActionable: false,
    missingConditions: [],
  });

  // Active Open Position during replay
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);

  // Modals
  const [isCheckpointOpen, setIsCheckpointOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Screenshot helper ref from canvas
  const getScreenshotRef = useRef<(() => string) | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to replay engine changes
  useEffect(() => {
    return replayEngine.subscribe((state) => {
      setReplayState(state);
    });
  }, [replayEngine]);

  // Load saved trades on initial mount & seed demo trades
  useEffect(() => {
    tradeRepository.seedDemoTradesIfEmpty().then(() => {
      tradeRepository.list().then((list) => {
        setTrades(list);
      });
    });
  }, [tradeRepository]);

  // Initialize or change session dataset
  const loadSession = useCallback(
    (targetInst: Instrument, date: string) => {
      marketDataProvider.getCandlesForDate(targetInst, 'M5', date).then((candles) => {
        replayEngine.loadDataset(targetInst, 'M5', date, candles, 'blind', 0);
        setManualSetup({
          htfContext: false,
          liquidityIdentified: false,
          liquiditySwept: false,
          reclaimConfirmed: false,
          displacementConfirmed: false,
          mssConfirmed: false,
          retracementConfirmed: false,
          entryZoneTouched: false,
          entryModelSelected: false,
          isActionable: false,
          missingConditions: [],
        });
        setInstrument(targetInst);
        setSelectedDate(date);

        if (candles.length > 0) {
          const cur = candles[0].close;
          setEntryPrice(cur);
          const isInd = targetInst === 'US30' || targetInst === 'NAS100';
          const riskDelta = isInd ? 60 : 3;
          setStopLoss(cur - riskDelta);
          setTakeProfit(cur + riskDelta * 2);
        }
      });
    },
    [marketDataProvider, replayEngine]
  );

  // Initial load on first render
  useEffect(() => {
    loadSession('US30', '2024-05-10');
  }, [loadSession]);

  // Market context is calculated from revealed candles only.
  // ICT setup interpretation is manual.
  const currentCandle = replayState.revealedCandles[replayState.currentIndex] || null;
  const marketContext = MarketContextEngine.calculateContext(replayState.revealedCandles, timeframe);

  const setupState = useMemo<SetupState>(() => {
    const missingConditions: string[] = [];

    if (!manualSetup.htfContext) missingConditions.push('HTF context not confirmed');
    if (!manualSetup.liquidityIdentified) missingConditions.push('Liquidity not identified');
    if (!manualSetup.liquiditySwept) missingConditions.push('Liquidity sweep not confirmed');
    if (!manualSetup.reclaimConfirmed) missingConditions.push('Reclaim not confirmed');
    if (!manualSetup.displacementConfirmed) missingConditions.push('Displacement not confirmed');
    if (!manualSetup.mssConfirmed) missingConditions.push('MSS not confirmed');
    if (!manualSetup.retracementConfirmed) missingConditions.push('Retracement not confirmed');
    if (!manualSetup.entryZoneTouched) missingConditions.push('Entry zone not touched');
    if (!manualSetup.entryModelSelected) missingConditions.push('Entry model not selected');

    return {
      ...manualSetup,
      missingConditions,
      isActionable: missingConditions.length === 0,
    };
  }, [manualSetup]);

  const qualityScore = QualityEngine.calculateQuality(setupState);

  // Auto-sync staged entry price when current candle changes if not manually set
  useEffect(() => {
    if (currentCandle && !activeTrade) {
      setEntryPrice(currentCandle.close);
      const riskDelta = instrument === 'US30' ? 60 : instrument === 'NAS100' ? 30 : 2.5;
      if (tradeDirection === 'BUY') {
        setStopLoss(Number((currentCandle.close - riskDelta).toFixed(2)));
        setTakeProfit(Number((currentCandle.close + riskDelta * 2.2).toFixed(2)));
      } else {
        setStopLoss(Number((currentCandle.close + riskDelta).toFixed(2)));
        setTakeProfit(Number((currentCandle.close - riskDelta * 2.2).toFixed(2)));
      }
    }
  }, [replayState.currentIndex, currentCandle?.time, tradeDirection, activeTrade, instrument]);

  // Daily risk controls
  const dailyState = RiskEngine.calculateDailyRiskState(trades, selectedDate);
  const riskDecision = RiskEngine.evaluateRisk(
    instrument,
    tradeDirection,
    entryPrice,
    stopLoss,
    takeProfit,
    settings,
    dailyState
  );

  // Check active trade outcome against newly revealed candles
  useEffect(() => {
    if (!activeTrade) return;

    const result = TradeResultEngine.evaluateTradeOutcome(
      activeTrade,
      replayState.revealedCandles,
      activeTrade.execution.entryReplayIndex
    );

    if (result.outcome === 'WIN' || result.outcome === 'LOSS') {
      const closedTrade: Trade = {
        ...activeTrade,
        result,
      };
      tradeRepository.create(closedTrade).then(() => {
        tradeRepository.list().then(setTrades);
        setActiveTrade(null);
        showToast(
          `Trade #${closedTrade.tradeNumber} Closed: ${result.outcome} (${
            result.resultR > 0 ? '+' : ''
          }${result.resultR}R | $${result.pnl})`
        );
      });
    }
  }, [replayState.revealedCandles.length, activeTrade, tradeRepository]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        replayEngine.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        replayEngine.nextCandle();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        replayEngine.previousCandle();
      } else if (e.code === 'KeyR') {
        replayEngine.reset();
      } else if (e.code === 'KeyT') {
        setIsCheckpointOpen(true);
      } else if (e.code === 'KeyF') {
        replayEngine.toggleRevealFuture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replayEngine]);

  // Execute trade from checkpoint or staging
  const handleExecuteTrade = (params: {
    entryModel: EntryModel;
    confidence: 1 | 2 | 3 | 4 | 5;
    psychology: EmotionalState;
    whyTaken: string;
  }) => {
    if (!currentCandle) return;

    const currentReplayIndex = replayState.currentIndex;
    const newTrade: Trade = {
      id: `trade_${Date.now()}`,
      tradeNumber: trades.length + 1,
      instrument,
      date: selectedDate,
      timestamp: currentCandle.time,
      session: marketContext.currentSession,
      dayOfWeek: new Date(currentCandle.time * 1000).toLocaleDateString('en-US', { weekday: 'long' }),
      direction: tradeDirection,
      marketContext: {
        htfBias: marketContext.htfBias,
        structure: marketContext.structure,
        premiumDiscount: marketContext.currentZone,
        pdh: marketContext.pdh,
        pdl: marketContext.pdl,
        sessionLiquidity: {
          asiaHigh: marketContext.asiaHigh,
          asiaLow: marketContext.asiaLow,
          londonHigh: marketContext.londonHigh,
          londonLow: marketContext.londonLow,
        },
      },
      setup: {
        liquidityType: setupState.targetLiquidity?.type || 'SSL',
        liquiditySwept: setupState.liquiditySwept,
        sweepPrice: setupState.targetLiquidity?.sweptPrice || entryPrice,
        reclaimConfirmed: setupState.reclaimConfirmed,
        displacementConfirmed: setupState.displacementConfirmed,
        mssConfirmed: setupState.mssConfirmed,
        retracementConfirmed: setupState.retracementConfirmed,
        entryZoneTouched: setupState.entryZoneTouched,
        entryModel: params.entryModel,
        setupSequenceCompleted: setupState.isActionable,
      },
      execution: {
        entryPrice,
        stopLoss,
        takeProfit,
        riskAmount: riskDecision.riskAmount,
        riskPercent: settings.riskPercent,
        rr: riskDecision.rrRatio,
        positionSize: riskDecision.calculatedPositionSize,
        entryReplayIndex: currentReplayIndex,
        entryTimestamp: currentCandle.time,
      },
      quality: {
        score: qualityScore.score,
        maxScore: qualityScore.maxScore,
        grade: qualityScore.grade,
        ruleFollowing: qualityScore.score >= 7,
        missingRules: setupState.missingConditions,
      },
      confidence: params.confidence,
      psychology: {
        preTradeState: params.psychology,
        followedPlan: qualityScore.score >= 7,
        wasImpulsive: qualityScore.score < 6,
        wouldTakeAgain: true,
      },
      notes: {
        whyTaken: params.whyTaken,
        whatHappened: '',
        whatLearned: '',
      },
      screenshot: getScreenshotRef.current
        ? {
            id: `ss_${Date.now()}`,
            tradeId: `trade_${Date.now()}`,
            dataUrl: getScreenshotRef.current(),
            timestamp: currentCandle.time,
            replayIndex: currentReplayIndex,
            annotationsCount: 0,
          }
        : undefined,
    };

    setActiveTrade(newTrade);
    showToast(`Trade #${newTrade.tradeNumber} Executed: ${tradeDirection} @ ${entryPrice}`);
    replayEngine.nextCandle();
  };

  const handleSkipTrade = (reason: string) => {
    showToast(`Trade Skipped: ${reason}`);
  };

  const handleUpdatePrice = (type: 'entry' | 'sl' | 'tp', price: number) => {
    if (type === 'entry') setEntryPrice(price);
    if (type === 'sl') setStopLoss(price);
    if (type === 'tp') setTakeProfit(price);
  };

  // Close active trade early at current market price
  const handleManualCloseTrade = () => {
    if (!activeTrade || !currentCandle) return;
    const closed: Trade = {
      ...activeTrade,
      result: {
        outcome: 'BREAKEVEN',
        exitPrice: currentCandle.close,
        exitTimestamp: currentCandle.time,
        exitReplayIndex: replayState.currentIndex,
        resultR: 0,
        pnl: 0,
        mfe: 0,
        mfeR: 0,
        mae: 0,
        maeR: 0,
        timeToCloseMinutes: Math.round((currentCandle.time - activeTrade.execution.entryTimestamp) / 60),
        candlesToClose: Math.max(1, replayState.currentIndex - activeTrade.execution.entryReplayIndex),
      },
    };
    tradeRepository.create(closed).then(() => {
      tradeRepository.list().then(setTrades);
      setActiveTrade(null);
      showToast(`Trade #${closed.tradeNumber} Manually Closed at ${currentCandle.close}`);
    });
  };

  // Check active trade unrealized excursions
  const activeExcursion = useMemo(() => {
    if (!activeTrade || !currentCandle) return null;
    return TradeResultEngine.evaluateTradeOutcome(
      activeTrade,
      replayState.revealedCandles,
      activeTrade.execution.entryReplayIndex
    );
  }, [activeTrade, currentCandle, replayState.revealedCandles]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold font-mono text-sm">
              ICT
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                ICT Trade Terminal
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                  PRO
                </span>
              </h1>
            </div>
          </div>

          {/* Instrument Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 ml-2">
            {(['US30', 'NAS100', 'XAUUSD'] as Instrument[]).map((inst) => (
              <button
                key={inst}
                onClick={() => loadSession(inst, selectedDate)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors ${
                  instrument === inst
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-mono">
            {(['M1', 'M5', 'M15', 'H1'] as string[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('replay')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'replay'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Replay Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'journal'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journal</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-sky-300 font-mono">
              {trades.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'analytics'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Edge Analytics</span>
          </button>
        </div>

        {/* Action Utility Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDataManagerOpen(true)}
            title="Market Data & CSV Importer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Sessions</span>
          </button>

          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            title="Automated Test Suite Diagnostics"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Verify Engine</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Risk Parameters"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Tab 1: Replay & Execution Terminal */}
        {activeTab === 'replay' && (
          <div className="flex h-full w-full p-2.5 gap-2.5">
            {/* Left: Chart + Replay Controls */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-0 h-full">
              <div className="flex-1 min-h-0 relative">
                <MarketChart
                  candles={replayState.revealedCandles}
                  instrument={instrument}
                  liquidityLevels={setupState.targetLiquidity ? [setupState.targetLiquidity] : []}
                  fvgs={setupState.activeFVG ? [setupState.activeFVG] : []}
                  orderBlocks={setupState.activeOrderBlock ? [setupState.activeOrderBlock] : []}
                  mss={setupState.activeMSS || null}
                  activeTrade={
                    activeTrade
                      ? {
                          direction: activeTrade.direction,
                          entryPrice: activeTrade.execution.entryPrice,
                          stopLoss: activeTrade.execution.stopLoss,
                          takeProfit: activeTrade.execution.takeProfit,
                          riskAmount: activeTrade.execution.riskAmount,
                        }
                      : {
                          direction: tradeDirection,
                          entryPrice,
                          stopLoss,
                          takeProfit,
                          riskAmount: riskDecision.riskAmount,
                        }
                  }
                  onUpdateTradePrice={handleUpdatePrice}
                  onCanvasReady={(getter) => {
                    getScreenshotRef.current = getter;
                  }}
                />
              </div>

              {/* Replay Controls HUD */}
              <div className="shrink-0">
                <ReplayControls
                  replayState={replayState}
                  onPlayToggle={() => replayEngine.togglePlay()}
                  onNextCandle={() => replayEngine.nextCandle()}
                  onPrevCandle={() => replayEngine.previousCandle()}
                  onFirstCandle={() => replayEngine.firstCandle()}
                  onLastCandle={() => replayEngine.lastCandle()}
                  onReset={() => {
                    replayEngine.reset();
                    setActiveTrade(null);
                  }}
                  onJumpToSetup={() => replayEngine.jumpToNextSetup()}
                  onSetSpeed={(s) => replayEngine.setSpeed(s)}
                  onSetMode={(m) => replayEngine.setMode(m)}
                  onToggleRevealFuture={() => replayEngine.toggleRevealFuture()}
                />
              </div>
            </div>

            {/* Right: Setup Sequence, Context & Trade Staging Sidebar */}
            <div className="w-80 shrink-0 flex flex-col gap-2.5 overflow-y-auto">
              {/* Active Open Trade Card (if in position) */}
              {activeTrade && currentCandle && (
                <div className="bg-gradient-to-br from-slate-900 to-sky-950/40 p-3 rounded-lg border border-sky-800/80 text-xs font-mono space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      ACTIVE POSITION #{activeTrade.tradeNumber}
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        activeTrade.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {activeTrade.direction}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Entry:</span>
                      <strong className="text-white">
                        {formatPrice(activeTrade.execution.entryPrice, instrument)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Current:</span>
                      <strong className="text-sky-300">{formatPrice(currentCandle.close, instrument)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Max Favorable (MFE):</span>
                      <strong className="text-emerald-400">+{activeExcursion?.mfeR || 0}R</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Max Adverse (MAE):</span>
                      <strong className="text-rose-400">-{activeExcursion?.maeR || 0}R</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleManualCloseTrade}
                    className="w-full py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                  >
                    Close Position Early
                  </button>
                </div>
              )}

              {/* Trade Execution Staging Box (if not in position) */}
              {!activeTrade && (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">Execution Staging</span>
                    <span className="text-[10px] text-slate-400">1 : {riskDecision.rrRatio} R:R</span>
                  </div>

                  {/* Direction Switch */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                    <button
                      onClick={() => setTradeDirection('BUY')}
                      className={`py-1 rounded font-bold transition-colors ${
                        tradeDirection === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setTradeDirection('SELL')}
                      className={`py-1 rounded font-bold transition-colors ${
                        tradeDirection === 'SELL'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SELL
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div>
                      <label className="text-[9px] text-sky-400 block mb-0.5">Entry</label>
                      <input
                        type="number"
                        step="any"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-rose-400 block mb-0.5">Stop (SL)</label>
                      <input
                        type="number"
                        step="any"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-emerald-400 block mb-0.5">Target (TP)</label>
                      <input
                        type="number"
                        step="any"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white"
                      />
                    </div>
                  </div>

                  {/* Position Sizing Info */}
                  <div className="flex justify-between text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded">
                    <span>Risk: ${riskDecision.riskAmount}</span>
                    <span>
                      Size:{' '}
                      <strong className="text-sky-400">
                        {riskDecision.calculatedPositionSize} lots
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={() => setIsCheckpointOpen(true)}
                    className="w-full py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-all shadow-md"
                  >
                    Open Decision Checkpoint
                  </button>
                </div>
              )}

              {/* Setup State Sequence Panel */}
              <SetupStatePanel
                setup={setupState}
                quality={qualityScore}
                onChangeBoolean={(field, value) =>
                  setManualSetup((prev) => ({
                    ...prev,
                    [field]: value,
                  }))
                }
                onChangeLiquidityType={(value) =>
                  setManualSetup((prev) => ({
                    ...prev,
                    liquidityType: value,
                  }))
                }
                onChangeSweepPrice={(value) =>
                  setManualSetup((prev) => ({
                    ...prev,
                    sweepPrice: value,
                  }))
                }
                onChangeEntryModel={(value) =>
                  setManualSetup((prev) => ({
                    ...prev,
                    entryModel: value,
                    entryModelSelected: true,
                  }))
                }
                onOpenDecisionCheckpoint={() => setIsCheckpointOpen(true)}
              />

              {/* Market Context Panel */}
              <MarketContextPanel context={marketContext} instrument={instrument} />
            </div>
          </div>
        )}

        {/* Tab 2: Trade Journal */}
        {activeTab === 'journal' && (
          <TradeJournalView
            trades={trades}
            onDeleteTrade={(id) => {
              tradeRepository.delete(id).then(() => {
                tradeRepository.list().then(setTrades);
                showToast('Trade record deleted');
              });
            }}
            onExportTrades={() => {
              tradeRepository.exportJSON().then((json) => {
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ict_trades_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Exported trade records to JSON');
              });
            }}
            onImportTrades={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                const text = event.target?.result as string;
                tradeRepository.importJSON(text).then((count) => {
                  tradeRepository.list().then(setTrades);
                  showToast(`Imported ${count} trades into journal`);
                });
              };
              reader.readAsText(file);
            }}
          />
        )}

        {/* Tab 3: Edge Analytics & Statistics */}
        {activeTab === 'analytics' && <AnalyticsDashboard trades={trades} />}
      </main>

      {/* Decision Checkpoint Modal */}
      <DecisionCheckpointModal
        isOpen={isCheckpointOpen}
        onClose={() => setIsCheckpointOpen(false)}
        instrument={instrument}
        context={marketContext}
        setup={setupState}
        quality={qualityScore}
        riskSettings={settings}
        riskDecision={riskDecision}
        direction={tradeDirection}
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        takeProfit={takeProfit}
        onChangeDirection={setTradeDirection}
        onChangePrice={handleUpdatePrice}
        onTakeTrade={handleExecuteTrade}
        onSkipTrade={handleSkipTrade}
      />

      {/* Data Manager Modal */}
      <DataManagerModal
        isOpen={isDataManagerOpen}
        onClose={() => setIsDataManagerOpen(false)}
        currentInstrument={instrument}
        currentDate={selectedDate}
        onSelectSession={(inst, date) => loadSession(inst, date)}
        onImportCustomCandles={(id, inst, tf, customCandles) => {
          replayEngine.loadDataset(inst, tf, 'custom', customCandles, 'blind', 0);
          setInstrument(inst);
          setTimeframe(tf);
          showToast(`Loaded custom CSV dataset: ${customCandles.length} candles`);
        }}
      />

      {/* Test Suite Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          showToast('Settings saved');
        }}
        onClearAllData={() => {
          tradeRepository.clear().then(() => {
            setTrades([]);
            showToast('All trade journal data cleared');
          });
        }}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-sky-300 border border-sky-800/80 px-4 py-2.5 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
