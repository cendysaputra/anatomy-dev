import {CityCamera} from './camera.mjs';
// Fixed close-up camera: drag or use the arrow keys to move around the city. No zoom.
export function setupCamera(stage){
  const svg=stage.querySelector('svg'),world=svg.viewBox.baseVal;
  const camera=new CityCamera(world.width,world.height);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let displayed=camera.box,frame=0,animationStart=0,animationFrom=displayed;
  const write=box=>{displayed=box;svg.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));};
  function tween(now){
    frame=0;const target=camera.box,t=Math.min(1,(now-animationStart)/180),ease=1-Math.pow(1-t,3),next={};
    for(const key of ['x','y','width','height'])next[key]=animationFrom[key]+(target[key]-animationFrom[key])*ease;
    if(t>=1)write(target);else{write(next);frame=requestAnimationFrame(tween);}
  }
  function apply(smooth=false){
    if(smooth&&!reduced.matches){animationStart=performance.now();animationFrom=displayed;if(!frame)frame=requestAnimationFrame(tween);}
    else{cancelAnimationFrame(frame);frame=0;write(camera.box);}
  }
  const toWorld=(x,y)=>new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());
  let drag=null;
  stage.addEventListener('pointerdown',event=>{
    if(drag||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();camera.adopt(displayed);apply();
    drag={id:event.pointerId,world:toWorld(event.clientX,event.clientY)};
    stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');stage.focus({preventScroll:true});
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;event.preventDefault();
    const current=toWorld(event.clientX,event.clientY);camera.pan(drag.world.x-current.x,drag.world.y-current.y);apply();
  });
  function end(event){
    if(!drag||event.pointerId!==drag.id)return;drag=null;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    stage.classList.remove('is-dragging');
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,end);
  stage.addEventListener('keydown',event=>{
    const step=displayed.width*.08;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    camera.pan(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0);apply(true);
    event.preventDefault();
  });
  function resize(){const box=stage.getBoundingClientRect();if(!box.width||!box.height)return;camera.resize(box.width/box.height);apply();}
  new ResizeObserver(resize).observe(stage);resize();
}
