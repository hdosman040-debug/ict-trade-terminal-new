import { Instrument, MarketCandle } from '../../types/domain';

export type TimezoneMode = 'UTC' | 'America/New_York' | 'Broker_UTC_PLUS_2' | 'Broker_UTC_PLUS_3' | 'Custom' | 'Unknown';

export interface CSVColumnMapping {
  timeCol: string;
  openCol: string;
  highCol: string;
  lowCol: string;
  closeCol: string;
  volumeCol?: string;
}

export interface CSVImportResult {
  success: boolean;
  candles: MarketCandle[];
  totalRowsProcessed: number;
  rowsImported: number;
  rowsRejected: number;
  errors: string[];
  firstTimestamp?: number;
  lastTimestamp?: number;
  detectedTimeframe?: string;
  configuredTimezone: TimezoneMode;
}

export function parseCSVHeader(csvText: string): { headers: string[]; delimiter: string; previewRows: string[][] } {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], delimiter: ',', previewRows: [] };
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const previewRows = lines.slice(1, 6).map(l => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));

  return { headers, delimiter, previewRows };
}

export function autoDetectMapping(headers: string[]): CSVColumnMapping {
  const lower = headers.map(h => h.toLowerCase());

  const findCol = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = lower.findIndex(h => h === c || h.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return '';
  };

  return {
    timeCol: findCol(['time', 'date', 'timestamp', 'datetime', 'gmt_time']),
    openCol: findCol(['open', 'o']),
    highCol: findCol(['high', 'h']),
    lowCol: findCol(['low', 'l']),
    closeCol: findCol(['close', 'c']),
    volumeCol: findCol(['volume', 'vol', 'v', 'tick_volume']),
  };
}

export function importOHLCVCSV(
  csvText: string,
  mapping: CSVColumnMapping,
  instrument: Instrument,
  timezoneMode: TimezoneMode,
  customOffsetHours = 0
): CSVImportResult {
  const { headers, delimiter } = parseCSVHeader(csvText);
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    return {
      success: false,
      candles: [],
      totalRowsProcessed: 0,
      rowsImported: 0,
      rowsRejected: 0,
      errors: ['File is empty or contains only headers.'],
      configuredTimezone: timezoneMode,
    };
  }

  const timeIdx = headers.indexOf(mapping.timeCol);
  const openIdx = headers.indexOf(mapping.openCol);
  const highIdx = headers.indexOf(mapping.highCol);
  const lowIdx = headers.indexOf(mapping.lowCol);
  const closeIdx = headers.indexOf(mapping.closeCol);
  const volIdx = mapping.volumeCol ? headers.indexOf(mapping.volumeCol) : -1;

  const errors: string[] = [];
  if (timeIdx === -1) errors.push(`Time column "${mapping.timeCol}" not found`);
  if (openIdx === -1) errors.push(`Open column "${mapping.openCol}" not found`);
  if (highIdx === -1) errors.push(`High column "${mapping.highCol}" not found`);
  if (lowIdx === -1) errors.push(`Low column "${mapping.lowCol}" not found`);
  if (closeIdx === -1) errors.push(`Close column "${mapping.closeCol}" not found`);

  if (errors.length > 0) {
    return {
      success: false,
      candles: [],
      totalRowsProcessed: lines.length - 1,
      rowsImported: 0,
      rowsRejected: lines.length - 1,
      errors,
      configuredTimezone: timezoneMode,
    };
  }

function parseCSVDateTimeString(
  rawTime: string,
  timezoneMode: TimezoneMode,
  customOffsetHours: number
): number | null {
  const trimmed = rawTime.trim();

  // 1. Unix epoch seconds or milliseconds
  if (/^\d{10}$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^\d{13}$/.test(trimmed)) {
    return Math.floor(parseInt(trimmed, 10) / 1000);
  }

  // 2. Structured regex for YYYY-MM-DD HH:mm:ss or YYYY.MM.DD HH:mm
  const match = trimmed.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?(?:\s*([+-]\d{2}:?\d{2}|Z))?$/i
  );

  if (match) {
    let year = parseInt(match[1], 10);
    let month = parseInt(match[2], 10) - 1;
    let day = parseInt(match[3], 10);
    let hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const second = match[6] ? parseInt(match[6], 10) : 0;
    const ampm = match[7]?.toUpperCase();
    const tzSuffix = match[8];

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    // If there is an explicit timezone suffix in the data string, honor it directly
    if (tzSuffix) {
      const parsed = Date.parse(trimmed);
      return isNaN(parsed) ? null : Math.floor(parsed / 1000);
    }

    // No timezone suffix in string: interpret deterministically according to selected timezoneMode
    // Base UTC milliseconds
    const utcMillis = Date.UTC(year, month, day, hour, minute, second);

    if (timezoneMode === 'America/New_York') {
      // Determine America/New_York offset (EDT is UTC-4 / -240m, EST is UTC-5 / -300m)
      // Extract offset directly using formatToParts without converting back through unzoned Date string
      const d = new Date(utcMillis);
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'longOffset',
      }).formatToParts(d);
      const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-05:00';
      const m = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);
      let offsetMin = -300;
      if (m) {
        const sign = m[1] === '-' ? -1 : 1;
        const h = parseInt(m[2], 10);
        const mins = parseInt(m[3], 10);
        offsetMin = sign * (h * 60 + mins);
      }
      // utcMillis represents NY time. Since NY = UTC + offset, UTC = NY - offset:
      return Math.floor((utcMillis - offsetMin * 60000) / 1000);
    } else if (timezoneMode === 'Broker_UTC_PLUS_2') {
      // CSV time is in UTC+2, so UTC is -2 hours
      return Math.floor((utcMillis - 2 * 3600 * 1000) / 1000);
    } else if (timezoneMode === 'Broker_UTC_PLUS_3') {
      // CSV time is in UTC+3, so UTC is -3 hours
      return Math.floor((utcMillis - 3 * 3600 * 1000) / 1000);
    } else if (timezoneMode === 'Custom') {
      return Math.floor((utcMillis - customOffsetHours * 3600 * 1000) / 1000);
    } else {
      // Default / UTC: the string is treated as UTC
      return Math.floor(utcMillis / 1000);
    }
  }

  // Fallback for non-standard date formats
  const fallback = Date.parse(trimmed);
  return isNaN(fallback) ? null : Math.floor(fallback / 1000);
}

  const candles: MarketCandle[] = [];
  let rowsRejected = 0;
  const seenTimestamps = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cells.length <= Math.max(timeIdx, openIdx, highIdx, lowIdx, closeIdx)) {
      rowsRejected++;
      continue;
    }

    const rawTime = cells[timeIdx];
    const open = parseFloat(cells[openIdx]);
    const high = parseFloat(cells[highIdx]);
    const low = parseFloat(cells[lowIdx]);
    const close = parseFloat(cells[closeIdx]);
    const volume = volIdx >= 0 ? parseFloat(cells[volIdx]) : undefined;

    // Validate OHLC numeric correctness
    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      rowsRejected++;
      continue;
    }

    if (high < low || open < 0 || close < 0 || high < open || high < close || low > open || low > close) {
      rowsRejected++;
      continue;
    }

    // Parse timestamp deterministically without device-timezone pollution
    const timeSeconds = parseCSVDateTimeString(rawTime, timezoneMode, customOffsetHours);

    if (timeSeconds === null || isNaN(timeSeconds)) {
      rowsRejected++;
      continue;
    }

    // Duplicate check
    if (seenTimestamps.has(timeSeconds)) {
      rowsRejected++;
      continue;
    }
    seenTimestamps.add(timeSeconds);

    candles.push({
      time: timeSeconds,
      open,
      high,
      low,
      close,
      volume: isNaN(volume as number) ? 100 : volume,
    });
  }

  // Sort chronologically (monotonic guarantee)
  candles.sort((a, b) => a.time - b.time);

  // Detect timeframe from median step difference of non-gap candles
  let detectedTimeframe = 'M5';
  if (candles.length > 2) {
    const steps: number[] = [];
    for (let i = 1; i < Math.min(candles.length, 60); i++) {
      const step = candles[i].time - candles[i - 1].time;
      if (step > 0 && step <= 14400) { // filter out weekend/overnight gaps > 4h
        steps.push(step);
      }
    }
    if (steps.length > 0) {
      steps.sort((a, b) => a - b);
      const median = steps[Math.floor(steps.length / 2)];
      if (median <= 60) detectedTimeframe = 'M1';
      else if (median <= 300) detectedTimeframe = 'M5';
      else if (median <= 900) detectedTimeframe = 'M15';
      else if (median <= 3600) detectedTimeframe = 'H1';
      else detectedTimeframe = 'D1';
    }
  }

  return {
    success: candles.length > 0,
    candles,
    totalRowsProcessed: lines.length - 1,
    rowsImported: candles.length,
    rowsRejected,
    errors: rowsRejected > 0 ? [`${rowsRejected} rows rejected due to invalid format, prices, or duplicate timestamps.`] : [],
    firstTimestamp: candles.length ? candles[0].time : undefined,
    lastTimestamp: candles.length ? candles[candles.length - 1].time : undefined,
    detectedTimeframe,
    configuredTimezone: timezoneMode,
  };
}
