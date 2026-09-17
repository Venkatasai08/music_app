// LRC Synchronized Lyrics Parser & Interpolator

import { LyricLine } from '../types/music';

/**
 * Parses raw LRC string into structured LyricLine array
 * Matches patterns like [01:23.45] or [01:23.456] or [01:23]
 */
export function parseLRC(lrcString: string | undefined): LyricLine[] {
  if (!lrcString || typeof lrcString !== 'string') {
    return [];
  }

  const lines = lrcString.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const rawLine of lines) {
    const text = rawLine.replace(timeRegex, '').trim();
    if (!text && !rawLine.includes('[')) continue;

    let match: RegExpExecArray | null;
    timeRegex.lastIndex = 0; // reset regex state

    while ((match = timeRegex.exec(rawLine)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const timeMs = minutes * 60 * 1000 + seconds * 1000 + fraction;

      if (text.length > 0) {
        result.push({ timeMs, text });
      }
    }
  }

  // Sort chronologically
  return result.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Calculates current active lyric line index based on playback position (in ms)
 */
export function findActiveLyricIndex(lyrics: LyricLine[], currentPositionMs: number): number {
  if (!lyrics || lyrics.length === 0) return -1;

  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentPositionMs >= lyrics[i].timeMs) {
      return i;
    }
  }

  return 0;
}
