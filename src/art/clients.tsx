import type { ArtComponent } from '../engine/types';

const PizzaChef: ArtComponent = ({ size = 144, title = 'Pete with a giggly pizza' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <path d="M37 127V110Q37 88 72 88Q107 88 107 110V127" fill="#9ce8ed" />
    <circle cx="72" cy="64" r="28" fill="#ffc994" />
    <path d="M46 45V32Q29 18 46 12Q57 7 62 20Q70 1 82 14Q98 6 104 20Q111 33 98 36V45Z" fill="#fff5dc" />
    <circle cx="62" cy="61" r="3" fill="#123b42" />
    <circle cx="82" cy="61" r="3" fill="#123b42" />
    <path d="M62 73Q72 84 82 73" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M66 92L72 100L78 92M72 100V114" fill="none" stroke="#ff7989" stroke-width="5" />
    <ellipse cx="72" cy="121" rx="44" ry="11" fill="#ffe477" stroke="#d8894f" stroke-width="4" />
    <circle cx="52" cy="120" r="4" fill="#ec6574" />
    <circle cx="72" cy="117" r="4" fill="#ec6574" />
    <circle cx="91" cy="122" r="4" fill="#ec6574" />
  </svg>
);

const ToyFactory: ArtComponent = ({ size = 144, title = 'A wobbly robot at the toy factory' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <path d="M16 112V58L35 44V58L54 44V58H125V112Z" fill="#658cb8" />
    <path d="M106 58V29H119V58" fill="#9ce8ed" />
    <path d="M25 76H37M25 91H37M111 76H121M111 91H121" stroke="#ffe477" stroke-width="6" />
    <g transform="rotate(-8 72 82)">
      <rect x="46" y="49" width="53" height="42" rx="10" fill="#9ce8ed" stroke="#123b42" stroke-width="3" />
      <path d="M72 49V39" stroke="#39ff88" stroke-width="4" />
      <circle cx="72" cy="36" r="5" fill="#39ff88" />
      <circle cx="60" cy="66" r="5" fill="#123b42" />
      <circle cx="85" cy="66" r="5" fill="#123b42" />
      <path d="M62 78Q72 87 83 78" fill="none" stroke="#123b42" stroke-width="3" />
      <rect x="53" y="93" width="39" height="28" rx="7" fill="#ffe477" />
      <path d="M47 99L37 89M98 99L108 86M61 122V130M84 122V130" stroke="#39ff88" stroke-width="6" stroke-linecap="round" />
    </g>
  </svg>
);

const ZooSeal: ArtComponent = ({ size = 144, title = 'A friendly zoo seal clapping' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <ellipse cx="72" cy="120" rx="49" ry="10" fill="#5dbad0" />
    <path d="M42 114Q42 74 69 70Q102 71 105 112L123 117L105 124H51Z" fill="#9ce8ed" />
    <circle cx="71" cy="59" r="30" fill="#9ce8ed" />
    <circle cx="60" cy="53" r="4" fill="#123b42" />
    <circle cx="83" cy="53" r="4" fill="#123b42" />
    <ellipse cx="72" cy="65" rx="6" ry="4" fill="#123b42" />
    <path d="M62 73Q72 83 82 73M47 64L32 60M47 70L32 74M96 64L111 60M96 70L111 74" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M54 92Q68 79 72 99Q78 78 91 93L75 112Q68 117 54 92Z" fill="#5dbad0" />
    <path d="M65 19L67 11M80 20L85 13" stroke="#ffe477" stroke-width="4" stroke-linecap="round" />
  </svg>
);

const SauceBadge: ArtComponent = ({ size = 96, title = 'Sauce Guard badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M22 26Q48 13 74 26L48 77Z" fill="#ffe477" stroke="#d8894f" stroke-width="4" stroke-linejoin="round" />
    <circle cx="37" cy="36" r="5" fill="#ec6574" />
    <circle cx="57" cy="35" r="5" fill="#ec6574" />
    <path d="M59 59V51A8 8 0 0 1 75 51V59" fill="none" stroke="#39ff88" stroke-width="4" />
    <rect x="54" y="58" width="26" height="22" rx="5" fill="#39ff88" />
    <circle cx="67" cy="68" r="3" fill="#123b42" />
  </svg>
);

const WebBadge: ArtComponent = ({ size = 96, title = 'Web Secret Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <rect x="19" y="23" width="58" height="49" rx="7" fill="#071410" stroke="#9ce8ed" stroke-width="3" />
    <path d="M20 34H76" stroke="#9ce8ed" stroke-width="3" />
    <circle cx="27" cy="29" r="2" fill="#ffe477" />
    <path d="M35 43L27 51L35 59M61 43L69 51L61 59" fill="none" stroke="#39ff88" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M43 52L48 57L57 45" fill="none" stroke="#ffe477" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const ZooBadge: ArtComponent = ({ size = 96, title = 'Zoo Lock Star badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M48 17L57 35L77 38L62 53L65 75L48 65L31 75L34 53L19 38L39 35Z" fill="#ffe477" />
    <path d="M40 46V39A8 8 0 0 1 56 39V46" fill="none" stroke="#123b42" stroke-width="4" />
    <rect x="35" y="45" width="26" height="20" rx="4" fill="#123b42" />
    <circle cx="48" cy="54" r="3" fill="#39ff88" />
  </svg>
);

export const clientArt: Record<string, ArtComponent> = {
  'client-m1-pizza': PizzaChef,
  'client-m2-toys': ToyFactory,
  'client-m3-zoo': ZooSeal,
  'badge-m1-pizza': SauceBadge,
  'badge-m2-toys': WebBadge,
  'badge-m3-zoo': ZooBadge,
};
