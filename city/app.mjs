import {setupCamera} from './controls.mjs';
import {snow} from './snow.mjs';
import {iso,extrude,roundedPlan,depthOf} from '../kit/iso-kit.mjs';
import {cityTraffic,sample} from './routes.mjs';
const P=JSON.parse(document.querySelector('#city-config').textContent).projection;
const traffic=cityTraffic(),scene=document.querySelector('#city-scene');
const props=[...scene.querySelectorAll('[data-city-object]')].map(node=>({node,depth:+node.dataset.depth}));
const cars=traffic.cars.map((data,i)=>({data,node:scene.querySelector('[data-car="'+i+'"]'),paths:Object.fromEntries([...scene.querySelector('[data-car="'+i+'"]') .querySelectorAll('[data-car-part]')].map(node=>[node.dataset.carPart,node]))}));
const bodyRing=roundedPlan({x:-5.5,y:-2.5,w:11,d:5,r:1.2},2);
const cabinRing=roundedPlan({x:-3.2,y:-1.9,w:5.8,d:3.8,r:.6},2);
const shadowRing=roundedPlan({x:-5.1,y:-2,w:11.4,d:5.3,r:1.4},2);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const path=points=>points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join('')+'Z';
function drawCar(car,time,view){
  const state=sample(traffic.loops[car.data.loop],car.data.offset+time*car.data.speed);
  car.depth=depthOf([state.x,state.y,0],P);
  // Off-screen cars keep their last shape: no path rebuild, no reorder.
  const [sx,sy]=iso([state.x,state.y,0],P);
  car.visible=sx>view.x-30&&sx<view.x+view.width+30&&sy>view.y-30&&sy<view.y+view.height+30;
  if(!car.visible)return;
  const c=Math.cos(state.angle),s=Math.sin(state.angle);
  const rotate=([x,y])=>[state.x+x*c-y*s,state.y+x*s+y*c];
  const projected=(points,z)=>points.map(p=>{const [x,y]=rotate(p);return iso([x,y,z],P);});
  const body=extrude(bodyRing.map(rotate),.65,1.8,P),cabin=extrude(cabinRing.map(rotate),2.45,1.4,P);
  const parts={
    shadow:path(projected(shadowRing,.12)),side:body.fill,top:body.top,edge:body.outline,
    'cabin-side':cabin.fill,'cabin-top':cabin.top,
    glass:path(projected([[1.1,-1.7],[2.2,-1.7],[2.2,1.7],[1.1,1.7]],3.9))+path(projected([[-2.8,-1.65],[-1.9,-1.65],[-1.9,1.65],[-2.8,1.65]],3.9)),
    lights:path(projected([[4.7,-2.1],[5.25,-2.1],[5.25,-1.2],[4.7,-1.2]],2.48))+path(projected([[4.7,1.2],[5.25,1.2],[5.25,2.1],[4.7,2.1]],2.48)),
    tail:path(projected([[-5.25,-2.1],[-4.8,-2.1],[-4.8,-1.2],[-5.25,-1.2]],2.48))+path(projected([[-5.25,1.2],[-4.8,1.2],[-4.8,2.1],[-5.25,2.1]],2.48))
  };
  for(const [key,d] of Object.entries(parts))car.paths[key].setAttribute('d',d);
}
// Buildings, trees and props never move, so they stay in their built (depth-sorted) order.
// Each frame only the visible cars are slotted in front of the first prop that lies nearer.
const svgEl=scene.ownerSVGElement;
function slot(depth){let lo=0,hi=props.length;while(lo<hi){const mid=(lo+hi)>>1;if(props[mid].depth<=depth)lo=mid+1;else hi=mid;}return lo<props.length?props[lo].node:null;}
function render(time){
  const view=svgEl.cityView||svgEl.viewBox.baseVal;
  for(const car of cars)drawCar(car,time,view);
  const moving=cars.filter(c=>c.visible).sort((a,b)=>b.depth-a.depth);
  const placed=new Map();
  for(const car of moving){const anchor=slot(car.depth),target=placed.has(anchor)?placed.get(anchor):anchor;if(car.node.nextSibling!==target)scene.insertBefore(car.node,target);placed.set(anchor,car.node);}
}
let clock=0,last=0,frame=0,visible=true;
function tick(now){
  frame=0;
  if(document.hidden||!visible||reduced.matches){last=0;return;}
  if(last&&now-last<1000/30){frame=requestAnimationFrame(tick);return;}
  const dt=last?Math.min((now-last)/1000,.25):0;last=now;clock+=dt;render(clock);
  frame=requestAnimationFrame(tick);
}
function run(){if(!frame&&!document.hidden&&visible&&!reduced.matches){last=0;frame=requestAnimationFrame(tick);}}
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();},{rootMargin:'150px'}).observe(scene.ownerSVGElement);
document.addEventListener('visibilitychange',run);
reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
render(0);run();
setupCamera(document.querySelector('.city-stage'));
snow(document.querySelector('.city-stage'));
