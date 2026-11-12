// Orthographic camera: moving its SVG viewBox preserves all Anatomy geometry.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export class CityCamera {
  constructor(width,height,{zoom=2.2,minZoom=1,maxZoom=4,aspect=width/height}={}){
    this.width=width;this.height=height;this.minZoom=minZoom;this.maxZoom=maxZoom;
    this.aspect=aspect;this.zoom=clamp(zoom,minZoom,maxZoom);this.x=0;this.y=0;this.center();
  }
  get baseWidth(){return Math.max(this.width,this.height*this.aspect);}
  get size(){const width=this.baseWidth/this.zoom;return {width,height:width/this.aspect};}
  get box(){return {x:this.x,y:this.y,...this.size};}
  constrain(){const s=this.size;this.x=s.width>=this.width?(this.width-s.width)/2:clamp(this.x,0,this.width-s.width);this.y=s.height>=this.height?(this.height-s.height)/2:clamp(this.y,0,this.height-s.height);}
  center(){const s=this.size;this.x=(this.width-s.width)/2;this.y=(this.height-s.height)/2;}
  pan(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return;this.x+=dx;this.y+=dy;this.constrain();}
  zoomAt(next,anchor,fraction){
    if(!Number.isFinite(next))return;
    const old=this.box;anchor??={x:old.x+old.width/2,y:old.y+old.height/2};
    const f=fraction??{x:(anchor.x-old.x)/old.width,y:(anchor.y-old.y)/old.height};
    this.zoom=clamp(next,this.minZoom,this.maxZoom);const s=this.size;
    this.x=anchor.x-f.x*s.width;this.y=anchor.y-f.y*s.height;this.constrain();
  }
  resize(aspect){if(!(aspect>0)||!Number.isFinite(aspect))return;const old=this.box,cx=old.x+old.width/2,cy=old.y+old.height/2;this.aspect=aspect;const s=this.size;this.x=cx-s.width/2;this.y=cy-s.height/2;this.constrain();}
  adopt(box){this.zoom=clamp(this.baseWidth/box.width,this.minZoom,this.maxZoom);this.x=box.x;this.y=box.y;this.constrain();}
  fit(){this.zoom=this.minZoom;this.center();}
}
