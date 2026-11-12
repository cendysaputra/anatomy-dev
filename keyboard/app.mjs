import {translateAlong} from '../kit/iso-kit.mjs';
import {displacement} from './motion.mjs';
const section=document.querySelector('.keyboard-scroll');
const stage=document.querySelector('.keyboard-stage');
const header=document.querySelector('.site-header');
const projection=JSON.parse(stage.dataset.projection);
const groups=[...stage.querySelectorAll('[data-layer]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let target=0,current=0,frame=0,start=0,distance=1;
function draw(){
 current=reduced.matches?target:current+(target-current)*.14;
 if(Math.abs(target-current)<.0001)current=target;
 for(const el of groups)el.setAttribute('transform',translateAlong(projection,displacement(el.dataset.layer,current)));
 section.dataset.progress=current.toFixed(4);
 frame=current===target?0:requestAnimationFrame(draw);
}
function update(){target=Math.max(0,Math.min(1,(scrollY-start)/distance));if(!frame)frame=requestAnimationFrame(draw)}
function measure(){
 const mobile=matchMedia('(max-width:900px)').matches;
 const top=mobile?header.getBoundingClientRect().height+24:16;
 document.documentElement.style.setProperty('--keyboard-top',`${top}px`);
 start=section.getBoundingClientRect().top+scrollY-top;
 distance=Math.max(1,section.offsetHeight-stage.offsetHeight);
 update();
}
addEventListener('scroll',update,{passive:true});
addEventListener('resize',measure);
reduced.addEventListener('change',update);
new ResizeObserver(measure).observe(header);
measure();
