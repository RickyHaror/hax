import type { ArtComponent } from '../engine/types';
import { loginArt } from './login';
import { sidekickArt } from './sidekicks';

/**
 * Art registry: key to inline SVG component. The content lane adds art here.
 * The engine renders a friendly fallback for a missing key.
 */
export const art: Record<string, ArtComponent> = {
  ...loginArt,
  ...sidekickArt,
};
