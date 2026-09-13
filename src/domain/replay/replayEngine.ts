import { Instrument, MarketCandle, ReplayMode, ReplaySpeed, ReplayState } from '../../types/domain';

export type ReplayEventListener = (state: ReplayState) => void;

export class ReplayEngine {
  private fullDataset: MarketCandle[] = [];
  private state: ReplayState;
  private listeners: Set<ReplayEventListener> = new Set();
  private timer: number | null = null;

  constructor(initialInstrument: Instrument = 'US30', initialDate = '2024-05-10') {
    this.state = {
      instrument: initialInstrument,
      timeframe: 'M5',
      date: initialDate,
      currentIndex: 0,
      totalCandles: 0,
      revealedCandles: [],
      replayMode: 'blind',
      isPlaying: false,
      speed: 1,
      isBlind: true,
      futureRevealed: false,
    };
  }

  public subscribe(listener: ReplayEventListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  public getState(): ReplayState {
    return {
      ...this.state,
      // Strictly enforce no-lookahead by producing immutable sliced array
      revealedCandles: this.state.futureRevealed
        ? [...this.fullDataset]
        : this.fullDataset.slice(0, this.state.currentIndex + 1),
    };
  }

  /**
   * Initializes or loads a new historical dataset.
   * Starts at initial candle index (e.g. at 08:30 or 09:30 NY open or 0).
   */
  public loadDataset(
    instrument: Instrument,
    timeframe: string,
    date: string,
    candles: MarketCandle[],
    mode: ReplayMode = 'blind',
    startIndex = 0
  ): void {
    this.pause();
    this.fullDataset = [...candles].sort((a, b) => a.time - b.time);

    // If starting in blind replay, default start to pre-market or open (e.g. index 110 or 0)
    const initialIndex = Math.min(Math.max(0, startIndex), Math.max(0, this.fullDataset.length - 1));

    this.state = {
      instrument,
      timeframe,
      date,
      currentIndex: initialIndex,
      totalCandles: this.fullDataset.length,
      revealedCandles: this.fullDataset.slice(0, initialIndex + 1),
      replayMode: mode,
      isPlaying: false,
      speed: 1,
      isBlind: mode === 'blind' || mode === 'trade',
      futureRevealed: mode === 'normal',
    };

    this.notify();
  }

  public setMode(mode: ReplayMode): void {
    const isBlind = mode === 'blind' || mode === 'trade';
    this.state.replayMode = mode;
    this.state.isBlind = isBlind;
    if (mode === 'normal') {
      this.state.futureRevealed = true;
    }
    this.notify();
  }

  public play(): void {
    if (this.state.isPlaying) return;
    this.state.isPlaying = true;
    this.notify();
    this.scheduleNextTick();
  }

  public pause(): void {
    if (!this.state.isPlaying && this.timer === null) return;
    this.state.isPlaying = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setSpeed(speed: ReplaySpeed): void {
    this.state.speed = speed;
    if (this.state.isPlaying) {
      if (this.timer !== null) {
        window.clearTimeout(this.timer);
      }
      this.scheduleNextTick();
    }
    this.notify();
  }

  public nextCandle(): boolean {
    if (this.state.currentIndex < this.fullDataset.length - 1) {
      this.state.currentIndex++;
      this.state.revealedCandles = this.fullDataset.slice(0, this.state.currentIndex + 1);
      this.notify();
      return true;
    } else {
      this.pause();
      return false;
    }
  }

  public previousCandle(): boolean {
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.state.revealedCandles = this.fullDataset.slice(0, this.state.currentIndex + 1);
      this.notify();
      return true;
    }
    return false;
  }

  public firstCandle(): void {
    this.pause();
    this.state.currentIndex = 0;
    this.state.revealedCandles = this.fullDataset.slice(0, 1);
    this.notify();
  }

  public lastCandle(): void {
    this.pause();
    this.state.currentIndex = Math.max(0, this.fullDataset.length - 1);
    this.state.revealedCandles = [...this.fullDataset];
    this.notify();
  }

  public reset(startIndex = 0): void {
    this.pause();
    this.state.currentIndex = startIndex;
    this.state.futureRevealed = this.state.replayMode === 'normal';
    this.state.revealedCandles = this.fullDataset.slice(0, startIndex + 1);
    this.notify();
  }

  public jumpToIndex(index: number): void {
    const clamped = Math.max(0, Math.min(this.fullDataset.length - 1, index));
    this.state.currentIndex = clamped;
    this.state.revealedCandles = this.state.futureRevealed
      ? [...this.fullDataset]
      : this.fullDataset.slice(0, clamped + 1);
    this.notify();
  }

  /**
   * Jump forward to the next probable ICT inflection setup candle (e.g. 09:45 or 10:00 or 10:15)
   */
  public jumpToNextSetup(): void {
    if (this.fullDataset.length === 0) return;
    // Step forward ~6 candles (30 minutes on M5)
    this.jumpToIndex(this.state.currentIndex + 6);
  }

  public revealFuture(): void {
    this.state.futureRevealed = true;
    this.state.revealedCandles = [...this.fullDataset];
    this.notify();
  }

  public hideFuture(): void {
    this.state.futureRevealed = false;
    this.state.revealedCandles = this.fullDataset.slice(0, this.state.currentIndex + 1);
    this.notify();
  }

  public toggleRevealFuture(): void {
    if (this.state.futureRevealed) {
      this.hideFuture();
    } else {
      this.revealFuture();
    }
  }

  public canGoNext(): boolean {
    return this.state.currentIndex < this.fullDataset.length - 1;
  }

  public canGoPrevious(): boolean {
    return this.state.currentIndex > 0;
  }

  public getCurrentCandle(): MarketCandle | null {
    if (this.state.currentIndex < 0 || this.state.currentIndex >= this.fullDataset.length) {
      return null;
    }
    return this.fullDataset[this.state.currentIndex];
  }

  public getFullDataset(): MarketCandle[] {
    return this.fullDataset;
  }

  private scheduleNextTick(): void {
    if (!this.state.isPlaying) return;

    // Base interval is 1000ms at 1x speed
    const intervalMs = Math.max(100, Math.round(1000 / this.state.speed));

    this.timer = window.setTimeout(() => {
      const advanced = this.nextCandle();
      if (advanced && this.state.isPlaying) {
        this.scheduleNextTick();
      }
    }, intervalMs);
  }
}
