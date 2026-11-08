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

export type Chapter = 'login' | 'bootcamp' | 'terminal' | 'missions';

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
}
export interface FsDir {
  type: 'dir';
  children: Record<string, FsNode>;
}
export type FsNode = FsFile | FsDir;

/* ---------- Step goals ---------- */

/** A terminal goal is met when the player has done the described thing. */
export type TerminalGoal =
  | { type: 'run'; command: string; args?: string[] }
  | { type: 'read'; path: string }
  | { type: 'cwd'; path: string }
  | { type: 'locked'; path: string }
  | { type: 'deleted'; path: string }
  | { type: 'all'; goals: TerminalGoal[] };

/* ---------- Step kinds (one widget each, built by the engine lane) ---------- */

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
}
