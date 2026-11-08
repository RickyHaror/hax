import type { ArtComponent } from '../engine/types';

const CupcakeBaker: ArtComponent = ({ size = 144, title = 'Barry with a pink cupcake' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <path d="M37 127V110Q37 88 72 88Q107 88 107 110V127" fill="#9ce8ed" />
    <circle cx="72" cy="64" r="28" fill="#ffc994" />
    <path d="M46 45V32Q29 18 46 12Q57 7 62 20Q70 1 82 14Q98 6 104 20Q111 33 98 36V45Z" fill="#fff5dc" />
    <circle cx="62" cy="61" r="3" fill="#123b42" />
    <circle cx="82" cy="61" r="3" fill="#123b42" />
    <path d="M62 73Q72 84 82 73" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M56 106H88L83 129H61Z" fill="#ffe477" stroke="#d8894f" stroke-width="3" />
    <path d="M52 106Q48 97 59 94Q56 84 67 84Q77 75 82 88Q96 89 92 101Q100 109 52 106Z" fill="#ff7989" />
    <path d="M62 97L66 99M79 91L82 94M80 103L85 101" stroke="#fff5dc" stroke-width="3" stroke-linecap="round" />
    <circle cx="38" cy="113" r="8" fill="#ffc994" />
    <circle cx="106" cy="113" r="8" fill="#ffc994" />
  </svg>
);

const BakerProfile: ArtComponent = ({ size = 144, title = 'Barry and his dog Sprinkles on a card' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <rect x="21" y="28" width="102" height="88" rx="10" fill="#fff5dc" stroke="#9ce8ed" stroke-width="3" />
    <path d="M29 104V88Q29 73 52 73Q75 73 75 88V104" fill="#9ce8ed" />
    <circle cx="52" cy="58" r="19" fill="#ffc994" />
    <path d="M34 45V37Q25 27 37 24Q45 20 49 29Q56 17 63 27Q77 23 75 36L70 45Z" fill="#fff5dc" stroke="#d8894f" stroke-width="2" />
    <circle cx="46" cy="56" r="2" fill="#123b42" />
    <circle cx="58" cy="56" r="2" fill="#123b42" />
    <path d="M46 64Q52 71 58 64" fill="none" stroke="#123b42" stroke-width="2" stroke-linecap="round" />
    <ellipse cx="96" cy="95" rx="19" ry="12" fill="#d8894f" />
    <circle cx="96" cy="73" r="19" fill="#ffc994" />
    <ellipse cx="80" cy="73" rx="7" ry="17" fill="#d8894f" transform="rotate(15 80 73)" />
    <ellipse cx="112" cy="73" rx="7" ry="17" fill="#d8894f" transform="rotate(-15 112 73)" />
    <circle cx="90" cy="71" r="2" fill="#123b42" />
    <circle cx="102" cy="71" r="2" fill="#123b42" />
    <path d="M92 79H100L96 83Z" fill="#123b42" />
    <path d="M91 85Q96 91 101 85" fill="none" stroke="#123b42" stroke-width="2" stroke-linecap="round" />
    <path d="M83 92Q96 98 109 92" fill="none" stroke="#39ff88" stroke-width="4" />
    <circle cx="96" cy="97" r="3" fill="#ffe477" />
  </svg>
);

const CupcakeBadge: ArtComponent = ({ size = 96, title = 'Password Pastry Pro badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M22 48H69L62 77H29Z" fill="#ffe477" stroke="#d8894f" stroke-width="3" />
    <path d="M19 48Q15 37 29 34Q25 22 39 23Q51 10 58 27Q74 27 71 40Q83 52 19 48Z" fill="#ff7989" />
    <path d="M31 36L36 38M46 28L50 31M55 42L61 39" stroke="#fff5dc" stroke-width="3" stroke-linecap="round" />
    <path d="M60 61V54A8 8 0 0 1 76 54V61" fill="none" stroke="#39ff88" stroke-width="4" />
    <rect x="55" y="60" width="26" height="22" rx="5" fill="#39ff88" />
    <circle cx="68" cy="70" r="3" fill="#123b42" />
  </svg>
);

export const m4CupcakeArt: Record<string, ArtComponent> = {
  'client-m4-cupcake': CupcakeBaker,
  'profile-m4-cupcake': BakerProfile,
  'badge-m4-cupcake': CupcakeBadge,
};
