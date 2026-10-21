// Text contrast preflight for settled local fixtures. Gradients, imagery and
// backdrop filters still require screenshot review. Disabled controls and hidden
// entrance animations are excluded; this is not a complete accessibility audit.
export async function darkTextIssues(page) {
 return page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const parse=value=>{if(value&&!value.startsWith('rgb')&&value!=='transparent'){ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const c=ctx.getImageData(0,0,1,1).data;return [c[0],c[1],c[2],c[3]/255]}const m=value?.match(/[\d.]+/g)?.map(Number);return m?.length>=3?[m[0],m[1],m[2],m[3]??1]:[0,0,0,0]};
  const blend=(a,b)=>[a[0]*a[3]+b[0]*(1-a[3]),a[1]*a[3]+b[1]*(1-a[3]),a[2]*a[3]+b[2]*(1-a[3]),1];
  const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
  const background=e=>{const layers=[];let uncertain=false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.backgroundImage!=='none')uncertain=true;const c=parse(s.backgroundColor);layers.push(c);if(c[3]>=.999)break}let c=[255,255,255,1];for(const l of layers.reverse())c=blend(l,c);return {color:c,uncertain}};
  return [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,label,span,strong,b,small,td,th,legend,summary,input,textarea,select,li')].flatMap(e=>{
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.right<=0||r.left>=innerWidth||r.width<2||r.height<2||s.visibility==='hidden'||!e.getClientRects().length||e.closest('[aria-hidden=true],.gm-style,[hidden],script,style')||e.closest(':disabled,[aria-disabled=true]')||Number(s.opacity)===0)return [];
   let text=[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim(),ink=parse(s.color),kind='text';
   if(e.matches('input,textarea')){if(e.type==='checkbox'||e.type==='radio'||e.type==='hidden')return [];text=e.value||e.placeholder;if(!e.value){ink=parse(getComputedStyle(e,'::placeholder').color);kind='placeholder'}}
   if(!text)return [];const bg=background(e);let opacity=1;for(let p=e;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);if(opacity<.01||((r.top>=innerHeight||r.bottom<=0)&&opacity<.95))return [];ink[3]*=opacity;
   const ratio=contrast(blend(ink,bg.color),bg.color),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700),required=large||(e.matches('button')&&e.hasAttribute('aria-label')&&text.length<=2)?3:4.5;
   if(ratio>=required)return [];
   return [{text:text.slice(0,120),tag:e.tagName,class:e.className,kind,ratio:+ratio.toFixed(2),required,ink:s.color,background:bg.color.slice(0,3).map(Math.round),uncertain:bg.uncertain,top:Math.round(r.top),font:s.fontSize}];
  });
 });
}
