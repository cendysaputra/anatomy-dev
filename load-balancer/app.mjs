import {Simulation,algorithms} from './model.mjs';
const model=new Simulation();
const $=selector=>document.querySelector(selector);
const paths=Array.from({length:4},(_,i)=>$('#route-'+i));
const lengths=paths.map(p=>p.getTotalLength());
const packetLayer=$('#packets');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const NS='http://www.w3.org/2000/svg';
const dots=new Map();
let mode='idle',rate=2,emission=0,last=0,uiAge=0;
function controls(){
  const auto=mode==='auto';
  $('#play').textContent=auto?'Jeda':mode==='paused'?'Lanjut':'Mulai';
}
function paint(){
  $('#sent').textContent=model.sent;
  $('#inflight').textContent=model.inflight;
  $('#completed').textContent=model.completed;
  $('#failed').textContent=model.failed;
  for(const s of model.servers){
    const i=s.id,m=$('[data-machine="'+i+'"]');
    m.dataset.down=String(!s.up);m.dataset.busy=String(s.active>0);
    const t=$('[data-toggle="'+i+'"]');t.setAttribute('aria-checked',String(s.up));t.setAttribute('aria-label','Server '+s.name+(s.up?' aktif':' mati'));
    $('[data-count="'+i+'"]').textContent=s.assigned;
  }
  for(const b of document.querySelectorAll('[data-algo]'))b.setAttribute('aria-pressed',String(b.dataset.algo===model.algorithm));
  const healthy=model.servers.filter(s=>s.up).length;
  $('#status').textContent=!healthy?'Semua server mati. Request baru gagal dengan 503.':mode==='paused'?'Dijeda.':healthy<3?'Server yang mati dilewati. Request yang sedang berjalan di sana gagal, tanpa retry.':mode==='idle'?'Tekan Mulai, atau kirim satu request untuk mengikuti perjalanannya.':'Oranye menuju server, hijau membawa response kembali.';
  $('#send').disabled=model.inflight>=120;
  controls();
}
function packets(){
  const ids=new Set();
  for(const r of model.requests){
    ids.add(r.id);let circle=dots.get(r.id);
    if(!circle){circle=document.createElementNS(NS,'circle');circle.setAttribute('r','4.5');circle.classList.add('packet');const title=document.createElementNS(NS,'title');title.textContent='Request #'+r.id;circle.append(title);packetLayer.append(circle);dots.set(r.id,circle);}
    let index=0,u=Math.min(1,r.age/.8);
    if(['outgoing','processing','returning'].includes(r.phase))index=r.server+1;
    if(r.phase==='processing')u=1;
    if(r.phase==='returning'||r.phase==='response')u=1-u;
    if(r.phase==='failed'){index=r.server===null?0:r.server+1;u=1;circle.style.opacity=String(1-r.age/.7);circle.style.fill='var(--anatomy-red)';}
    else {circle.style.opacity='1';circle.style.fill='';}
    const response=['returning','response'].includes(r.phase);
    if(response)circle.setAttribute('data-response','');else circle.removeAttribute('data-response');
    if(reduced.matches)u=u<.5?0:1;
    const point=paths[index].getPointAtLength(lengths[index]*u);
    circle.setAttribute('cx',String(point.x));circle.setAttribute('cy',String(point.y));
    circle.setAttribute('r',r.phase==='processing'&&!reduced.matches?String(4+Math.sin(r.age*5)*1):'4.5');
  }
  for(const [id,node] of dots)if(!ids.has(id)){node.remove();dots.delete(id);}
}
$('#play').addEventListener('click',()=>{mode=mode==='auto'?'paused':'auto';emission=0;paint();});
function send(count){if(model.inflight+count>120)return;for(let i=0;i<count;i++)model.send();if(mode!=='auto')mode='manual';paint();}
$('#send').addEventListener('click',()=>send(1));
$('#reset').addEventListener('click',()=>{const key=model.algorithm;model.reset();model.setAlgorithm(key);model.events=[];mode='idle';emission=0;packets();paint();});
for(const b of document.querySelectorAll('[data-algo]'))b.addEventListener('click',()=>{model.setAlgorithm(b.dataset.algo);$('#strategy-desc').textContent=algorithms[model.algorithm].description;paint();});
$('#rate').addEventListener('input',e=>{rate=+e.target.value;$('#rate-value').textContent=rate+'/s';emission=0;});
for(const button of document.querySelectorAll('[data-toggle]'))button.addEventListener('click',()=>{model.toggle(+button.dataset.toggle);paint();packets();});
document.addEventListener('visibilitychange',()=>{last=0;});
function frame(now){
  const dt=last?Math.min((now-last)/1000,2):0;last=now;
  if(!document.hidden&&['auto','manual'].includes(mode)){
    // Substeps preserve routing order even on low-frame-rate devices.
    let remaining=dt;
    while(remaining>0){const step=Math.min(remaining,1/30);model.tick(step);
      if(mode==='auto'){emission+=step;while(emission>=1/rate){if(model.inflight<120)model.send();emission-=1/rate;}}
      remaining-=step;
    }
    if(mode==='manual'&&!model.requests.length)mode='idle';
    packets();uiAge+=dt;if(uiAge>.1){paint();uiAge=0;}
  }
  requestAnimationFrame(frame);
}
$('#strategy-desc').textContent=algorithms.round.description;paint();requestAnimationFrame(frame);
