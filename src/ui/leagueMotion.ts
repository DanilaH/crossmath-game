import {RewardReadout} from './rewardReadout';
interface RowSnapshot {top:number;points:number;place:number}
/** Owned projection only: all counters and medals already belong to the committed save. */
export class LeagueMotion {
 private previous:{scope:string;rows:Map<string,RowSnapshot>}|undefined;
 private animations:Animation[]=[];
 private readouts:RewardReadout[]=[];
 private frame:number|undefined;
 capture(root:HTMLElement):void{
  const table=root.querySelector<HTMLElement>('.league-table');
  this.previous=table?{scope:table.dataset.week!,rows:new Map([...table.querySelectorAll<HTMLElement>('.league-row')].map(row=>[row.dataset.opponent!,{top:row.getBoundingClientRect().top,points:Number(row.dataset.points),place:Number(row.dataset.place)}]))}:undefined;
  this.finish();
 }
 play(root:HTMLElement,reduced:boolean):void{
  const table=root.querySelector<HTMLElement>('.league-table');
  if(reduced||!table||this.previous?.scope!==table.dataset.week||document.hidden)return;
  for(const row of table.querySelectorAll<HTMLElement>('.league-row')){
   const before=this.previous!.rows.get(row.dataset.opponent!);if(!before)continue;
   const delta=before.top-row.getBoundingClientRect().top,points=Number(row.dataset.points),place=Number(row.dataset.place);
   if(Math.abs(delta)>1)this.animations.push(row.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'}));
   if(points>before.points){const readout=new RewardReadout(row.querySelector<HTMLElement>('.league-points')!);readout.update(`${table.dataset.week}:${row.dataset.opponent}:${points}`,String(points),{from:before.points,to:points,format:String});this.readouts.push(readout);}
   if(row.dataset.opponent==='self'&&place<before.place)this.animations.push(row.animate([{boxShadow:'0 0 0 0px var(--reward-edge)'},{boxShadow:'0 0 0 4px transparent'}],{duration:850,easing:'ease-out'}));
  }
 }
 reveal(root:HTMLElement,id:string,reduced:boolean):void{
  if(reduced||document.hidden)return;
  this.frame=requestAnimationFrame(()=>{
   this.frame=undefined;const card=[...root.querySelectorAll<HTMLElement>('[data-medal]')].find(n=>n.dataset.medal===id);
   const medal=card?.querySelector<HTMLElement>('.league-medal');if(!medal||!medal.getClientRects().length)return;
   card!.dataset.revealing='true';
   this.animations.push(medal.animate([{transform:'translateY(10px) scale(.65) rotate(-12deg)',opacity:0},{offset:.65,transform:'translateY(-3px) scale(1.08) rotate(3deg)',opacity:1},{transform:'translateY(0) scale(1) rotate(0)',opacity:1}],{duration:780,easing:'cubic-bezier(.16,.8,.2,1)'}));
  });
 }
 finish():void{if(this.frame!==undefined)cancelAnimationFrame(this.frame);this.frame=undefined;this.animations.forEach(a=>a.cancel());this.animations=[];this.readouts.forEach(r=>r.finish());this.readouts=[];}
}
