// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusic, MUSIC_GAINS, AUDIO_GAINS } from './music';

function setup(failure?: 'reject' | 'throw' | 'construct') {
  const clips: FakeAudio[] = [];
  class FakeAudio {
    volume = 1;
    loop = false;
    pause = vi.fn();
    play = vi.fn(() => {
      if (failure === 'throw') throw Error('Blocked');
      return failure === 'reject' ? Promise.reject(Error('Blocked')) : Promise.resolve();
    });
    constructor(readonly src: string) {
      if (failure === 'construct') throw Error('Unavailable');
      clips.push(this);
    }
  }
  vi.useFakeTimers();
  const player = createMusic({ Audio: FakeAudio as unknown as typeof Audio });
  return { player, clips };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('background music', () => {
  it('loops local tracks, fades in, crossfades, and fades out to a stop', async () => {
    const { player, clips } = setup();
    player.play('hq'); await Promise.resolve();
    expect(player.supported).toBe(true);
    expect(clips[0]).toMatchObject({ src: '/audio/music/hq.mp3', loop: true, volume: 0 });
    vi.advanceTimersByTime(1000);
    expect(clips[0]!.volume).toBeCloseTo(MUSIC_GAINS.quiet);
    player.play('hq'); expect(clips).toHaveLength(1);
    player.play('terminal'); vi.advanceTimersByTime(480);
    expect(clips[0]!.volume).toBeGreaterThan(0);
    expect(clips[1]!.volume).toBeGreaterThan(0);
    expect(clips[0]!.volume).toBeLessThan(MUSIC_GAINS.quiet);
    vi.advanceTimersByTime(520);
    expect(clips[0]!.pause).toHaveBeenCalledOnce();
    expect(clips[1]!.volume).toBeCloseTo(MUSIC_GAINS.quiet);
    player.play(null); vi.advanceTimersByTime(1000);
    expect(clips[1]!.volume).toBe(0);
    expect(clips[1]!.pause).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ducks active and outgoing tracks, then restores the chosen volume', () => {
    const { player, clips } = setup();
    player.setVolume(0.25); player.play('hq'); vi.advanceTimersByTime(1000);
    player.play('bootcamp'); vi.advanceTimersByTime(400);
    player.duck(true); vi.advanceTimersByTime(160);
    expect(clips[0]!.volume).toBe(0);
    expect(clips[1]!.volume).toBeCloseTo(0.005);
    player.duck(false); vi.advanceTimersByTime(1000);
    expect(clips[1]!.volume).toBeCloseTo(0.25);
  });

  it('silences all tracks immediately when disabled and resumes the latest choice', () => {
    const { player, clips } = setup();
    player.play('hq'); vi.advanceTimersByTime(1000); player.play('terminal');
    player.setEnabled(false);
    for (const clip of clips) { expect(clip.volume).toBe(0); expect(clip.pause).toHaveBeenCalled(); }
    expect(vi.getTimerCount()).toBe(0);
    player.play('graduation'); expect(clips).toHaveLength(2);
    player.duck(true); player.setEnabled(true); vi.advanceTimersByTime(1000);
    expect(clips[2]!.src).toBe('/audio/music/graduation.mp3');
    expect(clips[2]!.volume).toBeCloseTo(MUSIC_GAINS.quiet * 0.02);
  });

  it.each(['reject', 'throw'] as const)('safely retries %s on the next play call', async (failure) => {
    const { player, clips } = setup(failure);
    expect(() => player.play('hq')).not.toThrow(); await Promise.resolve();
    clips[0]!.play.mockResolvedValue();
    player.play('hq'); await Promise.resolve(); player.play('hq');
    expect(clips[0]!.play).toHaveBeenCalledTimes(2);
    expect(clips).toHaveLength(1);
  });

  it('handles missing or throwing Audio and clamps volumes', () => {
    vi.stubGlobal('Audio', undefined);
    const absent = createMusic();
    expect(absent.supported).toBe(false);
    expect(() => { absent.play('hq'); absent.setVolume(1); absent.duck(true); absent.setEnabled(false); }).not.toThrow();
    expect(() => setup('construct').player.play('hq')).not.toThrow();
    const { player, clips } = setup(); player.play('playground');
    for (const [value, expected] of [[2, 1], [-1, 0], [NaN, 0], [Infinity, 0]]) {
      player.setVolume(value!); vi.advanceTimersByTime(1000); expect(clips[0]!.volume).toBe(expected);
    }
    for (const level of ['quiet', 'medium', 'loud'] as const) {
      expect(MUSIC_GAINS[level]).toBeLessThan(AUDIO_GAINS[level]);
    }
  });
});
