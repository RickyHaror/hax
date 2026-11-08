import type { WidgetMap } from '../Widget';
import { PasswordGuess } from './PasswordGuess';
import { LogRead } from './LogRead';
import { PhishSpot } from './PhishSpot';
import './cases.css';

export const caseWidgets: WidgetMap = {
  'password-guess': PasswordGuess,
  'log-read': LogRead,
  'phish-spot': PhishSpot,
};
