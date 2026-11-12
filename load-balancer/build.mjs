import {writeFileSync,readFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml,footerHtml} from '../scripts/chrome.mjs';
const theme=process.argv.includes('--dark')?'dark':'light';
const W=1000,H=420;
const base={x:-158,y:-100,w:320,d:200,r:12};
const servers=[[104,-76],[104,0],[104,76]],client=[-115,0],lb=[-20,0];
const SPEED=['1.8 s','3.6 s','2.4 s'];
const P=k.fitProjection([...k.boxCorners(base,-8,0),...servers.map(([x,y])=>[x,y,40]),[client[0],0,40]],W,H,{pad:16,azimuth:58,elevation:30});
const at=p=>k.iso(p,P),S=(p,o={})=>k.solidSvg(p,{tone:'mid',crease:'lo',...o}),L=(p,o={})=>k.lineSvg(p,o);
const slab=(p,z,h,o={})=>S(k.slabOf(p,z,h,P,5,.7),o);
const plan=(x,y,w,d,r=2)=>({x,y,w,d,r});
const above=([x,y],w,d,h,text)=>{const [cx]=at([x,y,h]);const [,ty]=at([x-w/2,y-d/2,h]);return `<text x="${cx.toFixed(1)}" y="${(ty-12).toFixed(1)}" class="machine-label" text-anchor="middle">${text}</text>`;};
const beside=([x,y],w,d,h,text,sub)=>{const pts=[[x-w/2,y-d/2],[x+w/2,y-d/2],[x+w/2,y+d/2],[x-w/2,y+d/2]].map(([a,b])=>at([a,b,h/2]));const r=pts.reduce((m,p)=>p[0]>m[0]?p:m);return `<text x="${(r[0]+12).toFixed(1)}" y="${(r[1]-2).toFixed(1)}" class="machine-label">${text}</text><text x="${(r[0]+12).toFixed(1)}" y="${(r[1]+14).toFixed(1)}" class="machine-sub">${sub}</text>`;};
const tag=(p,text,sub,anchor='middle',dy=0)=>{const [x,y]=at(p);return `<text x="${x.toFixed(1)}" y="${(y+dy).toFixed(1)}" class="machine-label" text-anchor="${anchor}">${text}</text>${sub?`<text x="${x.toFixed(1)}" y="${(y+dy+15).toFixed(1)}" class="machine-sub" text-anchor="${anchor}"${sub.attr||''}>${sub.text}</text>`:''}`;};
function server([x,y],i){
  let b=slab(plan(x-16,y-16,32,32,3),0,30);
  for(const z of [10,20])b+=L(k.pathOf([at([x+16,y-13,z]),at([x+16,y+13,z])]),{tone:'lo'});
  const [cx,cy]=at([x+16,y+10,25]);b+=`<circle class="server-led" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2"/>`;
  return `<g class="server-machine" data-machine="${i}" data-down="false">${b}${beside([x,y],32,32,30,'Server '+'ABC'[i],SPEED[i]+' · <tspan data-count="'+i+'">0</tspan> req')}</g>`;}
function balancer(){const [x,y]=lb;return slab(plan(x-24,y-20,48,40,4),0,14)+above(lb,48,40,14,'Load balancer');}
function source(){const [x,y]=client;let b=slab(plan(x-20,y-16,40,32,3),0,3);b+=slab(plan(x-18,y-14,4,28,1),3,26);return b+above([x-16,y],4,28,29,'Client');}
const routePoints=[[[client[0]+20,0,1],[lb[0]-24,0,1]],...servers.map(([x,y])=>[[lb[0]+24,0,1],[50,0,1],[50,y,1],[x-16,y,1]])];
const paths=routePoints.map(p=>k.pathOf(p.map(at)));
const fig=k.figureSvg({width:W,height:H,label:'Alur HTTP: client mengirim request melalui load balancer ke tiga server. Titik oranye adalah request, titik hijau adalah response.',body:[
 `<path class="iso-halo" d="${k.haloOf(base,-8,8,P)}"/>`,slab(base,-8,8,{tone:'lo'}),
 ...paths.map((d,i)=>`<path id="route-${i}" class="route" d="${d}"/>`),
 source(),balancer(),...servers.map(server),'<g id="packets" aria-hidden="true"></g>'
]});
const algoButtons=[['round','Round robin'],['least','Least connections'],['weighted','Weighted 3:2:1']].map(([v,l],i)=>`<button class="seg" data-algo="${v}" aria-pressed="${i===0}">${l}</button>`).join('');
const toggles=servers.map((_,i)=>`<button class="srv" role="switch" aria-checked="true" data-toggle="${i}">${'ABC'[i]}</button>`).join('');
const body=`<style>${chromeCss()}</style><link rel="stylesheet" href="/load-balancer/style.css">${chromeHtml({active:'lb',theme})}
<section aria-label="Simulasi load balancer">
<div class="lb-stage">${fig}</div>
<div class="lb-bar">
 <div class="group" role="group" aria-label="Algoritma">${algoButtons}</div>
 <div class="group"><button class="act primary" id="play">Mulai</button><button class="act" id="send">+1 request</button><button class="act quiet" id="reset">Reset</button></div>
 <label class="group rate">Trafik <input type="range" id="rate" min="1" max="6" step="1" value="2"><output id="rate-value">2/s</output></label>
 <div class="group" role="group" aria-label="Server aktif"><span class="muted">Server</span>${toggles}</div>
</div>
<div class="lb-readout"><span id="status" role="status">Tekan Mulai, atau kirim satu request untuk mengikuti perjalanannya.</span><span class="counts">dikirim <b id="sent">0</b> · berjalan <b id="inflight">0</b> · sukses <b id="completed">0</b> · gagal <b id="failed">0</b></span></div>
<div class="lb-notes">
 <div><h2>Algoritma</h2><p id="strategy-desc"></p></div>
 <div><h2>Server</h2><p>A butuh 1.8 s per request, B 3.6 s, C 2.4 s. B sengaja lambat supaya beda round robin dan least connections terlihat.</p></div>
 <div><h2>Batas model</h2><p>Satu request per koneksi, tanpa antrean dan tanpa retry. Server yang dimatikan langsung dilewati; request yang sedang berjalan di sana gagal.</p></div>
</div>
</section>${footerHtml()}`;
let html=k.pageHtml({title:'Load Balancing — Anatomy Dev',theme,width:1280,body});
html=html.replace('<html lang="en">','<html lang="id">').replace('</head>','<meta name="description" content="Pelajari cara kerja load balancer melalui simulasi isometrik interaktif. Bandingkan round robin, least connections, dan weighted routing."></head>').replace('</body>','<script type="module" src="/load-balancer/app.mjs"></script></body>');
writeFileSync(new URL(theme==='dark'?'dark.html':'index.html',import.meta.url),html);
console.log('Built load balancer · '+theme);
