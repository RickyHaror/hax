import type { FsDir, Line, Mission, Season, StepConfig } from '../engine/types';
import { CODENAME_PREFIX, SIGNUP_PROMPT } from '../engine/codename';
import { RANKS, rankFor, XP_PER_MISSION } from '../engine/progress';
import { CROCKFORD } from '../engine/savecode';
import { caesarDecode } from '../engine/cipher';
import * as content from '../missions';
import { playground } from '../missions/playground';
import { sidekicks } from '../missions/sidekicks';
import { firstWords, secondWords } from '../missions/names';

const spacePrompt: Line = { text: 'Find the Space bar.' };

/** Shared formatters keep variable screen text and its recording list identical. */
export const screenLines = {
  earnedXp: (xp: number): Line => ({ text: `+${xp} XP` }),
  clueXp: (xp: number): Line => ({ text: `Clue found! +${xp} XP` }),
  rankUp: (before: string, after: string): Line => ({ text: `Rank up! ${before} to ${after}` }),
  rankScore: (xp: number, next?: number): Line => ({ text: next === undefined ? `${xp} XP. Top rank!` : `${xp} / ${next} XP` }),
  nextRank: (name: string): Line => ({ text: `Next: ${name}` }),
  eggs: (found: number, total: number): Line => ({ text: `Eggs found: ${found} of ${total}` }),
  missions: (done: number, total: number): Line => ({ text: `${done} of ${total} missions done` }),
  caught: (caught: number, goal: number): Line => ({ text: `Caught ${caught} of ${goal}` }),
  type: (key: string): Line => ({ text: `Type ${key}` }),
  found: (found: number, needed: number): Line => ({ text: `Found ${found} of ${needed}` }),
  shift: (shift: number): Line => ({ text: `Shift: ${shift}` }),
  wordsLeft: (left: number): Line => ({ text: `Pick ${left} more ${left === 1 ? 'word' : 'words'}.` }),
  season: (number: number, title: string): Line => ({ text: `Season ${number} · ${title}` }),
  finishSeason: (number: number): Line => ({ text: `Finish Season ${number} first` }),
  finishMission: (title: string): Line => ({ text: `Finish ${title} first` }),
  duration: (minutes: number): Line => ({ text: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` }),
  missionCard: (title: string, blurb: string, duration: string, locked: string, next: boolean): Line =>
    ({ text: [title, blurb, duration, locked, next ? 'Next mission' : ''].filter(Boolean).join('. ') }),
  emailFrom: (from: string): Line => ({ text: `From: ${from}` }),
  emailSubject: (subject: string): Line => ({ text: `Subject: ${subject}` }),
};

/** Stable screen keys shared by playback, coverage and recording jobs. */
export const speechCatalog = {
  boot: {
    toolsReady: { text: 'Crew tools are ready.' },
    computerReady: { text: 'The practice computer is ready.' },
    pretend: { text: 'It is all pretend here. Nothing real can break.' },
  },
  app: {
    newMissions: { text: 'New missions arrived!' },
    musicLocked: { text: 'Music is locked off by a grown-up.' },
  },
  save: {
    secretKey: { text: 'Your secret decryption key. Copy it into your notebook.' },
    accessGranted: { text: 'ACCESS GRANTED' },
    unlocked: { text: 'UNLOCKED' },
    saved: { text: 'Great work, Agent! Mission saved.' },
    greatWork: { text: 'Great work, Agent!' },
    notSaved: { text: 'Write your secret key in your notebook. This computer could not save.' },
    proud: { text: 'You did it! I am so proud of you.' },
    restoreHelp: { text: 'Your secret key brings back your agent.' },
    checksum: { text: 'One letter looks different. Check your notebook again.' },
    wrongLength: { text: 'Your key looks too short or long. Check your notebook.' },
    badCharacter: { text: 'That mark is not in our keys. Check your notebook.' },
    unknownVersion: { text: 'This key uses a new code. Ask your grown-up.' },
    restored: { text: 'Your key worked. Welcome back!' },
  },
  map: {
    comingSoon: { text: 'Missions coming soon' },
    explore: { text: 'Explore your pretend computer. Find fun secrets!' },
    firstMission: { text: 'the first mission' },
    priorSeason: { text: 'Finish the prior season first' },
  },
  idCard: {
    badges: { text: 'Your badges' },
    firstBadge: { text: 'Finish a mission to earn your first badge.' },
    photo: { text: 'Choose a photo' },
    pickPhoto: { text: 'Pick your photo' },
    commands: { text: 'Commands learned' },
    learnCommands: { text: 'Learn commands as you play.' },
    title: { text: 'Agent ID card' },
    robot: { text: 'Robot' },
    ninjaCat: { text: 'Ninja Cat' },
    alien: { text: 'Alien' },
    dino: { text: 'Dino' },
    wizard: { text: 'Wizard' },
    astronaut: { text: 'Astronaut' },
    octopus: { text: 'Octopus' },
    unicorn: { text: 'Unicorn' },
  },
  parent: {
    setPin: { text: 'Set a grown-up PIN' },
    repeatPin: { text: 'Enter the PIN again' },
    enterPin: { text: 'Enter your grown-up PIN' },
    differentPins: { text: 'Those PINs differ. Try both again.' },
    wrongPin: { text: 'That PIN did not match. Try again.' },
    failedPin: { text: 'The PIN could not be checked. Try again.' },
    fourDigits: { text: 'Use four digits.' },
    wait: { text: 'Please wait 30 seconds. Then try again.' },
    stopSaved: { text: 'Great time to stop. Your mission is saved.' },
    stopUnsaved: { text: 'Great time to stop. Write your secret key first.' },
  },
  bootcamp: {
    dragNudge: { text: 'Good try. Let us find its home.' },
    keyNudge: { text: 'Good try. Look for the glowing key.' },
    typingNudge: { text: 'Good try. Find the next bright letter.' },
    fallingNudge: { text: 'Here it comes again. Take your time.' },
    space: spacePrompt,
    keysDone: { text: 'You found every key!' },
    doubleClick: { text: 'Click two times, fast!' },
    training: { text: 'Agent training' },
  },
  explorer: {
    locked: { text: 'This file is locked. Try another file.' },
    openFolder: { text: 'Click two times to open it.' },
    openFile: { text: 'Open this file, or choose its folder.' },
    wrongHome: { text: 'Good try. Let us find this file a different home.' },
    moved: { text: 'A snug home! Keep going.' },
    thisComputer: { text: 'This computer' },
  },
  passphrase: {
    strong: { text: 'Super strong!' },
    stronger: { text: 'Getting stronger!' },
    pickTeam: { text: 'Pick your word team.' },
    preview: { text: 'Your words go here.' },
    ready: { text: 'Your word team is ready.' },
    full: { text: 'Your team is full. Tap a word to swap it.' },
  },
  tools: {
    decoder: { text: 'Decoder wheel' },
    pretendPage: { text: 'This is just a pretend page.' },
    secretQuestion: { text: 'What secret did you find?' },
    noteQuestion: { text: 'What does the note say?' },
  },
  widgets: {
    unfinished: { text: 'This part is still being built.' },
    answerNudge: { text: 'Good try. Look at the clue and try again.' },
    thisOne: { text: 'This one!' },
    typeCommand: { text: 'Type a command. Press Enter to run it.' },
    showMe: { text: 'Show me types a command. Then press Enter.' },
    passwordNudge: { text: 'Good try. Look at the profile card for a clue.' },
    accessGranted: { text: 'Access granted' },
    logNudge: { text: 'Good try. Read the log for a clue.' },
    ethics: { text: 'Only hack what you own or have permission to hack.' },
  },
  signup: {
    prompt: SIGNUP_PROMPT,
    prefix: { text: 'Your name:', say: CODENAME_PREFIX, speaker: 'narrator' },
  },
  keys: Object.fromEntries([...CROCKFORD, ...'ILOU', 'Enter', 'Backspace', 'Shift']
    .map((key) => [key, keyPromptLine(key)])),
  saveCharacters: Object.fromEntries([...CROCKFORD, '-'].map((text) => [text, { text }])),
  nameWords: Object.fromEntries([...new Set([...firstWords, ...secondWords])].map((text) => [text, { text }])),
  ...recordingVariants(),
} satisfies Record<string, Record<string, Line>>;

/** Key prompts have a small, fixed set of possible recordings. */
export function keyPromptLine(key: string): Line {
  if (key === ' ') return spacePrompt;
  if (/^[0-9]$/.test(key)) return { text: `Find the number ${key}.` };
  return { text: key.length === 1 ? `Find the letter ${key.toUpperCase()}.` : `Find the ${key} key.` };
}

export function catalogEntries(): { key: string; line: Line }[] {
  return Object.entries(speechCatalog).flatMap(([screen, lines]) =>
    Object.entries(lines).map(([key, line]) => ({ key: `${screen}.${key}`, line })));
}

export function agentNameSpeech(first: string, second: string, preview = false): { line: Line; parts: Line[] } {
  const role = preview ? { speaker: 'narrator' as const } : {};
  const words: Line[] = [first, second].map((text) => ({ text, ...role }));
  return {
    line: { text: preview ? `${speechCatalog.signup.prefix.text} ${first} ${second}` : `${first} ${second}`, ...role },
    parts: preview ? [speechCatalog.signup.prefix, ...words] : words,
  };
}

export function saveKeySpeech(code: string): { line: Line; parts: Line[] } {
  return { line: { text: code, say: code.split('').join(' ') },
    parts: [...code].map((text) => ({ text })) };
}

function countVariants(total: number, make: (count: number, total: number) => Line): Line[] {
  return Array.from({ length: total + 1 }, (_, count) => make(count, total));
}

function fileVariants(tree: FsDir): Line[] {
  return Object.entries(tree.children).flatMap(([name, node]) => node.type === 'dir'
    ? [{ text: name }, ...fileVariants(node)] : [{ text: node.content }]);
}

function passphraseVariants(words: readonly string[], count: number, picked: string[] = []): Line[] {
  if (picked.length >= count) return [];
  return words.filter((word) => !picked.includes(word)).flatMap((word) => {
    const next = [...picked, word];
    return [{ text: next.join('-') }, ...passphraseVariants(words, count, next)];
  });
}

function widgetVariants(config: StepConfig): Line[] {
  switch (config.kind) {
    case 'typing-game': return [...countVariants(config.goal, screenLines.caught),
      ...[...new Set(config.words.join(''))].map((key) => screenLines.type(key === ' ' ? 'Space' : key.toUpperCase()))];
    case 'key-find': return config.keys.map(keyPromptLine);
    case 'passphrase': return [...countVariants(config.count - 1, (index) => screenLines.wordsLeft(index + 1)),
      ...passphraseVariants([...new Set(config.words)], config.count)];
    case 'file-explorer': return fileVariants(config.fs);
    case 'web-source': return [{ text: config.page.title },
      ...config.page.blocks.filter((block) => block.type !== 'button').map(({ text }) => ({ text }))];
    case 'decoder': return Array.from({ length: 26 }, (_, shift) => ({ text: caesarDecode(config.message, shift) }));
    case 'log-read': return config.lines.map((text) => ({ text }));
    case 'phish-spot': return [...countVariants(config.needed, screenLines.found),
      screenLines.emailFrom(config.email.from), screenLines.emailSubject(config.email.subject),
      ...[...config.email.body, config.email.link ?? '', ...config.clues.map((clue) => clue.match)]
        .filter(Boolean).map((text) => ({ text }))];
    default: return [];
  }
}

function missionMapVariants(mission: Mission, seasons: readonly Season[]): Line[] {
  const duration = screenLines.duration(mission.minutes).text;
  const required = mission.requires.map((id) => content.missions.find((entry) => entry.id === id)?.title ?? 'the first mission');
  const season = seasons.find((season) => season.missions.includes(mission.id));
  const prior = seasons.find((entry) => entry.id === season?.requires);
  const locks = [...required.map((title) => screenLines.finishMission(title).text),
    ...(season?.requires ? [prior ? screenLines.finishSeason(prior.number).text : 'Finish the prior season first'] : [])];
  return [...[false, true].map((next) => screenLines.missionCard(mission.title, mission.blurb, duration, '', next)),
    ...locks.map((locked) => screenLines.missionCard(mission.title, mission.blurb, duration, locked, false))];
}

function rewardVariants(mission: Mission): Line[] {
  return [{ text: mission.badge.name }, ...(mission.teaches?.map((text) => ({ text })) ?? []),
    ...(mission.contract ? [{ text: mission.contract.flag }, { text: mission.contract.client.name },
      { text: mission.contract.client.role }, ...mission.contract.allowed.map((text) => ({ text }))] : [])];
}

/** Enumerate bounded screen values from the same local content the UI plays. */
function recordingVariants(): Record<string, Record<string, Line>> {
  const seasons = (content as unknown as { seasons?: Season[] }).seasons ?? [];
  const totals = content.missions.reduce((values, mission) => [...new Set([
    ...values, ...values.map((xp) => xp + (mission.xp ?? XP_PER_MISSION)),
  ])], [0]);
  const rewards = [...new Set(content.missions.map((mission) => mission.xp ?? XP_PER_MISSION))];
  const active = content.missions.filter((mission) => !mission.retired);
  const configs = active.flatMap((mission) => mission.steps.map((step) => step.config));
  const widgetGroups = Object.fromEntries([...new Set(configs.map((config) => config.kind))]
    .map((kind) => [`${kind}Values`, configs.filter((config) => config.kind === kind).flatMap(widgetVariants)]));
  const groups: Record<string, Line[]> = {
    ...widgetGroups,
    mapValues: active.flatMap((mission) => missionMapVariants(mission, seasons)),
    idCardValues: [...content.missions.flatMap(rewardVariants), ...sidekicks.map((buddy) => ({ text: buddy.name }))],
    rankValues: [...RANKS.flatMap((rank) => [{ text: rank.name }, screenLines.nextRank(rank.name),
      ...RANKS.filter((before) => before.xp < rank.xp).map((before) => screenLines.rankUp(before.name, rank.name))]),
      ...totals.map((xp) => screenLines.rankScore(xp, rankFor(xp).next?.xp))],
    saveValues: rewards.flatMap((xp) => [screenLines.earnedXp(xp), screenLines.clueXp(xp)]),
    playgroundValues: playground ? [...countVariants(playground.eggs.length, screenLines.eggs),
      ...playground.eggs.map((egg) => ({ text: egg.name }))] : [],
    seasonValues: seasons.flatMap((season) => [screenLines.season(season.number, season.title), { text: season.blurb },
      screenLines.finishSeason(season.number), ...countVariants(season.missions.filter((id) =>
        content.missions.some((mission) => mission.id === id && mission.chapter === 'season' && !mission.retired)).length,
      screenLines.missions)]),
    decoderWheelValues: Array.from({ length: 26 }, (_, shift) => screenLines.shift(shift)),
  };
  return Object.fromEntries(Object.entries(groups).map(([screen, lines]) =>
    [screen, Object.fromEntries(lines.map((line) => [line.text, line]))]));
}

const catalogSpoken: ReadonlySet<string> = new Set(catalogEntries().map(({ line }) => (line.say ?? line.text).trim()));

/** Catalog speech is recorded only, including composed agent names and save keys. */
export function isCatalogSpeech(line: Line): boolean {
  const spoken = (line.say ?? line.text).trim();
  if (catalogSpoken.has(spoken)) return true;
  const prefix = `${speechCatalog.signup.prefix.text} `;
  const name = (spoken.startsWith(prefix) ? spoken.slice(prefix.length) : spoken).split(' ');
  if (name.length === 2 && firstWords.includes(name[0]!) && secondWords.includes(name[1]!)) return true;
  return spoken.length > 1 && /^[0-9A-HJKMNP-TV-Z -]+$/.test(spoken)
    && spoken.replace(/[ -]/g, '').length >= 12;
}
