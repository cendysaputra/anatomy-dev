import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CityCamera} from './camera.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
test('starts closer to the center of the city',()=>{const c=new CityCamera(1100,660);near(c.zoom,2.2);near(c.box.x+c.box.width/2,550);near(c.box.y+c.box.height/2,330);});
test('zoom keeps the selected world point under the cursor',()=>{const c=new CityCamera(1100,660);const b=c.box,f={x:.65,y:.4},p={x:b.x+b.width*f.x,y:b.y+b.height*f.y};c.zoomAt(3,p);near((p.x-c.box.x)/c.box.width,f.x);near((p.y-c.box.y)/c.box.height,f.y);});
test('pan and zoom are bounded and fit shows the whole map',()=>{const c=new CityCamera(1100,660);c.zoomAt(999);assert.equal(c.zoom,4);c.pan(-1e6,1e6);near(c.x,0);near(c.y,660-c.box.height);c.fit();near(c.zoom,1);near(c.x,0);near(c.y,0);near(c.box.width,1100);near(c.box.height,660);});
test('portrait viewport retains its center and fits the complete scene',()=>{const c=new CityCamera(1100,660);c.resize(390/480);near(c.box.width/c.box.height,390/480);near(c.box.x+c.box.width/2,550);near(c.box.y+c.box.height/2,330);c.fit();assert.ok(c.box.width>=1100&&c.box.height>=660);near(c.box.y+c.box.height/2,330);});
test('invalid wheel values do not corrupt the camera',()=>{const c=new CityCamera(1100,660),before=c.box;c.zoomAt(NaN);c.pan(Infinity,0);c.resize(0);assert.deepEqual(c.box,before);});
