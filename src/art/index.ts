import type { ArtComponent } from '../engine/types';
import { loginArt } from './login';
import { bootcampArt } from './bootcamp';
import { sidekickArt } from './sidekicks';
import { terminalArt } from './terminal';
import { clientArt } from './clients';
import { m4CupcakeArt } from './m4-cupcake';
import { m5MoonArt } from './m5-moon';
import { m6SocksArt } from './m6-socks';
import { m7GraduationArt } from './m7-graduation';
import { playgroundArt } from './playground';
import { season1Art } from './season1';

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
  ...m4CupcakeArt,
  ...m5MoonArt,
  ...m6SocksArt,
  ...m7GraduationArt,
  ...playgroundArt,
  ...season1Art,
};
