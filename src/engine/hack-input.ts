import { accepts, hint, output } from './hack-state';
import type { HackMachine, HackOutcome } from './hack-state';

export type Pending =
  | { type: 'user'; host: string; connecting: boolean }
  | { type: 'login'; host: string; connecting: boolean; validUser: boolean }
  | { type: 'sudo'; host: string; cwd: string; command: string }
  | { type: 'unlock'; host: string; path: string }
  | { type: 'passphrase'; host: string }
  | { type: 'confirm'; host: string; value: string };

export function inputLabel(pending: Pending): { label: string; secret: boolean } {
  switch (pending.type) {
    case 'user': return { label: 'User name:', secret: false };
    case 'passphrase': return { label: 'New passphrase:', secret: true };
    case 'confirm': return { label: 'Type it once more:', secret: true };
    default: return { label: 'Password:', secret: true };
  }
}

export interface InputResult {
  outcome: HackOutcome;
  pending?: Pending;
  command?: string;
}

function wrongPassword(): InputResult {
  return { outcome: { ...hint('That did not match. You can try again.'), wrongPassword: true } };
}

export function answer(pending: Pending, input: string, machine: HackMachine): InputResult {
  switch (pending.type) {
    case 'user': return {
      outcome: output('Password:'),
      pending: { type: 'login', host: pending.host, connecting: pending.connecting,
        validUser: input === machine.data.login?.user },
    };
    case 'login': return login(pending, input, machine);
    case 'sudo': {
      const credential = machine.data.sudo!;
      if (!accepts(input, credential.password, credential.accept)) return wrongPassword();
      machine.root = true;
      return { outcome: output('Root access is ready.'), command: pending.command };
    }
    case 'unlock': return unlock(pending, input, machine);
    case 'passphrase': {
      if (!/^[\p{L}]+(?:-[\p{L}]+){2,}$/u.test(input) || input.length < 16) {
        return { outcome: hint('Try three words joined by dashes, at least sixteen letters.') };
      }
      return { outcome: output('Type it once more:'),
        pending: { type: 'confirm', host: pending.host, value: input } };
    }
    case 'confirm': {
      if (input !== pending.value) return { outcome: hint('Those did not match. Try passwd again.') };
      machine.password = input;
      return { outcome: { ...output('Your new passphrase is set.'), effects: [{ type: 'passwd' }] } };
    }
  }
}

function login(pending: Extract<Pending, { type: 'login' }>, input: string,
  machine: HackMachine): InputResult {
  const credential = machine.data.login!;
  const password = machine.password ?? credential.password;
  const aliases = machine.password === undefined ? credential.accept : [];
  if (!pending.validUser || !accepts(input, password, aliases)) return wrongPassword();
  machine.loggedIn = true;
  return { outcome: { ...output(machine.data.banner),
    connected: pending.connecting ? pending.host : undefined } };
}

function unlock(pending: Extract<Pending, { type: 'unlock' }>, input: string,
  machine: HackMachine): InputResult {
  // Files have no password field. Use login credentials, or sudo without login.
  const credential = machine.data.login ?? machine.data.sudo;
  const password = machine.data.login ? machine.password ?? credential?.password : credential?.password;
  const aliases = machine.data.login && machine.password !== undefined ? [] : credential?.accept;
  if (password === undefined || !accepts(input, password, aliases)) return wrongPassword();
  return { outcome: machine.fs.unlock(pending.path).ok
    ? output('The file is open now.') : hint('Try unlock with a locked file name.') };
}
