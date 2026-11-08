import type { Mission } from '../engine/types';

/**
 * Mission registry. The content lane adds each mission file here.
 * Order in the game comes from Mission.order, not from this list.
 */
export const missions: Mission[] = [];
