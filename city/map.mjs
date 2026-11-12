// The city map as bitmap tiles. The map is a standalone SVG (built by build.mjs); here it is drawn
// once into canvases at the screen's own resolution, nearest tiles first. Dragging then only moves
// finished bitmaps, so the browser never rasterises the vector map again until the zoom changes.
const TILE=1536;          // tile edge in device pixels, safely below any GPU texture limit
const MAX_PIXELS=48e6;    // total budget; beyond it the map is drawn slightly below device resolution
export function cityMap(layer,world){
  const source=fetch('/city/map.svg').then(response=>response.text());
  let scale=0,view=null,pass=0,timer=0;
  // The SVG is sized in CSS pixels for the current zoom, so its hairline strokes come out exactly
  // as they would inline; drawing it scaled by the pixel ratio keeps everything vector-sharp.
  async function image(width,height){
    const text=(await source).replace('<svg ','<svg width="'+width.toFixed(2)+'" height="'+height.toFixed(2)+'" ');
    const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'})),picture=new Image();
    picture.src=url;
    try{await picture.decode();}finally{URL.revokeObjectURL(url);}
    return picture;
  }
  async function render(){
    const mine=++pass,width=world.width*scale,height=world.height*scale;
    const ratio=Math.min(devicePixelRatio||1,Math.sqrt(MAX_PIXELS/(width*height)));
    const picture=await image(width,height);
    if(mine!==pass)return;
    const set=document.createElement('div'),tiles=[],step=TILE/ratio;
    for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step)tiles.push({x,y,w:Math.min(step,width-x),h:Math.min(step,height-y)});
    // Tiles nearest the middle of the screen come first.
    const cx=(view.x+view.width/2)*scale,cy=(view.y+view.height/2)*scale;
    tiles.sort((a,b)=>Math.hypot(a.x+a.w/2-cx,a.y+a.h/2-cy)-Math.hypot(b.x+b.w/2-cx,b.y+b.h/2-cy));
    layer.append(set);
    for(const tile of tiles){
      if(mine!==pass){set.remove();return;}
      // Each tile overlaps its neighbours by a pixel so no seam can show between them. Positions
      // and sizes are fractions of the layer, so finished tiles stretch with it during a resize.
      const canvas=document.createElement('canvas'),w=tile.w+1/ratio,h=tile.h+1/ratio;
      canvas.width=Math.ceil(w*ratio);canvas.height=Math.ceil(h*ratio);
      canvas.style.left=tile.x/width*100+'%';canvas.style.top=tile.y/height*100+'%';
      canvas.style.width=canvas.width/ratio/width*100+'%';canvas.style.height=canvas.height/ratio/height*100+'%';
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.setTransform(ratio,0,0,ratio,-tile.x*ratio,-tile.y*ratio);ctx.drawImage(picture,0,0,width,height);
      set.append(canvas);
      // One tile per frame keeps the page responsive while the rest of the map fills in.
      await new Promise(done=>requestAnimationFrame(done));
    }
    if(mine!==pass){set.remove();return;}
    // The new tiles are complete: drop the ones from the previous zoom underneath.
    for(const old of [...layer.children])if(old!==set)old.remove();
  }
  return {
    // Called on every camera move; only a change of zoom needs new tiles.
    show(box,nextScale){
      view=box;
      if(Math.abs(nextScale-scale)<1e-6)return;
      const first=!scale;scale=nextScale;clearTimeout(timer);
      // While a window is being resized the old tiles simply stretch; redraw once it settles.
      if(first)render();else timer=setTimeout(render,180);
    }
  };
}
