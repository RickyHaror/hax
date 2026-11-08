import type { PhishSpotConfig } from '../../../engine/types';

export interface CluePart { text: string; clueId?: string }
export interface ClueFallback { text: string; clueId: string }
interface Match { field: number; start: number; end: number; clueId: string }

function findMatch(fields: string[], text: string, clueId: string): Match | undefined {
  if (!text) return;
  for (const sensitive of [true, false]) {
    for (const [field, value] of fields.entries()) {
      const start = sensitive ? value.indexOf(text) : value.toLowerCase().indexOf(text.toLowerCase());
      if (start >= 0) return { field, start, end: start + text.length, clueId };
    }
  }
}

function partsFor(text: string, matches: Match[]): CluePart[] {
  const parts: CluePart[] = [];
  let cursor = 0;
  for (const match of matches.sort((a, b) => a.start - b.start)) {
    if (cursor < match.start) parts.push({ text: text.slice(cursor, match.start) });
    parts.push({ text: text.slice(match.start, match.end), clueId: match.clueId });
    cursor = match.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

/** Keep the first occurrence intact. Covered clues get their own fallback button. */
export function splitClueText(fields: string[], clues: PhishSpotConfig['clues']) {
  const matches: Match[] = [];
  const fallback: ClueFallback[] = [];
  for (const clue of clues) {
    const match = findMatch(fields, clue.match, clue.id);
    if (!match) fallback.push({ text: clue.match, clueId: clue.id });
    else if (matches.some((other) => other.field === match.field
      && other.start < match.end && match.start < other.end)) {
      fallback.push({ text: fields[match.field]!.slice(match.start, match.end), clueId: clue.id });
    } else matches.push(match);
  }
  return { fields: fields.map((text, index) => partsFor(text, matches.filter((match) => match.field === index))), fallback };
}
