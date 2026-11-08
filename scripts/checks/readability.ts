/**
 * Early-reader checks for kid-facing text.
 *
 * Rules (owner, 2026-11-07):
 * - every sentence has at most MAX_WORDS words
 * - every word not on the taught-word list has at most MAX_SYLLABLES syllables
 * - the Flesch-Kincaid grade of each mission's text, taken together, is at most MAX_GRADE
 */
export const MAX_WORDS = 12;
export const MAX_SYLLABLES = 3;
export const MAX_GRADE = 3;

/** Words the game explicitly teaches. They are allowed even when long. */
export const TAUGHT_WORDS = new Set(
  [
    'computer', 'computers', 'keyboard', 'password', 'passwords', 'passphrase', 'terminal', 'permission',
    'folder', 'folders', 'file', 'files', 'hacker', 'hackers', 'hacking', 'agent', 'agents', 'security',
    'secret', 'secrets', 'cipher', 'decoder', 'phishing', 'email', 'emails', 'website', 'websites',
    'hidden', 'command', 'commands', 'explorer', 'internet', 'directory', 'lockdown', 'mission', 'missions',
    'cybersecurity', 'sidekick', 'ethical', 'pepperoni', 'factory', 'enter', 'backspace', 'decoded',
    'double', 'click', 'clicking', 'nickname', 'username', 'login',
  ].map((w) => w.toLowerCase()),
);

export function words(sentence: string): string[] {
  return sentence
    .replace(/[^A-Za-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w));
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

/** Heuristic English syllable count, good enough for grading short kid text. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function fleschKincaidGrade(texts: string[]): number {
  let s = 0;
  let w = 0;
  let syl = 0;
  for (const t of texts) {
    for (const sent of sentences(t)) {
      const ws = words(sent);
      s += 1;
      w += ws.length;
      for (const word of ws) syl += TAUGHT_WORDS.has(word.toLowerCase()) ? 1 : syllables(word);
    }
  }
  if (s === 0 || w === 0) return 0;
  return 0.39 * (w / s) + 11.8 * (syl / w) - 15.59;
}

export interface ReadingProblem {
  text: string;
  reason: string;
}

export function lineProblems(text: string): ReadingProblem[] {
  const problems: ReadingProblem[] = [];
  for (const sent of sentences(text)) {
    const ws = words(sent);
    if (ws.length > MAX_WORDS) problems.push({ text: sent, reason: `${ws.length} words (max ${MAX_WORDS})` });
    for (const word of ws) {
      const lower = word.toLowerCase();
      if (!TAUGHT_WORDS.has(lower) && syllables(word) > MAX_SYLLABLES) {
        problems.push({ text: sent, reason: `hard word "${word}"` });
      }
    }
  }
  return problems;
}
