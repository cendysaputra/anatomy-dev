import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from './model.mjs';
const advance=(m,n=100)=>{for(let i=0;i<n;i++)m.tick(.1);};
test('round robin distributes, completes, and conserves requests',()=>{const m=new Simulation();for(let i=0;i<12;i++)m.send();advance(m);assert.deepEqual(m.servers.map(s=>s.assigned),[4,4,4]);assert.equal(m.completed,12);assert.equal(m.inflight,0);assert.equal(m.servers.reduce((a,s)=>a+s.active,0),0);});
test('smooth weighted routing gives 3:2:1 and skips an unhealthy server',()=>{const m=new Simulation();m.setAlgorithm('weighted');for(let i=0;i<60;i++)m.send();m.tick(.9);assert.deepEqual(m.servers.map(s=>s.assigned),[30,20,10]);m.toggle(0);for(let i=0;i<30;i++)m.send();m.tick(.9);assert.deepEqual(m.servers.map(s=>s.assigned),[30,40,20]);});
test('least connections selects the least busy server',()=>{const m=new Simulation();m.setAlgorithm('least');m.servers[0].active=5;m.servers[1].active=2;assert.equal(m.choose().id,2);});
test('outage fails active requests; new requests bypass the failed server',()=>{const m=new Simulation();for(let i=0;i<3;i++)m.send();m.tick(.9);m.toggle(0);assert.equal(m.failed,1);assert.equal(m.servers[0].active,0);for(let i=0;i<6;i++)m.send();advance(m);assert.equal(m.servers[0].assigned,1);assert.equal(m.completed,8);assert.equal(m.sent,m.completed+m.failed+m.inflight);});
test('all down returns 503, recovery and reset work',()=>{const m=new Simulation();for(let i=0;i<3;i++)m.toggle(i);m.send();advance(m);assert.equal(m.failed,1);m.toggle(1);m.send();advance(m);assert.equal(m.completed,1);m.reset();assert.equal(m.sent,0);assert.ok(m.servers.every(s=>s.up&&s.active===0));});
