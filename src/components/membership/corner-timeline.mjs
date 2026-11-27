export const EFFECT_DURATION=6;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function cornerState(t){
  const idle={core:0,rays:0,dust:0,halo:0,rayScale:.65,stage:'Nền sáng'};
  if(t<=0||t>=4)return idle;
  if(t<.75){const p=ease(t/.75);return{core:.57*p,rays:0,dust:0,halo:.125*p,rayScale:.65,stage:'Tích sáng'}}
  if(t<1.55){const p=ease((t-.75)/.8);return{core:.57+.43*p,rays:p,dust:0,halo:.125+.12*p,rayScale:.65+.35*p,stage:'Mở tia'}}
  if(t<1.85)return{core:1,rays:1,dust:0,halo:.245,rayScale:1,stage:'Chói đỉnh'};
  if(t<3.1){const p=ease((t-1.85)/1.25);return{core:1-.67*p,rays:1-.94*p,dust:Math.sin(Math.PI*p)*.8,halo:.245-.16*p,rayScale:1-.24*p,stage:'Tan sáng'}}
  const p=ease((t-3.1)/.9);return{core:.33*(1-p),rays:.06*(1-p),dust:0,halo:.085*(1-p),rayScale:.76-.11*p,stage:'Về trạng thái đầu'};
}
export function effectStage(t){return t<.75?'Tích sáng':t<1.55?'Mở tia':t<1.85?'Chói đỉnh':t<3.1?'Tan sáng':t<4.45?'Về trạng thái đầu':'Sẵn sàng lặp lại'};

export function rayArms(t){return [0,.16,.32].map(delay=>{const age=t-.62-delay;const grow=ease(age/.8),fade=1-ease((t-1.86-delay*.2)/1.3);return {alpha:grow*fade,scale:.58+.42*grow}})}
export function afterShards(t){return [0,1,2,3,4].map(i=>{const age=t-1.92-i*.12;return ease(age/.23)*(1-ease((age-.35)/.95))})}

export function spinRadians(t){return Math.max(0,Math.min(1,t/4))*Math.PI*2}
export function createCornerPicker(random=Math.random){let bag=[],last=-1;return()=>{if(!bag.length){bag=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}if(bag[0]===last)[bag[0],bag[1]]=[bag[1],bag[0]]}last=bag.shift();return last}}
