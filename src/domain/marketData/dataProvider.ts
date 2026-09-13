import { Instrument, MarketCandle } from '../../types/domain';

export interface MarketDataProvider {
  getAvailableDates(instrument: Instrument, timeframe: string): Promise<string[]>;

  getCandlesForDate(
    instrument: Instrument,
    timeframe: string,
    dateString: string // YYYY-MM-DD
  ): Promise<MarketCandle[]>;

  getCandles(
    instrument: Instrument,
    timeframe: string,
    start: number,
    end: number
  ): Promise<MarketCandle[]>;

  saveCustomCandles(
    datasetId: string,
    instrument: Instrument,
    timeframe: string,
    candles: MarketCandle[]
  ): Promise<void>;
}
