import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync('src/styles/tokens.css', 'utf8');
const baseCss = readFileSync('src/styles/base.css', 'utf8');
const desktopRoot = tokensCss.match(/^:root\s*\{([^}]+)\}/)?.[1] ?? '';
const phoneRoot = tokensCss.match(/@media\s*\(max-width:\s*600px\)\s*\{\s*:root\s*\{([^}]+)\}/)?.[1] ?? '';

function declarations(css: string): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], match[2]!.trim()]));
}

const tokens = declarations(desktopRoot);
const expected = {
  '--bg': '#06090B', '--bar': '#080D10', '--term': '#0A0F12', '--term-input': '#0C1317',
  '--panel': '#0E161A', '--raised': '#101A1F', '--line': '#1E2C32', '--line-2': '#2D434B',
  '--text': '#E6EDF0', '--text-2': '#B7C6CC', '--muted': '#8DA1A8', '--ghost': '#7A8F96',
  '--go': '#39F28A', '--info': '#3CDCF5', '--careful': '#FFC24A', '--stop': '#FF7A7A',
  '--pc-hq': '#39F28A', '--pc-shop': '#3CDCF5', '--pc-bakery': '#FF9E5E', '--pc-library': '#B49CFF',
  '--ink-go': '#04140B', '--ink-careful': '#1A1000', '--focus': '#F5F9FA',
  '--font-mono': "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace",
  '--font-sans': "'Inter', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
  '--t-hero': '72px', '--t-term': '19px', '--t-input': '20px', '--t-title': '22px',
  '--t-say': '16px', '--t-chip': '17px', '--t-label': '12px',
  '--sp-1': '4px', '--sp-2': '8px', '--sp-3': '12px', '--sp-4': '16px',
  '--sp-5': '20px', '--sp-6': '24px', '--sp-7': '32px', '--sp-8': '48px',
  '--r-tag': '4px', '--r-chip': '8px', '--r-card': '10px', '--r-bubble': '12px', '--r-pill': '999px',
  '--target': '44px', '--target-primary': '52px',
  '--topbar': '56px', '--rail': '320px', '--gutter': '20px', '--side-pad': '24px',
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('foundation tokens', () => {
  it.each(Object.entries(expected))('defines %s with its design value', (name, value) => {
    expect(tokens[name]).toBe(value);
  });

  it('applies the phone type sizes at a maximum width of 600px', () => {
    expect(declarations(phoneRoot)).toEqual({
      '--t-hero': '52px', '--t-term': '15.5px', '--t-input': '16px', '--t-chip': '16px',
    });
  });

  it.each([
    ['--text', 16], ['--text-2', 10.9], ['--muted', 7], ['--ghost', 5.5],
    ['--go', 13], ['--info', 11.6], ['--careful', 11.9], ['--stop', 7.5],
    ['--pc-hq', 8], ['--pc-shop', 8], ['--pc-bakery', 8], ['--pc-library', 8],
  ] as const)('%s meets a contrast floor of %s on the terminal', (name, floor) => {
    expect(contrast(tokens[name]!, tokens['--term']!)).toBeGreaterThanOrEqual(floor);
  });

  it('loads tokens first and maps the existing theme names without overriding design tokens', () => {
    expect(baseCss.startsWith("@import './tokens.css';")).toBe(true);
    const aliases = declarations(baseCss);
    expect(aliases['--green']).toBe('var(--go)');
    expect(aliases['--font-story']).toBe('var(--font-sans)');
    expect(aliases['--font-code']).toBe('var(--font-mono)');
    for (const name of ['--bg', '--panel', '--text', '--muted']) {
      expect(aliases).not.toHaveProperty(name);
    }
  });

  it.each([['tokens.css', tokensCss], ['base.css', baseCss]])('%s has no external URLs', (_name, css) => {
    expect(css).not.toMatch(/url\(\s*['"]?\s*(?:https?:|\/\/)/i);
  });
});
