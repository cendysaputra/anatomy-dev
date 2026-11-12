import {writeFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml,footerHtml} from '../scripts/chrome.mjs';
const W=1040,H=420;
const base={x:-182,y:-118,w:390,d:235,r:10};
const regions=[{id:'jakarta',y:-65,user:'Jakarta',edge:'Edge Asia'},{id:'frankfurt',y:65,user:'Frankfurt',edge:'Edge Eropa'}];
const P=k.fitProjection([...k.boxCorners(base,-6,0),[-135,-65,50],[-135,65,50],[-30,-65,50],[-30,65,50],[156,0,65]],W,H,{pad:32,azimuth:70,elevation:30});
const at=p=>k.iso(p,P),S=p=>k.solidSvg(p,{tone:'mid',crease:'lo'}),slab=(x,y,w,d,z,h)=>S(k.slabOf({x,y,w,d,r:2},z,h,P,5,.5));
const line=ps=>k.lineSvg(k.pathOf(ps.map(at)),{tone:'mid'});
const label=(p,title,sub)=>{const [x,y]=at(p);return `<text x="${x}" y="${y}" class="cdn-label" text-anchor="middle">${title}</text><text x="${x}" y="${y+17}" class="cdn-sub" text-anchor="middle">${sub}</text>`;};
const links=[];
for(const r of regions){links.push({id:r.id+'-local',points:[[-113,r.y,2],[-55,r.y,2]],long:false});links.push({id:r.id+'-origin',points:[[-6,r.y,2],[63,r.y,2],[105,r.y<0?-12:12,2],[132,r.y<0?-12:12,2]],long:true});}
function region(r){const y=r.y;
 const client=slab(-156,y-15,43,30,0,3)+slab(-153,y-13,37,3,3,26)+line([[-147,y-10,24],[-140,y-10,20],[-147,y-10,16]])+line([[-135,y-10,16],[-126,y-10,16]]);
 let edge=slab(-55,y-20,50,40,0,3)+slab(-49,y-16,38,32,3,11)+slab(-49,y-16,38,32,15,11);
 for(let i=0;i<5;i++)edge+=line([[-43+i*6,y+16,18],[-43+i*6,y+16,23]]);
 const p=at([-19,y+16,8]);edge+=`<circle cx="${p[0]}" cy="${p[1]}" r="2" class="edge-led"/>`;
 return `<g data-region="${r.id}" class="region">${client}${label([-135,y,48],r.user,'pengguna')}${edge}${label([-30,y,48],r.edge,'cache lokal')}<text x="${at([-30,y,0])[0]}" y="${at([-30,y,0])[1]+29}" class="edge-state" text-anchor="middle" data-edge="${r.id}">kosong</text></g>`;
}
let origin=slab(132,-25,50,50,0,4);for(let z=4;z<46;z+=14){origin+=slab(138,-20,38,40,z,13);for(let i=0;i<4;i++)origin+=line([[143+i*7,20,z+4],[143+i*7,20,z+9]]);}
origin+=k.faceTextSvg(k.topMatrix([142,-5],45,P),'ORIGIN',{size:5.4,tone:'mid'});
const figure=k.figureSvg({width:W,height:H,label:'CDN dengan dua wilayah: pengguna Jakarta memakai Edge Asia dan pengguna Frankfurt memakai Edge Eropa. Edge mengambil aset dari origin saat cache miss; cache hit dilayani langsung dari edge.',body:[
 `<path class="iso-halo" d="${k.haloOf(base,-6,6,P)}"/>`,S(k.slabOf(base,-6,6,P,6,.5)),
 ...links.map(l=>`<path id="${l.id}" d="${k.pathOf(l.points.map(at))}" class="cdn-route${l.long?' origin-route':''}"/>`),
 ...regions.map(region),origin,label([156,0,66],'Origin','sumber hero.webp'),'<circle id="cdn-packet" r="5" hidden aria-hidden="true"/>'
]});
const body=`<style>${chromeCss()}</style><link rel="stylesheet" href="/cdn/style.css">${chromeHtml({active:'cdn'})}<section class="cdn-demo" aria-label="Simulasi CDN"><div class="cdn-figure">${figure}</div><div class="cdn-bar"><div class="cdn-locations" role="group" aria-label="Lokasi pengguna"><button data-location="jakarta" aria-pressed="true">Jakarta</button><button data-location="frankfurt" aria-pressed="false">Frankfurt</button></div><button id="cdn-send" class="cdn-button primary">Minta hero.webp</button><button id="cdn-purge" class="cdn-button quiet">Purge CDN</button></div><p id="cdn-status" role="status">Minta aset dua kali, lalu pindah lokasi untuk membandingkan edge.</p><div class="cdn-readout"><span id="cdn-result">Belum ada request</span><span>Origin diakses <b id="cdn-origin-count">0</b>×</span></div></section><section class="cdn-notes" aria-label="Cara kerja CDN"><article><h2>Lebih dekat</h2><p>CDN mengarahkan pengguna ke edge yang dekat secara jaringan, tempat salinan aset disimpan.</p></article><article><h2>Hit</h2><p>Jika aset ada di edge, response langsung kembali ke pengguna tanpa mengakses origin.</p></article><article><h2>Miss</h2><p>Jika belum ada, edge mengambil aset dari origin dan menyimpan salinannya untuk request berikutnya.</p></article></section><p class="cdn-note">Model dua wilayah untuk satu aset yang boleh di-cache. Routing dan waktu animasi disederhanakan; TTL, validasi ulang, dan tier cache tidak disimulasikan. Purge menghapus salinan di kedua edge.</p>${footerHtml()}`;
let html=k.pageHtml({title:'CDN — Anatomy Dev',theme:'light',width:1280,body});
html=html.replace('<html lang="en">','<html lang="id">').replace('</head>','<meta name="description" content="Lihat cara CDN melayani aset lewat edge server: cache hit, cache miss, origin, dan purge."></head>').replace('</body>','<script type="module" src="/cdn/app.mjs"></script></body>');
writeFileSync(new URL('index.html',import.meta.url),html);
console.log('Built CDN');
