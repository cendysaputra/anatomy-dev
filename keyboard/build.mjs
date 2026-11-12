import {writeFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml} from '../scripts/chrome.mjs';
import {keys,body} from './layout.mjs';
import {labels} from './labels.mjs';
import {layers} from './motion.mjs';
const W=1200,H=900;
// World extents of every layer, used to frame the assembled and the exploded keyboard.
const extents={tray:[0,12],cable:[0,11],foam:[4.5,5.5],pcb:[7,9.5],plate:[11,12.8],switches:[12.8,17],bezel:[9,13],screws:[13,14],caps:[14.5,22]};
const cornersOf=(name,shift=[0,0,0])=>k.boxCorners(body,...extents[name]).map(p=>p.map((v,i)=>v+shift[i]));
const assembled=Object.keys(extents).flatMap(n=>cornersOf(n));
const exploded=Object.keys(extents).flatMap(n=>cornersOf(n,layers[n].offset));
export const P=k.fitProjection([...assembled,...exploded],W,H,{pad:45,azimuth:62,elevation:30});
const boxOf=(pts,pad)=>{const f=pts.map(p=>k.iso(p,P)),xs=f.map(p=>p[0]),ys=f.map(p=>p[1]);const x=Math.min(...xs)-pad,y=Math.min(...ys)-pad;return [x,y,Math.max(...xs)+pad-x,Math.max(...ys)+pad-y].map(v=>+v.toFixed(1));};
// The camera frames the assembled keyboard closely and pulls back as the layers separate.
const views={rest:boxOf(assembled,24),apart:boxOf(exploded,40)};
const plan=(x,y,w,d,r=1)=>({x,y,w,d,r});
const solid=(p,z,h,cls='')=>k.solidSvg(k.slabOf(p,z,h,P,3,.3),{tone:'lo',crease:'faint',className:cls});
const line=(pts,z,cls='')=>`<path class="iso-line ${cls}" d="${k.onTop(pts,z,P)}"/>`;
const layer=(name,html)=>`<g data-layer="${name}">${html}</g>`;
const rails=(z,h)=>solid(plan(-158,-50,316,6,3),z,h)+solid(plan(-158,-44,6,88),z,h)+solid(plan(152,-44,6,88),z,h)+solid(plan(-158,44,316,6,3),z,h);
let tray=solid(body,0,3)+rails(3,8);
for(const x of [-139,0,139])for(const y of [-32,32])tray+=solid(plan(x-3,y-3,6,6,3),3,4);
const slots=keys.map(q=>k.planOutline(plan(q.x+q.w/2-4,q.y+q.d/2-4,8,8,.5),12.8,P)).join('');
const mask=`<mask id="switch-holes" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000"><rect x="-2000" y="-2000" width="5000" height="5000" fill="white"/><path fill="black" d="${slots}"/></mask>`;
let pcb=solid(plan(-150,-43,300,84,2),7,1.6,'pcb');
for(const [i,q] of keys.entries()){
 const x=q.x+q.w/2,y=q.y+q.d/2;
 pcb+=line([[x-2,y-2],[x-2,y-5],[x+3,y-5],[x+3,35-i%5]],8.7,'trace');
 for(const dx of [-2,2])pcb+=`<path class="pad" d="${k.ring(x+dx,y,1,8.7,P,10)}"/>`;
}
pcb+=solid(plan(70,30,12,8,.3),8.7,1.2,'chip');
for(let i=0;i<8;i++)pcb+=line([[70+i*1.5,29],[70+i*1.5,28]],9,'trace');
let switches='',caps='',stabilizers='';
// Reuse geometry for each width/depth; only the placement differs.
const defs=new Map();
for(const q of [...keys].sort((a,b)=>k.depthOf([a.x,a.y,0],P)-k.depthOf([b.x,b.y,0],P))){
 const x=q.x+q.w/2,y=q.y+q.d/2;
 const [sx,sy]=k.iso([x,y,0],{...P,origin:[0,0]});
 const id=`cap-${q.w}-${q.d}`;
 if(!defs.has(id))defs.set(id,`<g id="${id}">${solid(plan(-q.w/2,-q.d/2,q.w,q.d,1.1),14.5,7.5,'keycap')}${solid(plan(-q.w/2+1,-q.d/2+1,q.w-2,q.d-2,.8),22,.45,'keytop')}</g>`);
 switches+=`<g transform="translate(${sx} ${sy})"><use href="#switch"/></g>`;
 caps+=`<g data-key="${keys.indexOf(q)}"><use href="#${id}" transform="translate(${sx} ${sy})"/></g>`;
 if(q.w>16||q.d>16){
  const horizontal=q.w>q.d,a=horizontal?[[q.x+3,y],[q.x+q.w-3,y]]:[[x,q.y+3],[x,q.y+q.d-3]];
  stabilizers+=line(a,14,'stabilizer');for(const [u,v]of a)stabilizers+=solid(plan(u-1.5,v-1.5,3,3,.5),12.8,2);
 }
}
// Definitions use the same projection origin as the scene; translate by axis displacement.
const switchDef=`<g id="switch">${solid(plan(-4,-4,8,8,.6),12.8,3,'switch')}${solid(plan(-2,-2,4,4,.2),15.8,1.2,'stem')}</g>`;
let screws='';for(const x of [-154,154])for(const y of [-46,46])screws+=k.solidSvg(k.cylinder(x,y,1.2,13,1,P,12),{tone:'mid'});
const foam=solid(plan(-150,-43,300,84,2),4.5,1,'foam');
const cable=line([[115,-50],[115,-104]],8,'cable')+solid(plan(111,-57,8,9,1),7,3,'plug');
const scene=`<svg class="iso-svg" viewBox="${views.rest.join(' ')}" role="img" aria-label="Keyboard mekanis dengan 104 tombol dan komponen berlapis"><defs>${mask}${switchDef}${[...defs.values()].join('')}</defs>${layer('cable',cable)}${layer('tray',tray)}${layer('foam',foam)}${layer('pcb',pcb)}${layer('plate',`<g mask="url(#switch-holes)">${solid(plan(-150,-43,300,84,2),11,1.8,'plate')}</g>`)}${layer('switches',switches+stabilizers)}${layer('bezel',rails(9,4))}${layer('screws',screws)}${layer('caps',caps)}</svg>`;
const annotations=`<svg class="keyboard-leaders" aria-hidden="true">${labels.map(l=>`<g data-leader="${l.id}" opacity="0"><path/><circle r="2"/></g>`).join('')}</svg><div class="keyboard-labels">${labels.map(l=>`<span class="component-label" data-label="${l.id}" data-side="${l.side}" aria-hidden="true">${l.text}</span>`).join('')}</div>`;
const css=`${chromeCss()}
.iso-page{padding:16px;column-gap:16px;margin:0;max-width:none}.page-intro{display:none}.keyboard-scroll{height:340dvh;position:relative}.keyboard-stage{position:sticky;top:var(--keyboard-top,16px);height:calc(100dvh - var(--keyboard-top,16px) - 16px);display:grid;place-items:center;overflow:hidden}.keyboard-stage>.iso-svg{width:calc(100% - 240px);height:100%;overflow:hidden}.keyboard-leaders,.keyboard-labels{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.keyboard-leaders{overflow:visible;fill:none;stroke:#b5b8b5;stroke-width:.75}.keyboard-leaders circle{fill:#909690;stroke:white;stroke-width:1}.component-label{position:absolute;opacity:0;white-space:nowrap;font:400 16px/1.4 var(--body);color:#626762;background:#ffffffed;padding:3px 6px;border-radius:4px;transform:translateY(-50%)}.component-label[data-side="right"]{right:8px}.component-label[data-side="left"]{left:8px}@media(max-width:600px){.keyboard-stage>.iso-svg{width:calc(100% - 140px)}.component-label{font-size:11px;padding:2px 3px}.component-label[data-side="left"]{left:0}.component-label[data-side="right"]{right:0}}.iso[data-theme="light"]{--anatomy-mid:#8e8e8e;--anatomy-lo:#b9b9b9;--anatomy-faint:#dedede;--anatomy-shade-0:#d5d5d5;--anatomy-shade-1:#e0e0e0;--anatomy-shade-2:#ebebeb;--anatomy-shade-3:#f4f4f4}.keyboard-stage .iso-line{stroke-width:.65px}.pcb .iso-top{fill:#c6c8c7}.trace{stroke:#929793;stroke-width:.6px!important}.pad{fill:#e8e9e8;stroke:#919691;stroke-width:.5px}.chip .iso-top,.stem .iso-top{fill:#919493}.foam .iso-top{fill:#b8bbba}.switch .iso-top{fill:#e0e2e1}.stabilizer{stroke:#8c8f8e;stroke-width:1.2px!important}.cable{stroke:#a4a7a5;stroke-width:3px!important}[data-key][data-pressed]{--anatomy-top:#e2e4e2}.keytop .iso-edge{stroke:#e1e1e1}.keycap .iso-edge{stroke:#b8b8b8}@media(max-width:900px){.site-header{position:sticky;top:12px;z-index:2}.keyboard-scroll{height:300dvh}.keyboard-stage{height:calc(100dvh - var(--keyboard-top,150px) - 12px)}}`;
let html=k.pageHtml({title:'Keyboard · Anatomy Dev',theme:'light',body:chromeHtml({active:'keyboard'})+`<section class="keyboard-scroll" aria-label="Komponen keyboard"><div class="keyboard-stage" data-projection='${JSON.stringify(P)}' data-views='${JSON.stringify(views)}'>${scene}${annotations}</div></section>`});
html=html.replace('</style>',css+'</style>').replace('<html lang="en">','<html lang="id">');
html=html.replace('</body>','<script type="module" src="/keyboard/app.mjs"></script></body>');
writeFileSync(new URL('index.html',import.meta.url),html);
console.log(`Built keyboard · ${keys.length} blank keys · 9 component layers`);
