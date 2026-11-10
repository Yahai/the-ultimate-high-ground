import assert from 'node:assert/strict';
import {propagateOrbit,orbitPeriodSeconds,forecastPasses,findGroundContact,planMission,MISSION_ASSETS,MISSION_REGIONS,RECEIVERS,formatHours,elevationDeg} from '../assets/orbital.mjs';
const geo={class:'GEO',altitude:35786};
const g0=propagateOrbit(geo,0),g7=propagateOrbit(geo,7*86400);
assert.equal(g0.lon,42.5);assert.equal(g0.lat,0);
assert(Math.hypot(g0.ecef.x-g7.ecef.x,g0.ecef.y-g7.ecef.y,g0.ecef.z-g7.ecef.z)<1e-6);
const sat=MISSION_ASSETS.sat3;
const s0=propagateOrbit(sat,0),s60=propagateOrbit(sat,60);
assert(Math.abs(orbitPeriodSeconds(sat)/60-99)<2);
assert(Math.hypot(s0.ecef.x-s60.ecef.x,s0.ecef.y-s60.ecef.y,s0.ecef.z-s60.ecef.z)>300);
assert(Math.abs(Math.hypot(s0.ecef.x,s0.ecef.y,s0.ecef.z)-7071)<1e-5);
assert(Number.isFinite(elevationDeg(s0.ecef,9.15,7.48)));
for(const [id,asset] of Object.entries(MISSION_ASSETS)){
  const targets=id==='ais'?['delta']:Object.keys(MISSION_REGIONS);
  for(const region of targets){
    const p=planMission(id,region,0,2);
    assert(!p.error,`${id}/${region}: ${p.error}`);
    assert(p.passCount>0);
    assert(p.closestKm<=asset.footprintKm);
    assert(p.receiverAvailable,`${id}/${region} should find a 12h ground contact`);
    assert(p.pass.downlink.timeSeconds>=p.pass.peakSeconds);
    assert(p.pass.downlink.timeSeconds<=p.pass.peakSeconds+12*3600);
  }
}
assert(planMission('ais','hadin',0,1).error);
assert.deepEqual(forecastPasses(geo,MISSION_REGIONS.hadin,0),[]);
assert.equal(findGroundContact(MISSION_ASSETS.sar,0,[]),null);
assert.equal(formatHours(48.5),'D+2 00:30');
console.log('PASS: shared ECEF propagator, GEO station keeping, LEO motion, orbital pass windows, independent ground downlink visibility, mission eligibility.');