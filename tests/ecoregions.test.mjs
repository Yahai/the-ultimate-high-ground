import assert from 'node:assert/strict';
import {biomeBlend,cloudCover,cloudOpacity,campaignQuarter} from '../assets/ecoregions.mjs';
import {propagateOrbit} from '../assets/orbital.mjs';
import {readFileSync} from 'node:fs';
const input=(lon,lat)=>biomeBlend(lon,lat,1,.5);
const sahel=input(8.4,13.3),rainforest=input(6.8,5.9),savannah=input(9.7,9.5);
assert(sahel[0]>rainforest[0]*2,'Sahel should be warmer/lighter than rainforest');
assert(rainforest[1]>rainforest[0]*2,'Rainforest should look green');
assert(savannah[0]>rainforest[0]&&savannah[0]<sahel[0],'Woodland transitional ecotone');
for(let lon=3;lon<=14;lon+=1.5){for(let lat=4.4;lat<=13.5;lat+=.9){
 const color=input(lon,lat);assert(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 for(const q of [1,2,3,4]){const c=cloudCover(lon,lat,q);assert(c>=0&&c<=1);assert(cloudOpacity(lon,lat,q)>=0);}
}}
assert(cloudCover(6.3,6.1,3)>.5,'Southern monsoon must be visibly cloudy');
assert(cloudCover(6.3,6.1,3)>cloudCover(6.3,6.1,1)+.28,'Peak-rain cover must exceed dry season');
assert(cloudCover(8.5,12.4,1)<cloudCover(8.5,12.4,3),'Northern monsoon seasonality');
assert.deepEqual([1,2,3,4,5,6].map(campaignQuarter),[4,1,2,3,4,1]);
const asset={class:'GEO',altitude:35786,inclination:0};
const t0=propagateOrbit(asset,0),t1=propagateOrbit(asset,400*86400);
assert.equal(t0.lon,42.5);assert.equal(t0.lon,t1.lon);
assert.deepEqual(t0.ecef,t1.ecef,'NigComSat GEO must be fixed in Earth-centred Earth-fixed coordinates');
const scene=readFileSync(new URL('../assets/game.js',import.meta.url),'utf8');
assert(scene.includes("a.class==='GEO' ? -.08 : -t*.0008"),'Orbital display must not make GEO spin with simulation time');
assert(scene.includes('this.stationFeedWorld(model)'),'Signal start must be station feed-horn world position');
assert(scene.includes('pulse.position.copy(feed).lerp(link.source,frac)'),'Packet must advance from feed to GEO spacecraft');
assert(scene.includes('new THREE.SphereGeometry(2.43'),'Ground-station radome shell missing');
assert(scene.includes('this.setSeason(quarter)'),'Campaign weather must update when quarter changes');
assert(scene.includes('terrainGeo.setIndex(indices)'),'Smooth indexed elevation mesh required');
console.log('PASS: biomes, seasonal cloud intensity, quarter changes, GEO stationarity, ground feed and animated signal paths');