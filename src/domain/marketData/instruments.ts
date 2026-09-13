import { Instrument, InstrumentSpec } from '../../types/domain';

export const INSTRUMENT_SPECS: Record<Instrument, InstrumentSpec> = {
  US30: {
    symbol: 'US30',
    name: 'Dow Jones Industrial Average CFD',
    pipOrPointValue: 1, // $1 per point for 1 lot standard
    tickSize: 1.0,
    digits: 0,
    defaultStopDistance: 50, // 50 points
    contractSize: 1,
  },
  NAS100: {
    symbol: 'NAS100',
    name: 'Nasdaq 100 Index CFD',
    pipOrPointValue: 1, // $1 per point
    tickSize: 0.25,
    digits: 2,
    defaultStopDistance: 25, // 25 points
    contractSize: 1,
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold vs US Dollar (Spot)',
    pipOrPointValue: 1, // $1 per point move per oz ($100 per point move for 100-oz standard lot)
    tickSize: 0.01,
    digits: 2,
    defaultStopDistance: 3.5, // $3.50 move
    contractSize: 100, // 1 standard lot = 100 troy oz
  },
};

export function formatPrice(price: number, instrument: Instrument): string {
  const spec = INSTRUMENT_SPECS[instrument];
  return price.toFixed(spec ? spec.digits : 2);
}

export function calculatePoints(
  price1: number,
  price2: number,
  instrument: Instrument
): number {
  const points = Math.abs(price1 - price2);
  const spec = INSTRUMENT_SPECS[instrument];
  return Number(points.toFixed(spec ? spec.digits : 2));
}
