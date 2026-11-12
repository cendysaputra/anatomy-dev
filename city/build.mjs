import {writeFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml,footerHtml} from '../scripts/chrome.mjs';
import {GRID,BLOCKS,cityTraffic} from './routes.mjs';
const HALF=GRID[BLOCKS]+24,SCALE=HALF/216;
// The world grows with the city so a block keeps the same size on screen.
const W=Math.round(1100*SCALE),H=Math.round(660*SCALE),base={x:-HALF,y:-HALF,w:2*HALF,d:2*HALF,r:8};
const P=k.fitProjection([...k.boxCorners(base,-6,0),[-60,-60,64],[60,60,64]],W,H,{pad:30,azimuth:62,elevation:30});
const at=p=>k.iso(p,P),S=(p,o={})=>k.solidSvg(p,{tone:'mid',crease:'lo',...o});
const plan=(x,y,w,d,r=1)=>({x,y,w,d,r});
const slab=(p,z,h)=>S(k.slabOf(p,z,h,P,3,.4));
const top=(p,z=0)=>k.onTop(k.roundedPlan(p,3),z,P,true);
const line=(points,style={})=>k.lineSvg(k.pathOf(points.map(at)),style);
const objects=[];let buildings=0,trees=0;
function add(x,y,body,kind='detail'){objects.push({depth:k.depthOf([x,y,0],P),body,kind});}
function tree(x,y,size=1){trees++;const trunk=S(k.cylinder(x,y,.85*size,1,4*size,P,8));const canopy=S(k.cylinder(x,y,4.3*size,4*size,4*size,P,12))+S(k.cylinder(x,y,3.5*size,8*size,2.2*size,P,12));const cap=`<path class="snow-top" d="${flat(heap(x,y,3*size,3*size,trees),10.2*size+.05)}"/>`;add(x,y,`<path class="tree-shadow" d="${top(plan(x-3+3*size,y-3+3*size,7*size,7*size,3))}"/><g class="tree">${trunk}${canopy}</g>${cap}`,'tree');}
// A cone in the iso camera: its silhouette is the hull of the apex and the base circle;
// the half facing away from the light gets a darker tone.
function hull(pts){pts=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of pts){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of pts.reverse()){while(up.length>1&&cross(up.at(-2),up.at(-1),p)<=0)up.pop();up.push(p);}return lo.slice(0,-1).concat(up.slice(0,-1));}
const poly=pts=>'M'+pts.map(([a,b])=>a.toFixed(1)+' '+b.toFixed(1)).join('L')+'Z';
// Winter: settled snow is built into the static SVG, so it costs nothing while the page runs.
const seeded=seed=>{let s=(Math.imul(seed+11,2654435761))>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
const flat=(points,z)=>poly(points.map(([x,y])=>at([x,y,z])));
// A plan outline pulled inward by uneven amounts, so a snow sheet gets a soft irregular edge.
// Snow never settles in a neat rectangle. The outline follows the plan but is pushed in and out by
// a few overlapping waves: broad swells, smaller lobes and a little fine raggedness, so some
// stretches bulge out bluntly and others are nibbled back.
const waves=next=>[[2+Math.floor(next()*3),.55],[5+Math.floor(next()*4),.34],[11+Math.floor(next()*6),.16],[23+Math.floor(next()*9),.07]].map(([f,a])=>[f,a,next()*Math.PI*2]);
const swell=(shape,t)=>shape.reduce((sum,[f,a,phase])=>sum+Math.sin(t*f+phase)*a,0);
function drifted(p,seed,wobble=1.3){
  const next=seeded(seed),cx=p.x+p.w/2,cy=p.y+p.d/2,corners=k.roundedPlan({...p,r:Math.min(p.r,p.w/2,p.d/2)},5),ring=[];
  // Straight edges get a point every couple of units so they can wander too.
  corners.forEach(([x,y],i)=>{const [bx,by]=corners[(i+1)%corners.length],n=Math.max(1,Math.round(Math.hypot(bx-x,by-y)/2.2));for(let j=0;j<n;j++)ring.push([x+(bx-x)*j/n,y+(by-y)*j/n]);});
  const shape=waves(next);
  return ring.map(([x,y],i)=>{const t=i/ring.length*Math.PI*2,pull=(.45+swell(shape,t))*wobble,dx=cx-x,dy=cy-y,l=Math.hypot(dx,dy)||1;return [x+dx/l*pull,y+dy/l*pull];});
}
// An uneven rounded heap, as plan points: a lumpy outline rather than a clean oval.
function heap(cx,cy,rx,ry,seed,scale=1){const shape=waves(seeded(seed));return Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2,f=(.84+swell(shape,a)*.2)*scale;return [cx+Math.cos(a)*rx*f,cy+Math.sin(a)*ry*f];});}
// A snow sheet with visible thickness: its lower outline in shade, its top in white.
const snowSheet=(p,z,seed,depth=.7)=>{const ring=drifted(p,seed);return `<path class="snow-side snow-cut" d="${flat(ring,z)}"/><path class="snow-top snow-cut" d="${flat(ring,z+depth)}"/>`;};
// Roof snow is not a flat lid: a few soft mounds rise from it, and here and there a blunt tongue
// of snow sags over the two edges we can see.
function roofSnow(p,z,seed){
  const next=seeded(seed+31);let sides='',tops='',tongues='';
  for(let n=2+Math.floor(next()*2);n>0;n--){
    const rx=2.6+next()*3.2,ry=2.4+next()*2.6,cx=p.x+rx+1+next()*Math.max(1,p.w-2*rx-2),cy=p.y+ry+1+next()*Math.max(1,p.d-2*ry-2),rise=.8+next()*.9;
    sides+=flat(heap(cx,cy,rx,ry,seed*13+n),z+.7);tops+=flat(heap(cx,cy,rx,ry,seed*13+n,.74),z+.7+rise);
  }
  const tongue=(point,q,width,drop)=>poly([[-.5,0],[-.5,-.55],[-.3,-.9],[0,-1],[.3,-.9],[.5,-.55],[.5,0]].map(([u,v])=>at(point(q+u*width,z+.5+v*drop))));
  for(let n=1+Math.floor(next()*3);n>0;n--)tongues+=tongue((q,h)=>[p.x+q,p.y+p.d+.7,h],2+next()*(p.w-4),1.6+next()*2.4,.9+next()*1.3);
  for(let n=1+Math.floor(next()*3);n>0;n--)tongues+=tongue((q,h)=>[p.x+p.w+.7,p.y+q,h],2+next()*(p.d-4),1.6+next()*2.4,.9+next()*1.3);
  return snowSheet(p,z,seed)+`<path class="snow-side" d="${sides}"/><path class="snow-top snow-cut" d="${tops}"/><path class="snow-top snow-drip" d="${tongues}"/>`;
}
let snowSides='',snowTops='',lampPools='';
// A thin diamond: with a radial fill it reads as one streak of a lens flare.
const flare=(x,y,rx,ry)=>poly([[x-rx,y],[x,y-ry],[x+rx,y],[x,y+ry]]);
function snowHeap(cx,cy,rx,ry,seed,height=.6){snowSides+=flat(heap(cx,cy,rx,ry,seed),.25);snowTops+=flat(heap(cx,cy,rx,ry,seed,height?.8:1),.25+height);}
function cone(x,y,r,z0,h,kind='cone'){
 const ring=Array.from({length:28},(_,i)=>{const a=i/28*Math.PI*2;return [x+Math.cos(a)*r,y+Math.sin(a)*r];});
 const apex=at([x,y,z0+h]),base=ring.map(([px,py])=>at([px,py,z0]));
 const c=k.depthOf([x,y,0],P),front=ring.map(([px,py],i)=>k.depthOf([px,py,0],P)>c?base[i]:null).filter(Boolean);
 const shade=front.filter(p=>p[0]>=apex[0]).sort((a,b)=>a[0]-b[0]);
 return `<path class="${kind}-side" d="${poly(hull([apex,...base]))}"/>${shade.length>1?`<path class="${kind}-shade" d="${poly([apex,...shade])}"/>`:''}${kind==='cone'?`<path class="cone-edge" d="${poly(hull([apex,...base]))}"/>`:''}`;
}
// A pine for the Christmas parks; the big one at the centre carries baubles and a star.
function pine(x,y,size=1,big=false){
 trees++;
 let body=`<g class="pine-trunk">${S(k.cylinder(x,y,1.1*size,1,3*size,P,10))}</g><g class="pine">`;
 const tiers=3;let z=2.5*size,r=(big?8:4.4)*size,h=(big?11:6.5)*size;
 const baubles=[];
 for(let t=0;t<tiers;t++){
   body+=cone(x,y,r,z,h);
   {const f=t===tiers-1?.5:.68;body+=cone(x,y,r*f,z+h*(1-f),h*f,'snowcone');}
   if(big)for(let a=0;a<12;a++){const ang=a/12*Math.PI*2+t*.5,f=.55,px=x+Math.cos(ang)*r*f,py=y+Math.sin(ang)*r*f;if(k.depthOf([px,py,0],P)>k.depthOf([x,y,0],P)+r*f*.3)baubles.push([px,py,z+h*(1-f)*.95,(a+t)%3]);}
   z+=h*.42;r*=.74;h*=.8;
 }
 const topZ=z-h*.42/.8*.8+h/.8;
 body+='</g>';
 if(big){
   for(const tone of [0,1,2]){const pts=baubles.filter(b=>b[3]===tone).map(b=>at([b[0],b[1],b[2]]));body+=`<g class="bauble bauble-${tone}">${pts.map(([px,py])=>`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.4"/>`).join('')}</g>`;}
   const [sx,sy]=at([x,y,topZ+.5]);body+=`<path class="xmas-star" d="M${sx} ${sy-4.2}L${sx+1.2} ${sy-1.3}L${sx+4} ${sy-1.2}L${sx+1.8} ${sy+.7}L${sx+2.6} ${sy+3.6}L${sx} ${sy+1.9}L${sx-2.6} ${sy+3.6}L${sx-1.8} ${sy+.7}L${sx-4} ${sy-1.2}L${sx-1.2} ${sy-1.3}Z"/>`;
 }
 add(x,y,`<path class="tree-shadow" d="${top(plan(x-2*size,y-2*size,(big?14:8)*size,(big?14:8)*size,4))}"/>${body}`,'tree');
}
// In this orthographic camera a sphere is a plain circle on screen, so the snowman's snowballs
// are round polygons with a shaded gradient; everything else is ordinary kit solids.
const KK=k.cameraOf(P).k;
const disc=(sx,sy,r,n=28)=>poly(Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [sx+Math.cos(a)*r,sy+Math.sin(a)*r];}));
const ball=(x,y,z,r)=>{const [sx,sy]=at([x,y,z]);return `<path class="ball snow-cut" d="${disc(sx,sy,r*KK)}"/>`;};
function snowman(x,y){
  const [mx,my]=at([x,y,26]),[hx,hy]=at([x,y,36.5]),u=[Math.sin(62*Math.PI/180),-Math.cos(62*Math.PI/180)];
  const arm=side=>k.pathOf([[7,27],[13,31],[16,34]].map(([r,z])=>at([x+u[0]*r*side,y+u[1]*r*side,z])))+k.pathOf([[13,31],[15.5,30]].map(([r,z])=>at([x+u[0]*r*side,y+u[1]*r*side,z])));
  let out=`<path class="tree-shadow" d="${top(plan(x-7,y-5,30,26,12),1.1)}"/>`;
  out+=ball(x,y,11,11)+`<path class="twig" d="${arm(1)+arm(-1)}"/>`+ball(x,y,26,8);
  out+=`<path class="coal" d="${[-2.6,.8,4.2].map(dy=>disc(mx,my+dy*KK,.8*KK,10)).join('')}"/>`;
  // Scarf: a red band round the neck with one end hanging down the front.
  const tail=[[.25,31.5],[.6,31.5],[.66,22.5],[.3,22]].map(([a,z])=>at([x+Math.cos(a+.9)*6.1,y+Math.sin(a+.9)*6.1,z]));
  out+=`<g class="scarf">${S(k.cylinder(x,y,5.9,31,2.6,P,20))}</g><path class="scarf-tail" d="${poly(tail)}"/>`;
  out+=ball(x,y,36.5,5.8);
  out+=`<path class="coal" d="${disc(hx-2*KK,hy-1.1*KK,.75*KK,10)+disc(hx+2*KK,hy-1.1*KK,.75*KK,10)+[-2.4,-1.2,0,1.2,2.4].map(dx=>disc(hx+dx*KK,hy+(3.1-Math.abs(dx)*.35)*KK,.38*KK,8)).join('')}"/>`;
  out+=`<path class="carrot" d="${poly([[hx-.2*KK,hy+.1*KK],[hx-.2*KK,hy+1.7*KK],[hx+6.4*KK,hy+1.5*KK]])}"/>`;
  // Santa hat: white brim, red cone, white bobble.
  out+=`<g class="hat-brim">${S(k.cylinder(x,y,5.3,39.8,2,P,20))}</g>`+cone(x,y,4.7,41.6,9.5,'hatcone')+ball(x,y,51.6,2);
  add(x,y,out,'detail');
}
// A gilded reindeer statue on a stone plinth, with a red nose that glows.
function reindeer(x,y,s=1.55){
  const box=(dx,dy,w,d,z,h,r=.8)=>slab(plan(x+dx*s,y+dy*s,w*s,d*s,r),1+z*s,h*s);
  const antler=side=>k.pathOf([[4.6,1.1,22],[3.6,2.4,25.5],[2.2,3.4,29.5]].map(([dx,dy,z])=>at([x+dx*s,y+dy*side*s,1+z*s])))
    +k.pathOf([[3.6,2.4,25.5],[5.6,3,27.5]].map(([dx,dy,z])=>at([x+dx*s,y+dy*side*s,1+z*s])))
    +k.pathOf([[2.9,2.9,27.5],[1,2.6,28.6]].map(([dx,dy,z])=>at([x+dx*s,y+dy*side*s,1+z*s])));
  const [nx,ny]=at([x+10*s,y,1+20.2*s]);
  let out=`<path class="tree-shadow" d="${top(plan(x-9*s,y-4*s,22*s,13*s,5),1.1)}"/><g class="plinth">${box(-9.5,-4.6,19,9.2,0,2.2,1.4)}</g><g class="statue">`;
  out+=box(-6,-2.7,1.6,1.6,2.2,6.2)+box(4,-2.7,1.6,1.6,2.2,6.2)+box(-6,1.1,1.6,1.6,2.2,6.2)+box(4,1.1,1.6,1.6,2.2,6.2);
  out+=box(-8,-.8,1.3,1.6,11.4,1.8)+box(-7,-2.8,13.6,5.6,8.2,5,1.5)+box(3.7,-1.5,3,3,13,5.8)+box(3.3,-1.8,6.6,3.6,18.6,3.4,1.2);
  out+=`</g><path class="antler" d="${antler(-1)+antler(1)}"/><circle class="nose-glow" cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${(5*s*KK).toFixed(1)}"/><path class="rudolph" d="${disc(nx,ny,1.15*s*KK,14)}"/>`;
  add(x,y,out,'detail');
}
function building(x,y,w,d,h,seed){
 buildings++;
 const shell=plan(x,y,w,d,1.1),setback=seed%4===0;
 let out=`<path class="building-shadow" d="${top(plan(x+4,y+5,w+2,d+2,1.3),.2)}"/>`;
 out+=slab(shell,1,setback?5:h);
 const tower=setback?plan(x+2.5,y+2.5,w-5,d-5,1):shell;
 if(setback)out+=snowSheet(k.insetPlan({...shell,r:3},.6),6,seed*3+1,.5)+slab(tower,6,h-5);
 let lit='',dark='';const glowing=seeded(seed+900);
 const pane=d=>{if(glowing()<.52)lit+=d;else dark+=d;};
 for(let z=6;z<h-2;z+=5){
   for(let q=3;q<tower.w-2;q+=5)pane(k.pathOf([at([tower.x+q,tower.y+tower.d,z]),at([Math.min(tower.x+q+2.6,tower.x+tower.w-2),tower.y+tower.d,z])]));
   for(let q=3;q<tower.d-2;q+=5)pane(k.pathOf([at([tower.x+tower.w,tower.y+q,z]),at([tower.x+tower.w,Math.min(tower.y+q+2.6,tower.y+tower.d-2),z])]));
 }
 out+=`<path class="building-windows" d="${dark}"/><path class="window-glow" d="${lit}"/><path class="building-windows window-lit" d="${lit}"/>`;
 // Fairy lights strung under the roof edge of every other building, on the two faces we can see.
 if(seed%2===0){
   const bulbs=['','','',''];let n=seed;
   const bulb=(x,y)=>{const [px,py]=at([x,y,h-1.4]);bulbs[n++%4]+='M'+px.toFixed(1)+' '+py.toFixed(1)+'l0 0';};
   for(let q=1.5;q<=tower.w-1.5;q+=3)bulb(tower.x+q,tower.y+tower.d);
   for(let q=tower.d-3;q>=1.5;q-=3)bulb(tower.x+tower.w,tower.y+q);
   out+=bulbs.map((d,i)=>`<path class="fairy-glow fairy-${i}" d="${d}"/>`).join('')+bulbs.map((d,i)=>`<path class="fairy fairy-${i}" d="${d}"/>`).join('')+`<path class="fairy-core" d="${bulbs.join('')}"/>`;
 }
 out+=roofSnow(k.insetPlan({...tower,r:3.5},.7),h+1,seed*3+2);
 if(seed%3===0){out+=`<g class="roof-machine">${slab(plan(tower.x+3,tower.y+3,5,7,1),h+1,2.2)}</g>`;out+=line([[tower.x+4,tower.y+5,h+3.2],[tower.x+7,tower.y+5,h+3.2]],{tone:'lo'});}
 else if(seed%3===1){out+=`<g class="solar"><path d="${top(plan(tower.x+3,tower.y+3,8,10,.2),h+1.2)}"/>${line([[tower.x+7,tower.y+3,h+1.3],[tower.x+7,tower.y+13,h+1.3]],{tone:'faint'})}</g>`;}
 else out+=`<g class="roof-machine">${S(k.cylinder(tower.x+tower.w/2,tower.y+tower.d/2,3,h+1,3,P,14))}</g>`;
 add(x+w/2,y+d/2,`<g class="city-building">${out}</g>`,'building');
}
const ground=[];
// The city stands on a frozen lake: frost patches, a pale rim where snow has blown against the
// base, and long cracks in the ice. A handful of static paths, drawn once with the rest.
{
  const next=seeded(4242),far=HALF+520,outside=(x,y)=>Math.abs(x)>HALF+6||Math.abs(y)>HALF+6;
  let frost='',cracks='',glints='';
  for(let i=0;i<110;i++){const x=(next()*2-1)*far,y=(next()*2-1)*far;if(outside(x,y))frost+=flat(heap(x,y,28+next()*52,22+next()*40,9000+i),-6);}
  for(let i=0;i<260;i++){
    let x=(next()*2-1)*far,y=(next()*2-1)*far,heading=next()*Math.PI*2;if(!outside(x,y))continue;
    const run=(x0,y0,angle,segments)=>{const points=[[x0,y0]];let px=x0,py=y0,a=angle;for(let n=0;n<segments;n++){a+=(next()-.5)*1.1;const step=14+next()*34;px+=Math.cos(a)*step;py+=Math.sin(a)*step;points.push([px,py]);}return points;};
    const main=run(x,y,heading,3+Math.floor(next()*4));cracks+=k.pathOf(main.map(([px,py])=>at([px,py,-6])));
    const [bx,by]=main[1+Math.floor(next()*(main.length-1))];cracks+=k.pathOf(run(bx,by,heading+(next()<.5?1:-1)*(.7+next()*.6),2).map(([px,py])=>at([px,py,-6])));
    if(i%5===0){const [gx,gy]=at([x,y,-6]);glints+=poly([[gx-7,gy],[gx,gy-.7],[gx+7,gy],[gx,gy+.7]])+poly([[gx-.6,gy],[gx,gy-4],[gx+.6,gy],[gx,gy+4]]);}
  }
  ground.push(`<path class="ice-frost" d="${frost}"/><path class="ice-rim" d="${top({x:base.x-16,y:base.y-16,w:base.w+32,d:base.d+32,r:26},-6)}"/><path class="ice-cracks" d="${cracks}"/><path class="ice-glint" d="${glints}"/>`);
}
ground.push(`<path class="city-base-shadow" d="${top({...base,x:base.x+4,y:base.y+7},-7)}"/>`,slab(base,-6,6));
ground.push(`<path class="city-ground" d="${top(k.insetPlan(base,3),.05)}"/>`);
const R0=-HALF+9,RL=2*HALF-18;
for(const road of GRID){ground.push(`<path class="road" d="${top(plan(R0,road-9,RL,18,1),.1)}"/><path class="road" d="${top(plan(road-9,R0,18,RL,1),.1)}"/>`);}
let stripes='',crossings='';
for(const road of GRID)for(let i=0;i<BLOCKS;i++){
 stripes+=k.pathOf([at([GRID[i]+19,road,.15]),at([GRID[i+1]-19,road,.15])]);
 stripes+=k.pathOf([at([road,GRID[i]+19,.15]),at([road,GRID[i+1]-19,.15])]);
}
for(const x of GRID)for(const y of GRID)for(let j=-6;j<=6;j+=3){
 crossings+=top(plan(x+13,y+j-0.7,4,1.4,0),.15)+top(plan(x-17,y+j-0.7,4,1.4,0),.15);
 crossings+=top(plan(x+j-.7,y+13,1.4,4,0),.15)+top(plan(x+j-.7,y-17,1.4,4,0),.15);
}
ground.push(`<path class="road-stripes" d="${stripes}"/><path class="crosswalk" d="${crossings}"/>`);
const PARKS=new Set(['4,2','1,5','2,1','5,5','0,3','6,0']);
const MID=(BLOCKS-1)/2;
for(let row=0;row<BLOCKS;row++)for(let col=0;col<BLOCKS;col++){
 const x=GRID[col]+13,y=GRID[row]+13,cx=x+35,cy=y+35,seed=row*BLOCKS+col;
 ground.push(`<g class="sidewalk">${slab(plan(x-2,y-2,74,74,4),.2,.8)}</g>`);
 if(row===MID&&col===MID){
   // The central square: no buildings, just a giant snowman and the reindeer statue.
   ground.push(`<path class="park-ground" d="${top(plan(x+2,y+2,66,66,3),1.05)}"/>`);
   for(const [dx,dy,i] of [[-20,-20,0],[22,-18,1],[-21,21,2],[20,22,3],[0,2,4]])snowHeap(cx+dx,cy+dy,12,10,seed*17+i,0);
   lampPools+=`<path class="tree-pool" d="${flat(k.circleRing(cx-13,cy-9,26,24),1.12)}"/><path class="tree-pool" d="${flat(k.circleRing(cx+17,cy+15,24,24),1.12)}"/>`;
   snowman(cx-13,cy-9);reindeer(cx+15,cy+15);
   for(const [dx,dy] of [[-28,26],[28,-27]])pine(cx+dx,cy+dy,1.1);
 }else if(PARKS.has(row+','+col)){
   ground.push(`<path class="park-ground" d="${top(plan(x+2,y+2,66,66,3),1.05)}"/><path class="park-path" d="${top(plan(cx-3,y+2,6,66,0),1.1)+top(plan(x+2,cy-3,66,6,0),1.1)}"/>`);
   for(const [dx,dy,i] of [[-18,-18,0],[18,-17,1],[-17,18,2],[18,18,3]])snowHeap(cx+dx,cy+dy,11,10,seed*17+i,0);
   lampPools+=`<path class="tree-pool" d="${flat(k.circleRing(cx,cy,30,24),1.12)}"/>`;
   pine(cx,cy,1.5,true);
   for(const dx of [-22,22])for(const dy of [-22,22])pine(cx+dx,cy+dy,1.2);
   for(const [dx,dy] of [[-20,2],[20,-2]])add(cx+dx,cy+dy,slab(plan(cx+dx-4,cy+dy-1,8,2,0),1,2));
 }else{
   for(let a=0;a<2;a++)for(let b=0;b<2;b++){
     const s=seed*7+a*3+b,px=x+6+a*34,py=y+6+b*34;
     const central=Math.abs(col-MID)<=1.5&&Math.abs(row-MID)<=1.5;
     const h=central?30+(s*13%31):13+(s*11%24);
     building(px,py,24+(s%3),24+((s+1)%3),h,s);
   }
   tree(x+3,y+35,.7);tree(x+66,y+35,.7);
 }
 // Ploughed snow banked against the kerb on each side of the block, clear of the crossings.
 {const next=seeded(seed+500),bx=x-2,by=y-2;
  for(let side=0;side<4;side++)for(let n=0;n<3;n++){
    const t=12+n*17+next()*9,length=3+next()*4.5,off=side%2?74+1.5:-1.5;
    if(side<2)snowHeap(bx+t,by+off,length,1.6,seed*40+side*4+n);else snowHeap(bx+off,by+t,1.6,length,seed*40+side*4+n);
  }}
 // A slim street light on every block, set back from the carriageway.
 const lx=x+35,ly=y-1,[hx,hy]=at([lx,ly-3,8.3]);
 lampPools+=`<path d="${flat(k.circleRing(lx,ly-4,15,20),.3)}"/>`;
 add(lx,ly,`<g class="street-light">${line([[lx,ly,1],[lx,ly,8],[lx,ly-3,8]],{tone:'mid'})}${S(k.cylinder(lx,ly-3,1.3,8,.65,P,10))}<circle class="lamp-halo" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="12"/><path class="lamp-flare" d="${flare(hx,hy,24,1.1)}"/><path class="lamp-flare" d="${flare(hx,hy,1,15)}"/></g>`);
}
// An outer planted verge gives the road network a clean model edge.
for(const p of GRID.slice(0,-1).map(g=>g+38)){tree(-HALF+6,p,.8);tree(HALF-6,p,.8);tree(p,-HALF+6,.8);tree(p,HALF-6,.8);}
ground.push(`<path class="snow-side" d="${snowSides}"/><path class="snow-top snow-ground" d="${snowTops}"/><g class="lamp-pool">${lampPools}</g>`);
const glow=(id,colour,stops)=>`<radialGradient id="${id}">${stops.map(([at,alpha])=>`<stop offset="${at}" stop-color="${colour}" stop-opacity="${alpha}"/>`).join('')}</radialGradient>`;
const defs=`<defs>${glow('lamp-pool','#ffd98a',[[0,.6],[.4,.3],[1,0]])}${glow('lamp-halo','#ffeebd',[[0,1],[.12,.9],[.35,.4],[1,0]])}${glow('tree-pool','#ffc76b',[[0,.5],[.5,.2],[1,0]])}${glow('nose-glow','#ff3b30',[[0,.9],[.3,.45],[1,0]])}<radialGradient id="snowball" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#dde8f8"/><stop offset="1" stop-color="#8fa5c9"/></radialGradient></defs>`;
objects.sort((a,b)=>a.depth-b.depth);
const traffic=cityTraffic();
const fig=k.figureSvg({width:W,height:H,label:`Miniatur kota isometrik berisi ${buildings} gedung, taman, jalan dua arah, dan ${traffic.cars.length} mobil yang bergerak otomatis dalam lintasan looping.`,body:[defs,...ground,`<g id="city-scene">${objects.map((o,i)=>`<g data-city-object="${i}" data-depth="${o.depth.toFixed(6)}" data-kind="${o.kind}">${o.body}</g>`).join('')}</g>`]});
// The sidebar starts minimised on this page so the map is unobstructed; a button opens it.
const menuButton='<button class="menu-toggle" type="button" aria-controls="city-nav" aria-expanded="false" aria-label="Buka menu"><svg class="icon-open" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 6h13M3.5 10h13M3.5 14h13"/></svg><svg class="icon-close" viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 5.5L7 10l4.5 4.5M15 5.5L10.5 10l4.5 4.5"/></svg></button>';
const chrome=chromeHtml({active:'city'}).replace('<section class="page-intro">','<section class="page-intro visually-hidden">').replace('<header class="site-header">','<header class="site-header is-min">'+menuButton).replace('<nav class="iso-nav"','<nav id="city-nav" class="iso-nav"');
const body=`<style>${chromeCss()}</style><link rel="stylesheet" href="/city/style.css">${chrome}<figure class="city-figure"><div class="city-stage" tabindex="0" role="region" aria-label="Peta kota: seret atau pakai tombol panah untuk bergeser">${fig}</div></figure><script id="city-config" type="application/json">${JSON.stringify({projection:P,buildings,cars:traffic.cars.length})}</script>${footerHtml()}`;
let html=k.pageHtml({title:'City',theme:'dark',width:1280,body});
html=html.replace('<html lang="en">','<html lang="id">').replace('</head>','<meta name="description" content="Miniatur kota dengan sudut isometrik Anatomy, dengan puluhan gedung dan mobil yang bergerak looping otomatis."></head>').replace('</body>','<script type="module" src="/city/app.mjs"></script></body>');
// Path data is rewritten with relative segments: identical geometry at one-decimal precision,
// about a quarter fewer bytes of HTML to download and parse. Paths with finer numbers are left alone.
const num=v=>String(Math.round(v*10)/10).replace(/^(-?)0\./,'$1.');
function compact(d){
  if(/[^MLZ\d. -]/.test(d)||/\.\d\d/.test(d))return d;
  let out='',px=0,py=0,sx=0,sy=0;
  for(const [,op,a,b] of d.matchAll(/([MLZ])(-?[\d.]+)?(?: (-?[\d.]+))?/g)){
    if(op==='Z'){out+='z';px=sx;py=sy;continue;}
    const x=+a,y=+b;
    if(op==='M'){out+='M'+a+' '+b;sx=x;sy=y;}
    else{const dx=num(x-px),dy=num(y-py);out+='l'+dx+(dy[0]==='-'?'':' ')+dy;}
    px=x;py=y;
  }
  return out;
}
html=html.replace(/ d="([^"]*)"/g,(match,d)=>' d="'+compact(d)+'"');
writeFileSync(new URL('index.html',import.meta.url),html);
console.log(`Built city · ${buildings} buildings · ${traffic.cars.length} cars · ${trees} trees`);
