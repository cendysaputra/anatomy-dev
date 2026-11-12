import {CityCamera} from './camera.mjs';
// Fixed close-up camera: drag or use the arrow keys to move around the city. No zoom.
export function setupCamera(stage){
  const svg=stage.querySelector('svg'),vb=svg.viewBox.baseVal,world={width:vb.width,height:vb.height};
  const camera=new CityCamera(world.width,world.height);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let displayed=camera.box,frame=0,animationStart=0,animationFrom=displayed;
  // The SVG keeps its full-world viewBox and is drawn once at the current scale; moving the camera
  // only changes a GPU transform, so panning never re-rasterises the city.
  let scale=0;
  const write=box=>{
    displayed=box;svg.cityView=box;
    const next=stage.clientWidth/box.width;
    if(Math.abs(next-scale)>1e-6){scale=next;svg.style.width=world.width*scale+'px';svg.style.height=world.height*scale+'px';}
    svg.style.transform=`translate3d(${(-box.x*scale).toFixed(2)}px,${(-box.y*scale).toFixed(2)}px,0)`;
  };
  function tween(now){
    frame=0;const target=camera.box,t=Math.min(1,(now-animationStart)/180),ease=1-Math.pow(1-t,3),next={};
    for(const key of ['x','y','width','height'])next[key]=animationFrom[key]+(target[key]-animationFrom[key])*ease;
    if(t>=1)write(target);else{write(next);frame=requestAnimationFrame(tween);}
  }
  function apply(smooth=false){
    if(smooth&&!reduced.matches){animationStart=performance.now();animationFrom=displayed;if(!frame)frame=requestAnimationFrame(tween);}
    else{cancelAnimationFrame(frame);frame=0;write(camera.box);}
  }
  // Keep the view over the city: the world box has empty corners around the isometric diamond,
  // so panning is limited to a band around the centre where the city fills the screen.
  const pan=(dx,dy)=>{camera.pan(dx,dy);const s=camera.size,cx=(world.width-s.width)/2,cy=(world.height-s.height)/2,mx=Math.max(0,world.width*.5-s.width*.5-world.width*.2),my=Math.max(0,world.height*.5-s.height*.5-world.height*.2);camera.x=Math.min(cx+mx,Math.max(cx-mx,camera.x));camera.y=Math.min(cy+my,Math.max(cy-my,camera.y));};
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
    const current=toWorld(event.clientX,event.clientY);pan(drag.world.x-current.x,drag.world.y-current.y);apply();
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
    pan(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0);apply(true);
    event.preventDefault();
  });
  // Zoom is fixed per screen shape: the base close-up, or closer on tall screens so the map
  // always covers the whole stage. Recomputed on every resize, never ratcheted upward.
  const BASE_ZOOM=1.92;
  function resize(){
    const box=stage.getBoundingClientRect();if(box.width<50||box.height<50)return;
    const aspect=box.width/box.height;camera.resize(aspect);
    const cover=camera.baseWidth/Math.min(world.width,world.height*aspect);
    const zoom=Math.max(BASE_ZOOM,cover*1.05);camera.maxZoom=Math.max(4,zoom);camera.zoomAt(zoom);
    apply();
  }
  new ResizeObserver(resize).observe(stage);resize();
}
