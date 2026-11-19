import { OneShotPlayer } from '@danilah/mini-games-kit/audio';
import type { Settings } from '../app/model';
export type Cue = 'pick' | 'place' | 'right' | 'wrong' | 'win';
export class Feedback {
  private readonly audio=new OneShotPlayer({groups:{selection:{minIntervalMs:25},action:{minIntervalMs:0,replacementFadeMs:8}},maxVoices:4});
  private readonly buffers=new Map<string,AudioBuffer>();
  private allowed=true;
  constructor(private readonly settings:()=>Settings) {}
  setActive(active:boolean):void {this.allowed=active;const enabled=active && this.settings().sound;this.audio.setEligibility({gameplay:enabled,ui:enabled});if(!active)navigator.vibrate?.(0);}
  cue(kind: Cue, seated = false): void {
    const settings=this.settings();if(!this.allowed)return;
    if(settings.sound)this.audio.play({group:kind==='pick'?'selection':'action',channel:'gameplay',gain:.16,buffer:context=>{
      const key = `${kind}:${seated}:${context.sampleRate}`;
      const cached = this.buffers.get(key);
      if (cached) return cached;

      const notes = kind === 'pick' ? [720] : kind === 'place' ? (seated ? [] : [460])
        : kind === 'right' ? [520,700] : kind === 'wrong' ? [300,225] : [520,650,780];
      const noteLength = kind === 'pick' ? .035 : kind === 'win' ? .09 : .065;
      const contactLength = seated ? .032 : 0;
      const buffer = context.createBuffer(1, Math.ceil((contactLength + notes.length * noteLength) * context.sampleRate), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const time = i / context.sampleRate;
        if (time < contactLength) {
          const attack = Math.min(1, time / .001);
          data[i] = attack * (.65 * Math.sin(2 * Math.PI * 1500 * time) * Math.exp(-time * 280)
            + .4 * Math.sin(2 * Math.PI * 640 * time) * Math.exp(-time * 155));
        } else if (notes.length) {
          const t = time - contactLength;
          const index = Math.min(notes.length - 1, Math.floor(t / noteLength));
          const local = t % noteLength;
          const envelope = Math.min(1, local / .003) * Math.exp(-local * 55);
          data[i] = Math.sin(2 * Math.PI * notes[index]! * local) * envelope * (seated ? .66 : 1);
        }
      }
      this.buffers.set(key, buffer);
      return buffer;
    }});
    if(settings.vibration&&kind!=='pick')navigator.vibrate?.(kind==='win'?[12,35,16]:kind==='wrong'?15:7);
  }
  dispose():void{this.audio.dispose();navigator.vibrate?.(0);}
}
