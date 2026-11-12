import {setupCamera} from './controls.mjs';
import {snow} from './snow.mjs';
import {onFrame,pauseOffscreen} from './frames.mjs';
import {iso,extrude,roundedPlan,depthOf} from '../kit/iso-kit.mjs';
import {cityTraffic,sample} from './routes.mjs';
const P=JSON.parse(document.querySelector('#city-config').textContent).projection;
const stage=document.querySelector('.city-stage'),scene=document.querySelector('#city-scene');
const traffic=cityTraffic();
// Cars are drawn on their own canvas above the map. The city SVG is static, so the browser
// rasterises it once; with the cars inside it, every frame re-rasterised the whole visible city.
const canvas=document.createElement('canvas');canvas.className='city-cars';canvas.setAttribute('aria-hidden','true');
stage.append(canvas);
const ctx=canvas.getContext('2d');
// Paint comes from the same CSS custom properties the SVG cars used.
const token=(node,name)=>getComputedStyle(node).getPropertyValue(name).trim();
const paint={halo:token(stage,'--anatomy-halo'),glass:token(stage,'--anatomy-text'),lights:token(stage,'--anatomy-top'),tail:token(stage,'--anatomy-mid'),snow:token(stage,'--snow'),snowShade:token(stage,'--snow-shade')};
const liveries=[...new Set(traffic.cars.map(c=>c.color))].reduce((all,color)=>{
  const probe=document.createElement('i');probe.className='city-car car-'+color;stage.append(probe);
  all[color]={top:token(probe,'--car-top'),side:token(probe,'--car-side'),roof:token(probe,'--car-roof')};
  probe.remove();return all;
},{});
const cars=traffic.cars.map(data=>({data,livery:liveries[data.color],visible:false,depth:0,x:0,y:0,shape:null}));
// Buildings, trees and props never move and stay in their built far-to-near order. Their outlines
// are kept so a car can be hidden behind every object that stands nearer to the camera.
const props=[...scene.children].map(node=>{const b=node.getBBox();return {node,depth:+node.dataset.depth,x0:b.x,y0:b.y,x1:b.x+b.width,y1:b.y+b.height,shape:null};});
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
// An object's silhouette pieces, read from its SVG paths the first time a car comes near it.
function shapeOf(prop){
  if(prop.shape)return prop.shape;
  const cuts=[];
  for(const node of prop.node.querySelectorAll('.iso-fill,.cone-side,.xmas-star,.snow-cut,.street-light>.iso-line')){
    const d=node.getAttribute('d'),points=[];let x=0,y=0;
    // Built paths use absolute M/L and relative l segments.
    for(const [,op,a,b] of d.matchAll(/([MLl])(-?\d*\.?\d+) ?(-?\d*\.?\d+)/g)){if(op==='l'){x+=+a;y+=+b;}else{x=+a;y=+b;}points.push([x,y]);}
    cuts.push({shape:new Path2D(d),solid:!node.classList.contains('iso-line'),hull:hullOf(points)});
  }
  for(const c of prop.node.querySelectorAll('circle')){
    const cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy'),r=+c.getAttribute('r'),shape=new Path2D();
    shape.arc(cx,cy,r,0,Math.PI*2);cuts.push({shape,solid:true,hull:hullOf([[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]])});
  }
  return prop.shape={cuts,weight:prop.node.querySelector('.tree')?.4:.55};
}
function nearerFrom(depth){let lo=0,hi=props.length;while(lo<hi){const mid=(lo+hi)>>1;if(props[mid].depth<=depth)lo=mid+1;else hi=mid;}return lo;}
const bodyRing=roundedPlan({x:-5.5,y:-2.5,w:11,d:5,r:1.2},2);
const cabinRing=roundedPlan({x:-3.2,y:-1.9,w:5.8,d:3.8,r:.6},2);
const shadowRing=roundedPlan({x:-5.1,y:-2,w:11.4,d:5.3,r:1.4},2);
// Snow carried on the roof, bonnet and boot.
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
    [path(projected(shadowRing,.12)),'halo',.2],[body.fill,'side',1],[body.top,'top',1],[body.outline,'edge',1],
    [cabin.fill,'side',1],[cabin.top,'roof',1],
    [quads([[[1.1,-1.7],[2.2,-1.7],[2.2,1.7],[1.1,1.7]],[[-2.8,-1.65],[-1.9,-1.65],[-1.9,1.65],[-2.8,1.65]]],3.9),'glass',1],
    [quads([[[4.7,-2.1],[5.25,-2.1],[5.25,-1.2],[4.7,-1.2]],[[4.7,1.2],[5.25,1.2],[5.25,2.1],[4.7,2.1]]],2.48),'lights',1],
    [quads([[[-5.25,-2.1],[-4.8,-2.1],[-4.8,-1.2],[-5.25,-1.2]],[[-5.25,1.2],[-4.8,1.2],[-4.8,2.1],[-5.25,2.1]]],2.48),'tail',1],
    [path(projected(bonnetSnow,2.47))+path(projected(bootSnow,2.47)),'snowShade',1],[path(projected(bonnetSnow,2.72))+path(projected(bootSnow,2.68)),'snow',1],
    [path(projected(roofSnow,3.9)),'snowShade',1],[path(projected(roofSnow,4.3)),'snow',1]
  ].map(([d,colour,alpha])=>({shape:new Path2D(d),colour,alpha}));
  const hull=hullOf([...projected(shadowRing,.12),...projected(bodyRing,.65),...projected(bodyRing,2.45),...projected(cabinRing,3.85),...projected(roofSnow,4.3)].map(([x,y])=>[x-ORIGIN[0],y-ORIGIN[1]]));
  return shapes[key]={parts,hull,x0:Math.min(...hull.xs)-SLACK,y0:Math.min(...hull.ys)-SLACK,x1:Math.max(...hull.xs)+SLACK,y1:Math.max(...hull.ys)+SLACK};
}
let view=null,scale=1,dpr=1,clock=0;
function place(car){
  const state=sample(traffic.loops[car.data.loop],car.data.offset+clock*car.data.speed);
  car.depth=depthOf([state.x,state.y,0],P);
  const [sx,sy]=iso([state.x,state.y,0],P);
  // Off-screen cars are skipped entirely.
  car.visible=sx>view.x-30&&sx<view.x+view.width+30&&sy>view.y-30&&sy<view.y+view.height+30;
  if(car.visible){car.x=sx;car.y=sy;car.shape=shapeAt(state.angle);}
}
function draw(){
  if(!view)return;
  const k=scale*dpr,left=-view.x*k,top=-view.y*k;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineJoin='round';
  for(const car of cars)place(car);
  // Far to near: paint a car, then cut away whatever stands in front of it. A nearer car painted
  // later is untouched by that cut, so cars and objects interleave exactly as a depth sort would.
  for(const car of cars.filter(c=>c.visible).sort((a,b)=>a.depth-b.depth)){
    const {shape,livery}=car;
    ctx.setTransform(k,0,0,k,left+(car.x-ORIGIN[0])*k,top+(car.y-ORIGIN[1])*k);
    ctx.lineCap='butt';ctx.lineWidth=.35/scale;
    for(const part of shape.parts){
      ctx.globalAlpha=part.alpha;
      if(part.colour==='edge'){ctx.strokeStyle=livery.side;ctx.stroke(part.shape);}
      else{ctx.fillStyle=livery[part.colour]??paint[part.colour];ctx.fill(part.shape);}
    }
    const x0=car.x+shape.x0,y0=car.y+shape.y0,x1=car.x+shape.x1,y1=car.y+shape.y1;
    let cutting=false;
    for(let i=nearerFrom(car.depth);i<props.length;i++){
      const prop=props[i];if(prop.x0>x1||prop.x1<x0||prop.y0>y1||prop.y1<y0)continue;
      const {cuts,weight}=shapeOf(prop);
      for(const cut of cuts){
        if(!touching(shape.hull,car.x,car.y,cut.hull))continue;
        if(!cutting){cutting=true;ctx.setTransform(k,0,0,k,left,top);ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';}
        ctx.lineWidth=weight/scale;
        if(cut.solid)ctx.fill(cut.shape);
        ctx.stroke(cut.shape);
      }
    }
    if(cutting)ctx.globalCompositeOperation='source-over';
  }
}
// Called by the camera on every move and resize, in the same task that moves the map.
function onView(box,nextScale){
  view=box;scale=nextScale;dpr=Math.min(3,devicePixelRatio||1);
  const w=Math.round(stage.clientWidth*dpr),h=Math.round(stage.clientHeight*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  draw();
}
setupCamera(stage,onView);
pauseOffscreen(stage);
onFrame(dt=>{clock+=Math.min(dt,.25);draw();});
snow(stage);
