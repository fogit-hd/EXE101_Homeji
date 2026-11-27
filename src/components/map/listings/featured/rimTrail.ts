import { roundedBorderPoint } from '../../premium-effects/borderPoints'

export function createRimPath(width: number, height: number, radius = 14){
 const r=Math.min(radius,width/2,height/2),length=2*(width+height-4*r)+2*Math.PI*r;
 const count=Math.ceil(length/1.25),step=length/count;
 const points=Array.from({length:count},(_,i)=>{const p=roundedBorderPoint(width,height,r,i/count);return{x:p.x+width/2,y:p.y+height/2}});
 return{length,point(distance: number){const index=((distance/step)%count+count)%count,i=Math.floor(index),t=index-i,a=points[i],b=points[(i+1)%count];return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}};
}

export function paintRimTrail(ctx: CanvasRenderingContext2D, path: ReturnType<typeof createRimPath>, center: number, length = 340, theme: 'light' | 'dark' = 'dark'){
 const pieces=Math.ceil(length/2),step=length/pieces;
 ctx.save();ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';
 const strokes: [number, number, string][] = theme==='light'?[[1.5,.78,'139,103,42'],[.95,1,'224,181,81'],[.4,.95,'255,255,247']]:[[1.4,.35,'232,195,104'],[.7,1,'255,255,242']];
 for(const [width,gain,rgb]of strokes){
  ctx.lineWidth=width;
  for(let i=0;i<pieces;i++){
   const delta=-length/2+i*step,unit=(i+.5)/pieces;
   const alpha=Math.sin(Math.PI*unit)**1.5*gain;
   if(alpha<.002)continue;
   const a=path.point(center+delta),b=path.point(center+delta+step);
   ctx.strokeStyle=`rgba(${rgb},${alpha})`;
   ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
 }
 ctx.restore();
}
