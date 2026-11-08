import type { VirtualFs } from './fs';

interface Context {
  commands: readonly string[];
  fs: VirtualFs;
  hosts?: readonly string[];
}
interface Completion { value: string; suggestion: string | null; options: string[] }

function currentWord(input: string) {
  const words: string[] = [];
  let word = '';
  let quote = '';
  let started = false;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = '';
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/u.test(char)) {
      if (started) words.push(word);
      word = '';
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  return { words, word, quote };
}

function entries(word: string, fs: VirtualFs): string[] {
  const slash = word.lastIndexOf('/');
  const path = word.slice(0, slash + 1);
  const name = word.slice(slash + 1);
  const result = fs.list(path || '.', { all: name.startsWith('.') });
  return result.ok ? result.value.map((entry) =>
    path + entry.name + (entry.type === 'dir' ? '/' : '')) : [];
}

function commonPrefix(options: string[]): string {
  let prefix = options[0] ?? '';
  for (const option of options.slice(1)) {
    while (!option.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

/** Append shell-safe text while keeping the typed part available for a ghost. */
function appendSuffix(input: string, suffix: string, quote: string, finish: boolean): string {
  let value = input;
  for (const char of suffix) {
    const other = char === '"' ? "'" : '"';
    if (quote) value += char === quote ? `${quote}${other}${char}${other}${quote}` : char;
    else value += /[\s'"]/u.test(char) ? `${other}${char}${other}` : char;
  }
  return value + (finish ? `${quote} ` : '');
}

export function complete(input: string, ctx: Context): Completion {
  const { words, word, quote } = currentWord(input);
  const candidates = words.length === 0 ? ctx.commands
    : ['connect', 'scan'].includes(words[0]!.toLowerCase()) ? ctx.hosts ?? []
      : entries(word, ctx.fs);
  const options = [...new Set(candidates)].filter((name) => name.startsWith(word));
  if (!options.length) return { value: input, suggestion: null, options };
  const match = commonPrefix(options);
  const single = options.length === 1;
  const value = appendSuffix(input, match.slice(word.length), quote, single && !match.endsWith('/'));
  return { value, suggestion: single ? value.slice(input.length) : null, options };
}
