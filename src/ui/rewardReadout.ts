import { createValueTransferPlan, valueAfterVisualArrival } from '@danilah/mini-games-kit/core';

interface CountUp {
  from: number;
  to: number;
  format: (value:number)=>string;
}

/** Visual projection of a committed receipt. The accessible value is always final. */
export class RewardReadout {
  private key: string | undefined;
  private animatedKey: string | undefined;
  private frame: number | undefined;
  private finishCount: (()=>void) | undefined;

  constructor(private readonly host:HTMLElement) {}

  update(key:string, finalText:string, count?:CountUp, icon?:()=>Element):void {
    if (this.key === key && (!count || this.animatedKey === key)) return;
    this.finish();
    this.key = key;
    this.host.replaceChildren();
    if (icon) this.host.append(icon());
    if (!finalText) return;

    const accessible = document.createElement('span');
    accessible.className = 'readout-accessible';
    accessible.textContent = finalText;
    const readout = document.createElement('span');
    readout.className = 'readout';
    readout.setAttribute('aria-hidden','true');
    const reserve = document.createElement('span');
    reserve.className = 'readout-reserve';
    reserve.textContent = finalText;
    const visible = document.createElement('span');
    visible.className = 'readout-visible';
    visible.textContent = count ? count.format(count.from) : finalText;
    readout.append(reserve,visible);
    this.host.append(accessible,readout);
    if (!count || count.to <= count.from) return;
    this.animatedKey = key;

    const plan = createValueTransferPlan(count.to-count.from,{
      minDurationMs:290, maxDurationMs:560, durationPerSemanticUnitMs:2,
      maxVisualTokens:12, maxAudioEvents:1,
    });
    const begins = performance.now()+85;
    this.finishCount = () => {
      visible.textContent = finalText;
      delete this.host.dataset.counting;
    };
    this.host.dataset.counting = 'true';
    const step = (now:number) => {
      const ratio = Math.max(0,(now-begins)/plan.durationMs);
      if (ratio >= 1) { this.finish(); return; }
      const frame = Math.floor((1-(1-ratio)**1.5)*plan.visualTokenCount);
      const value = frame ? count.from+valueAfterVisualArrival(plan,frame-1) : count.from;
      const text = count.format(value);
      if (visible.textContent !== text) visible.textContent = text;
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  finish():void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.finishCount?.();
    this.finishCount = undefined;
  }
}
