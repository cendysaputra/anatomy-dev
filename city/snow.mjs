import {onFrame} from './frames.mjs';
// Light snowfall drawn on its own canvas above the map, so it never repaints the city SVG.
export function snow(stage){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');canvas.className='city-snow';canvas.setAttribute('aria-hidden','true');
  stage.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let w=0,h=0,dpr=1,flakes=[],sprites=[];
  // A flake is drawn once per size step and then stamped as an image: a few hundred image
  // stamps cost the GPU far less than filling twice as many small circles every frame.
  const SIZES=[2.2,3,3.8];
  function sprite(radius){
    const half=radius+1,image=document.createElement('canvas');image.width=image.height=Math.ceil(half*2*dpr);
    const g=image.getContext('2d');g.scale(dpr,dpr);
    g.globalAlpha=.7;g.fillStyle='#9fb1c6';g.beginPath();g.arc(half,half,radius,0,Math.PI*2);g.fill();
    g.globalAlpha=.9;g.fillStyle='#fff';g.beginPath();g.arc(half-radius*.25,half-radius*.25,radius*.45,0,Math.PI*2);g.fill();
    return {image,radius,half};
  }
  const make=(y)=>({x:Math.random()*w,y:y??Math.random()*h,r:1.4+Math.random()*2.4,v:18+Math.random()*28,drift:Math.random()*Math.PI*2,sway:6+Math.random()*10});
  function size(){
    const next=Math.min(1.5,devicePixelRatio||1);
    if(next!==dpr||!sprites.length){dpr=next;sprites=SIZES.map(sprite);}
    w=stage.clientWidth;h=stage.clientHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.round(Math.min(260,w*h/7000));
    while(flakes.length<count)flakes.push(make());flakes.length=count;
  }
  function draw(dt){
    dt=Math.min(dt,.1);
    ctx.clearRect(0,0,w,h);
    for(const f of flakes){
      f.y+=f.v*dt;f.drift+=dt*.8;
      if(f.y>h+4)Object.assign(f,make(-4));
      const s=sprites[f.r<=SIZES[0]?0:f.r<=SIZES[1]?1:2],half=s.half*f.r/s.radius;
      ctx.drawImage(s.image,f.x+Math.sin(f.drift)*f.sway-half,f.y-half,half*2,half*2);
    }
  }
  new ResizeObserver(size).observe(stage);size();
  reduced.addEventListener('change',()=>{if(reduced.matches)ctx.clearRect(0,0,w,h);});
  onFrame(draw);
}
