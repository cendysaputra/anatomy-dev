import {iso,axisVector,translateAlong} from '../kit/iso-kit.mjs';
import {displacement} from './motion.mjs';
import {labels,labelOpacity,arrangeLabels} from './labels.mjs';
import {createTyping,canType} from './typing.mjs';
const section=document.querySelector('.keyboard-scroll');
const stage=document.querySelector('.keyboard-stage');
const header=document.querySelector('.site-header');
const projection=JSON.parse(stage.dataset.projection);
const groups=[...stage.querySelectorAll('[data-layer]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const svg=stage.querySelector('.iso-svg');
const annotations=labels.map(label=>({...label,node:stage.querySelector(`[data-label="${label.id}"]`),leader:stage.querySelector(`[data-leader="${label.id}"]`)}));
let layout=null;
function measureLabels(){
 const rect=stage.getBoundingClientRect(),matrix=svg.getScreenCTM();
 if(!matrix)return;
 layout={height:rect.height,matrix:{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,e:matrix.e-rect.left,f:matrix.f-rect.top},items:annotations.map(l=>({...l,edge:l.side==='left'?l.node.offsetLeft+l.node.offsetWidth:l.node.offsetLeft}))};
}
function drawLabels(){
 if(!layout)return;
 const {matrix:m}=layout;
 const items=layout.items.map(l=>{
  const delta=displacement(l.layer,current);
  const [x,y]=iso(l.at.map((v,i)=>v+delta[i]),projection);
  return {...l,x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};
 });
 for(const side of ['left','right']){
  const visible=items.filter(l=>l.side===side);
  const arranged=arrangeLabels(visible,layout.height);
  for(const l of arranged){
   const anchor=items.find(item=>item.id===l.id),opacity=labelOpacity(l.layer,current);
   l.node.style.top=`${l.y}px`;l.node.style.opacity=opacity;
   l.node.setAttribute('aria-hidden',String(opacity<.5));
   l.leader.setAttribute('opacity',opacity);
   const elbow=l.edge+(side==='left'?18:-18);
   l.leader.querySelector('path').setAttribute('d',`M${l.edge} ${l.y}H${elbow}L${anchor.x} ${anchor.y}`);
   const dot=l.leader.querySelector('circle');dot.setAttribute('cx',anchor.x);dot.setAttribute('cy',anchor.y);
  }
 }
}
const keyNodes=new Map([...svg.querySelectorAll('[data-key]')].map(el=>[Number(el.dataset.key),el]));
const [pressX,pressY]=axisVector(projection,[0,0,-2.2]);
const typing=createTyping(keyNodes,[pressX,pressY],running=>{section.dataset.typing=String(running)});
let target=0,current=0,frame=0,start=0,distance=1;
function syncTyping(){
 if(canType({target,current,reduced:reduced.matches,hidden:document.hidden}))typing.start();
 else typing.stop();
}
function draw(){
 current=reduced.matches?target:current+(target-current)*.14;
 if(Math.abs(target-current)<.0001)current=target;
 for(const el of groups)el.setAttribute('transform',translateAlong(projection,displacement(el.dataset.layer,current)));
 section.dataset.progress=current.toFixed(4);
 drawLabels();
 syncTyping();
 frame=current===target?0:requestAnimationFrame(draw);
}
function update(){target=Math.max(0,Math.min(1,(scrollY-start)/distance));syncTyping();if(!frame)frame=requestAnimationFrame(draw)}
function measure(){
 const mobile=matchMedia('(max-width:900px)').matches;
 const top=mobile?header.getBoundingClientRect().height+24:16;
 document.documentElement.style.setProperty('--keyboard-top',`${top}px`);
 start=section.getBoundingClientRect().top+scrollY-top;
 distance=Math.max(1,section.offsetHeight-stage.offsetHeight);
 measureLabels();
 update();
}
addEventListener('scroll',update,{passive:true});
document.addEventListener('visibilitychange',syncTyping);
addEventListener('resize',measure);
reduced.addEventListener('change',update);
new ResizeObserver(measure).observe(header);
measure();

document.fonts?.ready.then(measure);
