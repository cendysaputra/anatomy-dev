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
  $('#play').textContent=auto?'Ⅱ Jeda simulasi':mode==='paused'?'▷ Lanjutkan simulasi':'▷ Mulai simulasi';
  $('#play').setAttribute('aria-label',auto?'Jeda simulasi':'Mulai atau lanjutkan simulasi');
  $('#live').dataset.paused=String(!['auto','manual'].includes(mode));
  $('#live').textContent=auto?'Live simulation':mode==='paused'?'Simulasi dijeda':mode==='manual'?'Mengirim request':'Siap dijalankan';
}
function paint(){
  $('#sent').textContent=model.sent;
  $('#inflight').textContent=model.inflight;
  $('#completed').innerHTML=model.completed+' <small>200 OK</small>';
  $('#failed').textContent=model.failed;
  const sum=model.servers.reduce((n,s)=>n+s.assigned,0);
  for(const s of model.servers){
    const i=s.id;
    $('[data-machine="'+i+'"]').dataset.down=String(!s.up);
    $('[data-machine="'+i+'"]').dataset.busy=String(s.active>0);
    $('[data-toggle="'+i+'"]').setAttribute('aria-checked',String(s.up));
    $('[data-toggle="'+i+'"]').setAttribute('aria-label','Server '+s.name+' aktif');
    $('[data-health="'+i+'"]').textContent=s.up?'Healthy':'Offline';
    $('[data-bar="'+i+'"]').style.width=(sum?s.assigned/sum*100:0)+'%';
    $('[data-dist="'+i+'"]').dataset.down=String(!s.up);
    $('[data-count="'+i+'"]').textContent=s.assigned;
  }
  $('#active-detail').textContent=model.servers.map(s=>s.name+' · '+s.active+' aktif').join('   /   ');
  $('#weights').textContent=model.algorithm==='weighted'?'Bobot 3 : 2 : 1':'Bobot setara';
  const newEvents=model.events.map(e=>{const li=document.createElement('li');li.dataset.kind=e.kind;const t=document.createElement('time');t.textContent=String(Math.floor(e.time/60)).padStart(2,'0')+':'+String(Math.floor(e.time%60)).padStart(2,'0');const span=document.createElement('span');span.textContent=e.message;li.append(t,span);return li;});
  if(newEvents.length)$('#events').replaceChildren(...newEvents);
  else $('#events').innerHTML='<li><time>00:00</time><span>Menunggu request pertama.</span></li>';
  const healthy=model.servers.filter(s=>s.up).length;
  $('#status').textContent=!healthy?'Semua server offline. Request baru akan gagal dengan 503 Service Unavailable.':mode==='paused'?'Simulasi dijeda. Request dan waktu proses berhenti sampai kamu lanjutkan.':healthy<3?'Server offline dilewati. Request yang sudah terputus tercatat gagal, tanpa retry.':mode==='idle'?'Mulai aliran otomatis, atau kirim satu request untuk mengikuti perjalanannya.':model.algorithm==='least'?'Server B lebih lambat. Amati strategi ini memilih server dengan koneksi aktif paling sedikit.':'Oranye bergerak ke server; hijau membawa response kembali ke client.';
  $('#send').disabled=model.inflight>=120;$('#burst').disabled=model.inflight>108;
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
$('#send').addEventListener('click',()=>send(1));$('#burst').addEventListener('click',()=>send(12));
$('#reset').addEventListener('click',()=>{const key=model.algorithm;model.reset();model.setAlgorithm(key);model.events=[];mode='idle';emission=0;packets();paint();});
$('#algorithm').addEventListener('change',e=>{model.setAlgorithm(e.target.value);$('#strategy-desc').textContent=algorithms[model.algorithm].description;paint();});
$('#rate').addEventListener('input',e=>{rate=+e.target.value;$('#rate-value').textContent=rate+' req/s';emission=0;});
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
