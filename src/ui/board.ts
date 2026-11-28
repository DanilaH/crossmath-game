import { expressionSignature } from '../core/engine';
import { conflictText, localize, operatorGlyph } from './locale';
import type { Language } from './locale';
import { OwnedDomMotion } from '@danilah/mini-games-kit/feel';
import { cellValue, evaluate, tokenValue } from '../core/types';
import type { Attempt, BoardAction, Puzzle } from '../core/types';
import type { Feedback } from './feedback';
import { moveIsCurrent } from './playFeedback';
import type { MoveFeedback } from './playFeedback';

type Source={kind:'token'|'cell';id:string};
type Target=Source|{kind:'return';id:string};
interface Gesture{pointer:number;source:Source;piece:HTMLElement;x:number;y:number;drag:boolean;revision:number;commandId:string}
interface Landing { cell: number; revision: number; from: DOMRect }
export const equationText=(p:Puzzle,a:Attempt,index:number):string=>{const eq=p.equations[index]!;const [left,right,result]=eq.cells.map(id=>cellValue(p,a,id)??'□');return `${left} ${operatorGlyph[eq.op]} ${right} = ${result}`;};
export class BoardView {
  private puzzle!:Puzzle;private attempt!:Attempt;private selected:Source|null=null;private gesture:Gesture|null=null;
  private readonly sortMotion=new OwnedDomMotion();
  private readonly motion=new OwnedDomMotion();private readonly cells=new Map<number,HTMLElement>();private signs:HTMLElement[][]=[];
  private equationLines: HTMLElement[] = [];
  private landing: Landing | undefined;
  private lastFeedbackCommand: string | undefined;
  private consumedPointerClick = false;
  private freshErrors: number[] = [];
  private preferredAxis: 'row' | 'column' | undefined;
  private explanation='';private supportIndices:number[]=[];
  private tutorialTimer:ReturnType<typeof setTimeout>|null=null;private tutorialShown=false;
  private readonly boardScroll: HTMLElement;
  private readonly playArea: HTMLElement;
  private readonly tools: HTMLElement;
  private readonly boardSize: ResizeObserver;
  private readonly trayViewport = document.querySelector<HTMLElement>('#traybox')!;
  private readonly trayNavigation = document.querySelector<HTMLElement>('#tray-nav')!;
  private readonly trayPrev = document.querySelector<HTMLButtonElement>('#tray-prev')!;
  private readonly trayNext = document.querySelector<HTMLButtonElement>('#tray-next')!;
  private readonly ghost=document.querySelector<HTMLElement>('#ghost')!;
  constructor(private readonly board:HTMLElement,private readonly tray:HTMLElement,private readonly note:HTMLElement,private readonly feedback:Feedback,
    private readonly disabled:()=>boolean,private readonly reduced:()=>boolean,
    private readonly action:(command:BoardAction,metadata:{commandId:string;expectedRevision:number})=>void,private readonly language:()=>Language){
    this.boardScroll = board.closest<HTMLElement>('.board-scroll')!;
    this.playArea = board.closest<HTMLElement>('.play-area')!;
    this.tools = this.playArea.querySelector<HTMLElement>('.tools')!;
    this.boardSize = new ResizeObserver(this.resize);
    for (const element of [this.playArea, this.note, this.trayViewport, this.tools]) {
      this.boardSize.observe(element);
    }
    this.tray.addEventListener('scroll', this.updateTrayButtons);
    this.trayPrev.onclick = () => this.pageTray(-1);
    this.trayNext.onclick = () => this.pageTray(1);
    document.addEventListener('pointerdown',this.down);document.addEventListener('pointermove',this.move);document.addEventListener('pointerup',this.up);
    document.addEventListener('pointercancel',this.pointerCancel);document.addEventListener('lostpointercapture',this.pointerCancel);document.addEventListener('click',this.click,true);
    window.addEventListener('resize',this.resize);window.addEventListener('blur',this.cancel);document.addEventListener('scroll',this.scroll,true);
  }
  private t(ru:string,en:string):string {return localize(this.language(),ru,en);}
  update(puzzle: Puzzle, attempt: Attempt, move?: MoveFeedback): void {
    const before = this.attempt;
    const sorting=move?.cue==='sort'&&moveIsCurrent(move,attempt)&&this.lastFeedbackCommand!==move.commandId;
    const positions=sorting&&!this.reduced()?new Map([...this.tray.querySelectorAll<HTMLElement>('[data-token]:not([hidden])')].map(e=>[e.dataset.token!,e.getBoundingClientRect()])):undefined;
    if(sorting||this.reduced())this.sortMotion.cancelAll();
    const changed = this.puzzle?.puzzleId !== puzzle.puzzleId || before.id !== attempt.id;
    this.puzzle = puzzle;
    this.attempt = attempt;
    if (changed) {
      this.landing = undefined;
      this.lastFeedbackCommand = undefined;
      this.cancel();
      this.selected = null;
      this.explanation = '';
      this.supportIndices = [];
      this.tutorialShown = false;
      this.freshErrors = [];
      this.preferredAxis = undefined;
      this.build();
    }
    const moved = !changed && before.boardRevision !== attempt.boardRevision;
    if (moved && attempt.mode !== 'endless') {
      this.freshErrors = evaluate(puzzle, attempt).flatMap((state, index) =>
        state === 'invalid' && expressionSignature(puzzle,before,index) !== expressionSignature(puzzle,attempt,index) ? [index] : []);
    }
    this.render();
    const landing = this.landing;
    if (this.disabled()) return;
    this.landing = undefined;
    if (changed || !move || !moveIsCurrent(move, attempt) || this.lastFeedbackCommand === move.commandId) return;
    this.lastFeedbackCommand = move.commandId;
    this.motion.cancelAll();
    if(positions)for(const piece of this.tray.querySelectorAll<HTMLElement>('[data-token]:not([hidden])')){
      const old=positions.get(piece.dataset.token!),now=piece.getBoundingClientRect();
      const visible=(r:DOMRect)=>r.top>=this.tray.getBoundingClientRect().top-1&&r.bottom<=this.tray.getBoundingClientRect().bottom+1;
      if(old&&visible(old)&&visible(now)&&(old.x!==now.x||old.y!==now.y))this.sortMotion.animate(piece.firstElementChild,[
        {translate:`${old.x-now.x}px ${old.y-now.y}px`},{translate:'0 0'},
      ],{duration:140,easing:'cubic-bezier(.2,.7,.3,1)'},{fromCurrent:'replace'});
    }

    const scored = move.cue === 'win' || attempt.mode !== 'endless' && (move.cue === 'right' || move.cue === 'wrong');
    const previous = scored ? evaluate(puzzle, move.before) : [];
    const current = scored ? evaluate(puzzle, attempt) : [];

    const placements = move.cell === undefined ? [] : puzzle.cells.filter(cell => {
      const token = attempt.placements[cell.id];
      return token !== undefined && token !== move.before.placements[cell.id];
    });
    const axes = current.flatMap((state, index) => {
      if (state !== 'valid' || (previous[index] === 'valid' && attempt.mode !== 'endless')) return [];
      const eq = puzzle.equations[index]!;
      const origin = placements.find(cell => cell.id === move.cell && eq.cells.includes(cell.id))
        ?? placements.find(cell => eq.cells.includes(cell.id));
      return [{index, origin}];
    });
    let contacted = false;
    const atContact = () => {
      if (contacted || !moveIsCurrent(move,this.attempt)) return;
      contacted = true;
      this.feedback.cue(move.cue, axes.length > 1 ? {...move.detail,double:true} : move.detail);
      if (this.reduced()) return;
      for (const {index, origin} of axes) {
        const line = this.equationLines[index]!;
        const row = line.dataset.axis === 'row';
        const coordinate = row ? 'x' : 'y';
        const position = origin ? origin[coordinate] - Number(line.style.getPropertyValue('--' + coordinate)) : 2;
        line.style.setProperty('--origin', String(position));
        this.motion.animate(line, [
          {scale: row ? '.03 1' : '1 .03', opacity: .98},
          {scale: '1', opacity: .93, offset: .64},
          {scale: '1', opacity: 0},
        ], {duration: 230, easing: 'ease-out'});
      }
    };
    let animatingContact = false;
    if (!this.reduced()) for (const cell of placements) {
      const face = this.cells.get(cell.id)!.firstElementChild as HTMLElement;
      this.motion.cancel(face);
      const released = landing?.cell === cell.id && landing.revision === move.before.boardRevision ? landing.from : undefined;
      const target = face.getBoundingClientRect();
      const start: Keyframe = released ? {
        translate: `${released.left + (released.width - target.width) / 2 - target.left}px ${released.top + (released.height - target.height) / 2 - target.top}px`,
        scale: String(released.width / target.width),
      } : {translate: '0 -5px', scale: '1.045'};
      const main = cell.id === move.cell;
      const arrival = this.motion.animate(face, [start, {translate: '0 0', scale: '1'}],
        {duration: released ? 82 : 42, easing: released ? 'cubic-bezier(.24,.35,.68,1)' : 'linear', fill: 'backwards'}, {
          onFinish: () => {
            if (!moveIsCurrent(move,this.attempt)) return;
            if (main) atContact();
            this.motion.animate(face, [
              {translate: '0 0', scale: '1'}, {translate: '0 1px', scale: '.975', offset: .34},
              {translate: '0 0', scale: '1'},
            ], {duration: 65, easing: 'ease-out'});
          },
        });
      if (main && arrival) animatingContact = true;
    }
    if (!animatingContact) atContact();
  }
  private part(tag:string,className:string,x:number,y:number):HTMLElement{const e=document.createElement(tag);e.className='part '+className;e.style.setProperty('--x',String(x));e.style.setProperty('--y',String(y));return e;}
  private build(): void {
    this.motion.cancelAll();
    this.playArea.classList.toggle('has-tall-board', this.puzzle.height >= 11);
    this.board.replaceChildren();
    this.tray.replaceChildren();
    this.boardScroll.scrollTo(0, 0);
    this.tray.scrollTop = 0;
    this.cells.clear();
    this.signs = [];
    this.equationLines = [];

    const squares = new Map<string, [number, number]>();
    const key = (x: number, y: number) => `${x},${y}`;
    const addSquare = (x: number, y: number) => squares.set(key(x, y), [x, y]);

    for (const cell of this.puzzle.cells) {
      const fixed = cell.given !== undefined;
      const node = this.part(fixed ? 'span' : 'button', fixed ? 'given' : 'cell', cell.x, cell.y);
      if (fixed) {
        node.textContent = String(cell.given);
        node.classList.toggle('two-digit', node.textContent.length === 2);
      } else {
        node.dataset.cell = String(cell.id);
        node.setAttribute('type', 'button');
        const tile = document.createElement('span');
        tile.className = 'tile';
        node.append(tile);
      }
      addSquare(cell.x, cell.y);
      this.cells.set(cell.id, node);
      this.board.append(node);
    }

    for (const eq of this.puzzle.equations) {
      const nodes = eq.cells.map(id => this.puzzle.cells.find(cell => cell.id === id)!);
      const [first, , last] = nodes;
      const line = document.createElement('span');
      line.className = 'equation-line';
      line.dataset.axis = first!.y === last!.y ? 'row' : 'column';
      line.style.setProperty('--x', String(first!.x));
      line.style.setProperty('--y', String(first!.y));
      line.style.setProperty('--length', String(1 + Math.abs(last!.x - first!.x) + Math.abs(last!.y - first!.y)));
      line.setAttribute('aria-hidden', 'true');
      this.equationLines.push(line);

      const signs: HTMLElement[] = [];
      for (let i = 0; i < 2; i++) {
        const a = nodes[i]!, b = nodes[i + 1]!;
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        const sign = this.part('span', 'op', x, y);
        sign.textContent = i === 0 ? operatorGlyph[eq.op] : '=';
        sign.setAttribute('aria-hidden', 'true');
        addSquare(x, y);
        this.board.append(sign);
        signs.push(sign);
      }
      this.signs.push(signs);
    }

    const surface = document.createElement('div');
    surface.className = 'board-surface';
    surface.setAttribute('aria-hidden', 'true');
    const edges = [
      ['top', 0, -1], ['right', 1, 0], ['bottom', 0, 1], ['left', -1, 0],
    ] as const;
    for (const [x, y] of squares.values()) {
      const square = document.createElement('span');
      square.className = 'board-square';
      square.style.gridRow = String(y + 1);
      square.style.gridColumn = String(x + 1);
      square.dataset.edges = edges
        .filter(([, dx, dy]) => !squares.has(key(x + dx, y + dy)))
        .map(([side]) => side)
        .join(' ');
      surface.append(square);
    }
    this.board.prepend(surface, ...this.equationLines);
    this.resize();
  }
  private renderTray():void{
    // Sorting is explicit; occupied slots keep their physical place during all other actions.
    const order=this.attempt.trayOrder,existing=[...this.tray.querySelectorAll<HTMLElement>('.slot')];
    if(existing.map(e=>e.dataset.slot).join('|')!==order.join('|')){
      const keyed=new Map(existing.map(e=>[e.dataset.slot,e]));
      for(const id of order){let slot=keyed.get(id);if(!slot){slot=document.createElement('span');slot.className='slot';slot.dataset.slot=id;
        const token=document.createElement('button');token.type='button';token.className='token';token.dataset.token=id;const face=document.createElement('span');face.className='token-face';face.textContent=String(tokenValue(this.puzzle,id));token.append(face);slot.append(token);}
        this.tray.append(slot);}
      this.tray.scrollTop=0;
    }
    const used=new Set(Object.values(this.attempt.placements));
    for(const token of this.tray.querySelectorAll<HTMLButtonElement>('button')){const id=token.dataset.token!;token.hidden=used.has(id);token.disabled=this.disabled()||this.attempt.status!=='playing';const active=this.selected?.kind==='token'&&this.selected.id===id;token.classList.toggle('selected',active);token.setAttribute('aria-pressed',String(active));token.setAttribute('aria-label',this.t(`Число ${tokenValue(this.puzzle,id)}, экземпляр ${Number(id.slice(1))+1}`,`Number ${tokenValue(this.puzzle,id)}, piece ${Number(id.slice(1))+1}`));}
  }
  private updateTrayButtons = (): void => {
    if (this.trayNavigation.hidden) return;
    const off = this.disabled() || this.attempt.status !== 'playing';
    this.trayPrev.disabled = off || this.tray.scrollTop <= 1;
    this.trayNext.disabled = off || this.tray.scrollTop + this.tray.clientHeight >= this.tray.scrollHeight - 1;
  };

  private pageTray(direction: -1 | 1): void {
    this.tray.scrollTop += direction * (this.tray.clientHeight + 5);
    this.updateTrayButtons();
    if (document.activeElement === (direction === 1 ? this.trayNext : this.trayPrev)) {
      const opposite = direction === 1 ? this.trayPrev : this.trayNext;
      if ((direction === 1 ? this.trayNext : this.trayPrev).disabled) opposite.focus({preventScroll:true});
    }
  }

  private sizeTray(): void {
    const width = this.trayViewport.clientWidth;
    const columns = Math.max(1, Math.floor((width + 3) / (48 + 3)));
    const rows = Number(getComputedStyle(this.trayViewport).getPropertyValue('--tray-rows'));
    this.trayNavigation.hidden = !width || this.puzzle.tray.length <= columns * rows;
    this.updateTrayButtons();
  }

  render():void{
    const p=this.puzzle,a=this.attempt;if(!p)return;
    const states=evaluate(p,a),conceal=a.mode==='endless'&&a.status!=='won';
    const bad=new Set<number>(),linked=new Set<number>();
    p.equations.forEach((eq,i)=>{
      if(!conceal&&states[i]==='invalid')eq.cells.forEach(id=>bad.add(id));
      if(this.selected?.kind==='cell'&&eq.cells.includes(Number(this.selected.id))||this.supportIndices.includes(i))eq.cells.forEach(id=>linked.add(id));
      const state = conceal ? 'neutral' : states[i]!;
      const equal = this.signs[i]![1]!;
      equal.textContent = state === 'invalid' ? '≠' : '=';
      equal.classList.toggle('invalid', state === 'invalid');
      equal.classList.toggle('right', state === 'valid');
      const line = this.equationLines[i]!;
      if (line.dataset.state === 'valid' && state !== 'valid') this.motion.cancel(line);
      line.dataset.state = state;
    });
    for(const cell of p.cells){const e=this.cells.get(cell.id)!,v=cellValue(p,a,cell.id);e.classList.toggle('linked',linked.has(cell.id));
      const relations=p.equations.map((eq,i)=>{
        if (!eq.cells.includes(cell.id)) return '';
        const relation = equationText(p,a,i);
        return !conceal && states[i]==='invalid' ? relation.replace(' = ',' ≠ ') : relation;
      }).filter(Boolean).join('; ');
      const type=cell.given!==undefined?this.t('Дано','Given'):v===undefined?this.t('Пустая клетка','Empty cell'):this.t('Число','Number');
      const position=this.t(`Строка ${cell.y+1}, столбец ${cell.x+1}`,`Row ${cell.y+1}, column ${cell.x+1}`);
      const warning=bad.has(cell.id)?this.t('. Проверьте равенство','. Check the equation'):'';
      const label=`${position}. ${type} ${v??''}. ${relations}${warning}`;
      e.setAttribute('aria-label',label);
      if(cell.given!==undefined)continue;
      (e as HTMLButtonElement).disabled=this.disabled()||a.status!=='playing';
      const tile=e.firstElementChild!;
      tile.textContent=v===undefined?'':String(v);
      tile.classList.toggle('two-digit',tile.textContent.length===2);
      e.classList.toggle('placed',v!==undefined);e.classList.toggle('empty',v===undefined);
      const active=this.selected?.kind==='cell'&&Number(this.selected.id)===cell.id;e.classList.toggle('selected',active);e.setAttribute('aria-pressed',String(active));
    }
    this.renderTray();
    this.updateTrayButtons();
    const focused = this.selectedCell();
    const axisFirst = (indices: number[]): number | undefined =>
      indices.find(index => this.equationLines[index]!.dataset.axis === this.preferredAxis) ?? indices[0];
    const wrong = conceal ? -1 : axisFirst(this.freshErrors.filter(index => states[index] === 'invalid'))
      ?? axisFirst(states.flatMap((state, index) => state === 'invalid' && focused !== undefined && p.equations[index]!.cells.includes(focused) ? [index] : []))
      ?? states.indexOf('invalid');
    const firstMove = p.puzzleId === 'cm-own-01-001' && a.mode === 'campaign' && a.boardRevision === 0 && a.status === 'playing';
    const showGuide = firstMove && !this.tutorialShown;
    this.board.classList.toggle('first-move', showGuide);
    this.tray.classList.toggle('first-move', showGuide);
    this.note.classList.toggle('problem', wrong >= 0 && !this.explanation);
    let note = this.explanation
      || (wrong >= 0 ? conflictText(this.language(), this.equationLines[wrong]!.dataset.axis === 'row', equationText(p, a, wrong))
        : this.selected?.kind === 'cell' ? p.equations.map((eq, i) => eq.cells.includes(Number(this.selected!.id)) ? equationText(p, a, i) : '').filter(Boolean).join(' · ')
        : this.selected?.kind === 'token' ? (this.boardScroll.scrollWidth > this.boardScroll.clientWidth + 1
          || this.boardScroll.scrollHeight > this.boardScroll.clientHeight + 1
          ? this.t('Можно сдвинуть поле и коснуться клетки', 'Pan the board, then tap a cell')
          : this.t('Коснитесь клетки', 'Tap a cell'))
        : firstMove ? this.t('Поставьте число в пустую клетку', 'Put the number in the empty cell')
        : '');
    if (conceal && !this.explanation && !this.selected && a.lastRejectedSignature && a.status === 'playing') {
      note = this.t('Измените числа и проверьте снова', 'Change the numbers and check again');
    }
    if (this.note.textContent !== note) {
      this.note.textContent = note;
      this.resize();
    }
    (document.querySelector('#return') as HTMLButtonElement).disabled =
      this.disabled() || a.status !== 'playing' || this.selected?.kind !== 'cell' || a.placements[this.selected.id] === undefined;
    if (showGuide && !this.tutorialTimer && !this.disabled() && !this.reduced()) this.tutorialTimer = setTimeout(() => this.demonstrateFirstMove(), 6000);
  }
  private dismissTutorial():void {
    this.tutorialShown = true;
    this.board.classList.remove('first-move');
    this.tray.classList.remove('first-move');
    this.stopTutorial();
  }
  private stopTutorial():void {
    if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
    this.tutorialTimer = null;
    for (const node of document.querySelectorAll('.tutorial-ghost')) {
      this.motion.cancel(node);
      node.remove();
    }
  }
  private demonstrateFirstMove():void{
    this.tutorialTimer=null;if(this.disabled()||this.gesture||this.attempt.boardRevision!==0||this.reduced())return;this.tutorialShown=true;
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
    this.freshErrors=[];
    if (source.kind === 'cell') {
      const links = this.puzzle.equations.flatMap((eq,index) => eq.cells.includes(Number(source.id)) ? [this.equationLines[index]!.dataset.axis] : []);
      if (links.length === 1) this.preferredAxis = links[0] as 'row' | 'column';
    }
    this.selected=source;this.explanation='';this.supportIndices=[];
    this.feedback.cue('pick',this.movable(source) ? {grasp:true} : undefined);
    this.render();
  }
  private movable(source:Source):boolean{return source.kind==='token'||this.attempt.placements[source.id]!==undefined;}
  private down=(e:PointerEvent):void=>{if(e.isPrimary){this.consumedPointerClick=false;this.sortMotion.cancelAll();}const source=this.source(e.target as Element);if(!source||this.disabled()||this.gesture||!e.isPrimary||e.button!==0)return;
    this.dismissTutorial();
    const piece=(e.target as Element).closest<HTMLElement>('[data-cell],[data-token]')!;
    if(this.movable(source))piece.classList.add('grasping');
    this.gesture={pointer:e.pointerId,source,piece,x:e.clientX,y:e.clientY,drag:false,revision:this.attempt.boardRevision,commandId:crypto.randomUUID()};document.body.setPointerCapture(e.pointerId);
  };
  private move=(e:PointerEvent):void=>{const g=this.gesture;if(!g||g.pointer!==e.pointerId||this.disabled())return;
    if(!g.drag&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;
    if(!this.movable(g.source))return;
    if(!g.drag){g.drag=true;g.piece.classList.remove('grasping');g.piece.classList.add('lifted');this.ghost.textContent=String(g.source.kind==='token'?tokenValue(this.puzzle,g.source.id):cellValue(this.puzzle,this.attempt,Number(g.source.id)));this.ghost.hidden=false;this.feedback.cue('pick',{grasp:true});}
    this.ghost.style.left=e.clientX+'px';this.ghost.style.top=e.clientY+'px';this.clearHover();const target=this.drop(e.clientX,e.clientY);
    this.ghost.classList.toggle('over-cell', target?.kind === 'cell');
    if(target?.kind==='cell')this.cells.get(Number(target.id))?.classList.add('hover');else if(target?.kind==='return'&&g.source.kind==='cell')this.tray.parentElement!.classList.add('hover');
  };
  private up=(e:PointerEvent):void=>{const g=this.gesture;if(!g||g.pointer!==e.pointerId)return;this.consumedPointerClick=true;const drop=this.drop(e.clientX,e.clientY),under=this.source(document.elementFromPoint(e.clientX,e.clientY));
    if(g.drag&&(!drop||drop.kind==='return'&&g.source.kind==='token'))this.returnGhost(g);
    const released = g.drag && drop?.kind === 'cell' && !this.reduced()
      ? {cell: Number(drop.id), revision: g.revision, from: this.ghost.getBoundingClientRect()} : undefined;
    this.cancel();if(this.disabled())return;this.landing=released;const metadata={commandId:g.commandId,expectedRevision:g.revision};
    if(g.drag){if(drop)this.transfer(g.source,drop,metadata);}else if(under?.kind===g.source.kind&&under.id===g.source.id)this.tap(g.source,metadata);
  };
  private returnGhost(g:Gesture):void{if(this.reduced())return;const source=g.source.kind==='token'?this.tray.querySelector<HTMLElement>(`[data-token="${g.source.id}"]`):this.cells.get(Number(g.source.id));if(!source)return;
    const from=this.ghost.getBoundingClientRect(),to=source.getBoundingClientRect(),copy=this.ghost.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.hidden=false;document.body.append(copy);
    const animation=this.motion.animate(copy,[{translate:'0 0',opacity:.92},{translate:`${to.x+to.width/2-from.x-from.width/2}px ${to.y+to.height/2-from.y-from.height/2}px`,opacity:0}],{duration:140,easing:'ease-out'},{onFinish:()=>copy.remove()});
    animation?.addEventListener('cancel',()=>copy.remove(),{once:true});
  }
  private clearHover():void{for(const el of document.querySelectorAll('.hover'))el.classList.remove('hover');}
  cancel=():void=>{this.sortMotion.cancelAll();this.stopTutorial();const g=this.gesture;this.gesture=null;g?.piece.classList.remove('lifted','grasping');if(g&&document.body.hasPointerCapture(g.pointer))document.body.releasePointerCapture(g.pointer);this.ghost.hidden=true;this.ghost.classList.remove('over-cell');this.clearHover();};
  suspend():void {this.landing=undefined;this.cancel();this.motion.cancelAll();this.sortMotion.cancelAll();}
  private pointerCancel=(e:PointerEvent):void=>{if(this.gesture?.pointer===e.pointerId)this.cancel();};
  private scroll=():void=>{if(this.gesture)this.cancel();};
  private click = (e: MouseEvent): void => {
    if (e.detail !== 0) {
      // A completed touch can reveal a result under the same coordinates before the browser dispatches click.
      if (this.consumedPointerClick) {
        this.consumedPointerClick = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (this.disabled()) return;
    const source = this.source(e.target as Element);
    if (!source) return;
    this.dismissTutorial();
    this.tap(source, {commandId: crypto.randomUUID(), expectedRevision: this.attempt.boardRevision});
  };
  resize=():void=>{
    const p = this.puzzle;
    const width = this.playArea.clientWidth - 4;
    if (!p || width <= 0) return;
    this.sizeTray();
    const roomy = p.width <= 5 && p.height <= 5 && innerHeight >= 650;
    const preferredHit = roomy ? 56 : 48;
    const widthStep = (width - preferredHit) / Math.max(1, p.width - 1);
    const heightStep = p.height > 5 ? (innerHeight>=650?46:30) : innerHeight < 650 ? 36 : roomy ? 56 : 46;
    const preferredStep = Math.max(preferredHit / 2, Math.min(widthStep, heightStep));
    let step = preferredStep, hit = preferredHit;
    if (this.playArea.parentElement!.classList.contains('is-solving')) {
      const gap = parseFloat(getComputedStyle(this.playArea).rowGap);
      const toolsMargin = parseFloat(getComputedStyle(this.tools).marginTop);
      const height = this.playArea.clientHeight - this.note.offsetHeight - this.trayViewport.offsetHeight
        - this.tools.offsetHeight - toolsMargin - 3 * gap;
      if ((p.width - 1) * step + hit > width || (p.height - 1) * step + hit > height) {
        // Packed cells use non-overlapping targets and the same pitch on both axes.
        // Keep a readable minimum when an unusually small viewport still needs panning.
        step = Math.max(18, Math.min(preferredStep, width / p.width, (height - 2) / p.height));
        hit = step;
      }
    }
    const geometry = {'--step': `${step}px`, '--hit': `${hit}px`, '--w': String(p.width), '--h': String(p.height)};
    if (Object.entries(geometry).every(([key, value]) => this.board.style.getPropertyValue(key) === value)) return;
    this.cancel();
    this.ghost.style.setProperty('--landing-size', `${Math.min(40, Math.round(step * .82))}px`);
    this.ghost.style.setProperty('--landing-clearance', `${step / 2 + 3}px`);
    this.board.classList.toggle('is-packed', hit === step && hit !== preferredHit);
    for (const [key, value] of Object.entries(geometry)) this.board.style.setProperty(key, value);
  };
  dispose():void{this.suspend();this.boardSize.disconnect();this.tray.removeEventListener('scroll',this.updateTrayButtons);this.trayPrev.onclick=this.trayNext.onclick=null;document.removeEventListener('pointerdown',this.down);document.removeEventListener('pointermove',this.move);document.removeEventListener('pointerup',this.up);document.removeEventListener('pointercancel',this.pointerCancel);document.removeEventListener('lostpointercapture',this.pointerCancel);document.removeEventListener('click',this.click,true);document.removeEventListener('scroll',this.scroll,true);window.removeEventListener('resize',this.resize);window.removeEventListener('blur',this.cancel);}
}
