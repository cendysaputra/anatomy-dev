import {writeFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml,footerHtml} from '../scripts/chrome.mjs';
import {GRID,cityTraffic} from './routes.mjs';
const W=1100,H=850,base={x:-216,y:-216,w:432,d:432,r:8};
const P=k.fitProjection([...k.boxCorners(base,-6,0),[-60,-60,64],[60,60,64]],W,H,{pad:30,azimuth:45,elevation:55});
const at=p=>k.iso(p,P),S=(p,o={})=>k.solidSvg(p,{tone:'mid',crease:'lo',...o});
const plan=(x,y,w,d,r=1)=>({x,y,w,d,r});
const slab=(p,z,h)=>S(k.slabOf(p,z,h,P,3,.4));
const top=(p,z=0)=>k.onTop(k.roundedPlan(p,3),z,P,true);
const line=(points,style={})=>k.lineSvg(k.pathOf(points.map(at)),style);
const objects=[];let buildings=0,trees=0;
function add(x,y,body,kind='detail'){objects.push({depth:k.depthOf([x,y,0],P),body,kind});}
function tree(x,y,size=1){trees++;const trunk=S(k.cylinder(x,y,.85*size,1,4*size,P,8));const canopy=S(k.cylinder(x,y,4.3*size,4*size,4*size,P,12))+S(k.cylinder(x,y,3.5*size,8*size,2.2*size,P,12));add(x,y,`<path class="tree-shadow" d="${top(plan(x-3+3*size,y-3+3*size,7*size,7*size,3))}"/><g class="tree">${trunk}${canopy}</g>`,'tree');}
function building(x,y,w,d,h,seed){
 buildings++;
 const shell=plan(x,y,w,d,1.1),setback=seed%4===0;
 const palettes=[['#f4f2ec','#e2e1d9','#dddcd4'],['#edf0e9','#dce3d7','#d5ddd1'],['#e7eceb','#d6dfdc','#ced8d3'],['#f1e9e2','#e4d8cb','#dbcec1']];
 const [roof,face,shade]=palettes[seed%palettes.length];
 let out=`<path class="building-shadow" d="${top(plan(x+4,y+5,w+2,d+2,1.3),.2)}"/>`;
 out+=slab(shell,1,setback?5:h);
 const tower=setback?plan(x+2.5,y+2.5,w-5,d-5,1):shell;
 if(setback)out+=slab(tower,6,h-5);
 let windows='';
 for(let z=6;z<h-2;z+=5){
   for(let q=3;q<tower.w-2;q+=5)windows+=k.pathOf([at([tower.x+q,tower.y+tower.d,z]),at([Math.min(tower.x+q+2.6,tower.x+tower.w-2),tower.y+tower.d,z])]);
   for(let q=3;q<tower.d-2;q+=5)windows+=k.pathOf([at([tower.x+tower.w,tower.y+q,z]),at([tower.x+tower.w,Math.min(tower.y+q+2.6,tower.y+tower.d-2),z])]);
 }
 out+=`<path class="building-windows" d="${windows}"/>`;
 out+=k.lineSvg(k.planOutline(k.insetPlan(tower,1.2),h+1,P,3),{tone:'lo'});
 if(seed%3===0){out+=`<g class="roof-machine">${slab(plan(tower.x+3,tower.y+3,5,7,1),h+1,2.2)}</g>`;out+=line([[tower.x+4,tower.y+5,h+3.2],[tower.x+7,tower.y+5,h+3.2]],{tone:'lo'});}
 else if(seed%3===1){out+=`<g class="solar"><path d="${top(plan(tower.x+3,tower.y+3,8,10,.2),h+1.2)}"/>${line([[tower.x+7,tower.y+3,h+1.3],[tower.x+7,tower.y+13,h+1.3]],{tone:'faint'})}</g>`;}
 else out+=`<g class="roof-machine">${S(k.cylinder(tower.x+tower.w/2,tower.y+tower.d/2,3,h+1,3,P,14))}</g>`;
 add(x+w/2,y+d/2,`<g class="city-building" style="--anatomy-top:${roof};--anatomy-shade-0:${shade};--anatomy-shade-1:${shade};--anatomy-shade-2:${face};--anatomy-shade-3:${face}">${out}</g>`,'building');
}
const ground=[];
ground.push(`<path class="city-base-shadow" d="${top({...base,x:base.x+4,y:base.y+7},-7)}"/>`,slab(base,-6,6));
ground.push(`<path class="city-ground" d="${top(k.insetPlan(base,3),.05)}"/>`);
for(const road of GRID){ground.push(`<path class="road" d="${top(plan(-207,road-9,414,18,1),.1)}"/><path class="road" d="${top(plan(road-9,-207,18,414,1),.1)}"/>`);}
let stripes='',crossings='';
for(const road of GRID)for(let i=0;i<4;i++){
 stripes+=k.pathOf([at([GRID[i]+19,road,.15]),at([GRID[i+1]-19,road,.15])]);
 stripes+=k.pathOf([at([road,GRID[i]+19,.15]),at([road,GRID[i+1]-19,.15])]);
}
for(const x of GRID)for(const y of GRID)for(let j=-6;j<=6;j+=3){
 crossings+=top(plan(x+13,y+j-0.7,4,1.4,0),.15)+top(plan(x-17,y+j-0.7,4,1.4,0),.15);
 crossings+=top(plan(x+j-.7,y+13,1.4,4,0),.15)+top(plan(x+j-.7,y-17,1.4,4,0),.15);
}
ground.push(`<path class="road-stripes" d="${stripes}"/><path class="crosswalk" d="${crossings}"/>`);
for(let row=0;row<4;row++)for(let col=0;col<4;col++){
 const x=GRID[col]+13,y=GRID[row]+13,cx=x+35,cy=y+35,seed=row*4+col;
 ground.push(`<g class="sidewalk">${slab(plan(x-2,y-2,74,74,4),.2,.8)}</g>`);
 if((row===2&&col===1)||(row===0&&col===3)){
   ground.push(`<path class="park-ground" d="${top(plan(x+2,y+2,66,66,3),1.05)}"/><path class="park-path" d="${top(plan(cx-3,y+2,6,66,0),1.1)+top(plan(x+2,cy-3,66,6,0),1.1)}"/>`);
   add(cx,cy,`<g class="fountain">${S(k.cylinder(cx,cy,10,1.2,1.7,P,32))}<path class="water" d="${k.ring(cx,cy,8.4,3,P,32)}"/>${S(k.cylinder(cx,cy,2.5,3,2,P,16))}</g>`);
   for(const dx of [-22,22])for(const dy of [-22,22])tree(cx+dx,cy+dy,1.2);
   for(const [dx,dy] of [[-20,2],[20,-2]])add(cx+dx,cy+dy,slab(plan(cx+dx-4,cy+dy-1,8,2,0),1,2));
 }else{
   for(let a=0;a<2;a++)for(let b=0;b<2;b++){
     const s=seed*7+a*3+b,px=x+6+a*34,py=y+6+b*34;
     const central=col>=1&&col<=2&&row>=1&&row<=2;
     const h=central?30+(s*13%31):13+(s*11%24);
     building(px,py,24+(s%3),24+((s+1)%3),h,s);
   }
   tree(x+3,y+35,.7);tree(x+66,y+35,.7);
 }
 // A slim street light on every block, set back from the carriageway.
 const lx=x+35,ly=y-1;add(lx,ly,`<g class="street-light">${line([[lx,ly,1],[lx,ly,8],[lx,ly-3,8]],{tone:'mid'})}${S(k.cylinder(lx,ly-3,1.3,8,.65,P,10))}</g>`);
}
// An outer green verge gives the road network a clean model edge.
for(const p of [-154,-58,38,134]){tree(-210,p,.8);tree(210,p,.8);tree(p,-210,.8);tree(p,210,.8);}
objects.sort((a,b)=>a.depth-b.depth);
const traffic=cityTraffic();
const carMarkup=traffic.cars.map((c,i)=>`<g class="city-car car-${c.color}" data-car="${i}" aria-hidden="true"><path data-car-part="shadow"/><path data-car-part="side"/><path data-car-part="top"/><path data-car-part="edge"/><path data-car-part="cabin-side"/><path data-car-part="cabin-top"/><path data-car-part="glass"/><path data-car-part="lights"/><path data-car-part="tail"/></g>`).join('');
const fig=k.figureSvg({width:W,height:H,label:`Miniatur kota isometrik berisi ${buildings} gedung, taman, jalan dua arah, dan ${traffic.cars.length} mobil yang bergerak otomatis dalam lintasan looping.`,body:[...ground,`<g id="city-scene">${objects.map((o,i)=>`<g data-city-object="${i}" data-depth="${o.depth.toFixed(6)}" data-kind="${o.kind}">${o.body}</g>`).join('')}${carMarkup}</g>`]});
const body=`<style>${chromeCss()}</style><link rel="stylesheet" href="/city/style.css">${chromeHtml({active:'city'})}<figure class="city-figure"><div class="city-stage" aria-label="Pemandangan kota isometrik">${fig}</div><figcaption class="city-caption"><span>${buildings} gedung · ${traffic.cars.length} mobil · ${trees} pohon</span><span class="city-live">Bergerak otomatis</span></figcaption></figure><script id="city-config" type="application/json">${JSON.stringify({projection:P,buildings,cars:traffic.cars.length})}</script>${footerHtml()}`;
let html=k.pageHtml({title:'Kota — Anatomy Dev',theme:'light',width:1280,body});
html=html.replace('<html lang="en">','<html lang="id">').replace('</head>','<meta name="description" content="Miniatur kota isometrik dari atas, dengan puluhan gedung dan mobil yang bergerak looping otomatis."></head>').replace('</body>','<script type="module" src="/city/app.mjs"></script></body>');
writeFileSync(new URL('index.html',import.meta.url),html);
console.log(`Built city · ${buildings} buildings · ${traffic.cars.length} cars · ${trees} trees`);
