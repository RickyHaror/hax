import type { Mission } from '../engine/types';

const flag = 'CLUE{grep-finds-the-needle}';

/** The same pretend visits appear each time this log is built. */
export function buildVisitsLog(): string {
  return Array.from({ length: 2000 }, (_, index) => {
    const visit = `visit ${String(index + 1).padStart(4, '0')}`;
    if (index === 1234) return `${visit}: found ${flag}`;
    if (index % 499 === 0) return `${visit}: oops, book cart needs a wheel`;
    return `${visit}: a book went back on the shelf`;
  }).join('\n');
}

export const s1m5LogSearch: Mission = {
  id: 's1-m5-log-search',
  bit: 20,
  order: 20,
  chapter: 'season',
  season: 's1',
  requires: ['s1-m4-page-source'],
  xp: 20,
  minutes: 10,
  title: 'The Long Log',
  blurb: 'Search a long log for one small clue.',
  badge: { id: 's1-m5-log-search', name: 'Log Scout', art: 'badge-s1' },
  contract: {
    client: { name: 'Mr Pages', role: 'Corner Town Library book cart captain' },
    problem: { text: 'My flag is lost in a long log.' },
    goal: { text: 'Search the log and bring back my flag.' },
    allowed: ['log-server'],
    flag,
  },
  teaches: ['grep'],
  machines: [{
    host: 'log-server', owner: 'Corner Town Library', user: 'helper', color: 'library',
    banner: ['Corner Town Library', 'So many books, so many logs!'],
    home: '/home/helper',
    fs: {
      type: 'dir', children: {
        home: { type: 'dir', children: {
          helper: { type: 'dir', children: {} },
        } },
        var: { type: 'dir', children: {
          log: { type: 'dir', children: {
            'visits.log': { type: 'file', content: buildVisitsLog() },
          } },
        } },
      },
    },
  }],
  intro: [
    { text: 'Mr Pages waves from his book cart.', speaker: 'narrator' },
    { text: 'Please help me search my log.', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'A log keeps a list of things that took place.' },
  ],
  steps: [
    {
      id: 'connect-log', title: 'Visit the log server',
      lines: [{ text: 'Connect to log-server to help Mr Pages.' }],
      hints: [
        { text: 'Start at the machine with the log.' },
        { text: 'Use connect with the host log-server.' },
        { text: 'Type connect log-server and press Enter.' },
      ],
      success: [{ text: 'You are in the library’s log server!' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['connect', 'help', 'clear'],
        chips: [{ command: 'connect log-server', hint: 'Visit the log' }],
        showMe: 'connect log-server', goal: { type: 'connected', host: 'log-server' },
      },
    },
    {
      id: 'find-log', title: 'Find the log file',
      lines: [
        { text: 'Use ls /var/log to list the log files.',
          say: 'Use L S, space, slash var slash log. List the files.' },
        { text: 'You can try cat, but this log is very long.' },
      ],
      hints: [
        { text: 'The log files have their own folder.' },
        { text: 'List the files in /var/log.' },
        { text: 'Type ls /var/log and press Enter.',
          say: 'Type L S, space, slash var slash log. Press Enter.' },
      ],
      success: [{ text: 'There is the log! Let us search it.' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [
          { command: 'ls /var/log', hint: 'List the logs' },
          { command: 'cat /var/log/visits.log', hint: 'Peek at the log' },
        ],
        showMe: 'ls /var/log',
        goal: { type: 'on', host: 'log-server', goal: { type: 'run', command: 'ls', args: ['/var/log'] } },
      },
    },
    {
      id: 'search-oops', title: 'Find the small bumps',
      lines: [
        { text: 'Use grep to find lines with one word.' },
        { text: 'Try the word oops. It marks a small bump.' },
      ],
      hints: [
        { text: 'You can search without reading the whole log.' },
        { text: 'Put oops after grep, then the log path.' },
        { text: 'Type grep oops /var/log/visits.log and press Enter.',
          say: 'Type grep, space, oops, then a space. Add slash var slash log slash visits dot log. Press Enter.' },
      ],
      success: [{ text: 'Just a few lines! That is much less to read.' }],
      config: {
        kind: 'hack', commands: ['grep', 'cat', 'ls', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'grep oops /var/log/visits.log', hint: 'Find oops lines' }],
        showMe: 'grep oops /var/log/visits.log',
        goal: { type: 'on', host: 'log-server', goal: {
          type: 'run', command: 'grep', args: ['oops', '/var/log/visits.log'],
        } },
      },
    },
    {
      id: 'search-flag', title: 'Search for the flag',
      lines: [
        { text: 'Now search for CLUE in the same log.' },
        { text: 'Use big letters for CLUE.' },
      ],
      hints: [
        { text: 'The flag starts with CLUE.' },
        { text: 'Use grep again. Change oops to CLUE.' },
        { text: 'Type grep CLUE /var/log/visits.log and press Enter.',
          say: 'Type grep, space, CLUE in big letters, then a space. Add slash var slash log slash visits dot log. Press Enter.' },
      ],
      success: [{ text: 'One line holds the flag. You found it!' }],
      config: {
        kind: 'hack', commands: ['grep', 'cat', 'ls', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'grep CLUE /var/log/visits.log', hint: 'Find the flag' }],
        showMe: 'grep CLUE /var/log/visits.log',
        goal: { type: 'on', host: 'log-server', goal: {
          type: 'run', command: 'grep', args: ['CLUE', '/var/log/visits.log'],
        } },
      },
    },
    {
      id: 'submit-flag', title: 'Send the flag',
      lines: [{ text: 'Send Mr Pages his lost flag.' }],
      hints: [
        { text: 'You found the one line you need.' },
        { text: 'Use submit with the whole flag.' },
        { text: 'Type submit CLUE, open brace. Add grep, dash, finds, dash, the, dash, needle. Close brace. Press Enter.' },
      ],
      success: [{ text: 'Job done! Mr Pages rings his book cart bell.' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: `submit ${flag}`, hint: 'Send the flag' }],
        showMe: `submit ${flag}`, goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great search! You earned your Log Scout badge.' },
    { text: 'Mr Pages can keep secret flags out of shared logs.' },
  ],
};
