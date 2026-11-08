// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parseAudioManifest } from '../engine/audio-manifest';
import { signupRecordings } from '../engine/codename';
import type { Line } from '../engine/types';
import {
  buildVoiceJobs, formatVoiceCoverageIssues, voiceCoverageIssues, type VoiceCast,
} from '../engine/voice-coverage';
import { buildRegistry } from './registry';
import { BOOT_LINES } from './screens/boot';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)
      && entry.name !== 'fixtures.ts' ? [path] : [];
  });
}

/** Conditional literal branches are spoken too; dynamic expressions need a separate audit. */
function literals(expression: ts.Expression): string[] {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isConditionalExpression(expression)) {
    return [...literals(expression.whenTrue), ...literals(expression.whenFalse)];
  }
  return [];
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const member = object.properties.find((member) =>
    ts.isPropertyAssignment(member) && member.name.getText() === name);
  return member && ts.isPropertyAssignment(member) ? member.initializer : undefined;
}

function inlineLines(node: ts.Node, lines: Line[]): void {
  if (ts.isObjectLiteralExpression(node)) {
    const text = property(node, 'text'), say = property(node, 'say');
    const speaker = property(node, 'speaker');
    const role = speaker && ts.isStringLiteralLike(speaker) ? speaker.text as Line['speaker'] : undefined;
    const spoken = say ?? text;
    if (spoken) for (const value of literals(spoken)) lines.push({ text: value, speaker: role });
  }
  ts.forEachChild(node, (child) => inlineLines(child, lines));
}

/** Follow the UI's speech entry points, rather than unrelated text fields or test fixtures. */
function speechLiterals(source: string, filename: string): Line[] {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const lines: Line[] = [];
  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && ['line', 'lines'].includes(node.name.getText())
      && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      inlineLines(node.initializer.expression, lines);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ['speak', 'speakAll', 'speakParts'].includes(node.expression.name.text)) {
      for (const argument of node.arguments) inlineLines(argument, lines);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return lines;
}

// Literal messages passed through state or variables before reaching SpeechLine.
// These use the default sidekick role, in each of the three voices.
const indirectLiterals = [
  // SaveScreens.tsx and store.ts.
  'One letter looks different. Check your notebook again.',
  'Your key looks too short or long. Check your notebook.',
  'That mark is not in our keys. Check your notebook.',
  'This key uses a new code. Ask your grown-up.',
  'Your key worked. Welcome back!',
  // Bootcamp nudges and the Space key prompt in helpers.ts.
  'Good try. Let us find its home.',
  'Good try. Look for the glowing key.',
  'Good try. Find the next bright letter.',
  'Here it comes again. Take your time.',
  'Find the Space bar.',
  // Passphrase.tsx strength messages.
  'Super strong!', 'Getting stronger!', 'Pick your word team.',
  // useExplorer.ts messages.
  'This file is locked. Try another file.',
  'Click two times to open it.', 'Open this file, or choose its folder.',
  'Good try. Let us find this file a different home.', 'A snug home! Keep going.',
  // MissionCard.tsx permission reminder.
  'Only hack what you own or have permission to hack.',
  // PinPad.tsx titles and messages.
  'Set a grown-up PIN', 'Enter the PIN again', 'Enter your grown-up PIN',
  'Those PINs differ. Try both again.', 'That PIN did not match. Try again.',
  'The PIN could not be checked. Try again.',
].map((text): Line => ({ text }));

function loadRecordedCoverage() {
  const registry = buildRegistry();
  const cast: VoiceCast = JSON.parse(readFileSync('scripts/audio/voices.json', 'utf8'));
  const manifest = parseAudioManifest(JSON.parse(readFileSync('public/audio/manifest.json', 'utf8')));
  if (!manifest) throw new Error('public/audio/manifest.json is not a valid audio manifest');
  const files = new Set(readdirSync('public/audio/lines', { withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => entry.name));
  const contentJobs = buildVoiceJobs({ ...registry,
    signup: signupRecordings(registry.firstWords, registry.secondWords) }, cast);
  return { cast, manifest, files, contentJobs };
}

describe('live recorded voice coverage', () => {
  it('every content line has a current recorded clip', () => {
    const { cast, manifest, files, contentJobs } = loadRecordedCoverage();
    expect(contentJobs.length).toBeGreaterThan(0);
    const issues = voiceCoverageIssues(contentJobs, cast, manifest, files);
    expect(issues.length, formatVoiceCoverageIssues(issues)).toBe(0);
  });

  // The generator must learn these lines before they can be recorded.
  it('every UI speech literal has a current recorded clip', () => {
    const { cast, manifest, files, contentJobs } = loadRecordedCoverage();
    const contentKeys = new Set(contentJobs.map((job) => `${job.role}|${job.spoken}`));
    const sourceLines = ['src/ui', 'src/engine'].flatMap(sourceFiles)
      .flatMap((path) => speechLiterals(readFileSync(path, 'utf8'), path));
    const ui = { id: 'ui', lines: [...sourceLines, ...indirectLiterals, ...BOOT_LINES.map(({ line }) => line)] };
    const jobs = buildVoiceJobs({ missions: [ui], sidekicks: [] }, cast)
      .filter((job) => !contentKeys.has(`${job.role}|${job.spoken}`));
    expect(jobs.length).toBeGreaterThan(0);
    const issues = voiceCoverageIssues(jobs, cast, manifest, files);
    expect(issues.length, formatVoiceCoverageIssues(issues)).toBe(0);
  });

  it('finds speech literals across multiline JSX, voice calls, say and conditional branches', () => {
    const lines = speechLiterals(`
      <SpeechLine line={{ text: 'Shown', say: 'Said', speaker: 'narrator' }} />;
      <SidekickBubble lines={[{ text: 'Hi' }]} />;
      <ReadAloudButton line={{ text: ready ? 'Ready' : 'Wait' }} />;
      voice.speakAll([{ text: 'Read me' }]);
      voice.speak({ text: 'Hidden', say: '' });
      const unrelated = { text: 'Not spoken' };
      <SpeechLine line={{ text: dynamic }} />;
    `, 'fixture.tsx');
    expect(lines).toEqual([
      { text: 'Said', speaker: 'narrator' }, { text: 'Hi', speaker: undefined },
      { text: 'Ready', speaker: undefined }, { text: 'Wait', speaker: undefined },
      { text: 'Read me', speaker: undefined }, { text: '', speaker: undefined },
    ]);
  });
});
