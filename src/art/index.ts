import type { ArtComponent } from '../engine/types';
import { loginArt } from './login';
import { bootcampArt } from './bootcamp';
import { sidekickArt } from './sidekicks';
import { terminalArt } from './terminal';
import { clientArt } from './clients';

/**
 * Art registry: key to inline SVG component. The content lane adds art here.
 * The engine renders a friendly fallback for a missing key.
 */
export const art: Record<string, ArtComponent> = {
  ...loginArt,
  ...bootcampArt,
  ...sidekickArt,
  ...terminalArt,
  ...clientArt,
};
