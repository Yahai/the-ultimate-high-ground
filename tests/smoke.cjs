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
for (const p of ['assets/game.js','assets/strategy.mjs','assets/orbital.mjs','assets/site.css','assets/favicon.svg','assets/war-room.jpg','assets/satellite-hero.jpg','assets/satellite-dossier.jpg']) {
  assert(fs.existsSync(path.join(root,p)), `Missing deployed file: ${p}`);
}
assert(html.includes('<script type="module" src="assets/game.js"'), 'Entry point missing');
assert(html.includes('href="assets/site.css"'), 'Stylesheet missing');
assert(js.includes('requestAnimationFrame(this.animate)'), 'Missing animation loop');
assert(js.includes('SAVE_KEY'), 'Missing campaign saving');
assert(js.includes("from './strategy.mjs'"), 'Strategy engine is not imported');
assert(js.includes("from './orbital.mjs'"), 'Shared orbital model is not imported');
assert(js.includes('missionPanel'), 'Missing mission-control interface');
assert(js.includes('requestLandscapeFullscreen'), 'Missing mobile fullscreen handler');
assert(js.includes('mobile-bottom-nav'), 'Missing mobile command dock');
assert(js.includes('rotate-device'), 'Missing portrait guidance');
assert(css.includes('@media (pointer:coarse) and (orientation:landscape)'), 'Missing landscape layout');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.orientation,'landscape');
assert.equal(manifest.display,'fullscreen');
assert(js.includes('event-decision-overlay'), 'Event decision UI missing');
assert(js.includes('project-portfolio'), 'Strategic portfolio UI missing');
assert(!js.includes('SCENARIO INVESTMENT BUDGET'), 'Outdated simulation banner still in primary UI');
assert(!js.includes('SECURE SIMULATION ENVIRONMENT'), 'Outdated simulation footer still in primary UI');
assert(!html.includes('data:image/'), 'Unexpected inline imagery');
assert(!css.includes('data:image/'), 'Image extraction incomplete');
assert(!js.includes('data:image/'), 'Image extraction incomplete');

console.log('PASS: deployment assets, shared orbital module, mission-control interface, animation loop, and save system.');