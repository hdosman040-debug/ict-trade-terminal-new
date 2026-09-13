import { Instrument, MarketCandle } from '../../types/domain';
import { MarketDataProvider } from './dataProvider';
import { HISTORICAL_SESSIONS, generateSessionCandles } from './historicalDatasets';

const CUSTOM_DATASETS_KEY = 'ict_custom_datasets_index';

export class LocalMarketDataProvider implements MarketDataProvider {
  private cache = new Map<string, MarketCandle[]>();

  async getAvailableDates(instrument: Instrument, timeframe: string): Promise<string[]> {
    // Check built-in historical sessions
    const builtInDates = HISTORICAL_SESSIONS.filter((s) => s.instrument === instrument).map((s) => s.date);

    // Check custom imported datasets in localStorage
    const customList = this.getCustomDatasetKeys();
    const customDates = customList
      .filter((k) => k.instrument === instrument && k.timeframe === timeframe)
      .map((k) => k.date);

    const set = new Set([...builtInDates, ...customDates]);
    return Array.from(set).sort();
  }

  async getCandlesForDate(
    instrument: Instrument,
    timeframe: string,
    dateString: string
  ): Promise<MarketCandle[]> {
    const cacheKey = `${instrument}_${timeframe}_${dateString}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check custom imported storage
    const customCandles = this.loadCustomCandles(instrument, timeframe, dateString);
    if (customCandles && customCandles.length > 0) {
      this.cache.set(cacheKey, customCandles);
      return customCandles;
    }

    // Check built-in session
    const session = HISTORICAL_SESSIONS.find(
      (s) => s.instrument === instrument && s.date === dateString
    );

    if (session) {
      const candles = generateSessionCandles(session, timeframe as 'M5' | 'M1' | 'M15');
      this.cache.set(cacheKey, candles);
      return candles;
    }

    // Fallback: create default session for this instrument and date if none exists
    const fallbackSession = {
      instrument,
      date: dateString,
      dayOfWeek: 'Monday',
      name: `${instrument} - ${dateString}`,
      pdh: instrument === 'US30' ? 39500 : instrument === 'NAS100' ? 18350 : 2350,
      pdl: instrument === 'US30' ? 39150 : instrument === 'NAS100' ? 18200 : 2320,
      asiaHigh: instrument === 'US30' ? 39400 : instrument === 'NAS100' ? 18320 : 2345,
      asiaLow: instrument === 'US30' ? 39250 : instrument === 'NAS100' ? 18240 : 2330,
      londonHigh: instrument === 'US30' ? 39450 : instrument === 'NAS100' ? 18340 : 2348,
      londonLow: instrument === 'US30' ? 39220 : instrument === 'NAS100' ? 18220 : 2325,
      setupSummary: 'NY AM Session',
    };

    const candles = generateSessionCandles(fallbackSession, timeframe as 'M5' | 'M1' | 'M15');
    this.cache.set(cacheKey, candles);
    return candles;
  }

  async getCandles(
    instrument: Instrument,
    timeframe: string,
    start: number,
    end: number
  ): Promise<MarketCandle[]> {
    // For date-based search, load available dates and slice
    const dates = await this.getAvailableDates(instrument, timeframe);
    const allCandles: MarketCandle[] = [];

    for (const d of dates) {
      const dayCandles = await this.getCandlesForDate(instrument, timeframe, d);
      allCandles.push(...dayCandles);
    }

    return allCandles
      .filter((c) => c.time >= start && c.time <= end)
      .sort((a, b) => a.time - b.time);
  }

  async saveCustomCandles(
    datasetId: string,
    instrument: Instrument,
    timeframe: string,
    candles: MarketCandle[]
  ): Promise<void> {
    if (!candles.length) return;
    const firstDate = new Date(candles[0].time * 1000).toISOString().split('T')[0];
    const storageKey = `ict_custom_data_${instrument}_${timeframe}_${firstDate}`;

    try {
      localStorage.setItem(storageKey, JSON.stringify(candles));

      const keys = this.getCustomDatasetKeys();
      const existing = keys.findIndex(
        (k) => k.instrument === instrument && k.timeframe === timeframe && k.date === firstDate
      );
      if (existing >= 0) {
        keys[existing].count = candles.length;
      } else {
        keys.push({
          id: datasetId,
          instrument,
          timeframe,
          date: firstDate,
          count: candles.length,
        });
      }
      localStorage.setItem(CUSTOM_DATASETS_KEY, JSON.stringify(keys));
      this.cache.set(`${instrument}_${timeframe}_${firstDate}`, candles);
    } catch (e) {
      console.error('Failed to save custom candles to localStorage', e);
    }
  }

  private getCustomDatasetKeys(): {
    id: string;
    instrument: Instrument;
    timeframe: string;
    date: string;
    count: number;
  }[] {
    try {
      const raw = localStorage.getItem(CUSTOM_DATASETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private loadCustomCandles(
    instrument: Instrument,
    timeframe: string,
    dateString: string
  ): MarketCandle[] | null {
    try {
      const raw = localStorage.getItem(`ict_custom_data_${instrument}_${timeframe}_${dateString}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export const defaultMarketDataProvider = new LocalMarketDataProvider();
