// One cacheable asset and one independent cache per illustrative region.
export const REGIONS={jakarta:{user:'Jakarta',edge:'Edge Asia'},frankfurt:{user:'Frankfurt',edge:'Edge Eropa'}};
export class CDN {
  constructor(){this.caches=new Map(Object.keys(REGIONS).map(key=>[key,new Map()]));this.originReads=0;this.hits=0;this.misses=0;}
  lookup(region,asset='hero.webp'){
    if(!this.caches.has(region))throw new Error('Unknown region');
    const hit=this.caches.get(region).has(asset);
    return {region,asset,hit};
  }
  deliver(request){
    if(!request||!this.caches.has(request.region))throw new Error('Unknown region');
    const cache=this.caches.get(request.region);
    if(request.hit){this.hits++;return cache.get(request.asset);}
    this.misses++;this.originReads++;
    const data={asset:request.asset,source:'origin'};cache.set(request.asset,data);return data;
  }
  purge(){for(const cache of this.caches.values())cache.clear();}
}
