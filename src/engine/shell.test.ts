import { describe, expect, it } from 'vitest';
import { HOME, VirtualFs } from './fs';
import { KNOWN_COMMANDS, Shell, editDistance, goalMet, parse, tokenize } from './shell';
import type { ShellEvent, ShellState } from './shell';
import type { FsDir, FsNode, TerminalGoal } from './types';

function dir(children: Record<string, FsNode> = {}): FsDir {
  return { type: 'dir', children };
}

function mission(): FsDir {
  return dir({
    home: dir({
      agent: dir({
        docs: dir({ 'note.txt': { type: 'file', content: 'Hello\nAgent\n' } }),
        empty: dir(),
        'note.txt': { type: 'file', content: 'Home note' },
        'my notes': { type: 'file', content: 'Space note' },
        'locked.txt': { type: 'file', content: 'Secret', locked: true },
        '.secret': { type: 'file', content: 'Hidden' },
        '.cache': dir(),
        '-': { type: 'file', content: 'Dash' },
        blank: { type: 'file', content: '' },
      }),
      agentish: dir(),
    }),
    tmp: dir(),
  });
}

function shell(allowed: readonly string[] = KNOWN_COMMANDS): Shell {
  return new Shell(new VirtualFs(mission()), allowed);
}

function runEvent(command: string, args: string[] = [], flags: string[] = [], ok = true): ShellEvent {
  return { type: 'run', command, args, flags, cwd: HOME, ok };
}

describe('tokenize', () => {
  it.each([
    ['', []],
    [' \t\n  ', []],
    ['  cat\t docs/note.txt  \n', ['cat', 'docs/note.txt']],
    ['cat "my notes"', ['cat', 'my notes']],
    ["cat 'my notes'", ['cat', 'my notes']],
    ['a"b c"d', ['ab cd']],
    ["a'b c'd", ['ab cd']],
    ['"" \'\' a""b', ['', '', 'ab']],
    ['"a\'b" \'c"d\'', ["a'b", 'c"d']],
    ['"one\ttwo\nthree"', ['one\ttwo\nthree']],
    ['"a"\'b\'c', ['abc']],
    ['cat folder\\note', ['cat', 'folder\\note']],
  ] as const)('groups %j into tokens', (input, tokens) => {
    expect(tokenize(input)).toEqual({ ok: true, tokens });
  });

  it.each(['cat "note', "cat 'note", 'a"b c', "a'b c", "'", '"'])('rejects %j', (input) => {
    expect(tokenize(input)).toEqual({ ok: false, error: 'unclosed-quote' });
  });
});

describe('parse', () => {
  it.each(['', ' \t\n '])('has no command for %j', (input) => {
    expect(parse(input)).toEqual({ ok: true, command: null });
  });

  it.each(['cat "note', "cat 'note"])('keeps the quote error for %j', (input) => {
    expect(parse(input)).toEqual({ ok: false, error: 'unclosed-quote' });
  });

  it.each([
    ['  LS \t-a  Docs ', { name: 'ls', flags: ['a'], args: ['Docs'] }],
    ['ls -la -a -ll docs -z', { name: 'ls', flags: ['l', 'a', 'z'], args: ['docs'] }],
    ['cat -', { name: 'cat', flags: [], args: ['-'] }],
    ['cat "my notes"', { name: 'cat', flags: [], args: ['my notes'] }],
    ['c"a"t a"b c"d', { name: 'cat', flags: [], args: ['ab cd'] }],
    ['cat ""', { name: 'cat', flags: [], args: [''] }],
    ['""', { name: '', flags: [], args: [] }],
    ['ls -A', { name: 'ls', flags: ['A'], args: [] }],
    ['ls "-aa" --', { name: 'ls', flags: ['a', '-'], args: [] }],
    ['-a ls', { name: '-a', flags: [], args: ['ls'] }],
  ])('parses %j', (input, command) => {
    expect(parse(input as string)).toEqual({ ok: true, command });
  });
});

describe('edit distance', () => {
  it.each([
    ['', '', 0], ['', 'cat', 3], ['cat', '', 3], ['cat', 'cat', 0],
    ['sl', 'ls', 1], ['cta', 'cat', 1], ['ct', 'cat', 1], ['cats', 'cat', 1],
    ['cut', 'cat', 1], ['kitten', 'sitting', 3], ['CA', 'ABC', 3],
    ['abcd', 'badc', 2], ['🐱a', 'a🐱', 1],
  ] as const)('measures %j and %j as %i', (a, b, distance) => {
    expect(editDistance(a, b)).toBe(distance);
    expect(editDistance(b, a)).toBe(distance);
  });
});

describe('empty input and prompts', () => {
  it('exports the command names in the required order', () => {
    expect(KNOWN_COMMANDS).toEqual(['ls', 'cd', 'cat', 'help', 'clear', 'pwd', 'lock', 'rm']);
  });

  it('ignores empty input and gives a kind quote error without events', () => {
    const sh = shell();
    for (const input of ['', ' \t\n ']) expect(sh.run(input)).toEqual({ lines: [], clear: false });
    for (const input of ['cat "note', "cat 'note"]) {
      expect(sh.run(input)).toEqual({
        lines: [{ kind: 'err', text: 'Close your quote and try again.' }], clear: false,
      });
    }
    expect(sh.events).toEqual([]);
  });

  it('shortens only home and its children in prompts', () => {
    const sh = shell();
    expect(sh.prompt()).toBe('agent@hax:~$');
    for (const [path, prompt] of [
      ['docs', '~/docs'], ['/', '/'], ['/home/agentish', '/home/agentish'], ['/tmp', '/tmp'],
    ]) {
      sh.run(`cd ${path}`);
      expect(sh.prompt()).toBe(`agent@hax:${prompt}$`);
    }
  });
});

describe('command permissions', () => {
  it.each(KNOWN_COMMANDS.filter((name) => name !== 'help'))('gates unlearned %s', (name) => {
    const sh = shell([]);
    const before = sh.fs.snapshot();
    expect(sh.run(`${name} note.txt`)).toEqual({
      lines: [{ kind: 'hint', text: 'You will learn that one soon!' }], clear: false,
    });
    expect(sh.events).toEqual([runEvent(name, ['note.txt'], [], false)]);
    expect(sh.fs.snapshot()).toEqual(before);
    expect(sh.fs.cwd()).toBe(HOME);
  });

  it.each(['ls -a', 'ls -q'])('gates %s only when the name is unavailable', (input) => {
    const sh = shell([]);
    expect(sh.run(input).lines).toEqual([{ kind: 'hint', text: 'You will learn that one soon!' }]);
    expect(sh.events).toEqual([runEvent('ls', [], [input.slice(-1)], false)]);
  });

  it.each(KNOWN_COMMANDS)('rejects unsupported flags on bare-allowed %s', (name) => {
    const sh = shell([name]);
    const before = sh.fs.snapshot();
    expect(sh.run(`${name} -z note.txt`)).toEqual({
      lines: [{ kind: 'err', text: 'That flag does not work here. Try help.' }], clear: false,
    });
    expect(sh.events).toEqual([runEvent(name, ['note.txt'], ['z'], false)]);
    expect(sh.fs.snapshot()).toEqual(before);
  });

  it.each([
    ['ls -q', ['ls'], 'ls', [], ['q']],
    ['ls -az', ['ls'], 'ls', [], ['a', 'z']],
    ['ls -A', ['ls'], 'ls', [], ['A']],
    ['ls -za', ['ls -z'], 'ls', [], ['z', 'a']],
    ['cat -z note.txt', ['cat -z'], 'cat', ['note.txt'], ['z']],
    ['help -a', [], 'help', [], ['a']],
  ] as const)('reports unsupported flags for %s', (input, allowed, name, args, flags) => {
    const sh = shell(allowed);
    const before = sh.fs.snapshot();
    expect(sh.run(input).lines).toEqual([
      { kind: 'err', text: 'That flag does not work here. Try help.' },
    ]);
    expect(sh.events).toEqual([runEvent(name, [...args], [...flags], false)]);
    expect(sh.fs.snapshot()).toEqual(before);
  });
});

describe('positional argument limits', () => {
  it.each([
    ['cd', ['docs', 'empty']], ['ls', ['docs', 'empty']],
    ['cat', ['note.txt', 'blank']], ['lock', ['note.txt', 'blank']],
    ['rm', ['note.txt', 'blank']], ['help', ['note.txt']],
    ['clear', ['note.txt']], ['pwd', ['note.txt']],
  ] as const)('rejects extra arguments for %s before any effects', (name, args) => {
    const sh = shell();
    const before = sh.fs.snapshot();
    expect(sh.run(`${name} ${args.join(' ')}`)).toEqual({
      clear: false, lines: [{ kind: 'err', text: args.length > 1
        ? 'Try one path at a time.' : 'Try that command on its own.' }],
    });
    expect(sh.events).toEqual([runEvent(name, [...args], [], false)]);
    expect(sh.fs.snapshot()).toEqual(before);
    expect(sh.fs.cwd()).toBe(HOME);
    expect(goalMet({ type: 'run', command: name }, sh.state)).toBe(false);
  });

  it('never awards read or run evidence for an ignored extra path', () => {
    const root = mission();
    const agent = (root.children.home as FsDir).children.agent as FsDir;
    agent.children['secret.txt'] = { type: 'file', content: 'Secret note' };
    const sh = new Shell(new VirtualFs(root), ['cat']);
    const goal: TerminalGoal = { type: 'run', command: 'cat', args: ['/home/agent/secret.txt'] };
    sh.run('cat note.txt /home/agent/secret.txt');
    expect(goalMet(goal, sh.state)).toBe(false);
    expect(goalMet({ type: 'read', path: '~/note.txt' }, sh.state)).toBe(false);
    expect(goalMet({ type: 'read', path: '~/secret.txt' }, sh.state)).toBe(false);
    sh.run('cat note.txt');
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('cat secret.txt');
    expect(goalMet(goal, sh.state)).toBe(true);
  });
});

describe('typo help', () => {
  it.each([
    ['sl', 'ls'], ['cta', 'cat'], ['SL', 'ls'], ['hepl', 'help'], ['lxx', 'ls'],
  ])('suggests %s as %s', (input, name) => {
    const sh = shell(['ls', 'cat']);
    expect(sh.run(input)).toEqual({ lines: [{ kind: 'hint', text: `Did you mean ${name}?` }], clear: false });
    expect(sh.events).toEqual([]);
  });

  it('uses the closest distance, then bare allow list order', () => {
    expect(shell(['ls', 'cd', 'cat']).run('ct').lines[0]?.text).toBe('Did you mean cd?');
    expect(shell(['cat', 'cd', 'ls']).run('ct').lines[0]?.text).toBe('Did you mean cat?');
    expect(shell(['cd', 'cat']).run('cta').lines[0]?.text).toBe('Did you mean cat?');
    expect(shell(['cat -a', 'cd', 'cat']).run('ct').lines[0]?.text).toBe('Did you mean cat?');
    expect(shell(['help', 'cat']).run('hep').lines[0]?.text).toBe('Did you mean help?');
  });

  it.each(['xyzzy', '__proto__', 'constructor', 'toString'])('handles unknown %s safely', (input) => {
    const sh = shell();
    expect(sh.run(input)).toEqual({
      lines: [{ kind: 'err', text: 'Hmm, I do not know that one. Try help.' }], clear: false,
    });
    expect(sh.events).toEqual([]);
  });

  it('does not suggest an unavailable bare command', () => {
    expect(shell(['ls -a']).run('sl').lines[0]?.text).toBe('Did you mean ls?');
    expect(shell(['cat']).run('sl').lines[0]?.text).toBe('Hmm, I do not know that one. Try help.');
    expect(shell([]).run('hepl').lines[0]?.text).toBe('Did you mean help?');
  });
});

describe('listing files', () => {
  it.each([['ls'], ['ls -a']])('allows bare and flagged listing with %j', (entry) => {
    const sh = shell([entry]);
    expect(sh.run('ls').lines.map((line) => line.text)).not.toContain('.secret');
    for (const input of ['ls -a', 'ls -la', 'ls -al']) {
      const result = sh.run(input);
      expect(result.lines.map((line) => line.text)).toEqual([
        '.cache/', 'docs/', 'empty/', '-', '.secret', 'blank', 'locked.txt [locked]', 'my notes', 'note.txt',
      ]);
      expect(result.lines.every((line) => line.kind === 'out')).toBe(true);
      expect(sh.events.at(-1)).toMatchObject({ type: 'run', command: 'ls', ok: true });
    }
  });

  it('lists each visible entry, marking directories and locked files', () => {
    const sh = shell();
    expect(sh.run('LS')).toEqual({ clear: false, lines: [
      'docs/', 'empty/', '-', 'blank', 'locked.txt [locked]', 'my notes', 'note.txt',
    ].map((text) => ({ kind: 'out', text })) });
    expect(sh.events).toEqual([runEvent('ls')]);
  });

  it('supports allowed, repeated flags and hidden entries at a chosen path', () => {
    const sh = shell();
    sh.run('cd /tmp');
    expect(sh.run('ls -aa -a ~').lines.map((line) => line.text)).toEqual([
      '.cache/', 'docs/', 'empty/', '-', '.secret', 'blank', 'locked.txt [locked]', 'my notes', 'note.txt',
    ]);
    expect(sh.events.at(-1)).toEqual({ ...runEvent('ls', ['~'], ['a']), cwd: '/tmp' });
    expect(sh.fs.cwd()).toBe('/tmp');
  });

  it('lists a relative path and gives a friendly empty result', () => {
    const sh = shell();
    expect(sh.run('ls docs').lines).toEqual([{ kind: 'out', text: 'note.txt' }]);
    expect(sh.run('ls empty').lines).toEqual([{ kind: 'out', text: 'This folder is empty.' }]);
  });
});

describe('navigation, reading and screen commands', () => {
  it('records cd with the old cwd before recording the new path', () => {
    const sh = shell();
    expect(sh.run('cd ./docs')).toEqual({ lines: [], clear: false });
    expect(sh.events).toEqual([runEvent('cd', ['./docs']), { type: 'cwd', path: `${HOME}/docs` }]);
    expect(sh.run('cd')).toEqual({ lines: [], clear: false });
    expect(sh.fs.cwd()).toBe(HOME);
    expect(sh.events.slice(2)).toEqual([
      { ...runEvent('cd'), cwd: `${HOME}/docs` }, { type: 'cwd', path: HOME },
    ]);
  });

  it('reads lines, trailing newlines, spaces, empty files and a lone dash', () => {
    const sh = shell();
    for (const [input, path, contents] of [
      ['cat ./docs//note.txt', 'docs/note.txt', ['Hello', 'Agent', '']],
      ['cat "my notes"', 'my notes', ['Space note']],
      ['cat blank', 'blank', ['']], ['cat -', '-', ['Dash']],
    ] as const) {
      expect(sh.run(input)).toEqual({ clear: false, lines: contents.map((text) => ({ kind: 'out', text })) });
      expect(sh.events.at(-2)).toMatchObject({ type: 'run', command: 'cat', ok: true });
      expect(sh.events.at(-1)).toEqual({ type: 'read', path: `${HOME}/${path}` });
    }
  });

  it('prints pwd and clears only the screen', () => {
    const sh = shell();
    sh.run('cd docs');
    expect(sh.run('pwd')).toEqual({ lines: [{ kind: 'out', text: `${HOME}/docs` }], clear: false });
    expect(sh.run('clear')).toEqual({ lines: [], clear: true });
    expect(sh.fs.cwd()).toBe(`${HOME}/docs`);
    expect(sh.events).toHaveLength(4);
    expect(sh.events.slice(-2)).toEqual([
      { ...runEvent('pwd'), cwd: `${HOME}/docs` }, { ...runEvent('clear'), cwd: `${HOME}/docs` },
    ]);
  });
});

describe('help', () => {
  it('always works with no permissions', () => {
    const sh = shell([]);
    expect(sh.run('HELP')).toEqual({
      lines: [{ kind: 'out', text: 'help: Show commands you can use.' }], clear: false,
    });
    expect(sh.events).toEqual([runEvent('help')]);
  });

  it.each([
    [['cat', 'ls', 'ls -a', 'cat'], ['cat', 'ls', 'help']],
    [['pwd', 'help', 'cat', 'help'], ['pwd', 'help', 'cat']],
    [[...KNOWN_COMMANDS, 'ls -a'], KNOWN_COMMANDS],
    [['ls -a'], ['ls', 'help']],
    [['ls -a', 'cat', 'ls', 'cat -z'], ['ls', 'cat', 'help']],
  ])('lists bare commands once, in order', (allowed, names) => {
    const result = shell(allowed).run('help');
    expect(result.lines.map((line) => line.text.split(':')[0])).toEqual(names);
    expect(result.lines.every((line) => line.kind === 'out' && line.text.length > 10)).toBe(true);
    expect(result.clear).toBe(false);
  });
});

describe('file changes', () => {
  it('locks a file and records the absolute path after the run event', () => {
    const sh = shell();
    expect(sh.run('lock ./docs/note.txt')).toEqual({
      clear: false, lines: [{ kind: 'out', text: 'You locked "./docs/note.txt". Nice work!' }],
    });
    expect(sh.fs.isLocked('docs/note.txt')).toBe(true);
    expect(sh.events).toEqual([
      runEvent('lock', ['./docs/note.txt']), { type: 'locked', path: `${HOME}/docs/note.txt` },
    ]);
    expect(sh.run('cat docs/note.txt').lines[0]?.kind).toBe('err');
    expect(sh.run('lock docs/note.txt').lines[0]?.kind).toBe('out');
  });

  it('removes a file and records its absolute path after the run event', () => {
    const sh = shell();
    expect(sh.run('rm ./docs/note.txt')).toEqual({
      clear: false, lines: [{ kind: 'out', text: 'You removed "./docs/note.txt". Nice work!' }],
    });
    expect(sh.fs.exists('docs/note.txt')).toBe(false);
    expect(sh.events).toEqual([
      runEvent('rm', ['./docs/note.txt']), { type: 'deleted', path: `${HOME}/docs/note.txt` },
    ]);
    expect(sh.fs.exists('note.txt')).toBe(true);
  });
});

describe('friendly file errors', () => {
  it.each(['cat', 'lock', 'rm'])('asks for the missing %s file', (name) => {
    const sh = shell();
    expect(sh.run(name)).toEqual({
      clear: false, lines: [{ kind: 'err', text: `Try ${name} with a file name.` }],
    });
    expect(sh.events).toEqual([runEvent(name, [], [], false)]);
  });

  it.each(['ls', 'cd', 'cat', 'lock', 'rm'])('%s names the typed missing, invalid or empty path', (name) => {
    for (const [path, message] of [
      ['./missing//file', 'I cannot find "./missing//file". Try ls to look around.'],
      ['./note.txt/child', '"./note.txt/child" is not a folder. Try ls to find one.'],
      ['', 'The path "" is empty. Try a file name.'],
    ]) {
      const sh = shell();
      const before = sh.fs.snapshot();
      expect(sh.run(`${name} "${path}"`)).toEqual({ clear: false, lines: [{ kind: 'err', text: message }] });
      expect(sh.events).toEqual([runEvent(name, [path!], [], false)]);
      expect(sh.fs.cwd()).toBe(HOME);
      expect(sh.fs.snapshot()).toEqual(before);
    }
  });

  it.each(['ls', 'cd'])('%s explains when the path names a file', (name) => {
    const sh = shell();
    expect(sh.run(`${name} ./note.txt`).lines).toEqual([
      { kind: 'err', text: '"./note.txt" is not a folder. Try ls to find one.' },
    ]);
    expect(sh.events).toEqual([runEvent(name, ['./note.txt'], [], false)]);
  });

  it.each(['cat', 'lock', 'rm'])('%s explains when the path names a folder', (name) => {
    const sh = shell();
    expect(sh.run(`${name} ./docs`).lines).toEqual([
      { kind: 'err', text: '"./docs" is a folder. Try a file name.' },
    ]);
    expect(sh.events).toEqual([runEvent(name, ['./docs'], [], false)]);
  });

  it.each(['cat', 'rm'])('%s explains locked files without changing them', (name) => {
    const sh = shell();
    const before = sh.fs.snapshot();
    expect(sh.run(`${name} ./locked.txt`).lines).toEqual([
      { kind: 'err', text: '"./locked.txt" is locked. Try a file you can read.' },
    ]);
    expect(sh.events).toEqual([runEvent(name, ['./locked.txt'], [], false)]);
    expect(sh.fs.snapshot()).toEqual(before);
  });
});

describe('event and instance isolation', () => {
  it('keeps permissions and event snapshots separate from caller changes', () => {
    const allowed = ['cat'];
    const sh = shell(allowed);
    allowed.push('rm');
    sh.run('cat note.txt');
    const state = sh.state;
    const first = state.events[0]!;
    if (first.type === 'run') {
      first.args.push('changed');
      first.flags.push('z');
      first.ok = false;
    }
    sh.run('cat blank');
    expect(state.events).toHaveLength(2);
    expect(sh.events[0]).toEqual(runEvent('cat', ['note.txt']));
    expect(sh.run('rm note.txt').lines[0]?.kind).toBe('hint');
    expect(state.fs).toBe(sh.fs);
  });

  it('keeps separate shell histories and mission file systems', () => {
    const first = shell();
    const second = shell();
    first.run('lock note.txt');
    first.run('cd docs');
    expect(second.events).toEqual([]);
    expect(second.fs.cwd()).toBe(HOME);
    expect(second.fs.isLocked('note.txt')).toBe(false);
  });
});

describe('run goals', () => {
  it('requires a successful run of the named command, ignoring command case', () => {
    const sh = shell(['ls']);
    const goal: TerminalGoal = { type: 'run', command: 'LS' };
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('ls missing');
    sh.run('ls -q');
    sh.run('cat note.txt');
    sh.run('sl');
    sh.run('ls "');
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('LS');
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet({ type: 'run', command: 'pwd' }, sh.state)).toBe(false);
  });

  it.each(['ls -a', 'ls -la', 'ls -al', 'ls -aa -a'])('meets a flag goal with %s', (input) => {
    const sh = shell(['ls']);
    const goal: TerminalGoal = { type: 'run', command: 'ls', args: ['-a'] };
    sh.run('ls');
    sh.run('ls -aq');
    sh.run('ls -a missing');
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run(input);
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet({ type: 'run', command: 'ls' }, sh.state)).toBe(true);
  });

  it('matches a goal without args after a successful flagged run', () => {
    const sh = shell(['ls']);
    sh.run('ls -a');
    expect(goalMet({ type: 'run', command: 'ls' }, sh.state)).toBe(true);
  });

  it.each(['ls -a ~', 'ls ~ -a'])('matches two goal args in either order for %s', (input) => {
    const sh = shell(['ls']);
    sh.run(input);
    for (const args of [['-a', '/home/agent'], ['/home/agent', '-a']]) {
      expect(goalMet({ type: 'run', command: 'ls', args }, sh.state)).toBe(true);
    }
    expect(goalMet({ type: 'run', command: 'ls', args: ['-a', '/tmp'] }, sh.state)).toBe(false);
  });

  it('treats a lone dash as a positional goal arg', () => {
    const sh = shell(['cat']);
    sh.run('cat note.txt');
    expect(goalMet({ type: 'run', command: 'cat', args: ['-'] }, sh.state)).toBe(false);
    sh.run('cat -');
    expect(goalMet({ type: 'run', command: 'cat', args: ['-'] }, sh.state)).toBe(true);
  });

  it('requires all args and flag letters together in one successful event', () => {
    const state: ShellState = { fs: shell().fs, events: [
      runEvent('ls', ['docs'], ['a', 'l']), runEvent('ls', ['empty'], ['a']),
    ] };
    const met = (args: string[]) => goalMet({ type: 'run', command: 'ls', args }, state);
    expect(met([])).toBe(true);
    expect(met(['-la', './docs'])).toBe(true);
    expect(met(['-a', '-l', 'docs'])).toBe(true);
    expect(met(['-z'])).toBe(false);
    expect(met(['-la', 'empty'])).toBe(false);
    expect(met(['docs', 'empty'])).toBe(false);
    expect(met(['Docs'])).toBe(false);
  });

  it('uses the event cwd for args and home for relative goal args', () => {
    const sh = shell();
    sh.run('cd docs');
    sh.run('cat ./note.txt');
    sh.run('cd /tmp');
    for (const path of ['docs/note.txt', '~/docs/./note.txt', `${HOME}//docs/note.txt`]) {
      expect(goalMet({ type: 'run', command: 'cat', args: [path] }, sh.state)).toBe(true);
    }
    expect(goalMet({ type: 'run', command: 'cat', args: ['note.txt'] }, sh.state)).toBe(false);
    expect(goalMet({ type: 'run', command: 'cat', args: ['./note.txt'] }, sh.state)).toBe(true);
    sh.run('cat ~/note.txt');
    expect(goalMet({ type: 'run', command: 'cat', args: ['note.txt'] }, sh.state)).toBe(true);
    expect(sh.fs.cwd()).toBe('/tmp');
  });
});

describe('file and composite goals', () => {
  it('meets an absolute hidden-file read goal from home', () => {
    const root = mission();
    const home = root.children.home as FsDir;
    const agent = home.children.agent as FsDir;
    agent.children['.secret_sauce'] = { type: 'file', content: 'Hidden sauce' };
    const sh = new Shell(new VirtualFs(root), ['cat', 'cd']);
    const goal: TerminalGoal = { type: 'read', path: '/home/agent/.secret_sauce' };
    expect(goalMet(goal, sh.state)).toBe(false);
    expect(sh.run('cat .secret_sauce').lines).toEqual([{ kind: 'out', text: 'Hidden sauce' }]);
    expect(sh.events).toEqual([
      runEvent('cat', ['.secret_sauce']), { type: 'read', path: '/home/agent/.secret_sauce' },
    ]);
    sh.run('cd /tmp');
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet({ type: 'read', path: '~/.secret_sauce' }, sh.state)).toBe(true);
  });

  it('resolves relative file goals against the current folder without changing it', () => {
    const sh = shell();
    sh.run('cd docs');
    sh.run('cat note.txt');
    expect(goalMet({ type: 'read', path: './note.txt' }, sh.state)).toBe(true);
    sh.run('lock note.txt');
    expect(goalMet({ type: 'locked', path: './note.txt' }, sh.state)).toBe(true);
    expect(goalMet({ type: 'cwd', path: '../docs/.' }, sh.state)).toBe(true);
    sh.run('rm ../blank');
    expect(goalMet({ type: 'deleted', path: '../blank' }, sh.state)).toBe(true);
    expect(sh.fs.cwd()).toBe(`${HOME}/docs`);
  });

  it('requires a read event, retaining it after navigation and deletion', () => {
    const sh = shell();
    const goal: TerminalGoal = { type: 'read', path: '~/docs/../note.txt' };
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('ls');
    sh.run('cat locked.txt');
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('cat note.txt');
    sh.run('rm note.txt');
    sh.run('cd /tmp');
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet({ type: 'read', path: '~/locked.txt' }, sh.state)).toBe(false);
  });

  it('checks current cwd rather than a past cwd event', () => {
    const sh = shell();
    expect(goalMet({ type: 'cwd', path: '~' }, sh.state)).toBe(true);
    const goal: TerminalGoal = { type: 'cwd', path: '~/docs/.' };
    sh.run('cd docs');
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet({ type: 'cwd', path: '.' }, sh.state)).toBe(true);
    sh.run('cd /tmp');
    expect(goalMet(goal, sh.state)).toBe(false);
  });

  it('uses current locks, including files locked before any command', () => {
    const sh = shell();
    expect(goalMet({ type: 'locked', path: './locked.txt' }, sh.state)).toBe(true);
    const goal: TerminalGoal = { type: 'locked', path: '~/docs/note.txt' };
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('lock docs/note.txt');
    expect(goalMet(goal, sh.state)).toBe(true);
    const unlocked = new VirtualFs(mission());
    expect(goalMet(goal, { fs: unlocked, events: sh.events })).toBe(false);
    expect(goalMet({ type: 'locked', path: 'docs' }, sh.state)).toBe(false);
    expect(goalMet({ type: 'locked', path: 'missing' }, sh.state)).toBe(false);
  });

  it('requires both a deletion event and current absence', () => {
    const sh = shell();
    const goal: TerminalGoal = { type: 'deleted', path: '~/docs/../note.txt' };
    expect(goalMet(goal, sh.state)).toBe(false);
    expect(goalMet({ type: 'deleted', path: 'missing' }, sh.state)).toBe(false);
    sh.run('rm note.txt');
    sh.run('cd /tmp');
    expect(goalMet(goal, sh.state)).toBe(true);
    expect(goalMet(goal, { fs: new VirtualFs(mission()), events: sh.events })).toBe(false);
    expect(goalMet(goal, { fs: sh.fs, events: [] })).toBe(false);
  });

  it('evaluates nested all goals and accepts an empty list', () => {
    const sh = shell();
    const goal: TerminalGoal = { type: 'all', goals: [
      { type: 'run', command: 'cat' },
      { type: 'all', goals: [{ type: 'read', path: '~/note.txt' }, { type: 'cwd', path: '~' }] },
    ] };
    expect(goalMet({ type: 'all', goals: [] }, sh.state)).toBe(true);
    expect(goalMet(goal, sh.state)).toBe(false);
    sh.run('cat note.txt');
    expect(goalMet(goal, sh.state)).toBe(true);
    sh.run('cd docs');
    expect(goalMet(goal, sh.state)).toBe(false);
  });
});

describe('kid-facing messages', () => {
  it('keeps shell messages short and free from sentence-breaking dashes', () => {
    const sh = shell([...KNOWN_COMMANDS, 'ls -a', 'cat -z']);
    const inputs = [
      'help', 'ls', 'ls empty', 'ls missing', 'ls note.txt', 'ls ""',
      'cat', 'lock', 'rm', 'cat docs', 'cat locked.txt', 'cat -z', 'ls -z',
      'cat "', 'xyzzy', 'sl', 'lock note.txt', 'rm blank',
    ];
    const messages = inputs.flatMap((input) => sh.run(input).lines);
    for (const { text } of messages) {
      expect(text).not.toMatch(/[\u2013\u2014]| - /u);
      for (const sentence of text.split(/[.!?]+/u)) {
        expect(sentence.trim().split(/\s+/u).filter(Boolean).length).toBeLessThanOrEqual(12);
      }
    }
  });
});
