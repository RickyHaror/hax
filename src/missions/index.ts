import type { Mission } from '../engine/types';
import { login } from './login';
import { b1Mouse } from './b1-mouse';
import { b2Keys } from './b2-keys';
import { b3Typing } from './b3-typing';
import { b4Files } from './b4-files';
import { b5Passwords } from './b5-passwords';
import { t1Hello } from './t1-hello';
import { t2Move } from './t2-move';
import { t3Tools } from './t3-tools';
import { m1Pizza } from './m1-pizza';
import { m2Toys } from './m2-toys';
import { m3Zoo } from './m3-zoo';
import { m4Cupcake } from './m4-cupcake';
import { m5Moon } from './m5-moon';
import { m6Socks } from './m6-socks';
import { m7Graduation } from './m7-graduation';

/**
 * Mission registry. The content lane adds each mission file here.
 * Order in the game comes from Mission.order, not from this list.
 */
export const missions: Mission[] = [login, b1Mouse, b2Keys, b3Typing, b4Files, b5Passwords, t1Hello, t2Move, t3Tools, m1Pizza, m2Toys, m3Zoo, m4Cupcake, m5Moon, m6Socks, m7Graduation];
