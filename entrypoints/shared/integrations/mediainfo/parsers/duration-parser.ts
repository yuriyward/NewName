/**
 * Duration parsing utilities for MediaInfo track data
 */
import type { GeneralTrack } from 'mediainfo.js';

/**
 * Coerce a value to a string if possible.
 */
function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Parse duration from tokens like "1h 30min 45s".
 */
function parseDurationFromTokens(input: string): number | undefined {
  const durationRegex =
    /([\d.,]+)\s*(h|hr|hrs|hour|hours|mn|min|mins|minute|minutes|s|sec|secs|second|seconds|ms|millisecond|milliseconds|us|µs|μs)/gi;
  let totalMs = 0;
  let matched = false;

  for (const match of input.matchAll(durationRegex)) {
    const [, rawValue, rawUnit] = match;
    const value = Number.parseFloat(rawValue.replace(/,/g, '.'));
    if (!Number.isFinite(value) || value < 0) {
      continue;
    }
    const unit = rawUnit.toLowerCase();
    let multiplier = 0;
    if (
      unit === 'h' ||
      unit === 'hr' ||
      unit === 'hrs' ||
      unit === 'hour' ||
      unit === 'hours'
    ) {
      multiplier = 3_600_000;
    } else if (
      unit === 'mn' ||
      unit === 'min' ||
      unit === 'mins' ||
      unit === 'minute' ||
      unit === 'minutes'
    ) {
      multiplier = 60_000;
    } else if (
      unit === 's' ||
      unit === 'sec' ||
      unit === 'secs' ||
      unit === 'second' ||
      unit === 'seconds'
    ) {
      multiplier = 1_000;
    } else if (
      unit === 'ms' ||
      unit === 'millisecond' ||
      unit === 'milliseconds'
    ) {
      multiplier = 1;
    } else if (unit === 'us' || unit === 'µs' || unit === 'μs') {
      multiplier = 0.001;
    }

    if (multiplier > 0) {
      totalMs += value * multiplier;
      matched = true;
    }
  }

  if (!matched) {
    return undefined;
  }

  return totalMs > 0 ? Math.round(totalMs) : undefined;
}

/**
 * Parse duration from colon-separated format like "1:30:45".
 */
function parseColonDuration(input: string): number | undefined {
  const candidate = input.split(/\s+/).find((segment) => segment.includes(':'));
  if (!candidate) {
    return undefined;
  }

  const tokens = candidate.split(':');
  if (tokens.length < 2) {
    return undefined;
  }

  const normalize = (value: string): number | undefined => {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
    if (cleaned.length === 0) return undefined;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const secondsToken = tokens.pop();
  if (!secondsToken) {
    return undefined;
  }

  const seconds = normalize(secondsToken);
  if (seconds === undefined) {
    return undefined;
  }

  let totalSeconds = seconds;
  const minutesToken = tokens.pop();
  if (minutesToken !== undefined) {
    const minutes = normalize(minutesToken) ?? 0;
    totalSeconds += minutes * 60;
  }
  const hoursToken = tokens.pop();
  if (hoursToken !== undefined) {
    const hours = normalize(hoursToken) ?? 0;
    totalSeconds += hours * 3_600;
  }

  return totalSeconds > 0 ? Math.round(totalSeconds * 1_000) : undefined;
}

/**
 * Pick duration strings from various MediaInfo track fields.
 */
function pickDurationStrings(track: GeneralTrack | undefined): string[] {
  if (!track) return [];
  const candidates: Array<unknown> = [
    track.Duration_String3,
    track.Duration_String,
    track.Duration_String1,
    track.Duration_String2,
    track.Duration_String4,
    track.Duration_String5,
  ];
  const sourceKeys = [
    'Source_Duration_String3',
    'Source_Duration_String',
    'Source_Duration_String1',
    'Source_Duration_String2',
    'Source_Duration_String4',
    'Source_Duration_String5',
  ] as const;
  for (const key of sourceKeys) {
    const value = Reflect.get(track, key);
    if (value !== undefined) {
      candidates.push(value);
    }
  }
  return candidates
    .map((value) => coerceString(value))
    .filter((value): value is string => typeof value === 'string');
}

/**
 * Parse duration in milliseconds from a GeneralTrack.
 */
export function parseDurationMs(
  track: GeneralTrack | undefined,
): number | undefined {
  if (!track) return undefined;

  const raw = track.Duration;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 0 && raw >= 1_000) {
      return Math.round(raw);
    }

    const supplemental = pickDurationStrings(track);
    for (const entry of supplemental) {
      if (/\bms\b/i.test(entry)) {
        return Math.round(raw);
      }
      const colonParsed = parseColonDuration(entry);
      if (colonParsed !== undefined) {
        return colonParsed;
      }
      const tokenParsed = parseDurationFromTokens(entry);
      if (tokenParsed !== undefined) {
        return tokenParsed;
      }
      if (/(?:^|\s)s(ec|econd)?s?\b/i.test(entry) || /:/.test(entry)) {
        return Math.round(raw * 1_000);
      }
    }

    if (raw > 0) {
      return Math.round(raw * 1_000);
    }
    return undefined;
  }

  const stringCandidates = pickDurationStrings(track);
  for (const candidate of stringCandidates) {
    const colonParsed = parseColonDuration(candidate);
    if (colonParsed !== undefined) {
      return colonParsed;
    }
    const tokenParsed = parseDurationFromTokens(candidate);
    if (tokenParsed !== undefined) {
      return tokenParsed;
    }
  }

  const sourceDuration = track
    ? Reflect.get(track, 'Source_Duration')
    : undefined;
  if (typeof sourceDuration === 'number' && Number.isFinite(sourceDuration)) {
    if (sourceDuration >= 1_000) {
      return Math.round(sourceDuration);
    }
    return sourceDuration > 0 ? Math.round(sourceDuration * 1_000) : undefined;
  }

  return undefined;
}
