import { OneShotPlayer } from '@danilah/mini-games-kit/audio';
import type { Settings } from '../app/model';
import type { Cue, CueDetail } from './playFeedback';

export function vibrationFor(kind: Cue, detail: CueDetail): number | number[] | undefined {
  switch (kind) {
    case 'pick': return detail.grasp ? 5 : undefined;
    case 'place': return detail.contact === 'exchange' ? [6, 15, 7] : 7;
    case 'right': return detail.double || detail.contact === 'exchange' ? [7, 17, 7] : 8;
    case 'wrong': return detail.lifeLost ? [15, 22, 9] : 15;
    case 'win': return detail.rank || detail.goal === 'complete' || detail.workshop === 'instrument'
      ? [12, 29, 12, 29, 16] : [12, 35, 16];
    default: return undefined;
  }
}

export class Feedback {
  private readonly audio = new OneShotPlayer({
    groups: {selection: {minIntervalMs: 25}, action: {minIntervalMs: 0, replacementFadeMs: 8}, workshop: {minIntervalMs: 25}},
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

  cue(kind: Cue, detail: CueDetail = {}): void {
    if (!this.allowed) return;
    const settings = this.settings();
    if (settings.sound) this.audio.play({
      group: kind === 'pick' ? 'selection' : 'action',
      channel: 'gameplay',
      gain: kind === 'start' ? .14 : .19,
      buffer: context => {
        const key = `${kind}:${JSON.stringify(detail)}:${context.sampleRate}`;
        const cached = this.buffers.get(key);
        if (cached) return cached;
        const buffer = this.renderCue(context, kind, detail);
        this.buffers.set(key, buffer);
        return buffer;
      },
    });
    const pattern = vibrationFor(kind, detail);
    if (settings.vibration && pattern !== undefined) navigator.vibrate?.(pattern);
  }

  workshopContact(): void {
    if (!this.allowed) return;
    const settings = this.settings();
    if (settings.sound) this.audio.play({
      group:'workshop', channel:'gameplay', gain:.25,
      buffer:context=>this.renderCue(context,'place',{contact:'wood'}),
    });
    if (settings.vibration) navigator.vibrate?.(9);
  }

  private renderCue(context: AudioContext, kind: Cue, detail: CueDetail): AudioBuffer {
    const exchange = detail.contact === 'exchange';
    const start = exchange ? .045 : detail.contact ? .025 : 0;
    const duration = {pick:.024, place:exchange ? .075 : .045, right:start+(detail.double ? .140 : .100),
      wrong:start+.082, win:detail.rank||detail.goal||detail.workshop ? .480 : .326,
      return:.066, sort:.081, undo:.077, start:.118}[kind];
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
    const wood = (offset:number, length:number, pitch:number, volume:number) => {
      let noise = 0;
      let seed = 1937;
      mix(offset, length, t => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        noise = .58 * noise + .42 * (seed / 2147483648 - 1);
        const resonance = .48 * sine(326 * pitch, t) * Math.exp(-111 * t)
          + .34 * sine(783 * pitch, t) * Math.exp(-196 * t)
          + .15 * sine(1249 * pitch, t) * Math.exp(-350 * t);
        const tap = resonance + .26 * noise * Math.exp(-265 * t);
        return tap * volume;
      });
    };
    if (detail.contact || kind === 'place') wood(0,.045,1,detail.contact ? .94 : .48);
    if (exchange) wood(.032,.041,1.17,.74);
    if (kind === 'pick') wood(0,.024,1.14,.28);
    if (kind === 'return') { wood(0,.035,.9,.45); wood(.028,.038,.64,.6); }
    if (kind === 'sort') { wood(0,.025,1.36,.30); wood(.021,.029,1.14,.38); wood(.041,.04,.91,.45); }
    if (kind === 'undo') { wood(0,.036,.77,.45); wood(.032,.045,1.34,.40); }
    const chime = (pitch: number, offset: number, length: number, gain: number) =>
      mix(offset, length, t => gain * (sine(pitch, t) + .24 * sine(pitch * 2.13, t)) * Math.exp(-t * (kind === 'win' ? 22 : 43)));
    if (kind === 'start') {
      wood(0,.036,.81,.47);
      chime(392,.037,.081,.18);
    } else if (kind === 'wrong') {
      mix(start, .082, t => (.36 * sine(208, t) + .2 * sine(317, t)) * Math.exp(-t * 62));
    } else if (kind === 'right' || kind === 'win') {
      chime(587, start, .092, .3);
      if (detail.double || kind === 'win') chime(detail.double ? 880 : 740, start + .051, .083, detail.double ? .19 : .26);
      if (kind === 'win') {
        chime(1174, start + .114, .178, .23);
        if (detail.workshop) {
          const strike = (at: number, pitch: number, volume: number) => mix(at, .17, t =>
            volume * (.72 * sine(pitch,t) * Math.exp(-33*t) + .28 * sine(pitch*1.59,t) * Math.exp(-63*t)));
          strike(start + .181, 1326, .28);
          if (detail.workshop === 'instrument') strike(start + .241, 1761, .22);
        }
        if (detail.goal) {
          wood(.216,.033,1.54,.43);
          if (detail.goal === 'complete') chime(988,.253,.114,.21);
        }
        if (detail.rank) {
          chime(659,.212,.13,.31);
          chime(988,.263,.13,.27);
          chime(1318,.317,.15,.25);
        }
      }
    }
    return buffer;
  }

  dispose(): void {
    this.audio.dispose();
    navigator.vibrate?.(0);
  }
}
