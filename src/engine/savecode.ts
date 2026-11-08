export const SAVE_CODE_VERSION = 2;
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SCRAMBLE = 0x9e3779b97f4n;

export interface SaveData {
  /** An exact integer below 2^48, JSON safe. Use bigint for bit operations. */
  missionBits: number;
  sidekick: number;
  firstWord: number;
  secondWord: number;
}

export type SaveCodeError = 'wrong-length' | 'bad-character' | 'checksum' | 'unknown-version';
export type DecodeResult = { ok: true; data: SaveData } | { ok: false; error: SaveCodeError };

export function crc16(bits: bigint, bitCount: number): number {
  let crc = 0xffff;
  for (let index = bitCount - 1; index >= 0; index -= 1) {
    const bit = Number((bits >> BigInt(index)) & 1n);
    const feedback = (crc >>> 15) ^ bit;
    crc = (crc << 1) & 0xffff;
    if (feedback !== 0) crc ^= 0x1021;
  }
  return crc;
}

function checkField(value: number, maximum: number, name: keyof SaveData): void {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${name} must be an integer from 0 to ${maximum}`);
  }
}

export function encodeSaveCode(data: SaveData): string {
  checkField(data.missionBits, 2 ** 48 - 1, 'missionBits');
  checkField(data.sidekick, 3, 'sidekick');
  checkField(data.firstWord, 63, 'firstWord');
  checkField(data.secondWord, 63, 'secondWord');

  // V2: version 2 + missions 48 + sidekick 2 + words 6 + 6 = 64 bits.
  // CRC adds 16 bits: 80 bits, the shortest four groups of four base32 characters.
  // V1 keeps its original 44-bit payload, including three spare low bits.
  const payload = (BigInt(SAVE_CODE_VERSION) << 62n)
    | (BigInt(data.missionBits) << 14n)
    | (BigInt(data.sidekick) << 12n)
    | (BigInt(data.firstWord) << 6n)
    | BigInt(data.secondWord);
  const scrambled = payload ^ SCRAMBLE;
  const value = (scrambled << 16n) | BigInt(crc16(scrambled, 64));
  let characters = '';
  for (let shift = 75; shift >= 0; shift -= 5) {
    characters += CROCKFORD[Number((value >> BigInt(shift)) & 31n)];
  }
  return `HAX-${characters.match(/.{4}/g)!.join('-')}`;
}

export function normalizeSaveCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[ \t\-_.]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  return [15, 19].includes(cleaned.length) && cleaned.startsWith('HAX') ? cleaned.slice(3) : cleaned;
}

export function decodeSaveCode(input: string): DecodeResult {
  const characters = normalizeSaveCode(input);
  if (characters.length !== 12 && characters.length !== 16) return { ok: false, error: 'wrong-length' };
  if ([...characters].some((character) => !CROCKFORD.includes(character))) {
    return { ok: false, error: 'bad-character' };
  }

  let value = 0n;
  for (const character of characters) {
    value = (value << 5n) | BigInt(CROCKFORD.indexOf(character));
  }
  const scrambled = value >> 16n;
  const legacy = characters.length === 12;
  if (crc16(scrambled, legacy ? 44 : 64) !== Number(value & 0xffffn)) {
    return { ok: false, error: 'checksum' };
  }
  const payload = scrambled ^ SCRAMBLE;
  if (legacy ? payload >> 41n !== 1n || (payload & 7n) !== 0n
    : payload >> 62n !== BigInt(SAVE_CODE_VERSION)) {
    return { ok: false, error: 'unknown-version' };
  }
  return {
    ok: true,
    data: {
      missionBits: Number((payload >> (legacy ? 17n : 14n)) & (legacy ? 0xffffffn : 0xffffffffffffn)),
      sidekick: Number((payload >> (legacy ? 15n : 12n)) & 3n),
      firstWord: Number((payload >> (legacy ? 9n : 6n)) & 63n),
      secondWord: Number((payload >> (legacy ? 3n : 0n)) & 63n),
    },
  };
}
