import assert from 'node:assert/strict';
import {createCampaign,campaignDateLabel,computeMetrics,advanceCampaign,applyDirective,resolveEvent,programmeRemaining,MAX_TURNS} from '../assets/strategy.mjs';
const almost=(a,b)=>Math.abs(a-b)<1e-8;
assert.equal(campaignDateLabel(1),'Q4 2026');
assert.equal(campaignDateLabel(2),'Q1 2027');
assert.equal(campaignDateLabel(5),'Q4 2027');
assert.equal(campaignDateLabel(40),'Q3 2036');
let s=createCampaign();
assert.equal(s.version,2);
assert.equal(s.turn,1);
assert.equal(s.commercialCredits,2);
assert(computeMetrics(s).coverage<25);
assert.equal(computeMetrics(s).deployed.length,0);
// Research is not an immediate capability upgrade.
let r=applyDirective(s,'fund','sat3');assert(!r.error);
s=r.state;assert.equal(s.programmes.sat3,'research');assert.equal(programmeRemaining(s,'sat3'),4);
assert.equal(computeMetrics(s).coverage,computeMetrics(createCampaign()).coverage);
assert(applyDirective(s,'deploy','sat3').error,'Cannot commission before qualification');
assert(applyDirective(s,'fund','sat3').error,'Cannot purchase R&D twice');
// Every third quarterly turn requires a strategic event decision.
r=advanceCampaign(s);assert.equal(r.state.turn,2);assert.equal(r.state.pendingEvent,'flood');s=r.state;
assert(advanceCampaign(s).error,'Pending event blocks advance');
assert(applyDirective(s,'upgrade','nasrda').error,'Pending event blocks investment');
r=resolveEvent(s,'coordinate');assert(!r.error);s=r.state;
assert.equal(s.pendingEvent,null);
for(let i=0;i<3;i++){
  s=advanceCampaign(s).state;
  if(s.pendingEvent){const choice={flood:'defer',outage:'accept',research:'pass',debris:'ignore',budget:'protect',supplier:'delay'};const resolved=resolveEvent(s,choice[s.pendingEvent]);assert(!resolved.error);s=resolved.state;}
}
assert.equal(s.programmes.sat3,'ready','Research must become ready after 4 quarters');
assert(applyDirective(s,'deploy','sat3').error,'Ground dependency should prevent direct commission');
s=applyDirective(s,'upgrade','abuja').state;
assert.equal(s.groundLevel,2);
s=applyDirective(s,'deploy','sat3').state;
assert.equal(s.programmes.sat3,'deployed');
assert(computeMetrics(s).coverage>computeMetrics(createCampaign()).coverage,'Commissioning + ground must improve real coverage');
assert(computeMetrics(s).upkeep>computeMetrics(createCampaign()).upkeep,'New satellite has recurring costs');
// Intelligence and threat are separate dimensions: imagery never directly changes risk.
const beforeRisk=s.threats.hadin, beforeIntel=s.intel.hadin;
s=applyDirective(s,'observe','hadin').state;
assert.equal(s.threats.hadin,beforeRisk);
assert(s.intel.hadin>beforeIntel);
// Full game must remain deterministic and every branch returns bounded sensible numbers.
let trial=createCampaign();
for(let i=1;i<MAX_TURNS;i++){
  const result=advanceCampaign(trial);
  assert(!result.error,`Turn ${i} cannot advance`);
  trial=result.state;
  if(trial.pendingEvent){
    const options={flood:'defer',outage:'accept',research:'pass',debris:'ignore',budget:'protect',supplier:'delay'};
    trial=resolveEvent(trial,options[trial.pendingEvent]).state;
  }
  assert(trial.budget>=0);
  for(const key of ['integrity','support','groundHealth','groundReliability'])assert(trial[key]>=0&&trial[key]<=100);
  if(trial.outcome)break;
}
assert(trial.outcome,'Campaign should eventually have a win/loss determination');
// Saving compatibility: v1 funded transitions to research, without inventing deployments.
const migrated=createCampaign({version:1,turn:9,budget:900,programmes:{sat3:'funded'},researchTurn:{sat3:7},logs:[]});
assert.equal(migrated.programmes.sat3,'research');assert.equal(migrated.budget,900);
assert(!migrated.outcome);
const copy=createCampaign({...s,version:2});assert.equal(copy.programmes.sat3,'deployed');
assert.equal(JSON.stringify(createCampaign()),JSON.stringify(createCampaign()),'New campaign deterministic');
console.log('PASS: quarterly calendar, V1 migration, research pipeline, gated commissioning, recurring costs, independent intelligence and coverage, event decisions, full campaign outcome.');