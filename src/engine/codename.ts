import type { Line } from './types';

export const CODENAME_ROLE = 'narrator';
export const CODENAME_PREFIX = 'Your name is';
export const SIGNUP_PROMPT: Line = {
  text: 'Pick your agent name',
  say: 'Pick your agent name. Tap one word in each row.',
  speaker: 'narrator',
};

export function codenameLines(first: string, second: string): Line[] {
  return [
    { text: 'Your name:', say: CODENAME_PREFIX, speaker: CODENAME_ROLE },
    { text: first, speaker: CODENAME_ROLE },
    { text: second, speaker: CODENAME_ROLE },
  ];
}

/** Add these `${role}|${spoken}` keys to the audio generator's recording jobs. */
export function codenameRecordings(
  firstWords: readonly string[], secondWords: readonly string[],
): { role: string; spoken: string }[] {
  const spoken = new Set([CODENAME_PREFIX, ...firstWords, ...secondWords].map((word) => word.trim()));
  return [...spoken].map((word) => ({ role: CODENAME_ROLE, spoken: word }));
}

/** The generator records these prompt and codename pairs. */
export function signupRecordings(
  firstWords: readonly string[], secondWords: readonly string[],
): { role: string; spoken: string }[] {
  const prompt = { role: CODENAME_ROLE, spoken: (SIGNUP_PROMPT.say ?? SIGNUP_PROMPT.text).trim() };
  const pairs = [prompt, ...codenameRecordings(firstWords, secondWords)];
  return [...new Map(pairs.map((pair) => [`${pair.role}|${pair.spoken}`, pair])).values()];
}
