import { handlers, KNOWN_COMMANDS } from './shell';
import type { ParsedCommand } from './shell';
import { hint, output } from './hack-state';
import type { HackMachine, HackOutcome } from './hack-state';
import type { Contract } from './types';

const HELP: Readonly<Record<string, string>> = Object.freeze({
  ls: 'List files. Try -a or -l too.', cd: 'Go to a folder.', cat: 'Read a file.',
  pwd: 'Show this folder.', help: 'Show your commands.', clear: 'Clear the screen.',
  lock: 'Lock a file.', rm: 'Remove a file.', whoami: 'Show your user name.',
  connect: 'Visit an allowed computer.', login: 'Sign in with a user and password.',
  exit: 'Go back one computer.', scan: 'Look for computers or ports.',
  sudo: 'Run a command as root.', grep: 'Find a word in a file.',
  'view-source': 'Read a pretend page source.', decode: 'Read base64 text.',
  mail: 'List mail, or read its number.', report: 'Report a trick email.',
  passwd: 'Set a strong passphrase.', chmod: 'Set three permission digits on a file.',
  unlock: 'Open a locked file with its password.', open: 'Read your HQ message.',
  submit: 'Hand in clue text or a file.',
});

export function ordinary(machine: HackMachine, command: ParsedCommand,
  allowed: readonly string[], contract?: Contract): HackOutcome {
  const { name, args } = command;
  if (name === 'help') return output(allowed.map((name) => `${name}: ${HELP[name]}`));
  if (name === 'whoami') return output(machine.root ? 'root' : machine.data.user);
  if (name === 'ls' && command.flags.includes('l')) return longList(machine, command);
  if (KNOWN_COMMANDS.includes(name)) return shellCommand(machine, command, allowed);
  switch (name) {
    case 'grep': return grep(machine, args[0]!, args[1]!);
    case 'view-source': {
      const page = machine.data.pages?.find((page) => page.address === args[0]);
      return page ? output(page.source) : hint('Try a page address from this mission.');
    }
    case 'decode': return decode(args.join(' '));
    case 'mail': return mail(machine, args[0]);
    case 'report': return report(machine, args[0]!);
    case 'chmod': return chmod(machine, args[0]!, args[1]!);
    case 'open': return contract ? output([
      contract.problem.text, contract.goal.text, 'You may visit:', ...contract.allowed,
    ]) : hint('HQ has no message for this mission.');
    case 'submit': return submit(machine, args.join(' '), contract);
    default: return hint();
  }
}

function shellCommand(machine: HackMachine, command: ParsedCommand,
  allowed: readonly string[]): HackOutcome {
  const args = command.name === 'cd' && !command.args.length ? [machine.data.home] : command.args;
  const result = handlers[command.name]!(machine.fs, { ...command, args }, allowed);
  if (!result.ok) return hint('Try a file or folder shown by ls.');
  const messages = command.name === 'lock' ? ['You locked the file. Nice work!']
    : command.name === 'rm' ? ['You removed the file. Nice work!']
      : result.lines.map((line) => line.text);
  const formatted = output(messages);
  return { ...formatted, clear: result.clear, effects: result.event ? [result.event] : [] };
}

function longList(machine: HackMachine, command: ParsedCommand): HackOutcome {
  const result = machine.fs.list(command.args[0] ?? '.', { all: command.flags.includes('a') });
  if (!result.ok) return hint('Try ls with a folder name.');
  return output(result.value.length ? result.value.map((entry) =>
    `${entry.type === 'dir' ? 'dir' : entry.mode ?? '644'} ${entry.name}${entry.type === 'dir'
      ? '/' : entry.locked ? ' [locked]' : ''}`) : ['This folder is empty.']);
}

function grep(machine: HackMachine, word: string, path: string): HackOutcome {
  if (!word) return hint('Try grep with a word and file name.');
  const result = machine.fs.read(path);
  if (!result.ok) return hint('Try grep with a file you can read.');
  const matches = result.value.split('\n').flatMap((line, index) =>
    line.toLowerCase().includes(word.toLowerCase()) ? [`${index + 1}: ${line}`] : []);
  if (!matches.length) return hint('No matching lines yet. Try another word.');
  return { ...output(matches), effects: [{ type: 'read', path: machine.fs.resolve(path) }] };
}

function decode(text: string): HackOutcome {
  try {
    if (!text || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/u.test(text)) {
      return hint('Try base64 text with letters, numbers, plus, or slash.');
    }
    const bytes = Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/\b(?:[a-z\d-]+\.)+[a-z]{2,}\b/iu.test(decoded)) {
      return hint('Try clue text without a web address.');
    }
    if (/[\p{Cc}]/u.test(decoded.replace(/[\n\r\t]/gu, ''))) {
      return hint('Try base64 that holds readable text.');
    }
    return { ...output(decoded.split('\n')), effects: [{ type: 'decoded', text: decoded }] };
  } catch {
    return hint('Try base64 that holds readable text.');
  }
}

function mail(machine: HackMachine, id?: string): HackOutcome {
  const messages = machine.data.mail ?? [];
  if (id === undefined) return output(messages.length ? messages.map((message) =>
    `${message.id}: ${message.subject}`) : ['No mail here yet.']);
  const message = messages.find((message) => message.id === id);
  return message ? output([message.from, message.subject, ...message.body])
    : hint('Try a mail number from the list.');
}

function report(machine: HackMachine, id: string): HackOutcome {
  const message = machine.data.mail?.find((message) => message.id === id);
  if (!message) return hint('Try a mail number from the list.');
  if (!message.fake) return hint('This mail looks safe. Look for a trick email.');
  return { ...output('Thanks! You reported the trick email.'), effects: [{ type: 'reported', mailId: id }] };
}

function chmod(machine: HackMachine, mode: string, path: string): HackOutcome {
  if (!/^[0-7]{3}$/u.test(mode)) return hint('Try three digits, each from zero to seven.');
  if (!machine.fs.chmod(path, mode).ok) return hint('Try chmod with a file name.');
  return { ...output('The file permissions are set.'),
    effects: [{ type: 'chmod', path: machine.fs.resolve(path), mode }] };
}

function submit(machine: HackMachine, text: string, contract?: Contract): HackOutcome {
  if (!contract?.flag) return hint('HQ has no clue to collect yet.');
  const file = machine.fs.read(text);
  const found = text.trim() === contract.flag || (file.ok && file.value.includes(contract.flag));
  return found ? { ...output('Clue received. Nice work!'), effects: [{ type: 'flag' }] }
    : hint('Keep looking for the whole CLUE text.');
}

/** Validate before dispatch, so extra arguments can never make changes. */
export function validCommand(command: ParsedCommand): boolean {
  const { name, args, flags } = command;
  if (flags.some((flag) => name !== 'ls' || !['a', 'l'].includes(flag))) return false;
  const counts: Readonly<Record<string, readonly [number, number]>> = {
    ls: [0, 1], cd: [0, 1], cat: [1, 1], help: [0, 0], clear: [0, 0],
    pwd: [0, 0], lock: [1, 1], rm: [1, 1], whoami: [0, 0],
    connect: [1, 1], login: [0, 0], exit: [0, 0], scan: [0, 1],
    grep: [2, 2], 'view-source': [1, 1], decode: [1, 1], mail: [0, 1],
    report: [1, 1], passwd: [0, 0], chmod: [2, 2], unlock: [1, 1],
    open: [0, 0], submit: [1, Infinity],
  };
  const count = counts[name];
  return !!count && args.length >= count[0] && args.length <= count[1]
    && args.every((arg) => arg.trim().length > 0);
}
