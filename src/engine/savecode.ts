export const SAVE_CODE_VERSION = 1;
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SCRAMBLE = 0x9e3779b97f4n;

export interface SaveData {
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
  checkField(data.missionBits, 0xffffff, 'missionBits');
  checkField(data.sidekick, 3, 'sidekick');
  checkField(data.firstWord, 63, 'firstWord');
  checkField(data.secondWord, 63, 'secondWord');

  const payload = (BigInt(SAVE_CODE_VERSION) << 41n)
    | (BigInt(data.missionBits) << 17n)
    | (BigInt(data.sidekick) << 15n)
    | (BigInt(data.firstWord) << 9n)
    | (BigInt(data.secondWord) << 3n);
  const scrambled = payload ^ SCRAMBLE;
  const value = (scrambled << 16n) | BigInt(crc16(scrambled, 44));
  let characters = '';
  for (let shift = 55; shift >= 0; shift -= 5) {
    characters += CROCKFORD[Number((value >> BigInt(shift)) & 31n)];
  }
  return `HAX-${characters.slice(0, 4)}-${characters.slice(4, 8)}-${characters.slice(8)}`;
}

export function normalizeSaveCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[ \t\-_.]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  return cleaned.length === 15 && cleaned.startsWith('HAX') ? cleaned.slice(3) : cleaned;
}

export function decodeSaveCode(input: string): DecodeResult {
  const characters = normalizeSaveCode(input);
  if (characters.length !== 12) return { ok: false, error: 'wrong-length' };
  if ([...characters].some((character) => !CROCKFORD.includes(character))) {
    return { ok: false, error: 'bad-character' };
  }

  let value = 0n;
  for (const character of characters) {
    value = (value << 5n) | BigInt(CROCKFORD.indexOf(character));
  }
  const scrambled = value >> 16n;
  if (crc16(scrambled, 44) !== Number(value & 0xffffn)) {
    return { ok: false, error: 'checksum' };
  }
  const payload = scrambled ^ SCRAMBLE;
  if (Number(payload >> 41n) !== SAVE_CODE_VERSION || (payload & 7n) !== 0n) {
    return { ok: false, error: 'unknown-version' };
  }
  return {
    ok: true,
    data: {
      missionBits: Number((payload >> 17n) & 0xffffffn),
      sidekick: Number((payload >> 15n) & 3n),
      firstWord: Number((payload >> 9n) & 63n),
      secondWord: Number((payload >> 3n) & 63n),
    },
  };
}
