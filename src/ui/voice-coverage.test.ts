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
import { catalogEntries } from './speech-catalog';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)
      && entry.name !== 'fixtures.ts' ? [path] : [];
  });
}

type Bindings = ReadonlyMap<string, readonly ts.Expression[]>;

/** Follow local values and state updates as well as inline conditional branches. */
function literals(expression: ts.Expression, bindings: Bindings, seen = new Set<string>()): string[] {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isConditionalExpression(expression)) {
    return [...literals(expression.whenTrue, bindings, seen), ...literals(expression.whenFalse, bindings, seen)];
  }
  if (ts.isTemplateExpression(expression)
    && /[a-z]/i.test(expression.head.text + expression.templateSpans.map((span) => span.literal.text).join(''))) {
    return [expression.getText()];
  }
  if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken]
    .includes(expression.operatorToken.kind)) {
    return [...literals(expression.left, bindings, seen), ...literals(expression.right, bindings, seen)];
  }
  if (ts.isParenthesizedExpression(expression)) return literals(expression.expression, bindings, seen);
  if (ts.isIdentifier(expression) && !seen.has(expression.text)) {
    const next = new Set([...seen, expression.text]);
    return (bindings.get(expression.text) ?? []).flatMap((value) => literals(value, bindings, next)).filter(Boolean);
  }
  if (ts.isElementAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return (bindings.get(expression.expression.text) ?? []).flatMap((value) => ts.isObjectLiteralExpression(value)
      ? value.properties.flatMap((member) => ts.isPropertyAssignment(member) ? literals(member.initializer, bindings, seen) : []) : []);
  }
  return [];
}

function localBindings(file: ts.SourceFile): Bindings {
  const bindings = new Map<string, ts.Expression[]>();
  const setters = new Map<string, string>();
  const add = (key: string, value: ts.Expression) => bindings.set(key, [...bindings.get(key) ?? [], value]);
  function declarations(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name)) add(node.name.text, node.initializer);
      if (ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer)) {
        const [state, setter] = node.name.elements;
        if (state && setter && ts.isBindingElement(state) && ts.isBindingElement(setter)
          && ts.isIdentifier(state.name) && ts.isIdentifier(setter.name)) {
          setters.set(setter.name.text, state.name.text);
          if (node.initializer.arguments[0]) add(state.name.text, node.initializer.arguments[0]);
        }
      }
    }
    ts.forEachChild(node, declarations);
  }
  function updates(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const state = setters.get(node.expression.text);
      if (state && node.arguments[0]) add(state, node.arguments[0]);
    }
    ts.forEachChild(node, updates);
  }
  declarations(file); updates(file);
  return bindings;
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const member = object.properties.find((member) =>
    ts.isPropertyAssignment(member) && member.name.getText() === name);
  return member && ts.isPropertyAssignment(member) ? member.initializer : undefined;
}

function inlineLines(node: ts.Node, lines: Line[], bindings: Bindings, seen = new Set<string>()): void {
  if (ts.isIdentifier(node) && !seen.has(node.text)) {
    const next = new Set([...seen, node.text]);
    for (const value of bindings.get(node.text) ?? []) inlineLines(value, lines, bindings, next);
    return;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const text = property(node, 'text'), say = property(node, 'say');
    const speaker = property(node, 'speaker');
    const role = speaker && ts.isStringLiteralLike(speaker) ? speaker.text as Line['speaker'] : undefined;
    const spoken = say ?? text;
    if (spoken) for (const value of literals(spoken, bindings)) lines.push({ text: value, speaker: role });
  }
  ts.forEachChild(node, (child) => inlineLines(child, lines, bindings, seen));
}

/** Follow the UI's speech entry points, rather than unrelated text fields or test fixtures. */
function speechLiterals(source: string, filename: string): Line[] {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const bindings = localBindings(file);
  const lines: Line[] = [];
  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && ['line', 'lines', 'config'].includes(node.name.getText())
      && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      inlineLines(node.initializer.expression, lines, bindings);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ['speak', 'speakAll', 'speakParts'].includes(node.expression.name.text)) {
      for (const argument of node.arguments) inlineLines(argument, lines, bindings);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return lines;
}

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

  it('every UI speech literal has a current recorded clip', () => {
    const { cast, manifest, files, contentJobs } = loadRecordedCoverage();
    const contentKeys = new Set(contentJobs.map((job) => `${job.role}|${job.spoken}`));
    const jobs = buildVoiceJobs({ missions: [], sidekicks: [],
      catalog: catalogEntries().map(({ line }) => line) }, cast)
      .filter((job) => !contentKeys.has(`${job.role}|${job.spoken}`));
    expect(jobs.length).toBeGreaterThan(0);
    const issues = voiceCoverageIssues(jobs, cast, manifest, files);
    expect(issues.length, formatVoiceCoverageIssues(issues)).toBe(0);
  });

  it('keeps new spoken literals outside the catalog from being missed', () => {
    const sourceLines = ['src/ui', 'src/engine'].flatMap(sourceFiles)
      .filter((path) => !path.replaceAll('\\', '/').endsWith('/speech-catalog.ts'))
      .flatMap((path) => speechLiterals(readFileSync(path, 'utf8'), path)
        .filter((line) => line.text.trim())
        // These existing literals belong to the coordinator's separate Player packet.
        .filter((line) => !(path.replaceAll('\\', '/').endsWith('/screens/Player.tsx')
          && ['Lock it down!', '`Signed: ${client.contact}`'].includes(line.text)))
        .map((line) => ({ path, line })));
    expect(sourceLines).toEqual([]);
  });

  it('finds literals passed through local variables and state setters', () => {
    expect(speechLiterals(`
      const greeting = { text: 'Hello there.' };
      const [message, setMessage] = useState('');
      setMessage(ready ? 'Ready now.' : 'Try again.');
      const strength = full ? 'Strong!' : 'Keep going.';
      <SidekickBubble lines={[greeting]} />;
      <SpeechLine line={{ text: message }} />;
      <SpeechLine line={{ text: strength }} />;
    `, 'fixture.tsx').map((line) => line.text)).toEqual([
      'Hello there.', 'Ready now.', 'Try again.', 'Strong!', 'Keep going.',
    ]);
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
