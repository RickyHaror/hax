import type { Position, Screen } from '../store';

export function isSafeMoment(screen: Screen, position: Position): boolean {
  switch (screen.name) {
    case 'start': case 'map': case 'settings': case 'done': case 'stop': case 'savecode':
      return true;
    case 'player':
      return position.phase === 'intro' || position.phase === 'success' || position.phase === 'outro';
    case 'onboarding':
      return false;
  }
}
