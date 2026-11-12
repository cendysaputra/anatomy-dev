import {readFileSync,existsSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {keys,body} from './layout.mjs';
import {layers,displacement} from './motion.mjs';
test('104 key ANSI layout fits case with no overlapping keys',()=>{
 assert.equal(keys.length,104);
 for(const [i,a]of keys.entries()){
  assert.ok(a.x>body.x&&a.y>body.y&&a.x+a.w<body.x+body.w&&a.y+a.d<body.y+body.d);
  for(const b of keys.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.d<=b.y||b.y+b.d<=a.y);
 }
});
test('scroll endpoints assemble exactly and expose every layer',()=>{
 for(const [name,{offset}]of Object.entries(layers)){
  assert.ok(displacement(name,-1).every(v=>v===0));
  assert.deepEqual(displacement(name,1),offset);
  assert.deepEqual(displacement(name,2),offset);
  for(let t=0;t<1;t+=.05)assert.ok(displacement(name,t).every(Number.isFinite));
  assert.deepEqual(displacement(name,0.4),displacement(name,0.4));
 }
});

// Vercel rewrites /keyboard to its index without adding a trailing slash.
test('animation entry loads from every supported keyboard URL',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const entry=html.match(/<script type="module" src="([^"]+)"/)[1];
 for(const route of ['/keyboard','/keyboard/','/keyboard/index.html']){
  const resolved=new URL(entry,'https://anatomy.example'+route);
  assert.equal(resolved.pathname,'/keyboard/app.mjs');
  assert.ok(existsSync(new URL('..'+resolved.pathname,import.meta.url)));
 }
});

import {labels,labelOpacity,arrangeLabels} from './labels.mjs';
test('every component layer is labelled and labels stay hidden until opening',()=>{
 assert.deepEqual(new Set(labels.map(l=>l.layer)),new Set(Object.keys(layers)));
 assert.equal(new Set(labels.map(l=>l.id)).size,labels.length);
 for(const label of labels){assert.equal(labelOpacity(label.layer,0),0);assert.equal(labelOpacity(label.layer,1),1)}
});
test('crowded label anchors keep readable spacing within the stage',()=>{
 for(const height of [240,640]){
  const arranged=arrangeLabels([10,11,12,height-1,height+20].map((y,id)=>({y,id})),height);
  assert.ok(arranged[0].y>=24);
  assert.ok(arranged.at(-1).y<=height-24);
  for(let i=1;i<arranged.length;i++)assert.ok(arranged[i].y-arranged[i-1].y>=30);
 }
});

import {typingOrder,canType,keyTravel} from './typing.mjs';
test('idle typing covers all 104 rendered keys once per cycle',()=>{
 assert.equal(typingOrder.length,keys.length);
 assert.equal(new Set(typingOrder).size,keys.length);
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const rendered=[...html.matchAll(/data-key="(\d+)"/g)].map(m=>Number(m[1]));
 assert.deepEqual(rendered.sort((a,b)=>a-b),[...typingOrder].sort((a,b)=>a-b));
});
test('typing runs only while fully assembled, visible and motion is allowed',()=>{
 const closed={target:0,current:0,reduced:false,hidden:false};
 assert.equal(canType(closed),true);
 for(const change of [{target:.01},{current:.01},{reduced:true},{hidden:true}])assert.equal(canType({...closed,...change}),false);
});

test('key press travels down and returns fully without overshooting',()=>{
 assert.equal(keyTravel(0),0);assert.equal(keyTravel(90),1);assert.equal(keyTravel(270),0);
 for(let t=0;t<=300;t+=5)assert.ok(keyTravel(t)>=0&&keyTravel(t)<=1);
});
