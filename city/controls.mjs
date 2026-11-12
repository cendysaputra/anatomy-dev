import {CityCamera} from './camera.mjs';
export function setupCamera(stage){
  const svg=stage.querySelector('svg'),world=svg.viewBox.baseVal;
  const camera=new CityCamera(world.width,world.height);
  const output=stage.querySelector('[data-zoom]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let displayed=camera.box,frame=0,animationStart=0,animationFrom=displayed;
  const write=box=>{displayed=box;svg.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));};
  function tween(now){
    frame=0;const target=camera.box,t=Math.min(1,(now-animationStart)/180),ease=1-Math.pow(1-t,3),next={};
    for(const key of ['x','y','width','height'])next[key]=animationFrom[key]+(target[key]-animationFrom[key])*ease;
    if(t>=1)write(target);else{write(next);frame=requestAnimationFrame(tween);}
  }
  function apply(smooth=false){
    output.textContent=Math.round(camera.zoom*100)+'%';
    stage.querySelector('[data-camera="out"]').disabled=camera.zoom<=camera.minZoom+.001;
    stage.querySelector('[data-camera="in"]').disabled=camera.zoom>=camera.maxZoom-.001;
    if(smooth&&!reduced.matches){animationStart=performance.now();animationFrom=displayed;if(!frame)frame=requestAnimationFrame(tween);}
    else{cancelAnimationFrame(frame);frame=0;write(camera.box);}
  }
  const toWorld=(x,y)=>new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse());
  const fraction=point=>({x:(point.x-displayed.x)/displayed.width,y:(point.y-displayed.y)/displayed.height});
  function zoom(next,point){camera.zoomAt(next,point,point?fraction(point):undefined);apply(true);}
  stage.addEventListener('wheel',event=>{
    event.preventDefault();
    const scale=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
    const delta=Math.max(-250,Math.min(250,event.deltaY*scale));
    zoom(camera.zoom*Math.exp(-delta*.002),toWorld(event.clientX,event.clientY));
  },{passive:false});
  for(const button of stage.querySelectorAll('[data-camera]'))button.addEventListener('click',()=>{
    if(button.dataset.camera==='fit'){camera.fit();apply(true);}
    else zoom(camera.zoom*(button.dataset.camera==='in'?1.25:.8));
  });
  const pointers=new Map();let gesture=null;
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function rebase(){
    camera.adopt(displayed);apply();
    const list=[...pointers.values()];
    if(list.length>=2){const mid=midpoint(list[0],list[1]);gesture={kind:'pinch',world:toWorld(mid.x,mid.y),zoom:camera.zoom,distance:Math.max(1,Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y))};}
    else gesture=list.length?{kind:'pan',world:toWorld(list[0].x,list[0].y)}:null;
  }
  stage.addEventListener('pointerdown',event=>{
    if(event.target.closest('.city-camera-controls')||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');stage.focus({preventScroll:true});rebase();
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const list=[...pointers.values()];
    if(gesture?.kind==='pinch'&&list.length>=2){
      const mid=midpoint(list[0],list[1]),distance=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);
      camera.zoomAt(gesture.zoom*distance/gesture.distance,gesture.world);apply();
      const current=toWorld(mid.x,mid.y);camera.pan(gesture.world.x-current.x,gesture.world.y-current.y);apply();
    }else if(gesture?.kind==='pan'){
      const current=toWorld(event.clientX,event.clientY);camera.pan(gesture.world.x-current.x,gesture.world.y-current.y);apply();
    }
  });
  function end(event){
    if(!pointers.delete(event.pointerId))return;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    if(!pointers.size)stage.classList.remove('is-dragging');rebase();
  }
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,end);
  stage.addEventListener('keydown',event=>{
    if(event.target.closest('.city-camera-controls'))return;
    const step=displayed.width*.08;
    if(['+','='].includes(event.key))zoom(camera.zoom*1.2);
    else if(['-','_'].includes(event.key))zoom(camera.zoom/1.2);
    else if(['0','Home'].includes(event.key)){camera.fit();apply(true);}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      camera.pan(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0);apply(true);
    }else return;event.preventDefault();
  });
  function resize(){const box=stage.getBoundingClientRect();if(!box.width||!box.height)return;camera.resize(box.width/box.height);apply();}
  new ResizeObserver(resize).observe(stage);resize();
}
