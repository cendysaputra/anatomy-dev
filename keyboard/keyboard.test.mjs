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
