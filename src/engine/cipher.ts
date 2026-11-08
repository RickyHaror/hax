export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function normalizeShift(shift: number): number {
  if (!Number.isInteger(shift)) {
    throw new RangeError('Shift must be a finite integer.');
  }
  return ((shift % ALPHABET.length) + ALPHABET.length) % ALPHABET.length;
}

export function caesarEncode(text: string, shift: number): string {
  const offset = normalizeShift(shift);
  return text.replace(/[A-Za-z]/g, (letter) => {
    const code = letter.charCodeAt(0);
    const start = code >= 97 ? 97 : 65;
    return String.fromCharCode(start + ((code - start + offset) % ALPHABET.length));
  });
}

export function caesarDecode(text: string, shift: number): string {
  return caesarEncode(text, -normalizeShift(shift));
}

export interface WheelPair {
  plain: string;
  cipher: string;
}

export function wheel(shift: number): WheelPair[] {
  const offset = normalizeShift(shift);
  return [...ALPHABET].map((plain) => ({ plain, cipher: caesarEncode(plain, offset) }));
}

export function decodeLetter(letter: string, shift: number): string {
  return caesarDecode(letter, shift);
}
