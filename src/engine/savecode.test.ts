import { describe, expect, it } from 'vitest';
import {
  CROCKFORD, SAVE_CODE_VERSION, SCRAMBLE, crc16, decodeSaveCode, encodeSaveCode,
  normalizeSaveCode, type SaveData,
} from './savecode';

const zero: SaveData = { missionBits: 0, sidekick: 0, firstWord: 0, secondWord: 0 };
const maximum: SaveData = { missionBits: 0xffffff, sidekick: 3, firstWord: 63, secondWord: 63 };
const examples: SaveData[] = [
  zero, maximum,
  { missionBits: 0x123456, sidekick: 2, firstWord: 17, secondWord: 42 },
  { missionBits: 0x800001, sidekick: 1, firstWord: 32, secondWord: 1 },
];

function randomStates(seed: number, count: number): SaveData[] {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  return Array.from({ length: count }, () => {
    const missionBits = next() & 0xffffff;
    const choices = next();
    return {
      missionBits,
      sidekick: choices & 3,
      firstWord: (choices >>> 2) & 63,
      secondWord: (choices >>> 8) & 63,
    };
  });
}

// Build a code directly from the documented payload, including unsupported bits.
function codeForPayload(payload: bigint): string {
  const scrambled = payload ^ SCRAMBLE;
  const value = (scrambled << 16n) | BigInt(crc16(scrambled, 44));
  return Array.from({ length: 12 }, (_, index) => {
    const shift = BigInt((11 - index) * 5);
    return CROCKFORD[Number((value >> shift) & 31n)];
  }).join('');
}

describe('crc16', () => {
  it('matches the CCITT-FALSE ASCII check vector', () => {
    expect(crc16(0x313233343536373839n, 72)).toBe(0x29b1);
  });

  it('retains the initial value for no bits and feeds leading zeros', () => {
    expect(crc16(0n, 0)).toBe(0xffff);
    expect(crc16(0n, 8)).toBe(0xe1f0);
  });
});

describe('save codes', () => {
  it('round trips 1000 seeded states and the boundary examples', () => {
    for (const data of [...examples, ...randomStates(0x12345678, 1000)]) {
      const code = encodeSaveCode(data);
      expect(code).toMatch(/^HAX-([0-9A-HJKMNP-TV-Z]{4}-){2}[0-9A-HJKMNP-TV-Z]{4}$/);
      expect(decodeSaveCode(code)).toEqual({ ok: true, data });
    }
  });

  it('packs each field in the documented bit positions', () => {
    const version = BigInt(SAVE_CODE_VERSION) << 41n;
    const cases: [SaveData, bigint][] = [
      [zero, version],
      [{ ...zero, missionBits: 1 }, version | (1n << 17n)],
      [{ ...zero, sidekick: 1 }, version | (1n << 15n)],
      [{ ...zero, firstWord: 1 }, version | (1n << 9n)],
      [{ ...zero, secondWord: 1 }, version | (1n << 3n)],
      [maximum, version | (0xffffffn << 17n) | (3n << 15n) | (63n << 9n) | (63n << 3n)],
    ];
    for (const [data, payload] of cases) {
      expect(normalizeSaveCode(encodeSaveCode(data))).toBe(codeForPayload(payload));
      expect(decodeSaveCode(codeForPayload(payload))).toEqual({ ok: true, data });
    }
  });

  it('rejects every single-character substitution in several valid codes', () => {
    for (const data of examples) {
      const code = normalizeSaveCode(encodeSaveCode(data));
      for (let index = 0; index < code.length; index += 1) {
        for (const replacement of CROCKFORD) {
          if (replacement === code[index]) continue;
          const changed = code.slice(0, index) + replacement + code.slice(index + 1);
          expect(decodeSaveCode(changed)).toEqual({ ok: false, error: 'checksum' });
        }
      }
    }
  });

  it('rejects all adjacent transpositions of different characters', () => {
    for (const data of examples) {
      const code = normalizeSaveCode(encodeSaveCode(data));
      for (let index = 0; index < code.length - 1; index += 1) {
        if (code[index] === code[index + 1]) continue;
        const characters = [...code];
        [characters[index], characters[index + 1]] = [characters[index + 1]!, characters[index]!];
        expect(decodeSaveCode(characters.join(''))).toEqual({ ok: false, error: 'checksum' });
      }
    }
  });

  it('accepts case, missing prefix, and extra or missing separators', () => {
    for (const data of examples) {
      const code = encodeSaveCode(data);
      const bare = normalizeSaveCode(code);
      const variants = [
        code.toLowerCase(), code.replace(/-/g, ''), bare, bare.toLowerCase(),
        code.replace(/-/g, '---'), ` \t${code.split('').join(' ._\t-')} . `,
      ];
      for (const variant of variants) {
        expect(normalizeSaveCode(variant)).toBe(bare);
        expect(decodeSaveCode(variant)).toEqual({ ok: true, data });
      }
    }
  });

  it('accepts O, I, L, and U look-alikes in valid codes', () => {
    const aliases = [['0', 'O'], ['1', 'I'], ['1', 'L'], ['V', 'U']] as const;
    const states = randomStates(0xabcdef01, 1000);
    for (const [character, alias] of aliases) {
      const data = states.find((state) => normalizeSaveCode(encodeSaveCode(state)).includes(character));
      expect(data).toBeDefined();
      if (data === undefined) throw new Error(`Missing fixture for ${alias}`);
      const code = encodeSaveCode(data).replaceAll(character, alias).toLowerCase();
      expect(decodeSaveCode(code)).toEqual({ ok: true, data });
    }
  });

  it('removes HAX only at the start of a cleaned 15-character string', () => {
    expect(normalizeSaveCode('hax-oilu')).toBe('HAX011V');
    expect(normalizeSaveCode('hax-0000-0000-0000')).toBe('000000000000');
    expect(normalizeSaveCode('0hax-0000-0000-000')).toBe('0HAX00000000000');
  });

  it.each(['', 'HAX-123', '00000000000', '0000000000000', 'HAX-0000-0000-00000'])(
    'reports wrong-length for %j', (input) => {
      expect(decodeSaveCode(input)).toEqual({ ok: false, error: 'wrong-length' });
    },
  );

  it.each(['?', '/', '\n', '\r', '!', '😀'])('rejects the unsupported character %j', (character) => {
    const input = character + normalizeSaveCode(encodeSaveCode(zero)).slice(character.length);
    expect(decodeSaveCode(input)).toEqual({ ok: false, error: 'bad-character' });
  });

  it('checks length before characters and checksum before version', () => {
    expect(decodeSaveCode('?')).toEqual({ ok: false, error: 'wrong-length' });
    const future = codeForPayload(2n << 41n);
    const last = future.endsWith('0') ? '1' : '0';
    expect(decodeSaveCode(future.slice(0, -1) + last)).toEqual({ ok: false, error: 'checksum' });
  });

  it('rejects unsupported versions with a correct checksum', () => {
    for (const version of [0, 2, 3, 4, 5, 6, 7]) {
      expect(decodeSaveCode(codeForPayload(BigInt(version) << 41n)))
        .toEqual({ ok: false, error: 'unknown-version' });
    }
  });

  it('rejects every nonzero spare value with a correct checksum', () => {
    for (let spare = 1n; spare <= 7n; spare += 1n) {
      expect(decodeSaveCode(codeForPayload((1n << 41n) | spare)))
        .toEqual({ ok: false, error: 'unknown-version' });
    }
  });

  it('scrambles the zero state into mostly nonzero characters', () => {
    const code = normalizeSaveCode(encodeSaveCode(zero));
    expect([...code].filter((character) => character !== '0').length).toBeGreaterThan(6);
  });

  it.each<[keyof SaveData, number]>([
    ['missionBits', 0xffffff], ['sidekick', 3], ['firstWord', 63], ['secondWord', 63],
  ])('throws RangeError for invalid %s values', (field, max) => {
    for (const value of [-1, max + 1, 0.5, Number.NaN, Infinity, -Infinity]) {
      expect(() => encodeSaveCode({ ...zero, [field]: value })).toThrow(RangeError);
    }
  });
});
