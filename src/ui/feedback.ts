import { OneShotPlayer } from '@danilah/mini-games-kit/audio';
import type { Settings } from '../app/model';

export type Cue = 'pick' | 'place' | 'right' | 'wrong' | 'win';

export class Feedback {
  private readonly audio = new OneShotPlayer({
    groups: {selection: {minIntervalMs: 25}, action: {minIntervalMs: 0, replacementFadeMs: 8}},
    maxVoices: 4,
  });
  private readonly buffers = new Map<string, AudioBuffer>();
  private allowed = true;

  constructor(private readonly settings: () => Settings) {}

  setActive(active: boolean): void {
    this.allowed = active;
    const enabled = active && this.settings().sound;
    this.audio.setEligibility({gameplay: enabled, ui: enabled});
    if (!active) navigator.vibrate?.(0);
  }

  cue(kind: Cue, seated = false, double = false): void {
    if (!this.allowed) return;
    const settings = this.settings();
    if (settings.sound) this.audio.play({
      group: kind === 'pick' ? 'selection' : 'action',
      channel: 'gameplay',
      gain: .19,
      buffer: context => {
        const key = `${kind}:${seated}:${double}:${context.sampleRate}`;
        const cached = this.buffers.get(key);
        if (cached) return cached;
        const buffer = this.renderCue(context, kind, seated, double);
        this.buffers.set(key, buffer);
        return buffer;
      },
    });
    if (settings.vibration && kind !== 'pick') navigator.vibrate?.(kind === 'win' ? [12, 35, 16] : kind === 'wrong' ? 15 : 7);
  }

  private renderCue(context: AudioContext, kind: Cue, seated: boolean, double: boolean): AudioBuffer {
    const duration = {pick: .024, place: .045, right: double ? .159 : .118, wrong: .107, win: .326}[kind];
    const buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
    const data = buffer.getChannelData(0);
    const mix = (offset: number, length: number, tone: (t: number) => number) => {
      const start = Math.round(offset * context.sampleRate);
      const samples = Math.min(Math.round(length * context.sampleRate), data.length - start);
      for (let i = 0; i < samples; i++) {
        const t = i / context.sampleRate;
        const taper = Math.min(1, t / .0009, (samples - i) / (context.sampleRate * .005));
        data[start + i]! += taper * tone(t);
      }
    };
    const sine = (hz: number, t: number) => Math.sin(2 * Math.PI * hz * t);
    if (seated || kind === 'pick' || kind === 'place') {
      const gentle = !seated;
      let noise = 0;
      let seed = 1937;
      mix(0, kind === 'pick' ? .024 : .045, t => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        noise = .58 * noise + .42 * (seed / 2147483648 - 1);
        const tap = .59 * sine(385, t) * Math.exp(-140 * t) + .29 * sine(913, t) * Math.exp(-249 * t)
          + .24 * noise * Math.exp(-210 * t);
        return tap * (gentle ? kind === 'pick' ? .28 : .48 : 1);
      });
    }
    const chime = (pitch: number, offset: number, length: number, gain: number) =>
      mix(offset, length, t => gain * (sine(pitch, t) + .24 * sine(pitch * 2.13, t)) * Math.exp(-t * (kind === 'win' ? 22 : 43)));
    const start = seated ? .025 : 0;
    if (kind === 'wrong') {
      mix(start, .082, t => (.36 * sine(208, t) + .2 * sine(317, t)) * Math.exp(-t * 62));
    } else if (kind === 'right' || kind === 'win') {
      chime(587, start, .092, .3);
      if (double || kind === 'win') chime(double ? 880 : 740, start + .051, .083, double ? .19 : .26);
      if (kind === 'win') chime(1174, start + .114, .178, .23);
    }
    return buffer;
  }

  dispose(): void {
    this.audio.dispose();
    navigator.vibrate?.(0);
  }
}
