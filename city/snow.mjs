// Light snowfall drawn on its own canvas above the map, so it never repaints the city SVG.
export function snow(stage){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');canvas.className='city-snow';canvas.setAttribute('aria-hidden','true');
  stage.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let w=0,h=0,dpr=1,flakes=[],frame=0,last=0;
  const make=(y)=>({x:Math.random()*w,y:y??Math.random()*h,r:1.4+Math.random()*2.4,v:18+Math.random()*28,drift:Math.random()*Math.PI*2,sway:6+Math.random()*10});
  function size(){
    dpr=Math.min(1.5,devicePixelRatio||1);w=stage.clientWidth;h=stage.clientHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.round(Math.min(260,w*h/7000));
    while(flakes.length<count)flakes.push(make());flakes.length=count;
  }
  function draw(now){
    frame=0;if(document.hidden||reduced.matches){last=0;return;}
    if(last&&now-last<1000/30){frame=requestAnimationFrame(draw);return;}
    const dt=last?Math.min((now-last)/1000,.1):0;last=now;
    ctx.clearRect(0,0,w,h);
    for(const f of flakes){
      f.y+=f.v*dt;f.drift+=dt*.8;
      if(f.y>h+4)Object.assign(f,make(-4));
      const x=f.x+Math.sin(f.drift)*f.sway;
      ctx.globalAlpha=.7;ctx.fillStyle='#9fb1c6';
      ctx.beginPath();ctx.arc(x,f.y,f.r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.9;ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(x-f.r*.25,f.y-f.r*.25,f.r*.45,0,Math.PI*2);ctx.fill();
    }
    frame=requestAnimationFrame(draw);
  }
  const run=()=>{if(!frame&&!document.hidden&&!reduced.matches){last=0;frame=requestAnimationFrame(draw);}};
  new ResizeObserver(size).observe(stage);size();
  document.addEventListener('visibilitychange',run);
  reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;ctx.clearRect(0,0,w,h);}else run();});
  run();
}
