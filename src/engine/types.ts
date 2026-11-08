import type { JSX } from 'preact';

/**
 * Mission schema: the contract between the engine lane and the content lane.
 *
 * The engine lane owns this file and implements every StepKind as a widget.
 * The content lane writes mission data files under src/missions/ that satisfy it.
 * Changing this file needs owner approval because both lanes depend on it.
 */

/** Stable mission identifier, for example "m1-pizza". Never rename after release. */
export type MissionId = string;

/** One line of kid-facing text. Every Line gets a read-aloud button. */
export interface Line {
  /** What is shown. Short sentences, early reader words. */
  text: string;
  /** Optional spoken version when the written form reads badly aloud (for example "ls" said as "L S"). */
  say?: string;
  /** Who says it. Defaults to the sidekick. */
  speaker?: 'sidekick' | 'client' | 'narrator' | 'player';
}

/** Three-rung hint ladder: nudge, bigger hint, show me. */
export type HintLadder = readonly [nudge: Line, bigger: Line, showMe: Line];

export type Chapter = 'login' | 'bootcamp' | 'terminal' | 'missions' | 'season';

export interface Badge {
  id: string;
  name: string;
  /** Key into the engine's badge art registry. */
  art: string;
}

/** The pretend client. Every client mission opens with a permission slip. */
export interface Client {
  company: string;
  /** Person who signs the slip. Fictional and silly. */
  contact: string;
  /** Key into the engine's client art registry. */
  art: string;
  /** What the agent may test. Shown on the slip, read aloud, must be accepted. */
  allowed: Line[];
  /** What is off limits. */
  notAllowed: Line[];
}

/* ---------- Simulated file system (data form) ---------- */

export interface FsFile {
  type: 'file';
  content: string;
  /** Locked files cannot be read until unlocked. Lockdown steps lock files. */
  locked?: boolean;
  /** Pretend permissions for `chmod`, for example "644" (anyone can read) or "600" (only me). */
  mode?: string;
}
export interface FsDir {
  type: 'dir';
  children: Record<string, FsNode>;
}
export type FsNode = FsFile | FsDir;

/* ---------- Seasons ---------- */

/** Stable season identifier, for example "s1". */
export type SeasonId = string;

export interface Season {
  id: SeasonId;
  number: number;
  title: string;
  blurb: string;
  /** Mission ids in play order. This list is the season order. */
  missions: MissionId[];
  /** Season that must be finished first, or null for Season 1. */
  requires: SeasonId | null;
}

/* ---------- Target machines ---------- */

/** Prompt color tokens from DSFoundations (--pc-hq, --pc-shop, --pc-bakery, --pc-library). */
export type PromptColor = 'hq' | 'shop' | 'bakery' | 'library';

export interface MachineLogin {
  user: string;
  password: string;
  /** Other accepted spellings, case insensitive. */
  accept?: string[];
}

export interface MailMessage {
  /** Shown as its number in `mail`. */
  id: string;
  /** Pretend sender, for example "Sunny-Bakery Help <help@sunny-bakkery.example>". */
  from: string;
  subject: string;
  body: string[];
  /** True for the trick email the player should `report`. */
  fake?: boolean;
}

export interface WebPage {
  /** Pretend address ending in .example, with an optional path. */
  address: string;
  title: string;
  /** Lines `view-source` prints. A password may hide in an <!-- comment -->. */
  source: string[];
}

export interface Machine {
  /** Pretend host, for example "shop-pc". */
  host: string;
  /** Owner shown by `scan`, for example "Corner Shop". */
  owner: string;
  /** User after a successful login (or from the start when there is no login). */
  user: string;
  color: PromptColor;
  /** One to four lines, each at most 36 characters. */
  banner: string[];
  fs: FsDir;
  /** Home and start directory, for example "/home/admin". */
  home: string;
  /** Present when `connect` asks for a login first. */
  login?: MachineLogin;
  /** Present when `sudo` works on this machine. Success makes the prompt root@host #. */
  sudo?: { password: string; accept?: string[] };
  /** Pretend open doors listed by `scan <host>` (mission 7). */
  ports?: { port: number; name: string; open: boolean }[];
  mail?: MailMessage[];
  pages?: WebPage[];
  /** False hides it from `scan` (the HQ machine, for example). Default true. */
  listed?: boolean;
}

/* ---------- Contract ---------- */

export interface Contract {
  client: { name: string; role: string; art?: string };
  problem: Line;
  goal: Line;
  /** Hosts in scope. `connect` to any other host prints the out of scope warning and does nothing. */
  allowed: string[];
  /** The flag the player captures, for example "CLUE{old-passwords-are-easy-to-guess}". */
  flag: string;
}

/* ---------- Step goals ---------- */

/** A terminal goal is met when the player has done the described thing. */
export type TerminalGoal =
  | { type: 'run'; command: string; args?: string[] }
  | { type: 'read'; path: string }
  | { type: 'cwd'; path: string }
  | { type: 'locked'; path: string }
  | { type: 'deleted'; path: string }
  | { type: 'all'; goals: TerminalGoal[] };

/** Goals for a hack step. Plain TerminalGoal paths apply to the machine the player is on. */
export type HackGoal =
  | TerminalGoal
  | { type: 'on'; host: string; goal: TerminalGoal }
  | { type: 'connected'; host: string }
  | { type: 'logged-in'; host: string }
  | { type: 'root'; host: string }
  | { type: 'found-port'; host: string; port: number }
  | { type: 'decoded'; text: string }
  | { type: 'reported'; host: string; mailId: string }
  | { type: 'passwd'; host: string }
  | { type: 'chmod'; host: string; path: string; mode: string }
  | { type: 'flag' }
  | { type: 'all'; goals: HackGoal[] };

/* ---------- Step kinds (one widget each, built by the engine lane) ---------- */

/** A command to type into the prompt, with an optional short hint. */
export interface CommandChip {
  command: string;
  hint?: string;
}

export interface HackConfig {
  kind: 'hack';
  /** Host the step starts on when it is the first step, otherwise the session carries on. Default "hq". */
  start?: string;
  /** Commands that work in this step. Others get the friendly "not yet" line. */
  commands: string[];
  chips?: CommandChip[];
  /** The command line the Help me "Show me" rung types into the prompt. He still presses Enter. */
  showMe: string;
  goal: HackGoal;
}

export interface ClickTargetsConfig {
  kind: 'click-targets';
  action: 'click' | 'double-click';
  targets: { id: string; label: string; art: string }[];
}

export interface DragDropConfig {
  kind: 'drag-drop';
  items: { id: string; label: string; art: string; goesTo: string }[];
  zones: { id: string; label: string }[];
}

export interface KeyFindConfig {
  kind: 'key-find';
  /** Key names as KeyboardEvent.key values, in order, for example ["a", " ", "Enter"]. */
  keys: string[];
}

export interface TypingGameConfig {
  kind: 'typing-game';
  /** Letters or short words that fall. The game slows down on misses and can never be lost. */
  words: string[];
  /** How many catches finish the step. */
  goal: number;
}

export interface FileExplorerConfig {
  kind: 'file-explorer';
  fs: FsDir;
  task:
    | { type: 'open'; path: string }
    | { type: 'move'; moves: { file: string; toDir: string }[] };
}

export interface ChoiceConfig {
  kind: 'choice';
  question: Line;
  options: { id: string; label: string; art?: string; feedback: Line }[];
  correct: string[];
}

export interface PassphraseConfig {
  kind: 'passphrase';
  /** Word tiles the player picks from to build a three-word passphrase. */
  words: string[];
  count: number;
}

export interface TerminalConfig {
  kind: 'terminal';
  fs: FsDir;
  /** Absolute start directory, for example "/home/agent". */
  cwd: string;
  /** Commands that work in this step. Others get a friendly "not yet" message. */
  commands: string[];
  goal: TerminalGoal;
  /** Clickable command chips for players who are not ready to type. */
  chips?: string[];
}

export interface WebSourceConfig {
  kind: 'web-source';
  /** Pretend web page shown in the fake browser. Never a real URL. */
  page: { title: string; address: string; blocks: { type: 'heading' | 'text' | 'button'; text: string }[] };
  /** Pretend source code shown when "View Code" is clicked. */
  source: string;
  /** The answer the player finds and types or clicks. */
  answer: string;
}

export interface DecoderConfig {
  kind: 'decoder';
  cipher: 'caesar';
  message: string;
  shift: number;
  /** Optional clue that tells the shift, for example "the zoo has 3 lions". */
  clue?: Line;
  answer: string;
}

export interface PasswordGuessConfig {
  kind: 'password-guess';
  /** Profile card of the fictional employee with clues. */
  profile: { name: string; art: string; facts: Line[] };
  username: string;
  password: string;
  /** Accepted alternative spellings (case insensitive). */
  accept?: string[];
}

export interface LogReadConfig {
  kind: 'log-read';
  fileName: string;
  lines: string[];
  question: Line;
  options: { id: string; label: string }[];
  correct: string;
}

export interface PhishSpotConfig {
  kind: 'phish-spot';
  email: { from: string; subject: string; body: string[]; link?: string };
  /** Clickable clue regions. Each id must match a marked span in the email. */
  clues: { id: string; match: string; explain: Line }[];
  /** How many clues finish the step. */
  needed: number;
}

export interface AnswerConfig {
  kind: 'answer';
  question: Line;
  answer: string;
  accept?: string[];
}

export interface StoryConfig {
  kind: 'story';
}

export type StepConfig =
  | ClickTargetsConfig
  | DragDropConfig
  | KeyFindConfig
  | TypingGameConfig
  | FileExplorerConfig
  | ChoiceConfig
  | PassphraseConfig
  | TerminalConfig
  | HackConfig
  | WebSourceConfig
  | DecoderConfig
  | PasswordGuessConfig
  | LogReadConfig
  | PhishSpotConfig
  | AnswerConfig
  | StoryConfig;

export type StepKind = StepConfig['kind'];

export interface Step {
  id: string;
  title: string;
  /** Sidekick instructions shown before and during the step. */
  lines: Line[];
  hints: HintLadder;
  /** Shown when the step is completed. */
  success: Line[];
  /** True for the "lock it down" fix step at the end of a client mission. */
  lockdown?: boolean;
  /** Optional picture shown with the step (key into the art registry), for example the login screen. */
  art?: string;
  config: StepConfig;
}

/* ---------- Art, sidekicks and hacker names (content lane provides, engine renders) ---------- */

/** Art is a small inline SVG Preact component, registered by key in src/art/index.ts. */
export type ArtComponent = (props: { size?: number; title?: string }) => JSX.Element;

export interface Sidekick {
  id: string;
  name: string;
  /** Key into the art registry. */
  art: string;
  personality: Line;
  greeting: Line[];
  goodbye: Line[];
}

/* ---------- Agent Playground (free-play terminal, unlocked after Terminal Training) ---------- */

/** A secret the player can discover in the playground. Each one found earns a small badge. */
export interface PlaygroundEgg {
  id: string;
  name: string;
  /** Found by reading a file, by running a secret command, or by visiting a folder. */
  trigger: { type: 'read'; path: string } | { type: 'command'; command: string } | { type: 'cwd'; path: string };
  /** What the sidekick says when it is found. */
  found: Line[];
}

/** A secret command that only exists in the playground. Output is plain lines, or a named effect. */
export interface PlaygroundCommand {
  name: string;
  /** One short line shown by `help` once the command has been discovered. */
  help: string;
  output: string[];
  /** Optional visual effect key the engine plays, for example "matrix". */
  effect?: string;
}

export interface Playground {
  fs: FsDir;
  cwd: string;
  /** Mission id that unlocks the playground. */
  unlockedBy: MissionId;
  intro: Line[];
  commands: PlaygroundCommand[];
  eggs: PlaygroundEgg[];
}

export interface Mission {
  id: MissionId;
  /** Save-code bit index 0 to 23. Unique and stable forever. */
  bit: number;
  chapter: Chapter;
  /** Order within the whole game. */
  order: number;
  title: string;
  /** One line shown on the mission map. */
  blurb: string;
  minutes: number;
  requires: MissionId[];
  client?: Client;
  badge: Badge;
  intro: Line[];
  steps: Step[];
  outro: Line[];
  /** Season this mission belongs to. Order comes from Season.missions. */
  season?: SeasonId;
  contract?: Contract;
  /** Machines in this mission. The engine adds the HQ machine (agent@hq) when none has host "hq". */
  machines?: Machine[];
  /** Commands this mission adds to his toolkit (profile "Commands learned"). */
  teaches?: string[];
  /** XP for finishing. Default 20. */
  xp?: number;
  /** Alarm meter. Absent means no alarm in this mission. */
  alarm?: { limit: number };
  /** True keeps an old mission in the registry for saves but takes it off the map. */
  retired?: boolean;
}

/** Rank name and the XP needed to reach it. */
export interface RankDef {
  name: string;
  xp: number;
}
