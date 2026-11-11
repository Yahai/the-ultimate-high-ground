import assert from 'node:assert/strict';
import {createCampaign,applyDirective,queueMission,analyseProduct,advanceCampaign,computeMetrics,resolveEvent} from '../assets/strategy.mjs';
function commissioned(ids=['sar']){
  return createCampaign({version:3,budget:1400,groundLevel:2,programmes:Object.fromEntries(ids.map(id=>[id,'deployed'])),bandwidth:75});
}
let s=createCampaign();
assert(queueMission(s,'sar','delta').error,'Concept should not be taskable');
assert(queueMission(s,'geo','delta').error,'GEO communications should not be imaging');
assert(queueMission(s,'ais','hadin').error,'Uncommissioned maritime-only satellite cannot observe elsewhere');
s=commissioned();
const base=computeMetrics(s);
assert.equal(s.dataProducts.length,0);
const r=queueMission(s,'sar','savannah');assert(!r.error,r.message);
s=r.state;assert.equal(s.missionQueue.length,1);assert.equal(s.dataProducts.length,0);
const turn=advanceCampaign(s);assert(!turn.error);s=turn.state;
assert.equal(s.missionQueue.length,0);assert.equal(s.missionHistory[0].status,'delivered');
assert.equal(s.dataProducts[0].analysedTurn,null);
assert.equal(computeMetrics(s).unprocessed,1);
const intelBefore=s.intel.savannah,metricBefore=computeMetrics(s).regionalCoverage.savannah,riskBefore=s.threats.savannah;
// A standard recurring event can block analytical work until a decision is made.
if(s.pendingEvent)s=resolveEvent(s,'coordinate').state;
const productId=s.dataProducts[0].id;
let analysed=analyseProduct(s,productId);
assert(!analysed.error,analysed.message);
s=analysed.state;
assert(s.intel.savannah>intelBefore);
assert(computeMetrics(s).regionalCoverage.savannah>metricBefore);
assert.equal(s.threats.savannah,riskBefore);
assert(analyseProduct(s,productId).error,'Cannot process same product twice');
assert.equal(computeMetrics(s).unprocessed,0);
// No immediate free intelligence gain from buying or queuing a mission.
let q=queueMission(s,'sar','hadin');assert(!q.error);assert.equal(q.state.intel.hadin,s.intel.hadin);
// Queue limits depend on ground infrastructure, even with ample spacecraft.
let cap=commissioned(['sar','sat3','ais']);
for(let j=0;j<3;j++){
  const result=queueMission(cap,'sar',['hadin','fansan','savannah'][j]);assert(!result.error);cap=result.state;
}
assert(queueMission(cap,'sar','delta').error,'No more than 3 tasks with ground network L2');
const completed=advanceCampaign(cap).state;
assert.equal(completed.missionHistory.length,3);
assert.equal(completed.missionHistory.filter(t=>t.status==='delivered').length,2,'Level 2 should only serve 2 downlinks in representative window');
assert.equal(completed.missionHistory.filter(t=>t.status==='missed').length,1);
// Degraded receiving network means a mission cannot deliver imagery.
let broken=commissioned();
broken=queueMission(broken,'sar','delta').state;
broken.groundHealth=38;
broken=advanceCampaign(broken).state;
assert.equal(broken.missionHistory[0].status,'missed');
assert.equal(broken.dataProducts.length,0);
// Campaign version migration keeps old investments and gives new mission defaults.
const migrated=createCampaign({version:2,turn:8,budget:650,programmes:{sar:'research'},groundLevel:2});
assert.equal(migrated.version,5);assert.equal(migrated.missionQueue.length,0);assert.equal(migrated.missionEpochSeconds,7*14*86400);
console.log('PASS: mission eligibility, queueing costs, orbital delivery, ground limits/failures, analysis, independence from risk, save migration.');