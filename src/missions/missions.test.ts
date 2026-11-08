import { describe, expect, it } from 'vitest';
import type { FsDir, FsNode, Line, Mission, StepConfig, TerminalConfig, TerminalGoal } from '../engine/types';
import { missions } from './index';

const missionTable = [
  ['login', 'login'],
  ['b1-mouse', 'bootcamp'],
  ['b2-keys', 'bootcamp'],
  ['b3-typing', 'bootcamp'],
  ['b4-files', 'bootcamp'],
  ['b5-passwords', 'bootcamp'],
  ['t1-hello', 'terminal'],
  ['t2-move', 'terminal'],
  ['t3-tools', 'terminal'],
  ['m1-pizza', 'missions'],
  ['m2-toys', 'missions'],
  ['m3-zoo', 'missions'],
  ['m4-cupcake', 'missions'],
  ['m5-moon', 'missions'],
  ['m6-socks', 'missions'],
  ['m7-graduation', 'missions'],
] as const;

function configLines(config: StepConfig): Line[] {
  switch (config.kind) {
    case 'answer':
    case 'log-read':
      return [config.question];
    case 'choice':
      return [config.question, ...config.options.map((option) => option.feedback)];
    case 'decoder':
      return config.clue ? [config.clue] : [];
    case 'password-guess':
      return config.profile.facts;
    case 'phish-spot':
      return config.clues.map((clue) => clue.explain);
    default:
      return [];
  }
}

function missionLines(mission: Mission): Line[] {
  return [
    ...mission.intro,
    ...mission.outro,
    ...(mission.client?.allowed ?? []),
    ...(mission.client?.notAllowed ?? []),
    ...mission.steps.flatMap((step) => [
      ...step.lines, ...step.hints, ...step.success, ...configLines(step.config),
    ]),
  ];
}

function needsSay(text: string): boolean {
  return /\b(?:ls|cd|pwd)\b/i.test(text) || /[\w-]+\.[\w-]+|\.[\w-]+/.test(text);
}

function checkLine(line: Line): void {
  expect(typeof line.text).toBe('string');
  expect(line.text.trim()).not.toBe('');
  expect(Object.keys(line).every((key) => ['text', 'say', 'speaker'].includes(key))).toBe(true);
  expect(line.say, line.text).not.toBe(line.text);
  if (needsSay(line.text)) {
    expect(typeof line.say, line.text).toBe('string');
    expect(line.say?.trim(), line.text).toBeTruthy();
  }
}

/** Resolve absolute paths inside the mission's pretend file tree. */
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

function decodeCaesar(message: string, shift: number): string {
  return message.replace(/[A-Za-z]/g, (letter) => {
    const base = letter >= 'a' && letter <= 'z' ? 97 : 65;
    const offset = ((letter.charCodeAt(0) - base - shift) % 26 + 26) % 26;
    return String.fromCharCode(base + offset);
  });
}

function checkTerminalGoal(config: TerminalConfig, goal: TerminalGoal): void {
  if (goal.type === 'all') {
    goal.goals.forEach((child) => checkTerminalGoal(config, child));
    return;
  }
  if (goal.type === 'run') {
    expect(config.commands).toContain(goal.command);
    return;
  }
  const command = { read: 'cat', cwd: 'cd', locked: 'lock', deleted: 'rm' }[goal.type];
  expect(config.commands).toContain(command);
  expect(goal.path.startsWith('/'), goal.path).toBe(true);
  expect(resolvePath(config.fs, goal.path)?.type, goal.path).toBe(goal.type === 'cwd' ? 'dir' : 'file');
}

function checkFileExplorer(config: Extract<StepConfig, { kind: 'file-explorer' }>): void {
  if (config.task.type === 'open') {
    expect(resolvePath(config.fs, config.task.path), config.task.path).toBeDefined();
    return;
  }
  for (const move of config.task.moves) {
    expect(resolvePath(config.fs, move.file)?.type, move.file).toBe('file');
    expect(resolvePath(config.fs, move.toDir)?.type, move.toDir).toBe('dir');
  }
}

function checkTerminal(config: TerminalConfig): void {
  expect(resolvePath(config.fs, config.cwd)?.type, config.cwd).toBe('dir');
  checkTerminalGoal(config, config.goal);
  for (const chip of config.chips ?? []) {
    expect(config.commands, chip).toContain(chip.trim().split(/\s+/)[0]);
  }
}

function checkSolvable(config: StepConfig): void {
  switch (config.kind) {
    case 'answer':
      expect(config.answer.trim()).not.toBe('');
      break;
    case 'key-find':
      expect(config.keys.length).toBeGreaterThan(0);
      for (const key of config.keys) expect(key.length).toBeGreaterThan(0);
      break;
    case 'typing-game':
      expect(config.goal).toBeGreaterThanOrEqual(1);
      expect(config.words.length).toBeGreaterThan(0);
      for (const word of config.words) expect(word.trim()).not.toBe('');
      break;
    case 'file-explorer':
      checkFileExplorer(config);
      break;
    case 'choice':
      expect(config.correct.length).toBeGreaterThan(0);
      for (const id of config.correct) expect(config.options.map((option) => option.id)).toContain(id);
      break;
    case 'log-read': {
      expect(config.lines.length).toBeGreaterThan(0);
      for (const line of config.lines) expect(line.trim()).not.toBe('');
      const ids = config.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain(config.correct);
      break;
    }
    case 'phish-spot': {
      const ids = config.clues.map((clue) => clue.id);
      expect(new Set(ids).size).toBe(ids.length);
      const fields = [config.email.from, config.email.subject, ...config.email.body, config.email.link ?? ''];
      for (const clue of config.clues) {
        expect(clue.match.trim()).not.toBe('');
        expect(fields.some((field) => field.includes(clue.match)), clue.match).toBe(true);
      }
      expect(config.needed).toBeGreaterThanOrEqual(1);
      expect(config.needed).toBeLessThanOrEqual(config.clues.length);
      break;
    }
    case 'drag-drop':
      for (const item of config.items) expect(config.zones.map((zone) => zone.id)).toContain(item.goesTo);
      break;
    case 'passphrase':
      expect(config.words.length).toBeGreaterThanOrEqual(config.count);
      break;
    case 'password-guess':
      expect(config.username.trim()).not.toBe('');
      expect(config.password.trim()).not.toBe('');
      for (const entry of config.accept ?? []) expect(entry.trim()).not.toBe('');
      break;
    case 'decoder':
      expect(config.answer).toBe(decodeCaesar(config.message, config.shift));
      break;
    case 'web-source':
      expect(config.source).toContain(config.answer);
      break;
    case 'terminal':
      checkTerminal(config);
      break;
  }
}

describe('registered mission data', () => {
  it('keeps ids, bits and orders unique', () => {
    expect(missions.some((mission) => mission.id === 'login')).toBe(true);
    for (const field of ['id', 'bit', 'order'] as const) {
      expect(new Set(missions.map((mission) => mission[field])).size).toBe(missions.length);
    }
  });

  for (const mission of missions) {
    describe(mission.id, () => {
      it('matches the permanent table and requires its previous mission', () => {
        const index = missionTable.findIndex(([id]) => id === mission.id);
        expect(mission.order).toBe(mission.bit);
        if (index >= 0) {
          expect(mission.bit).toBe(index);
          expect(mission.chapter).toBe(missionTable[index]![1]);
          expect(mission.requires).toEqual(index === 0 ? [] : [missionTable[index - 1]![0]]);
        }
        if (mission.id === 'login') expect(mission.requires).toEqual([]);
        else {
          const previous = missions.filter((entry) => entry.order === mission.order - 1);
          expect(previous).toHaveLength(1);
          expect(mission.requires).toEqual([previous[0]!.id]);
        }
      });

      it('uses valid Lines and full hint ladders', () => {
        missionLines(mission).forEach(checkLine);
        for (const step of mission.steps) expect(step.hints, step.id).toHaveLength(3);
      });

      it('can solve every step from its data', () => {
        for (const step of mission.steps) checkSolvable(step.config);
      });

      if (mission.chapter === 'missions') {
        it('opens with permission and ends with lockdown', () => {
          expect(mission.client).toBeDefined();
          expect(mission.client?.allowed.length).toBeGreaterThan(0);
          expect(mission.client?.notAllowed.length).toBeGreaterThan(0);
          expect(mission.intro.some((line) => /\bpermission\b/i.test(line.text))).toBe(true);
          expect(mission.intro.some((line) => /\bown\b/i.test(line.text))).toBe(true);
          expect(mission.steps.at(-1)?.lockdown).toBe(true);
        });
      }
    });
  }
});

describe('mission data check helpers', () => {
  it.each(['Type ls.', 'Use cd now.', 'Try pwd!', 'Read notes.txt.', 'Find .secret_sauce.'])(
    'requires spoken text for %s', (text) => {
      expect(needsSay(text)).toBe(true);
      expect(() => checkLine({ text })).toThrow();
      expect(() => checkLine({ text, say: 'A clear spoken hint.' })).not.toThrow();
    },
  );

  it.each(['The door is open.', 'Well done! Next stop: Boot Camp.', 'The shells look nice.'])(
    'allows ordinary sentences without say: %s', (text) => {
      expect(needsSay(text)).toBe(false);
    },
  );

  it('rejects empty Lines and extra keys instead of overlooking them', () => {
    expect(() => checkLine({ text: ' ' })).toThrow();
    const extra = { text: 'Hello!', extra: 'This is not a Line key.' };
    expect(() => checkLine(extra)).toThrow();
  });

  it('rejects copied spoken text while allowing distinct spoken forms', () => {
    expect(() => checkLine({ text: 'Hello!', say: 'Hello!' })).toThrow();
    expect(() => checkLine({ text: 'Type ls.', say: 'Type ls.' })).toThrow();
    expect(() => checkLine({ text: 'Type ls.', say: 'Type L S.' })).not.toThrow();
  });

  it('decodes mixed case, wraparound and punctuation', () => {
    expect(decodeCaesar('Khoor, Zruog! 42', 3)).toBe('Hello, World! 42');
    expect(decodeCaesar('AbC xYz.', 27)).toBe('ZaB wXy.');
  });

  const fs: FsDir = {
    type: 'dir',
    children: {
      home: { type: 'dir', children: { note: { type: 'file', content: 'Hi!' } } },
    },
  };

  it('resolves only absolute paths to real files and directories', () => {
    expect(resolvePath(fs, '/')).toBe(fs);
    expect(resolvePath(fs, '/home')?.type).toBe('dir');
    expect(resolvePath(fs, '/home/note')?.type).toBe('file');
    expect(resolvePath(fs, '/home/./../home/note')?.type).toBe('file');
    for (const path of ['home/note', '/missing', '/home/note/child', '/toString']) {
      expect(resolvePath(fs, path), path).toBeUndefined();
    }
  });

  it('checks paths and allowed commands in every nested terminal goal', () => {
    const config: TerminalConfig = {
      kind: 'terminal', fs, cwd: '/home', commands: ['cat', 'cd', 'lock', 'rm', 'ls'],
      chips: ['cat note', 'ls -a'],
      goal: { type: 'all', goals: [
        { type: 'cwd', path: '/home' },
        { type: 'all', goals: [
          { type: 'read', path: '/home/note' }, { type: 'locked', path: '/home/note' },
          { type: 'deleted', path: '/home/note' }, { type: 'run', command: 'ls', args: ['-a'] },
        ] },
      ] },
    };
    expect(() => checkTerminal(config)).not.toThrow();
    for (const command of config.commands) {
      expect(() => checkTerminal({ ...config, commands: config.commands.filter((c) => c !== command) })).toThrow();
    }
    expect(() => checkTerminal({ ...config, cwd: '/home/note' })).toThrow();
    expect(() => checkTerminal({ ...config, chips: ['help'] })).toThrow();
    expect(() => checkTerminalGoal(config, { type: 'read', path: '/home' })).toThrow();
    expect(() => checkTerminalGoal(config, { type: 'cwd', path: '/home/note' })).toThrow();
    expect(() => checkTerminalGoal(config, { type: 'deleted', path: '/missing' })).toThrow();
    expect(() => checkTerminalGoal(config, { type: 'locked', path: 'home/note' })).toThrow();
  });
});
