import { describe, expect, it } from 'vitest';
import type { FsDir, FsNode, Line, Playground } from '../engine/types';
import { fleschKincaidGrade, lineProblems, MAX_GRADE, words } from '../../scripts/checks/readability';
import { playground } from './playground';

function getPlayground(): Playground {
  expect(playground, 'playground data').not.toBeNull();
  if (playground === null) throw new Error('playground data is null');
  return playground;
}

/** Resolve absolute paths inside the playground's pretend file tree. */
function resolvePath(fs: FsDir, path: string): FsNode | undefined {
  if (!path.startsWith('/')) return undefined;
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  let node: FsNode = fs;
  for (const part of parts) {
    if (node.type !== 'dir' || !Object.hasOwn(node.children, part)) return undefined;
    node = node.children[part]!;
  }
  return node;
}

function needsSay(text: string): boolean {
  return /\b(?:ls|cd|pwd)\b/i.test(text) || /[\w-]+\.[\w-]+|\.[\w-]+/.test(text);
}

function checkLine(line: Line, label: string): void {
  expect(typeof line.text, label).toBe('string');
  expect(line.text.trim(), label).not.toBe('');
  expect(Object.keys(line).every((key) => ['text', 'say', 'speaker'].includes(key)), label).toBe(true);
  expect(line.say, label).not.toBe(line.text);
  if (needsSay(line.text)) {
    expect(typeof line.say, label).toBe('string');
    expect(line.say?.trim(), label).toBeTruthy();
  }
}

function allLines(data: Playground): { label: string; line: Line }[] {
  return [
    ...data.intro.map((line, index) => ({ label: `playground intro ${index + 1}`, line })),
    ...data.eggs.flatMap((egg) => egg.found.map((line, index) => ({
      label: `egg ${egg.id} found ${index + 1}`, line,
    }))),
  ];
}

function fileContents(node: FsNode, path = ''): { path: string; content: string }[] {
  if (node.type === 'file') return [{ path, content: node.content }];
  return Object.entries(node.children).flatMap(([name, child]) => fileContents(child, `${path}/${name}`));
}

function contentLines(data: Playground): { label: string; text: string }[] {
  return [
    ...fileContents(data.fs).flatMap(({ path, content }) => content.split(/\r?\n/).map((text, index) => ({
      label: `${path} line ${index + 1}`, text,
    }))),
    ...data.commands.flatMap((command) => command.output.flatMap((output, index) => (
      output.split(/\r?\n/).map((text, lineIndex) => ({
        label: `command ${command.name} output ${index + 1} line ${lineIndex + 1}`, text,
      }))
    ))),
  ];
}

describe('Agent Playground data', () => {
  it('is available after tools training with an intro and a real start directory', () => {
    const data = getPlayground();
    expect(data.unlockedBy, 'playground unlockedBy').toBe('t3-tools');
    expect(resolvePath(data.fs, data.cwd)?.type, `playground cwd ${data.cwd}`).toBe('dir');
    expect(data.intro.length, 'playground intro').toBeGreaterThanOrEqual(3);
    expect(data.intro.length, 'playground intro').toBeLessThanOrEqual(4);
  });

  it('has eight to twelve home folders and short files throughout the tree', () => {
    const data = getPlayground();
    const home = resolvePath(data.fs, '/home/agent');
    expect(home?.type, '/home/agent').toBe('dir');
    if (home?.type !== 'dir') throw new Error('/home/agent must be a directory');
    const folders = Object.values(home.children).filter((node) => node.type === 'dir');
    expect(folders.length, '/home/agent child folders').toBeGreaterThanOrEqual(8);
    expect(folders.length, '/home/agent child folders').toBeLessThanOrEqual(12);
    for (const { path, content } of fileContents(data.fs)) {
      const lines = content.split(/\r?\n/);
      expect(lines.length, path).toBeGreaterThanOrEqual(1);
      expect(lines.length, path).toBeLessThanOrEqual(6);
    }
  });

  it('has ten to fourteen uniquely named eggs with short found messages', () => {
    const { eggs } = getPlayground();
    expect(eggs.length, 'playground eggs').toBeGreaterThanOrEqual(10);
    expect(eggs.length, 'playground eggs').toBeLessThanOrEqual(14);
    for (const egg of eggs) {
      const label = `egg ${egg.id}`;
      expect(eggs.filter((entry) => entry.id === egg.id), label).toHaveLength(1);
      expect(egg.id, label).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(egg.name.trim(), label).not.toBe('');
      expect(egg.found.length, label).toBeGreaterThanOrEqual(1);
      expect(egg.found.length, label).toBeLessThanOrEqual(2);
    }
  });

  it('can reach every egg through a real file, directory or command', () => {
    const data = getPlayground();
    for (const type of ['read', 'cwd', 'command'] as const) {
      expect(data.eggs.some((egg) => egg.trigger.type === type), `playground eggs: ${type}`).toBe(true);
    }
    for (const egg of data.eggs) {
      const trigger = egg.trigger;
      if (trigger.type === 'command') {
        expect(data.commands.map((command) => command.name), `egg ${egg.id}: ${trigger.command}`)
          .toContain(trigger.command);
      } else {
        const label = `egg ${egg.id}: ${trigger.path}`;
        expect(trigger.path.startsWith('/'), label).toBe(true);
        expect(resolvePath(data.fs, trigger.path)?.type, label).toBe(trigger.type === 'read' ? 'file' : 'dir');
      }
    }
  });

  it('defines distinct extra commands with help, output and required special behavior', () => {
    const { commands } = getPlayground();
    const names = commands.map((command) => command.name);
    const reserved = ['ls', 'cd', 'pwd', 'cat', 'help', 'clear', 'lock', 'rm'];
    for (const name of ['whoami', 'joke', 'fortune', 'matrix', 'moo', 'dance']) {
      expect(names, `command ${name}`).toContain(name);
    }
    for (const command of commands) {
      const label = `command ${command.name}`;
      expect(names.filter((name) => name === command.name), label).toHaveLength(1);
      expect(command.name, label).toMatch(/^[a-z]+$/);
      expect(reserved, label).not.toContain(command.name);
      expect(command.help.trim(), label).not.toBe('');
      expect(command.output.length, label).toBeGreaterThan(0);
      expect(command.output.join('\n').trim(), label).not.toBe('');
    }
    expect(commands.find((command) => command.name === 'whoami')?.output.join('\n'), 'command whoami')
      .toContain('{name}');
    expect(commands.find((command) => command.name === 'matrix')?.effect, 'command matrix').toBe('matrix');
  });

  it('uses only Line keys and supplies distinct spoken text where needed', () => {
    for (const { label, line } of allLines(getPlayground())) checkLine(line, label);
  });

  it('keeps story, help and sentence-like content at an early reading level', () => {
    const data = getPlayground();
    const lines = allLines(data);
    for (const { label, line } of lines) expect(lineProblems(line.text), label).toEqual([]);
    for (const command of data.commands) {
      expect(lineProblems(command.help), `command ${command.name} help`).toEqual([]);
    }
    for (const { label, text } of contentLines(data)) {
      if (words(text).length >= 3) expect(lineProblems(text), label).toEqual([]);
    }
    expect(fleschKincaidGrade(lines.map(({ line }) => line.text)), 'playground intro and egg found texts')
      .toBeLessThanOrEqual(MAX_GRADE);
  });

  it('keeps every file and command output line within forty columns', () => {
    for (const { label, text } of contentLines(getPlayground())) {
      expect(text.length, label).toBeLessThanOrEqual(40);
    }
  });

  it('contains no external URL markers or long dash characters', () => {
    const serialized = JSON.stringify(getPlayground());
    expect(serialized, 'playground serialized data URL markers').not.toMatch(/https?|www\.|:\/\//i);
    expect(serialized, 'playground serialized data dash characters').not.toMatch(/[\u2013\u2014]/);
  });
});

describe('playground reachability helper', () => {
  it('resolves real nodes and rejects a missing path', () => {
    const fs: FsDir = {
      type: 'dir',
      children: { home: { type: 'dir', children: { note: { type: 'file', content: 'Hi!' } } } },
    };
    expect(resolvePath(fs, '/home')?.type, '/home').toBe('dir');
    expect(resolvePath(fs, '/home/note')?.type, '/home/note').toBe('file');
    for (const path of ['/home/missing', 'home/note', '/home/note/child', '/toString']) {
      expect(resolvePath(fs, path), path).toBeUndefined();
    }
  });
});
