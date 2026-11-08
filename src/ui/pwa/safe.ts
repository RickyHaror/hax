import type { Position, Screen } from '../store';

export function isSafeMoment(screen: Screen, position: Position): boolean {
  switch (screen.name) {
    case 'map': case 'settings': case 'done': case 'stop': case 'savecode':
      return true;
    case 'start': case 'player':
      return position.phase === 'intro' || position.phase === 'success' || position.phase === 'outro';
    case 'onboarding': case 'playground':
      return false;
  }
}
