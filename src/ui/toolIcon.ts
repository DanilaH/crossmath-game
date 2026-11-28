/** Own Rubik numerals and linework. Theme roles provide contrast without raster filters. */
export function toolIcon(name:string):SVGSVGElement {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  svg.classList.add('tool-icon');
  const path=document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');
  path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
  path.setAttribute('d',name==='sort'?'M18 4v16m-3-3 3 3 3-3':name==='undo'?'m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14':'M4 15v6h16v-6M12 3v13m-4-4 4 4 4-4');
  svg.append(path);
  if(name==='sort')for(const [digit,y] of [['1','9'],['9','21']]){
    const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x','3');text.setAttribute('y',y!);
    text.setAttribute('fill','currentColor');text.setAttribute('stroke','none');text.setAttribute('font-family','Rubik, sans-serif');text.setAttribute('font-size','11');text.setAttribute('font-weight','750');text.textContent=digit!;svg.append(text);
  }
  return svg;
}
