// Isolated grammar investigation. Not imported by the game or used to admit content.
import assert from 'node:assert/strict';
function side(numbers,ops){
 if(numbers.length!==ops.length+1)throw Error('arity');
 const terms=[{sign:1,value:numbers[0]}];
 for(let i=0;i<ops.length;i++){
  const op=ops[i],b=numbers[i+1];
  if(op==='*'||op==='/'){
   const previous=terms.pop(),a=previous.value,value=op==='*'?a*b:a/b;
   if(!Number.isSafeInteger(value)||value<1||value>99)throw Error('intermediate');
   terms.push({...previous,value});
  }else terms.push({sign:op==='+'?1:-1,value:b});
 }
 const result=terms.reduce((a,b)=>a+b.sign*b.value,0);
 if(result<1||result>99)throw Error('result');
 return result;
}
const positive=[[[2,3,4],['+','*'],14],[[12,3,2],['/','*'],8],[[9,3,2],['-','-'],4],[[9,3,2],['-','+'],8],[[9,3,2],['-','*'],3]];
positive.forEach(([numbers,ops,expected])=>assert.equal(side(numbers,ops),expected));
for(const [numbers,ops] of [[[4,3],['/']],[[2,3],['-']],[[20,6,30],['*','-']]])assert.throws(()=>side(numbers,ops));
assert.equal(side([2,3],['+']),side([9,4],['-']));
console.log(JSON.stringify({status:'PASS',controls:9,scope:'Own precedence/left-association and positive integer bounds model. New AST, domain and proof budgets require a separate specification.'},null,2));
