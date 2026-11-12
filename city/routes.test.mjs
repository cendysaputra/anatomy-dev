import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roundedLoop,sample,cityTraffic,BLOCKS} from './routes.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
test('loop position and direction join without a reset jump',()=>{const r=roundedLoop(-20,-20,40,40);const a=sample(r,0),b=sample(r,r.length);near(a.x,b.x);near(a.y,b.y);near(a.angle,b.angle);const before=sample(r,r.length-.001),after=sample(r,.001);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.003);assert.ok(Math.cos(before.angle-after.angle)>.999);});
test('every straight and turn has a continuous tangent',()=>{const r=roundedLoop(0,0,87,87);let d=0;for(const p of r.parts){d+=p.length;const a=sample(r,d-1e-5),b=sample(r,d+1e-5);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<3e-5);assert.ok(Math.cos(a.angle-b.angle)>.999999);}});
test('one car on every other block loop stays on its road',()=>{const {loops,cars}=cityTraffic();assert.equal(loops.length,BLOCKS*BLOCKS);assert.equal(cars.length,Math.ceil(BLOCKS*BLOCKS/2));for(const c of cars){assert.equal(c.loop%2,0);for(let t=0;t<100;t+=.23){const p=sample(loops[c.loop],c.offset+t*c.speed);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}}});
