// Centralized New York (America/New_York) Timezone & Session Utility
import { SessionName, TradingWindowStatus } from '../../types/domain';

export interface NYTimeDetails {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dayOfWeek: string; // 'Monday', 'Tuesday', ...
  dayOfWeekIndex: number; // 0 (Sun) - 6 (Sat)
  nyDateString: string; // 'YYYY-MM-DD'
  nyTimeString: string; // 'HH:mm'
  totalMinutesFromMidnight: number;
}

const NY_TIMEZONE = 'America/New_York';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat('en-US', { ...options, timeZone: NY_TIMEZONE }));
  }
  return formatterCache.get(key)!;
}

export function getNYTimeDetails(timestampSeconds: number): NYTimeDetails {
  const date = new Date(timestampSeconds * 1000);

  // Use Intl to format in America/New_York
  const partsFormatter = getFormatter({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hour12: false,
  });

  const parts = partsFormatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // Handle 24:00 edge cases in some engines
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const dayOfWeek = map.weekday || 'Monday';

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekIndex = Math.max(0, dayOfWeekNames.indexOf(dayOfWeek));

  const nyDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const nyTimeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const totalMinutesFromMidnight = hour * 60 + minute;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    dayOfWeekIndex,
    nyDateString,
    nyTimeString,
    totalMinutesFromMidnight,
  };
}

/**
 * Evaluates whether candle falls in the defined ICT NY AM Trading Window (09:45 - 12:00 NY)
 */
export function getTradingWindowStatus(
  timestampSeconds: number,
  startWindow = '09:45',
  endWindow = '12:00'
): TradingWindowStatus {
  const { totalMinutesFromMidnight } = getNYTimeDetails(timestampSeconds);

  const [sH, sM] = startWindow.split(':').map(Number);
  const [eH, eM] = endWindow.split(':').map(Number);

  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  if (totalMinutesFromMidnight < startMin) {
    return 'BEFORE_WINDOW';
  }
  if (totalMinutesFromMidnight <= endMin) {
    return 'ACTIVE_WINDOW';
  }
  return 'AFTER_WINDOW';
}

/**
 * Determines current ICT session in NY Time:
 * - Asia: 20:00 (prev day) - 00:00 (midnight)
 * - London: 02:00 - 05:00
 * - NY AM: 08:30 - 12:00 (with primary window 09:45 - 12:00)
 * - NY PM: 13:30 - 16:00
 */
export function getSessionFromTimestamp(timestampSeconds: number): SessionName {
  const { hour, minute } = getNYTimeDetails(timestampSeconds);
  const mins = hour * 60 + minute;

  // Asia: 20:00 to 00:00
  if (mins >= 20 * 60 || mins < 2 * 60) {
    return 'ASIA';
  }
  // London: 02:00 to 05:00
  if (mins >= 2 * 60 && mins < 5 * 60) {
    return 'LONDON';
  }
  // NY AM: 08:30 to 12:00
  if (mins >= 8 * 60 + 30 && mins < 12 * 60) {
    return 'NY_AM';
  }
  // NY PM: 13:30 to 16:00
  if (mins >= 13 * 60 + 30 && mins < 16 * 60) {
    return 'NY_PM';
  }

  return 'OFF_HOURS';
}

/**
 * Format timestamp in NY time format: "2024-05-10 10:15 NY"
 */
export function formatNYDateTime(timestampSeconds: number): string {
  const { nyDateString, nyTimeString } = getNYTimeDetails(timestampSeconds);
  return `${nyDateString} ${nyTimeString} NY`;
}
