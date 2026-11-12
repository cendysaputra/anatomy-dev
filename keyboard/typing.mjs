// Coprime stride visits all 104 keys once per cycle, without pressing rows together.
export const typingOrder=Array.from({length:104},(_,i)=>(31+i*37)%104);
export const typingDelay=step=>step%11===10?620:100+(step%4)*27;
export const canType=({target,current,reduced,hidden})=>target===0&&current===0&&!reduced&&!hidden;

export function keyTravel(elapsed){
 const t=Math.max(0,Math.min(1,elapsed/270));
 if(t<.25)return 1-(1-t/.25)**3;
 if(t<.45)return 1;
 return (1-(t-.45)/.55)**2;
}
export function createTyping(keys,[pressX,pressY],onState=()=>{}){
 let running=false,frame=0,step=0,next=0;
 const active=new Map();
 function draw(now){
  if(!running)return;
  if(now>=next){
   const key=keys.get(typingOrder[step%typingOrder.length]);
   if(key)active.set(key,now);
   next=now+typingDelay(step++);
  }
  for(const [key,time] of active){
   const elapsed=now-time;
   if(elapsed>=270){key.removeAttribute('transform');key.removeAttribute('data-pressed');active.delete(key);continue}
   const amount=keyTravel(elapsed);
   key.setAttribute('transform',`translate(${pressX*amount} ${pressY*amount})`);
   key.setAttribute('data-pressed','true');
  }
  frame=requestAnimationFrame(draw);
 }
 return{
  start(){if(running)return;running=true;onState(true);next=performance.now()+420;frame=requestAnimationFrame(draw)},
  stop(){if(!running)return;running=false;onState(false);cancelAnimationFrame(frame);for(const key of active.keys()){key.removeAttribute('transform');key.removeAttribute('data-pressed')}active.clear()},
 };
}
