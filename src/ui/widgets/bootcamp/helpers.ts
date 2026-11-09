import { keyPromptLine } from '../../speech-catalog';
export interface KeyCap { key: string; width: number }
export function keyLayout(): KeyCap[][] {
  const letters = (row: string) => [...row].map((key) => ({ key, width: 1 }));
  return [
    [...letters('1234567890'), { key: 'Backspace', width: 2 }],
    letters('QWERTYUIOP'),
    [...letters('ASDFGHJKL'), { key: 'Enter', width: 2 }],
    [{ key: 'Shift', width: 2 }, ...letters('ZXCVBNM'), { key: 'Shift', width: 2 }],
    [{ key: ' ', width: 6 }],
  ];
}
export function keyName(key: string): string { return key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key; }
export function keyPrompt(key: string): string {
  return keyPromptLine(key).text;
}
export function sameKey(left: string, right: string): boolean { return left.toLowerCase() === right.toLowerCase(); }
export function typingSpeed(speed: number, caught: boolean): number {
  return Math.max(2, Math.min(6, caught ? speed + 0.15 : speed * 0.8));
}
export function fall(position: number, speed: number, seconds: number) {
  const next = position + speed * seconds;
  return { position: next >= 100 ? 0 : next, speed: next >= 100 ? typingSpeed(speed, false) : speed };
}
