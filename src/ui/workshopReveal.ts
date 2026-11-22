import { OwnedDomMotion } from '@danilah/mini-games-kit/feel';
import { config } from '../content/catalog';
import { workshopBeats, workshopTarget } from '../meta/workshopProgress';
import type { WorkshopTarget } from '../meta/workshopProgress';
import type { Completion } from '../app/model';

interface WorkshopCopy {
  t(ru: string, en: string): string;
  part(index: number, part: number): string;
  art(index: number, parts: number): HTMLElement;
}

function node<K extends keyof HTMLElementTagNameMap>(tag:K, className:string, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/** The only writes here are to presentation nodes. Every beat is derived from a durable receipt. */
export class WorkshopReveal {
  private readonly motion = new OwnedDomMotion();
  private key: string | undefined;
  private controller: AbortController | undefined;
  private finish: (() => void) | undefined;

  constructor(private readonly root: HTMLElement, private readonly contact: () => void) {}

  skip(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.motion.cancelAll();
    this.finish?.();
    this.finish = undefined;
  }

  hide(): void {
    if (!this.key) return;
    this.skip();
    this.key = undefined;
    this.root.hidden = true;
  }

  show(receipt: Completion, language: string, copy: WorkshopCopy, animate: boolean): void {
    if (!receipt.workshop || receipt.collectionFragments === undefined) { this.hide(); return; }
    const key = receipt.id + language;
    if (this.key === key) return;
    this.skip();
    this.key = key;
    this.root.hidden = false;
    const {from,to} = receipt.workshop;
    const total = receipt.collectionFragments;
    const start = workshopTarget(from, total - receipt.fragments);
    const beats = workshopBeats(receipt.workshop,total,receipt.fragments);
    const last = beats.at(-1);

    const image = node('div','workshop-figure');
    image.setAttribute('aria-hidden','true');
    const count = node('span','workshop-count');
    const name = node('span','workshop-name');
    const stamp = node('span','workshop-stamp');
    const label = node('div','workshop-label');
    label.append(name,stamp);
    const amount = node('span','workshop-percent');
    const status = node('div','workshop-status');
    status.append(label,amount);
    const fill = node('i','workshop-fill');
    const end = node('i','workshop-end');
    const track = node('div','workshop-track');
    track.setAttribute('aria-hidden','true');
    track.append(fill,end);
    const summary = node('p','workshop-summary');
    summary.setAttribute('role','status');
    const text = node('div','workshop-text');
    text.append(count,status,track,summary);
    this.root.replaceChildren(image,text);

    let progressFrame = 0;
    const setPercent = (percent:number) => {
      amount.textContent = percent+'%';
      fill.style.width = percent+'%';
    };
    const render = (target:WorkshopTarget|undefined, installed:boolean) => {
      const index = target?.index ?? config.cards.length - 1;
      const parts = target ? target.part - Number(!installed) : config.collection.fragmentsPerCard;
      image.replaceChildren(copy.art(index,parts));
      count.textContent = copy.t(`${parts} из 4`,`${parts} of 4`);
      name.textContent = target ? copy.part(index,target.part) : copy.t('Коллекция собрана','Collection complete');
      stamp.textContent = installed ? copy.t('✓ Получено','✓ Fitted') : copy.t('На очереди','Up next');
      label.classList.toggle('landed',installed);
      amount.hidden = !target;
      track.hidden = !target;
      setPercent(target?.percent ?? 100);
      this.root.dataset.phase = installed ? 'fitted' : 'progress';
    };
    const granted = beats.slice(0,receipt.fragments).map(beat => copy.part(beat.index,beat.part));
    const finish = () => {
      cancelAnimationFrame(progressFrame);
      this.root.querySelector('.workshop-flight')?.remove();
      end.classList.remove('charged');
      const complete = total === config.collection.fragmentWinThresholds.length;
      render(complete ? undefined : last, Boolean(last && last.percent === 100));
      if (granted.length) summary.textContent = copy.t(`В лотке · ${granted.join(' и ')}`,`In the tray · ${granted.join(' and ')}`);
      this.root.dataset.phase = 'done';
    };
    if (!animate || !start || from === to) { finish(); return; }
    this.finish = finish;
    const controller = new AbortController();
    this.controller = controller;
    const {signal} = controller;
    render(start,false);
    const pause = (ms:number) => new Promise<void>(resolve => {
      const timer = window.setTimeout(done,ms);
      function done() { clearTimeout(timer); signal.removeEventListener('abort',done); resolve(); }
      signal.addEventListener('abort',done,{once:true});
    });
    const ramp = (previous:number, goal:number, ms:number) => new Promise<void>(resolve => {
      const now = performance.now();
      const done = () => { cancelAnimationFrame(progressFrame); signal.removeEventListener('abort',done); resolve(); };
      signal.addEventListener('abort',done,{once:true});
      const tick = (at:number) => {
        const time = Math.min(1,(at-now)/ms);
        setPercent(Math.floor(previous+(goal-previous)*Math.max(0,time)));
        if (time === 1) done();
        else progressFrame = requestAnimationFrame(tick);
      };
      progressFrame = requestAnimationFrame(tick);
    });
    const run = async () => {
      // The wallet and award amount are painted by GameUi before the first progress beat.
      await pause(receipt.coins ? 160 : 32);
      for (const [i,beat] of beats.entries()) {
        if (signal.aborted) return;
        if (i) {
          this.motion.animate(label, [{translate:'0',opacity:1},{translate:'-14px',opacity:0}], {duration:85});
          await pause(85);
          if (signal.aborted) return;
          this.motion.cancel(label);
          render({...beat,percent:0},false);
          this.motion.animate(label,[{translate:'14px',opacity:0},{translate:'0',opacity:1}],{duration:105});
        }
        const hit = i < receipt.fragments;
        await ramp(i === 0 ? start.percent : 0,beat.percent,hit?320:330);
        if (signal.aborted) return;
        if (!hit) continue;
        end.classList.add('charged');
        await pause(90);
        if (signal.aborted) return;
        end.classList.remove('charged');
        const duration = i ? 430 : 500;
        render(beat,true);
        this.root.dataset.phase = 'flight';
        count.textContent = copy.t(`${beat.part - 1} из 4`,`${beat.part - 1} of 4`);
        label.classList.remove('landed');
        stamp.textContent = copy.t('На очереди','Up next');
        const art = image.querySelector('svg')!;
        const piece = art.querySelector<SVGGraphicsElement>(`[data-part="${beat.part}"]`);
        if (piece) {
          const bounds = piece.getBBox();
          const target = piece.getBoundingClientRect();
          const origin = end.getBoundingClientRect();
          const rootRect = this.root.getBoundingClientRect();
          piece.style.opacity='0';
          const ghost = document.createElementNS('http://www.w3.org/2000/svg','svg');
          ghost.classList.add('workshop-flight');
          ghost.setAttribute('viewBox',`${bounds.x-3} ${bounds.y-3} ${bounds.width+6} ${bounds.height+6}`);
          ghost.append(piece.cloneNode(true));
          ghost.firstElementChild?.removeAttribute('style');
          Object.assign(ghost.style,{
            width:`${Math.max(12,target.width+6)}px`,height:`${Math.max(12,target.height+6)}px`,
            left:`${target.x-rootRect.x-3}px`,top:`${target.y-rootRect.y-3}px`,
          });
          this.root.append(ghost);
          const dx=origin.x-target.x,dy=origin.y-target.y;
          this.motion.animate(ghost,[
            {transform:`translate(${dx}px,${dy}px) rotate(-22deg) scale(.35)`},
            {transform:`translate(${dx*.55}px,${Math.min(dy*.18,-28)}px) rotate(12deg) scale(1.14)`,offset:.53},
            {transform:'translate(0,0) rotate(0) scale(1)'},
          ],{duration,easing:'cubic-bezier(.32,.15,.55,1)'});
          [...(ghost.firstElementChild?.children ?? [])].slice(0,3).forEach((line,k)=>{
            this.motion.animate(line,[{rotate:'0deg'},{rotate:`${(k-1)*17}deg`,offset:.52},{rotate:'0deg'}],{duration});
          });
        }
        await pause(duration-65);
        if (signal.aborted) return;
        this.motion.animate(stamp,[{opacity:1},{opacity:0}],{duration:65});
        await pause(65);
        if (signal.aborted) return;
        this.motion.cancel(stamp);
        this.root.querySelector('.workshop-flight')?.remove();
        render(beat,true);
        this.contact();
        this.motion.animate(stamp,[{translate:'0 -2.5px',scale:'1.1'},{translate:'0 0',scale:'1'}],{duration:140,easing:'ease-out'});
        this.motion.animate(count,[{translate:'0 -.35em',opacity:.7},{translate:'0 0',opacity:1}],{duration:145});
        this.motion.animate(image,[{translate:'0 0'},{translate:'0 2px',offset:.26},{translate:'0 0'}],{duration:180});
        await pause(i < beats.length - 1 ? 180 : 145);
      }
      if (signal.aborted) return;
      this.controller = undefined;
      this.finish = undefined;
      finish();
    };
    void run();
  }
}
