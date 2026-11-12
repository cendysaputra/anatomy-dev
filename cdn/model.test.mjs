import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CDN} from './model.mjs';
test('first miss fills its edge; repeat hit does not read origin',()=>{const cdn=new CDN();const first=cdn.lookup('jakarta');assert.equal(first.hit,false);cdn.deliver(first);const second=cdn.lookup('jakarta');assert.equal(second.hit,true);cdn.deliver(second);assert.equal(cdn.originReads,1);assert.equal(cdn.hits,1);assert.equal(cdn.misses,1);});
test('regional caches fill independently',()=>{const cdn=new CDN();cdn.deliver(cdn.lookup('jakarta'));assert.equal(cdn.lookup('frankfurt').hit,false);cdn.deliver(cdn.lookup('frankfurt'));assert.equal(cdn.originReads,2);assert.ok(cdn.lookup('jakarta').hit&&cdn.lookup('frankfurt').hit);});
test('purge removes copies from both edges and preserves request counts',()=>{const cdn=new CDN();for(const key of ['jakarta','frankfurt'])cdn.deliver(cdn.lookup(key));cdn.purge();assert.equal(cdn.lookup('jakarta').hit,false);assert.equal(cdn.lookup('frankfurt').hit,false);cdn.deliver(cdn.lookup('jakarta'));assert.equal(cdn.originReads,3);});
