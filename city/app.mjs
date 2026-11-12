import {setupCamera} from './controls.mjs';
import {snow} from './snow.mjs';
import {cityMap} from './map.mjs';
import {onFrame,pauseOffscreen} from './frames.mjs';
import {iso,extrude,roundedPlan,depthOf} from '../kit/iso-kit.mjs';
import {cityTraffic,sample} from './routes.mjs';
// Scene data is built ahead of time (see build.mjs): the projection, and for every object its
// depth, bounds and the outlines that can hide a car.
const scene=await (await fetch('/city/props.json')).json();
const P=scene.projection;
const stage=document.querySelector('.city-stage'),layer=stage.querySelector('.city-map');
const traffic=cityTraffic();
// Cars are drawn on their own canvas above the map, so the map itself never has to be redrawn.
const canvas=document.createElement('canvas');canvas.className='city-cars';canvas.setAttribute('aria-hidden','true');
stage.append(canvas);
const ctx=canvas.getContext('2d');
// Paint comes from the same CSS custom properties the SVG cars used.
const token=(node,name)=>getComputedStyle(node).getPropertyValue(name).trim();
const paint={halo:token(stage,'--anatomy-halo'),glass:token(stage,'--anatomy-text'),lights:token(stage,'--anatomy-top'),tail:token(stage,'--anatomy-mid'),snow:token(stage,'--snow'),snowShade:token(stage,'--snow-shade'),beam:token(stage,'--car-beam'),lights:'#fff6d6',tail:'#ff4a3a'};
const liveries=[...new Set(traffic.cars.map(c=>c.color))].reduce((all,color)=>{
  const probe=document.createElement('i');probe.className='city-car car-'+color;stage.append(probe);
  all[color]={top:token(probe,'--car-top'),side:token(probe,'--car-side'),roof:token(probe,'--car-roof')};
  probe.remove();return all;
},{});
const cars=traffic.cars.map(data=>({data,livery:liveries[data.color],visible:false,depth:0,x:0,y:0,shape:null}));
// Buildings, trees and props never move and stay in their built far-to-near order. Their outlines
// are kept so a car can be hidden behind every object that stands nearer to the camera.
const props=scene.props.map(data=>({data,depth:data.z,x0:data.b[0],y0:data.b[1],x1:data.b[2],y1:data.b[3],shape:null}));
// Convex hull of a point set with unit edge normals, for exact overlap tests.
function hullOf(points){
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  const ring=lower.slice(0,-1).concat(upper.slice(0,-1)),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),nx=[],ny=[];
  ring.forEach(([x,y],i)=>{const [bx,by]=ring[(i+1)%ring.length],length=Math.hypot(bx-x,by-y)||1;nx.push((by-y)/length);ny.push((x-bx)/length);});
  return {xs,ys,nx,ny};
}
// Separating-axis test between hull a moved by (ox,oy) and hull b. SLACK covers edge strokes.
const SLACK=1;
function touching(a,ox,oy,b){
  for(const hull of [a,b])for(let i=0;i<hull.nx.length;i++){
    const nx=hull.nx[i],ny=hull.ny[i];let alo=Infinity,ahi=-Infinity,blo=Infinity,bhi=-Infinity;
    for(let j=0;j<a.xs.length;j++){const t=(a.xs[j]+ox)*nx+(a.ys[j]+oy)*ny;if(t<alo)alo=t;if(t>ahi)ahi=t;}
    for(let j=0;j<b.xs.length;j++){const t=b.xs[j]*nx+b.ys[j]*ny;if(t<blo)blo=t;if(t>bhi)bhi=t;}
    if(alo>bhi+SLACK||blo>ahi+SLACK)return false;
  }
  return true;
}
// An object's silhouette pieces, turned into paths the first time a car comes near it.
function shapeOf(prop){
  if(prop.shape)return prop.shape;
  const cuts=[];
  for(const [d,how] of prop.data.c){
    const points=[];let x=0,y=0;
    // Built paths use absolute M/L and relative l segments.
    for(const [,op,a,b] of d.matchAll(/([MLl])(-?\d*\.?\d+) ?(-?\d*\.?\d+)/g)){if(op==='l'){x+=+a;y+=+b;}else{x=+a;y=+b;}points.push([x,y]);}
    cuts.push({shape:new Path2D(d),solid:!!(how&1),edged:!!(how&2),hull:hullOf(points)});
  }
  for(const [cx,cy,r] of prop.data.o??[]){
    const shape=new Path2D();shape.arc(cx,cy,r,0,Math.PI*2);
    cuts.push({shape,solid:true,edged:false,hull:hullOf([[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]])});
  }
  return prop.shape={cuts,weight:prop.data.w};
}
function nearerFrom(depth){let lo=0,hi=props.length;while(lo<hi){const mid=(lo+hi)>>1;if(props[mid].depth<=depth)lo=mid+1;else hi=mid;}return lo;}
const bodyRing=roundedPlan({x:-5.5,y:-2.5,w:11,d:5,r:1.2},2);
const cabinRing=roundedPlan({x:-3.2,y:-1.9,w:5.8,d:3.8,r:.6},2);
const shadowRing=roundedPlan({x:-5.1,y:-2,w:11.4,d:5.3,r:1.4},2);
// Snow carried on the roof, bonnet and boot.
// Headlight beams on the road ahead: a wide faint fan and a brighter core.
const BEAM=[[5.2,-2.2],[15,-4.4],[16.5,0],[15,4.4],[5.2,2.2]],BEAM_CORE=[[5.2,-1.9],[10.5,-2.9],[11.5,0],[10.5,2.9],[5.2,1.9]];
const roofSnow=roundedPlan({x:-1.75,y:-1.6,w:2.7,d:3.2,r:1},2),bonnetSnow=roundedPlan({x:2.8,y:-1.7,w:1.7,d:3.4,r:.7},2),bootSnow=roundedPlan({x:-4.6,y:-1.6,w:1.2,d:3.2,r:.5},2);
const path=points=>points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join('')+'Z';
// The projection is affine, so a car's outline depends only on its heading; moving it is a plain
// translation. Shapes are built once per half-degree of heading at the world origin and shared by
// every car, instead of re-extruding every car on every frame.
const HEADINGS=720,ORIGIN=iso([0,0,0],P),shapes=new Array(HEADINGS);
function shapeAt(angle){
  const key=((Math.round(angle/(Math.PI*2)*HEADINGS)%HEADINGS)+HEADINGS)%HEADINGS;
  if(shapes[key])return shapes[key];
  const a=key/HEADINGS*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
  const rotate=([x,y])=>[x*c-y*s,x*s+y*c];
  const projected=(points,z)=>points.map(p=>{const [x,y]=rotate(p);return iso([x,y,z],P);});
  const quads=(list,z)=>list.map(q=>path(projected(q,z))).join('');
  const body=extrude(bodyRing.map(rotate),.65,1.8,P),cabin=extrude(cabinRing.map(rotate),2.45,1.4,P);
  // [path, colour, alpha] in paint order; the body outline is the only stroked part.
  const parts=[
    [path(projected(BEAM,.14)),'beam',.2],[path(projected(BEAM_CORE,.14)),'beam',.32],
    [path(projected(shadowRing,.12)),'halo',.3],[body.fill,'side',1],[body.top,'top',1],[body.outline,'edge',1],
    [cabin.fill,'side',1],[cabin.top,'roof',1],
    [quads([[[1.1,-1.7],[2.2,-1.7],[2.2,1.7],[1.1,1.7]],[[-2.8,-1.65],[-1.9,-1.65],[-1.9,1.65],[-2.8,1.65]]],3.9),'glass',1],
    [quads([[[4.7,-2.1],[5.25,-2.1],[5.25,-1.2],[4.7,-1.2]],[[4.7,1.2],[5.25,1.2],[5.25,2.1],[4.7,2.1]]],2.48),'lights',1],
    [quads([[[-5.25,-2.1],[-4.8,-2.1],[-4.8,-1.2],[-5.25,-1.2]],[[-5.25,1.2],[-4.8,1.2],[-4.8,2.1],[-5.25,2.1]]],2.48),'tail',1],
    [path(projected(bonnetSnow,2.47))+path(projected(bootSnow,2.47)),'snowShade',1],[path(projected(bonnetSnow,2.72))+path(projected(bootSnow,2.68)),'snow',1],
    [path(projected(roofSnow,3.9)),'snowShade',1],[path(projected(roofSnow,4.3)),'snow',1]
  ].map(([d,colour,alpha])=>({shape:new Path2D(d),colour,alpha}));
  const hull=hullOf([...projected(shadowRing,.12),...projected(bodyRing,.65),...projected(bodyRing,2.45),...projected(cabinRing,3.85),...projected(roofSnow,4.3),...projected(BEAM,.14)].map(([x,y])=>[x-ORIGIN[0],y-ORIGIN[1]]));
  const room=[...projected([[11,-6],[11,6],[-8.6,-5],[-8.6,5]],2.48),...projected([[5.3,0]],8.5)].map(([x,y])=>[x-ORIGIN[0],y-ORIGIN[1]]),xs=[...hull.xs,...room.map(p=>p[0])],ys=[...hull.ys,...room.map(p=>p[1])];
  const lamps=[...projected([[5.3,-1.65],[5.3,1.65]],2.48).map(([x,y])=>({x,y,tone:4,size:5.5})),...projected([[-5.3,-1.65],[-5.3,1.65]],2.48).map(([x,y])=>({x,y,tone:5,size:3.2}))];
  return shapes[key]={key,parts,lamps,hull,x0:Math.min(...xs)-SLACK,y0:Math.min(...ys)-SLACK,x1:Math.max(...xs)+SLACK,y1:Math.max(...ys)+SLACK};
}
// Christmas-tree lights twinkle on this canvas rather than in the SVG, so the map never repaints.
// Each decorated tree becomes a group of glows placed over its baubles and star.
const GLOWS=['#ff4a4a','#ffd84a','#fff3d0','#ffe27a','#ffe9a8','#ff3b2f'];
const garlands=scene.garlands.map((tree,index)=>{
  const bulbs=tree.bulbs.map(([x,y,tone],i)=>({x,y,tone,size:8,phase:i*2.4+index,rate:1.6+(i%5)*.45}));
  bulbs.push({x:tree.star[0],y:tree.star[1],tone:3,size:24,phase:index,rate:1.1});
  const xs=bulbs.map(b=>b.x),ys=bulbs.map(b=>b.y),x0=Math.min(...xs)-5,y0=Math.min(...ys)-9,x1=Math.max(...xs)+5,y1=Math.max(...ys)+5;
  return {depth:tree.z,bulbs,x:0,y:0,shape:{hull:hullOf([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]),x0,y0,x1,y1}};
});
// One soft dot per colour, redrawn only when the zoom changes.
let glowScale=0,glowSprites=[];
function glowSprite(colour,k){
  const R=Math.max(4,Math.ceil(16*k)),image=document.createElement('canvas');image.width=image.height=R*2;
  const g=image.getContext('2d'),fade=g.createRadialGradient(R,R,0,R,R,R);
  fade.addColorStop(0,'#fff');fade.addColorStop(.14,colour);fade.addColorStop(.45,colour+'55');fade.addColorStop(1,colour+'00');
  g.fillStyle=fade;g.fillRect(0,0,R*2,R*2);
  // Two thin streaks through the centre give the dot a lens-flare sparkle.
  g.globalCompositeOperation='lighter';
  for(const [sx,sy] of [[1,.06],[.06,.8]]){
    const streak=g.createRadialGradient(0,0,0,0,0,R);streak.addColorStop(0,'#ffffffcc');streak.addColorStop(.3,colour+'88');streak.addColorStop(1,colour+'00');
    g.save();g.translate(R,R);g.scale(sx,sy);g.fillStyle=streak;g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fill();g.restore();
  }
  return image;
}
function paintGarland(garland,k,left,top){
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='lighter';
  for(const bulb of garland.bulbs){
    const pulse=.5+.5*Math.sin(clock*bulb.rate+bulb.phase),half=bulb.size*k*(.75+.25*pulse);
    ctx.globalAlpha=.45+.55*pulse;
    ctx.drawImage(glowSprites[bulb.tone],left+bulb.x*k-half,top+bulb.y*k-half,half*2,half*2);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function paintParts(g,shape,livery){
  g.lineJoin='round';g.lineCap='butt';g.lineWidth=.35/scale;
  for(const part of shape.parts){
    g.globalAlpha=part.alpha;
    if(part.colour==='edge'){g.strokeStyle=livery.side;g.stroke(part.shape);}
    else{g.fillStyle=livery[part.colour]??paint[part.colour];g.fill(part.shape);}
  }
  g.globalAlpha=1;
  for(const lamp of shape.lamps)g.drawImage(glowSprites[lamp.tone],lamp.x-lamp.size,lamp.y-lamp.size,lamp.size*2,lamp.size*2);
}
// A car driving straight keeps one of four headings, so it is drawn once per colour into a small
// image and stamped each frame; only cars in the middle of a turn are drawn as paths.
let stampScale=0;const stamps=new Map();
function stampOf(car,k){
  if(stampScale!==k){stampScale=k;stamps.clear();}
  const shape=car.shape,key=shape.key+'/'+car.data.color;let stamp=stamps.get(key);
  if(!stamp){
    stamp=document.createElement('canvas');stamp.width=Math.ceil((shape.x1-shape.x0)*k)+2;stamp.height=Math.ceil((shape.y1-shape.y0)*k)+2;
    const g=stamp.getContext('2d');g.setTransform(k,0,0,k,1-(ORIGIN[0]+shape.x0)*k,1-(ORIGIN[1]+shape.y0)*k);
    paintParts(g,shape,car.livery);stamps.set(key,stamp);
  }
  return stamp;
}
function paintCar(car,k,left,top){
  const shape=car.shape;
  if(shape.key%(HEADINGS/4)===0){
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
    ctx.drawImage(stampOf(car,k),left+(car.x+shape.x0)*k-1,top+(car.y+shape.y0)*k-1);
  }else{
    ctx.setTransform(k,0,0,k,left+(car.x-ORIGIN[0])*k,top+(car.y-ORIGIN[1])*k);
    paintParts(ctx,shape,car.livery);
  }
}
let view=null,scale=1,dpr=1,clock=0;
function place(car){
  const state=sample(traffic.loops[car.data.loop],car.data.offset+clock*car.data.speed);
  car.depth=depthOf([state.x,state.y,0],P);
  const [sx,sy]=iso([state.x,state.y,0],P);
  // Off-screen cars are skipped entirely.
  const edge=MARGIN/scale+30;
  car.visible=sx>view.x-edge&&sx<view.x+view.width+edge&&sy>view.y-edge&&sy<view.y+view.height+edge;
  if(car.visible){car.x=sx;car.y=sy;car.shape=shapeAt(state.angle);}
}
// The canvas overhangs the stage by MARGIN on every side. While the map is being dragged the
// canvas is not redrawn for every pointer event: it is slid along with the map (a free compositor
// move) and redrawn at its normal pace, and the overhang hides the strip a slide would expose.
const MARGIN=96;
let drawn=null,settle=0;
function draw(){
  if(!view)return;
  clearTimeout(settle);settle=0;drawn=view;canvas.style.transform='translate3d(0,0,0)';
  const k=scale*dpr,left=MARGIN*dpr-view.x*k,top=MARGIN*dpr-view.y*k;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineJoin='round';
  if(glowScale!==k){glowScale=k;glowSprites=GLOWS.map(colour=>glowSprite(colour,k));stamps.clear();}
  for(const car of cars)place(car);
  const edge=MARGIN/scale;
  const lit=garlands.filter(g=>g.shape.x1>view.x-edge&&g.shape.x0<view.x+view.width+edge&&g.shape.y1>view.y-edge&&g.shape.y0<view.y+view.height+edge);
  // Far to near: paint a car or a tree's lights, then cut away whatever stands in front of it.
  // Anything nearer painted later is untouched by that cut, so cars, lights and objects
  // interleave exactly as a depth sort would.
  for(const item of [...cars.filter(c=>c.visible),...lit].sort((a,b)=>a.depth-b.depth)){
    const shape=item.shape;
    if(item.bulbs)paintGarland(item,k,left,top);else paintCar(item,k,left,top);
    const x0=item.x+shape.x0,y0=item.y+shape.y0,x1=item.x+shape.x1,y1=item.y+shape.y1;
    let cutting=false;
    for(let i=nearerFrom(item.depth);i<props.length;i++){
      const prop=props[i];if(prop.x0>x1||prop.x1<x0||prop.y0>y1||prop.y1<y0)continue;
      const {cuts,weight}=shapeOf(prop);
      for(const cut of cuts){
        if(!touching(shape.hull,item.x,item.y,cut.hull))continue;
        if(!cutting){cutting=true;ctx.setTransform(k,0,0,k,left,top);ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';}
        ctx.lineWidth=weight/scale;
        if(cut.solid)ctx.fill(cut.shape);
        if(cut.edged)ctx.stroke(cut.shape);
      }
    }
    if(cutting)ctx.globalCompositeOperation='source-over';
  }
}
// Called by the camera on every move and resize, in the same task that moves the map.
function onView(box,nextScale){
  const zoomed=nextScale!==scale;
  view=box;scale=nextScale;map.show(box,scale);dpr=Math.min(1.5,devicePixelRatio||1);
  const cssW=stage.clientWidth+MARGIN*2,cssH=stage.clientHeight+MARGIN*2,w=Math.round(cssW*dpr),h=Math.round(cssH*dpr);
  const resized=canvas.width!==w||canvas.height!==h;
  if(resized){canvas.width=w;canvas.height=h;canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';}
  const dx=drawn?(drawn.x-box.x)*scale:0,dy=drawn?(drawn.y-box.y)*scale:0;
  if(resized||zoomed||!drawn||Math.abs(dx)>MARGIN||Math.abs(dy)>MARGIN){draw();return;}
  canvas.style.transform='translate3d('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px,0)';
  // Redraw shortly even when the frame loop is paused (reduced motion), so the slide settles.
  if(!settle)settle=setTimeout(draw,40);
}
const map=cityMap(layer,scene.world);
setupCamera(stage,layer,scene.world,onView);
pauseOffscreen(stage);
// Cars creep along slowly, so 30 frames a second is plenty and halves the work of this canvas.
onFrame(dt=>{clock+=Math.min(dt,.25);draw();},30);
snow(stage);
// The sidebar can be minimised to a small pill; the choice is remembered on this device.
const menu=document.querySelector('.site-header'),toggle=menu.querySelector('.menu-toggle');
function setMenu(open,remember){
  menu.classList.toggle('is-min',!open);
  toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Kecilkan menu':'Buka menu');
  if(remember)try{localStorage.setItem('city-menu',open?'open':'min');}catch{}
}
let saved=null;try{saved=localStorage.getItem('city-menu');}catch{}
setMenu(saved==='open',false);
toggle.addEventListener('click',()=>setMenu(menu.classList.contains('is-min'),true));
