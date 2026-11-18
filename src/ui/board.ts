import { OwnedDomMotion } from '@danilah/mini-games-kit/feel';
import { cellValue, evaluate, tokenValue } from '../core/types';
import type { Attempt, BoardAction, Puzzle } from '../core/types';
import type { Feedback } from './feedback';

type Source={kind:'token'|'cell';id:string};
type Target=Source|{kind:'return';id:string};
interface Gesture{pointer:number;source:Source;x:number;y:number;drag:boolean;revision:number;commandId:string}
const glyph={'+':'+','-':'−','*':'×','/':'÷'};
export const equationText=(p:Puzzle,a:Attempt,index:number):string=>{const eq=p.equations[index]!;const [left,right,result]=eq.cells.map(id=>cellValue(p,a,id)??'□');return `${left} ${glyph[eq.op]} ${right} = ${result}`;};
export class BoardView {
  private puzzle!:Puzzle;private attempt!:Attempt;private selected:Source|null=null;private gesture:Gesture|null=null;
  private readonly motion=new OwnedDomMotion();private readonly cells=new Map<number,HTMLElement>();private signs:HTMLElement[][]=[];
  private explanation='';private supportIndices:number[]=[];
  private tutorialTimer:ReturnType<typeof setTimeout>|null=null;private tutorialShown=false;
  private readonly ghost=document.querySelector<HTMLElement>('#ghost')!;
  constructor(private readonly board:HTMLElement,private readonly tray:HTMLElement,private readonly note:HTMLElement,private readonly feedback:Feedback,
    private readonly disabled:()=>boolean,private readonly reduced:()=>boolean,
    private readonly action:(command:BoardAction,metadata:{commandId:string;expectedRevision:number})=>void){
    document.addEventListener('pointerdown',this.down);document.addEventListener('pointermove',this.move);document.addEventListener('pointerup',this.up);
    document.addEventListener('pointercancel',this.pointerCancel);document.addEventListener('lostpointercapture',this.pointerCancel);document.addEventListener('click',this.keyboard);
    window.addEventListener('resize',this.resize);window.addEventListener('blur',this.cancel);document.addEventListener('scroll',this.scroll,true);
  }
  update(puzzle:Puzzle,attempt:Attempt):void{
    const changed=this.puzzle?.puzzleId!==puzzle.puzzleId||this.attempt?.id!==attempt.id;
    this.puzzle=puzzle;this.attempt=attempt;
    if(changed){this.cancel();this.selected=null;this.explanation='';this.supportIndices=[];this.tutorialShown=false;this.build();}
    this.render();
  }
  private part(tag:string,className:string,x:number,y:number):HTMLElement{const e=document.createElement(tag);e.className='part '+className;e.style.setProperty('--x',String(x));e.style.setProperty('--y',String(y));return e;}
  private build():void{
    this.motion.cancelAll();this.board.replaceChildren();this.tray.replaceChildren();this.cells.clear();this.signs=[];
    for(const cell of this.puzzle.cells){const fixed=cell.given!==undefined,e=this.part(fixed?'span':'button',fixed?'given':'cell',cell.x,cell.y);
      if(fixed)e.textContent=String(cell.given);else{e.dataset.cell=String(cell.id);e.setAttribute('type','button');const tile=document.createElement('span');tile.className='tile';e.append(tile);}
      this.cells.set(cell.id,e);this.board.append(e);
    }
    for(const eq of this.puzzle.equations){const nodes=eq.cells.map(id=>this.puzzle.cells.find(c=>c.id===id)!);const signs:HTMLElement[]=[];
      for(let i=0;i<2;i++){const a=nodes[i]!,b=nodes[i+1]!,e=this.part('span','op',(a.x+b.x)/2,(a.y+b.y)/2);e.textContent=i?'=':glyph[eq.op];e.setAttribute('aria-hidden','true');this.board.append(e);signs.push(e);}this.signs.push(signs);
    }
    this.resize();
  }
  private renderTray():void{
    // Sorting is explicit; occupied slots keep their physical place during all other actions.
    const order=this.attempt.trayOrder,existing=[...this.tray.querySelectorAll<HTMLElement>('.slot')];
    if(existing.map(e=>e.dataset.slot).join('|')!==order.join('|')){
      this.tray.replaceChildren();for(const id of order){const slot=document.createElement('span');slot.className='slot';slot.dataset.slot=id;
        const token=document.createElement('button');token.type='button';token.className='token';token.dataset.token=id;token.textContent=String(tokenValue(this.puzzle,id));slot.append(token);this.tray.append(slot);}
    }
    const used=new Set(Object.values(this.attempt.placements));
    for(const token of this.tray.querySelectorAll<HTMLButtonElement>('button')){const id=token.dataset.token!;token.hidden=used.has(id);token.disabled=this.disabled()||this.attempt.status!=='playing';const active=this.selected?.kind==='token'&&this.selected.id===id;token.classList.toggle('selected',active);token.setAttribute('aria-pressed',String(active));token.setAttribute('aria-label',`Число ${tokenValue(this.puzzle,id)}, экземпляр ${Number(id.slice(1))+1}`);}
  }
  render():void{
    const p=this.puzzle,a=this.attempt;if(!p)return;
    const states=evaluate(p,a),conceal=a.mode==='endless'&&a.status!=='won';
    const bad=new Set<number>(),linked=new Set<number>();
    p.equations.forEach((eq,i)=>{
      if(!conceal&&states[i]==='invalid')eq.cells.forEach(id=>bad.add(id));
      if(this.selected?.kind==='cell'&&eq.cells.includes(Number(this.selected.id))||this.supportIndices.includes(i))eq.cells.forEach(id=>linked.add(id));
      for(const sign of this.signs[i]!)sign.classList.toggle('invalid',!conceal&&states[i]==='invalid');this.signs[i]![1]!.classList.toggle('right',!conceal&&states[i]==='valid');
    });
    for(const cell of p.cells){const e=this.cells.get(cell.id)!,v=cellValue(p,a,cell.id);e.classList.toggle('invalid',bad.has(cell.id));e.classList.toggle('linked',linked.has(cell.id));
      const relations=p.equations.map((eq,i)=>eq.cells.includes(cell.id)?equationText(p,a,i):'').filter(Boolean).join('; ');
      const label=`Строка ${cell.y+1}, столбец ${cell.x+1}. ${cell.given!==undefined?'Дано':v===undefined?'Пустая клетка':'Число'} ${v??''}. ${relations}${bad.has(cell.id)?'. Проверьте равенство':''}`;
      e.setAttribute('aria-label',label);
      if(cell.given!==undefined)continue;
      (e as HTMLButtonElement).disabled=this.disabled()||a.status!=='playing';e.firstElementChild!.textContent=v===undefined?'':String(v);e.classList.toggle('placed',v!==undefined);e.classList.toggle('empty',v===undefined);
      const active=this.selected?.kind==='cell'&&Number(this.selected.id)===cell.id;e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));
    }
    this.renderTray();
    const wrong=conceal?-1:states.indexOf('invalid');this.note.classList.toggle('problem',wrong>=0);
    this.note.textContent=this.explanation|| (a.status==='won'?'Все равенства сходятся.':wrong>=0?'Проверьте: '+equationText(p,a,wrong).replace(' = ',' ≠ ')+'.':this.selected?.kind==='cell'?'Связи клетки: '+p.equations.map((eq,i)=>eq.cells.includes(Number(this.selected!.id))?equationText(p,a,i):'').filter(Boolean).join(' и ')+'.':this.selected?.kind==='token'?`Выбрано ${tokenValue(p,this.selected.id)}. Коснитесь клетки.`:a.boardRevision===0&&p.campaignPosition===1?'Выберите число и коснитесь пустой клетки.':'Число на пересечении участвует в обеих связях.');
    document.querySelector('#filled')!.textContent=`${Object.keys(a.placements).length} / ${p.tray.length}`;
    document.querySelector('#stock')!.textContent=`Осталось ${p.tray.length-Object.keys(a.placements).length}`;
    (document.querySelector('#return') as HTMLButtonElement).disabled=this.disabled()||a.status!=='playing'||this.selected?.kind!=='cell'||a.placements[this.selected.id]===undefined;
    if(p.campaignPosition===1&&a.boardRevision===0&&!this.tutorialShown&&!this.tutorialTimer&&!this.disabled())this.tutorialTimer=setTimeout(()=>this.demonstrateFirstMove(),6000);
  }
  private dismissTutorial():void{this.tutorialShown=true;this.stopTutorial();}
  private stopTutorial():void{if(this.tutorialTimer)clearTimeout(this.tutorialTimer);this.tutorialTimer=null;for(const node of document.querySelectorAll('.tutorial-ghost')){this.motion.cancel(node);node.remove();}}
  private demonstrateFirstMove():void{
    this.tutorialTimer=null;if(this.disabled()||this.gesture||this.attempt.boardRevision!==0)return;this.tutorialShown=true;
    if(this.reduced())return;
    const token=this.tray.querySelector<HTMLElement>('[data-token]'),target=this.cells.get(2);if(!token||!target)return;
    const from=token.getBoundingClientRect(),to=target.getBoundingClientRect(),ghost=token.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-token');ghost.removeAttribute('aria-pressed');ghost.className='token tutorial-ghost';ghost.setAttribute('aria-hidden','true');ghost.setAttribute('tabindex','-1');
    Object.assign(ghost.style,{position:'fixed',left:from.x+'px',top:from.y+'px',pointerEvents:'none',zIndex:'9'});document.body.append(ghost);
    const animation=this.motion.animate(ghost,[{translate:'0 0',opacity:0,offset:0},{translate:'0 0',opacity:.7,offset:.15},{translate:`${to.x-from.x}px ${to.y-from.y}px`,opacity:.7,offset:.8},{translate:`${to.x-from.x}px ${to.y-from.y}px`,opacity:0,offset:1}],{duration:1100,easing:'ease-in-out'},{onFinish:()=>ghost.remove()});
    animation?.addEventListener('cancel',()=>ghost.remove(),{once:true});
  }
  explain(text:string,indices:number[]):void{this.explanation=text;this.supportIndices=indices;this.render();}
  selectedCell():number|undefined{return this.selected?.kind==='cell'?Number(this.selected.id):undefined;}
  returnSelected():void{if(this.selected?.kind==='cell')this.dispatch({type:'ReturnToTray',cellId:Number(this.selected.id)});}
  clearSelection():void{this.selected=null;this.explanation='';this.supportIndices=[];this.render();}
  private source(el:Element|null):Source|null{const e=el?.closest<HTMLElement>('[data-cell],[data-token]');if(!e||e.hidden||(e as HTMLButtonElement).disabled)return null;return e.dataset.cell!==undefined?{kind:'cell',id:e.dataset.cell}:{kind:'token',id:e.dataset.token!};}
  private drop(x:number,y:number):Target|null{const el=document.elementFromPoint(x,y),target=this.source(el);return target?.kind==='cell'?target:el?.closest('#traybox')?{kind:'return',id:''}:null;}
  private dispatch(action:BoardAction,metadata?:{commandId:string;expectedRevision:number}):void{this.selected=null;this.explanation='';this.supportIndices=[];this.action(action,metadata??{commandId:crypto.randomUUID(),expectedRevision:this.attempt.boardRevision});}
  private transfer(source:Source,target:Target,metadata:{commandId:string;expectedRevision:number}):void{
    if(target.kind==='return'){if(source.kind==='cell')this.dispatch({type:'ReturnToTray',cellId:Number(source.id)},metadata);return;}
    if(target.kind!=='cell')return;
    if(source.kind==='token')this.dispatch({type:'PlaceFromTray',tokenId:source.id,cellId:Number(target.id)},metadata);
    else this.dispatch({type:'MoveCell',from:Number(source.id),to:Number(target.id)},metadata);
  }
  private tap(source:Source,metadata:{commandId:string;expectedRevision:number}):void{
    if(this.selected?.kind===source.kind&&this.selected.id===source.id){this.selected=null;this.render();return;}
    if(this.selected?.kind==='token'&&source.kind==='cell'){this.transfer(this.selected,source,metadata);return;}
    if(this.selected?.kind==='cell'&&source.kind==='token'){this.transfer(source,this.selected,metadata);return;}
    if(this.selected?.kind==='cell'&&this.attempt.placements[this.selected.id]!==undefined&&source.kind==='cell'){this.transfer(this.selected,source,metadata);return;}
    this.selected=source;this.explanation='';this.supportIndices=[];this.feedback.cue('pick');this.render();
  }
  private down=(e:PointerEvent):void=>{const source=this.source(e.target as Element);if(!source||this.disabled()||this.gesture||!e.isPrimary||e.button!==0)return;
    this.dismissTutorial();
    this.gesture={pointer:e.pointerId,source,x:e.clientX,y:e.clientY,drag:false,revision:this.attempt.boardRevision,commandId:crypto.randomUUID()};document.body.setPointerCapture(e.pointerId);
  };
  private move=(e:PointerEvent):void=>{const g=this.gesture;if(!g||g.pointer!==e.pointerId||this.disabled())return;
    if(!g.drag&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;
    if(g.source.kind==='cell'&&this.attempt.placements[g.source.id]===undefined)return;
    if(!g.drag){g.drag=true;this.ghost.textContent=String(g.source.kind==='token'?tokenValue(this.puzzle,g.source.id):cellValue(this.puzzle,this.attempt,Number(g.source.id)));this.ghost.hidden=false;this.feedback.cue('pick');}
    this.ghost.style.left=e.clientX+'px';this.ghost.style.top=e.clientY+'px';this.clearHover();const target=this.drop(e.clientX,e.clientY);
    if(target?.kind==='cell')this.cells.get(Number(target.id))?.classList.add('hover');else if(target?.kind==='return'&&g.source.kind==='cell')this.tray.parentElement!.classList.add('hover');
  };
  private up=(e:PointerEvent):void=>{const g=this.gesture;if(!g||g.pointer!==e.pointerId)return;const drop=this.drop(e.clientX,e.clientY),under=this.source(document.elementFromPoint(e.clientX,e.clientY));
    if(g.drag&&(!drop||drop.kind==='return'&&g.source.kind==='token'))this.returnGhost(g);
    this.cancel();if(this.disabled())return;const metadata={commandId:g.commandId,expectedRevision:g.revision};
    if(g.drag){if(drop)this.transfer(g.source,drop,metadata);}else if(under?.kind===g.source.kind&&under.id===g.source.id)this.tap(g.source,metadata);
  };
  private returnGhost(g:Gesture):void{if(this.reduced())return;const source=g.source.kind==='token'?this.tray.querySelector<HTMLElement>(`[data-token="${g.source.id}"]`):this.cells.get(Number(g.source.id));if(!source)return;
    const from=this.ghost.getBoundingClientRect(),to=source.getBoundingClientRect(),copy=this.ghost.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.hidden=false;document.body.append(copy);
    const animation=this.motion.animate(copy,[{translate:'0 0',opacity:.92},{translate:`${to.x+to.width/2-from.x-from.width/2}px ${to.y+to.height/2-from.y-from.height/2}px`,opacity:0}],{duration:140,easing:'ease-out'},{onFinish:()=>copy.remove()});
    animation?.addEventListener('cancel',()=>copy.remove(),{once:true});
  }
  private clearHover():void{for(const el of document.querySelectorAll('.hover'))el.classList.remove('hover');}
  cancel=():void=>{this.stopTutorial();const g=this.gesture;this.gesture=null;if(g&&document.body.hasPointerCapture(g.pointer))document.body.releasePointerCapture(g.pointer);this.ghost.hidden=true;this.clearHover();};
  private pointerCancel=(e:PointerEvent):void=>{if(this.gesture?.pointer===e.pointerId)this.cancel();};
  private scroll=():void=>{if(this.gesture)this.cancel();};
  private keyboard=(e:MouseEvent):void=>{if(e.detail!==0||this.disabled())return;const source=this.source(e.target as Element);if(source){this.dismissTutorial();this.tap(source,{commandId:crypto.randomUUID(),expectedRevision:this.attempt.boardRevision});}};
  resize=():void=>{this.cancel();this.motion.cancelAll();if(!this.puzzle)return;const p=this.puzzle,pad=this.board.closest<HTMLElement>('.boardpad')!,scale=parseFloat(getComputedStyle(document.documentElement).fontSize)/16;
    const hit=48*Math.max(1,scale),maxWidth=pad.clientWidth-4,step=Math.max(hit/2,Math.min(46*scale,(maxWidth-hit)/Math.max(1,p.width-1),p.height>5?30*scale:innerHeight<650?31*scale:46*scale));
    for(const [key,value] of Object.entries({step,item:Math.min(hit-2,step*1.13),hit,w:p.width,h:p.height}))this.board.style.setProperty('--'+key,String(value)+(key==='w'||key==='h'?'':'px'));
  };
  dispose():void{this.cancel();this.motion.cancelAll();document.removeEventListener('pointerdown',this.down);document.removeEventListener('pointermove',this.move);document.removeEventListener('pointerup',this.up);document.removeEventListener('pointercancel',this.pointerCancel);document.removeEventListener('lostpointercapture',this.pointerCancel);document.removeEventListener('click',this.keyboard);document.removeEventListener('scroll',this.scroll,true);window.removeEventListener('resize',this.resize);window.removeEventListener('blur',this.cancel);}
}
