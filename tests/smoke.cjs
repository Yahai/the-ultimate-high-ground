/* Dependency-free regression checks for the actual orbital functions in assets/game.js. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const js = fs.readFileSync(path.join(root,'assets/game.js'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/site.css'),'utf8');
for (const p of ['assets/game.js','assets/strategy.mjs','assets/site.css','assets/favicon.svg','assets/war-room.jpg','assets/satellite-hero.jpg','assets/satellite-dossier.jpg']) {
  assert(fs.existsSync(path.join(root,p)), `Missing deployed file: ${p}`);
}
assert(html.includes('<script type="module" src="assets/game.js"'), 'Entry point missing');
assert(html.includes('href="assets/site.css"'), 'Stylesheet missing');
assert(js.includes('requestAnimationFrame(this.animate)'), 'Missing animation loop');
assert(js.includes('SAVE_KEY'), 'Missing campaign saving');
assert(js.includes("from './strategy.mjs'"), 'Strategy engine is not imported');
assert(js.includes('event-decision-overlay'), 'Event decision UI missing');
assert(!html.includes('data:image/'), 'Unexpected inline imagery');
assert(!css.includes('data:image/'), 'Image extraction incomplete');
assert(!js.includes('data:image/'), 'Image extraction incomplete');

class Vector3 {
  constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; }
  clone(){return new Vector3(this.x,this.y,this.z)}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z}
  multiplyScalar(a){this.x*=a;this.y*=a;this.z*=a;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
}
const start = js.indexOf('const EARTH_RADIUS_KM = ');
const end = js.indexOf('function makeLabel(', start);
assert(start>=0 && end>start, 'Orbital routines missing');
const ctx = {THREE:{Vector3}};
vm.runInNewContext(js.slice(start,end)+'\nthis.testAPI={orbitPeriodSeconds,orbitState,orbitToTabletop};', ctx);
const {orbitPeriodSeconds,orbitState,orbitToTabletop} = ctx.testAPI;
const geo = {altitude:35786,class:'GEO'};
const geo1=orbitState(geo,0), geo2=orbitState(geo,7*86400);
assert.equal(geo1.lon,42.5);
assert.equal(geo1.lat,0);
assert(geo1.ecef.clone().sub(geo2.ecef).length()<1e-7,'GEO must remain Earth-fixed');
const leo = {altitude:700,class:'SSO',inclination:98,raanDeg:10.1,phaseDeg:9.0};
const a=orbitState(leo,0), b=orbitState(leo,60), c=orbitState(leo,orbitPeriodSeconds(leo));
assert(Math.abs(orbitPeriodSeconds(leo)/60-99)<2,'Unexpected 700-km orbital period');
assert(a.ecef.clone().sub(b.ecef).length()>300, 'LEO should change position over one minute');
assert(Math.abs(a.ecef.length()-7071)<1e-6, 'LEO radius must match altitude');
assert(Math.abs(a.lat-c.lat)<0.1,'Latitude should return after one orbit (Earth rotates under the path)');
const pa=orbitToTabletop(a.ecef), pb=orbitToTabletop(orbitState(leo,orbitPeriodSeconds(leo)/4).ecef);
assert(Math.abs(pa.y-pb.y)>1, 'Tabletop orbital pass must not be a horizontal ring');
console.log('PASS: static deployment assets, independent animation, GEO, LEO, tabletop orbit geometry, save system.');