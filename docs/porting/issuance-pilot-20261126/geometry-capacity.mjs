// Independent model of geometry_graph, shape_options and connected line sets; no original puzzle data.
// Exact 7x7 enumeration: add each compatible neighbor to every previously reachable connected set.
// Every connected set admits a connected-prefix ordering. Keys deduplicate line IDs, not solutions.
// 9x9 is a seeded sample, only a lower bound on geometric classes. No numerical assignment/mask/solver.
function geometryCapacity(){
 const canon=lines=>{const coords=[...new Map(lines.flatMap(l=>[l[0],l[2],l[4]]).map(([x,y])=>[`${x},${y}`,[x,y]])).values()];let ks=[];for(let t=0;t<8;t++){const xy=coords.map(([x,y])=>{if(t&1)[x,y]=[y,x];if(t&2)x=-x;if(t&4)y=-y;return [x,y]});const mx=Math.min(...xy.map(v=>v[0])),my=Math.min(...xy.map(v=>v[1]));ks.push(xy.map(([x,y])=>`${x-mx},${y-my}`).sort().join(";"));}return ks.sort()[0]};
 function graph(size){
  const lines=[];for(const [dx,dy] of [[1,0],[0,1]])for(let x=0;x<size-4*dx;x++)for(let y=0;y<size-4*dy;y++)lines.push(Array.from({length:5},(_,i)=>[x+i*dx,y+i*dy]));
  const incompatible=lines.map(()=>new Set()),touches=lines.map(()=>new Set()),key=([x,y])=>`${x},${y}`,sets=lines.map(l=>new Set(l.map(key))),nums=lines.map(l=>new Set([l[0],l[2],l[4]].map(key)));
  for(let i=0;i<lines.length;i++)for(let j=0;j<i;j++){
   const a=lines[i],b=lines[j],sa=sets[i],sb=sets[j],shared=new Set([...sa].filter(v=>sb.has(v)));
   let clash=shared.size>0&&([...shared].some(v=>!nums[i].has(v)||!nums[j].has(v))||((a[0][0]===a[1][0])===(b[0][0]===b[1][0])));
   if(!clash)clash=a.some(v=>!shared.has(key(v))&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const k=key([v[0]+dx,v[1]+dy]);return sb.has(k)&&!shared.has(k)}));
   if(clash){incompatible[i].add(j);incompatible[j].add(i)}else if(shared.size){touches[i].add(j);touches[j].add(i)}
  }
  return {lines,incompatible,touches};
 }
 const {lines,incompatible,touches}=graph(7);
 let level=new Map(lines.map((_,i)=>[String(i),[i]])),levels=[];
 for(let count=1;count<=8;count++){
  if(level.size>200000)throw Error("budget");
  levels.push({equations:count,anchoredLineSets:level.size,d4Shapes:new Set([...level.values()].map(ids=>canon(ids.map(i=>lines[i])))).size});
  if(count===8)break;
  const next=new Map();
  for(const chosen of level.values()){
   const seen=new Set(chosen),front=new Set(chosen.flatMap(i=>[...touches[i]]));
   for(const j of front)if(!seen.has(j)&&chosen.every(i=>!incompatible[i].has(j))){const ids=[...chosen,j].sort((a,b)=>a-b);next.set(ids.join(","),ids);}
  }
  level=next;
 }
 let seed=20261126;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const g=graph(9),sample=[];
 for(const n of [7,8]){
  const shapes=new Set();let success=0;
  for(let i=0;i<10000;i++){
   const chosen=[Math.floor(rng()*g.lines.length)];while(chosen.length<n){
    const available=[...new Set(chosen.flatMap(j=>[...g.touches[j]]))].filter(j=>!chosen.includes(j)&&chosen.every(k=>!g.incompatible[k].has(j)));
    if(!available.length)break;
    chosen.push(available[Math.floor(rng()*available.length)]);
   }
   if(chosen.length===n){success++;shapes.add(canon(chosen.map(i=>g.lines[i])));}
  }
  sample.push({bound:9,equations:n,attempts:10000,connectedCompatibleSuccess:success,d4ShapesLowerBound:shapes.size});
 }
 return {scope:"geometric feasibility only; no values, masks, unique solutions or human difficulty verified",exact7:levels,sample9:sample,seed:20261126};
}
console.log(JSON.stringify(geometryCapacity(),null,2));
