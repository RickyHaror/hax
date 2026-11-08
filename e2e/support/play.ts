import { expect, type Locator, type Page } from '@playwright/test';
import { normalizeShift } from '../../src/engine/cipher';
import { VirtualFs } from '../../src/engine/fs';
import { HackSession, hackGoalMet } from '../../src/engine/hack';
import { tokenize } from '../../src/engine/shell';
import { goalMet, Shell } from '../../src/engine/shell';
import type {
  DragDropConfig, FileExplorerConfig, HackConfig, Mission, Step, StepConfig, TerminalConfig,
  TypingGameConfig,
} from '../../src/engine/types';
import { solveTerminal } from '../../src/ui/widgets/terminal/solve';
import { checkLayout } from './layout-check';

interface PlayOptions {
  hints: 'none' | 'all';
  onScreen?: (label: string) => Promise<void>;
}

export async function begin(page: Page): Promise<void> {
  const tap = button(page, 'Tap to begin, Agent!');
  await tap.waitFor({ state: 'visible', timeout: 10_000 });
  await checkLayout(page, 'begin');
  await tap.click();
}

function button(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

async function screen(page: Page, opts: PlayOptions, label: string): Promise<void> {
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await opts.onScreen?.(label);
  await checkLayout(page, label);
}

async function showHints(page: Page, opts: PlayOptions, label: string): Promise<void> {
  if (opts.hints !== 'all') return;
  for (let rung = 0; rung < 3; rung++) {
    await button(page, 'Help me').click();
    await screen(page, opts, rung === 2 ? `${label}-show-me` : `${label}-hint-${rung + 1}`);
  }
}

async function checkAnswer(
  page: Page, answer: string, hints: PlayOptions['hints'], label = 'Answer',
): Promise<void> {
  const input = page.getByRole('textbox', { name: label, exact: true });
  if (hints === 'none') await input.fill(answer);
  else await expect(input).toHaveValue(answer);
  await button(page, 'Check').click();
}

async function mouseDrag(page: Page, item: Locator, zone: Locator): Promise<void> {
  await item.scrollIntoViewIfNeeded();
  await zone.scrollIntoViewIfNeeded();
  const from = await item.boundingBox();
  const to = await zone.boundingBox();
  if (!from || !to) throw new Error('Drag item and destination must be visible.');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  try {
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  } finally {
    await page.mouse.up();
  }
}

async function placeStickers(page: Page, config: DragDropConfig): Promise<void> {
  for (const [index, item] of config.items.entries()) {
    const zone = config.zones.find((entry) => entry.id === item.goesTo);
    if (!zone) throw new Error(`Unknown sticker zone "${item.goesTo}".`);
    if (index === 0) {
      await mouseDrag(page, button(page, item.label), button(page, `Put in ${zone.label}`));
      // A failed pointer drag must fail here, rather than being repaired by a click.
      if (config.items.length === 1) await expect(button(page, 'Help me')).toHaveCount(0);
      else {
        await expect(page.getByRole('region', { name: zone.label, exact: true })
          .getByRole('button', { name: item.label, exact: true })).toBeDisabled();
      }
    } else {
      await button(page, item.label).click();
      await button(page, `Put in ${zone.label}`).click();
    }
  }
}

async function catchPackets(
  page: Page, config: TypingGameConfig, hints: PlayOptions['hints'],
): Promise<void> {
  await page.getByRole('main').focus();
  for (let caught = 0; caught < config.goal; caught++) {
    const word = config.words[caught % config.words.length];
    if (!word) throw new Error('Typing game needs a nonempty word.');
    await expect(button(page, `Catch ${word}`)).toBeVisible();
    if (hints === 'all') await button(page, `Catch ${word}`).click();
    else await page.keyboard.type(word);
    if (caught + 1 < config.goal) {
      await expect(page.getByText(`Caught ${caught + 1} of ${config.goal}`, { exact: true })).toBeVisible();
    }
  }
}

function explorer(page: Page): Locator {
  return page.getByRole('region', { name: 'File explorer', exact: true });
}

async function openFolder(page: Page, path: string): Promise<void> {
  await explorer(page).getByRole('navigation', { name: 'Folders', exact: true })
    .getByRole('button', { name: 'This computer', exact: true }).click();
  for (const name of path.split('/').filter(Boolean)) {
    await explorer(page).locator('.file-items').getByRole('button', { name, exact: true }).dblclick();
  }
}

async function exploreFiles(page: Page, config: FileExplorerConfig): Promise<void> {
  if (config.task.type === 'open') {
    const parts = config.task.path.split('/').filter(Boolean);
    const target = parts.pop();
    if (!target) throw new Error('File explorer needs an entry to open.');
    await openFolder(page, parts.join('/'));
    await explorer(page).locator('.file-items')
      .getByRole('button', { name: target, exact: true }).dblclick();
  } else {
    for (const move of config.task.moves) {
      const parts = move.file.split('/').filter(Boolean);
      const name = parts.pop()!;
      await openFolder(page, parts.join('/'));
      await explorer(page).locator('.file-items').getByRole('button', { name, exact: true }).click();
      await explorer(page).getByRole('button', {
        name: `Move to ${move.toDir.split('/').filter(Boolean).at(-1)}`, exact: true,
      }).click();
    }
  }
}

async function runTerminal(
  page: Page, config: TerminalConfig, hints: PlayOptions['hints'],
): Promise<void> {
  const shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands);
  const commands = solveTerminal(config);
  for (const planned of commands) {
    const command = hints === 'all' ? solveTerminal(config, shell.state)[0] : planned;
    if (!command) throw new Error('Terminal solution ended before its goal.');
    const input = page.getByRole('textbox', { name: 'Command', exact: true });
    if (hints === 'all') {
      await button(page, 'Show me').click();
      await expect(input).toHaveValue(`${command} `);
    } else await input.fill(command);
    await input.press('Enter');
    shell.run(command);
  }
  expect(goalMet(config.goal, shell.state)).toBe(true);
}

async function solveTools(page: Page, config: StepConfig, hints: PlayOptions['hints']): Promise<void> {
  switch (config.kind) {
    case 'web-source':
      if (hints === 'none') await button(page, 'View Code').click();
      await checkAnswer(page, config.answer, hints);
      return;
    case 'decoder':
      if (hints === 'none') {
        for (let shift = 0; shift < normalizeShift(config.shift); shift++) {
          await button(page, 'Turn right').click();
        }
        await expect(page.getByLabel('Decoded message', { exact: true })).toContainText(config.answer);
      }
      await checkAnswer(page, config.answer, hints);
      return;
    case 'password-guess':
      await checkAnswer(page, config.password, hints, 'Password');
      return;
    case 'log-read': {
      const option = config.options.find((entry) => entry.id === config.correct);
      if (!option) throw new Error('Log reading step needs a correct option.');
      await button(page, option.label).click();
      return;
    }
    case 'phish-spot':
      for (const clue of config.clues.slice(0, config.needed)) {
        const name = new RegExp(`^${escapePattern(clue.match)}$`, 'i');
        await page.getByRole('button', { name }).click();
      }
      return;
    default: throw new Error(`Unknown tool kind "${config.kind}".`);
  }
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function missionCard(page: Page, mission: Mission, completed = false): Locator {
  const title = escapePattern(mission.title);
  return page.getByRole('button', { name: new RegExp(completed ? `^✓\\s+${title}(?:\\s|$)` : title) });
}

function hackAnswer(mission: Mission, session: HackSession, config: HackConfig, command: string): string {
  const pending = session.pendingInput();
  const parsed = tokenize(command);
  const tokens = parsed.ok ? parsed.tokens : [];
  const host = tokens[0] === 'connect' ? tokens[1]
    : command === '' ? config.start ?? session.prompt().host : session.prompt().host;
  const machine = mission.machines?.find((entry) => entry.host === host);
  if (pending?.label === 'New passphrase:' || pending?.label === 'Type it once more:') return 'milk-rocket-tuba-cloud';
  if (pending?.label === 'User name:' && machine?.login) return machine.login.user;
  const changed = session.events.some((event) => event.type === 'passwd' && event.host === host);
  const password = tokens[0] === 'sudo' ? machine?.sudo?.password
    : changed ? 'milk-rocket-tuba-cloud' : (machine?.login ?? machine?.sudo)?.password;
  if (!password) throw new Error(`No fixture credential for ${mission.id} on ${host}.`);
  return password;
}

async function hackInputs(
  page: Page, mission: Mission, session: HackSession, config: HackConfig, command: string, opts: PlayOptions,
): Promise<void> {
  while (session.pendingInput()) {
    const pending = session.pendingInput()!;
    const input = page.getByRole('textbox', { name: pending.label, exact: true });
    await expect(input).toBeVisible();
    await screen(page, opts, `hack-input-${pending.label.replace(/\W+/g, '-').toLowerCase()}`);
    const answer = hackAnswer(mission, session, config, command);
    await input.fill(answer);
    if (pending.secret) await expect(input).toHaveValue('*'.repeat(answer.length));
    await input.press('Enter');
    session.run(answer, config.commands);
  }
}

async function runHack(
  page: Page, mission: Mission, step: Step, config: HackConfig, opts: PlayOptions, session: HackSession,
): Promise<void> {
  await hackInputs(page, mission, session, config, '', opts);
  const commands = [...new Set([...(config.chips ?? []).map((chip) => chip.command), config.showMe])];
  for (const [index, command] of commands.entries()) {
    if (hackGoalMet(config.goal, session)) break;
    const chip = config.chips?.find((entry) => entry.command === command);
    if (chip && (opts.hints === 'none' || command !== config.showMe)) await button(page, command).click();
    else {
      if (!await button(page, 'Show me').isVisible()) {
        await showHints(page, { ...opts, hints: 'all' }, `step-${step.id}-command-${index + 1}`);
      }
      await button(page, 'Show me').click();
    }
    const input = page.getByRole('textbox', { name: 'Command', exact: true });
    await expect(input).toHaveValue(new RegExp(`^${escapePattern(command)}\\s*$`));
    await screen(page, opts, `step-${step.id}-command-${index + 1}`);
    await input.press('Enter');
    session.run(command, config.commands);
    await hackInputs(page, mission, session, config, command, opts);
  }
  expect(hackGoalMet(config.goal, session), `${mission.id}/${step.id}: hack goal`).toBe(true);
}

async function solveStep(page: Page, mission: Mission, step: Step, opts: PlayOptions, hack: HackSession): Promise<void> {
  const { config } = step;
  const known = ['story', 'answer', 'click-targets', 'drag-drop', 'key-find', 'typing-game',
    'file-explorer', 'choice', 'passphrase', 'terminal', 'web-source', 'decoder',
    'password-guess', 'log-read', 'phish-spot', 'hack'];
  if (!known.includes(config.kind)) {
    throw new Error(`Unknown step kind "${config.kind}" in mission "${mission.id}".`);
  }
  if (await page.getByText('This part is still being built.', { exact: true }).isVisible()) {
    await button(page, 'Next').click();
    return;
  }
  const hints = opts.hints;
  switch (config.kind) {
    case 'story': await button(page, 'Next').click(); return;
    case 'answer': await checkAnswer(page, config.answer, hints); return;
    case 'click-targets':
      for (const target of config.targets) {
        if (config.action === 'double-click' && hints === 'none') await button(page, target.label).dblclick();
        else await button(page, target.label).click();
      }
      return;
    case 'drag-drop': if (hints === 'none') await placeStickers(page, config); return;
    case 'key-find':
      await page.getByRole('main').focus();
      for (const key of config.keys) await page.keyboard.press(key === ' ' ? 'Space' : key);
      return;
    case 'typing-game': await catchPackets(page, config, hints); return;
    case 'file-explorer': if (hints === 'none') await exploreFiles(page, config); return;
    case 'choice': {
      const option = config.options.find((entry) => entry.id === config.correct[0]);
      if (!option) throw new Error(`No correct option in mission "${mission.id}".`);
      await button(page, option.label).click(); return;
    }
    case 'passphrase':
      if (hints === 'none') {
        for (const word of [...new Set(config.words)].slice(0, config.count)) await button(page, word).click();
      }
      await button(page, 'Check').click(); return;
    case 'terminal': await runTerminal(page, config, hints); return;
    case 'hack': await runHack(page, mission, step, config, opts, hack); return;
    default: await solveTools(page, config, hints);
  }
}

async function playLogin(page: Page, mission: Mission, opts: PlayOptions): Promise<void> {
  const step = mission.steps.find((entry) => entry.config.kind === 'answer');
  if (!step || step.config.kind !== 'answer') throw new Error(`Login "${mission.id}" needs an answer step.`);
  await expect(page.getByRole('heading', { name: 'AGENT HQ', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
  await screen(page, opts, 'intro');
  await screen(page, opts, `step-${step.id}-before`);
  await showHints(page, opts, `step-${step.id}`);
  await checkAnswer(page, step.config.answer, opts.hints, 'Password');
  await expect(button(page, 'Next')).toBeVisible();
  await screen(page, opts, `step-${step.id}-after`);
  await screen(page, opts, `success-${step.id}`);
  await button(page, 'Next').click();
  await expect(page.getByRole('heading', { name: 'Pick your agent name', exact: true })).toBeVisible();
  await screen(page, opts, 'onboarding');
}

export async function playMission(page: Page, mission: Mission, opts: PlayOptions): Promise<void> {
  if (mission.chapter === 'login') return playLogin(page, mission, opts);
  await missionCard(page, mission).click();
  await expect(button(page, 'Start mission')).toBeVisible();
  await screen(page, opts, 'intro');
  await button(page, 'Start mission').click();
  if (mission.client) {
    await expect(button(page, 'I accept')).toBeVisible();
    await screen(page, opts, 'permission');
    await button(page, 'I accept').click();
  }
  const hack = new HackSession(mission);
  for (const step of mission.steps) {
    await expect(page.getByRole('heading', { name: step.title, level: 2, exact: true })).toBeVisible();
    await screen(page, opts, `step-${step.id}-before`);
    await showHints(page, opts, `step-${step.id}`);
    await solveStep(page, mission, step, opts, hack);
    await expect(button(page, 'Help me')).toHaveCount(0);
    await expect(button(page, 'Next')).toBeVisible();
    await screen(page, opts, `step-${step.id}-after`);
    await screen(page, opts, `success-${step.id}`);
    await button(page, 'Next').click();
  }
  await expect(button(page, 'Next')).toBeVisible();
  await screen(page, opts, 'outro');
  await button(page, 'Next').click();
  const done = mission.contract ? 'ACCESS GRANTED' : 'Great work, Agent! Mission saved.';
  await expect(page.getByRole('heading', { name: done, exact: true })).toBeVisible();
  await screen(page, opts, 'done');
}
