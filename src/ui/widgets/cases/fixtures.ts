import type { LogReadConfig, PasswordGuessConfig, PhishSpotConfig, Step, StepConfig } from '../../../engine/types';
import { client } from '../../test/fixtures';

export const passwordConfig: PasswordGuessConfig = {
  kind: 'password-guess', username: 'pete', password: 'Noodle', accept: ['Noodles'],
  profile: { name: 'Pete Pie', art: 'pizza', facts: [
    { text: 'I bake pizza.' }, { text: 'My cat is called Noodle.' }, { text: 'I like green hats.' },
  ] },
};
export const logConfig: LogReadConfig = {
  kind: 'log-read', fileName: 'pizza.log',
  lines: ['09:00 PETE opened the pizza box.', '09:05 MIA closed the pizza box.', '09:10 PETE went home.'],
  question: { text: 'Who opened the pizza box?' },
  options: [{ id: 'pete', label: 'Pete' }, { id: 'mia', label: 'Mia' }], correct: 'pete',
};
export const phishConfig: PhishSpotConfig = {
  kind: 'phish-spot', needed: 2,
  email: { from: 'Prize Club', subject: 'Free pizza!',
    body: ['Send your password to win.', 'Hurry now!'], link: 'Claim a prize' },
  clues: [
    { id: 'password', match: 'your password', explain: { text: 'Keep your password to yourself.' } },
    { id: 'rush', match: 'Hurry now!', explain: { text: 'Slow down when a note tries to rush you.' } },
    { id: 'link', match: 'Claim a prize', explain: { text: 'Ask a grown up before you click.' } },
  ],
};
export function caseStep(config: StepConfig): Step {
  return { ...client.steps[0]!, id: 'case-step', title: 'Find the clue', config };
}
