import { planMission, MISSION_ASSETS, MISSION_REGIONS, MISSION_HORIZON_S, DAY_S } from './orbital.mjs';
/** The Ultimate High Ground — deterministic, fictional strategic simulation.
 * This pure module contains no DOM, React, Three.js or military operational data.
 * All money values are game billions of naira; satellite/programme data are synthetic.
 */
export const MAX_TURNS = 40;
export const VERSION = 5;
export const PROGRAMMES = Object.freeze({
  sat3: {name:'NigeriaSat-3 optical programme',research:4,researchCost:95,commissionCost:270,upkeep:18,coverage:22,autonomy:19,processing:9},
  sar: {name:'Nigeria SAR research programme',research:6,researchCost:145,commissionCost:340,upkeep:24,coverage:30,autonomy:25,processing:16},
  ais: {name:'Maritime AIS smallsat concept',research:3,researchCost:70,commissionCost:165,upkeep:10,coverage:13,autonomy:12,processing:6}
});
export const PROJECTS=Object.freeze({
  exchange:{name:'Emergency Data Exchange',cost:160,quarters:2,upkeep:6,icon:'shield-check',summary:'Faster crisis coordination and stronger communications resilience.',impact:'Ground reliability +10 · response decisions improve'},
  fusion:{name:'National Data Fusion Backbone',cost:205,quarters:3,upkeep:8,icon:'database',summary:'Increase imagery processing and eliminate downlink bottlenecks.',impact:'Processing +30 · +1 receiving slot · cheaper analysis'},
  academy:{name:'Space Systems Integration Academy',cost:145,quarters:3,upkeep:5,icon:'graduation-cap',summary:'Develop specialists who accelerate future spacecraft qualification.',impact:'Research +18 · spacecraft research accelerated'}
});
export const MILESTONES=Object.freeze([
 {id:'resilience',name:'Resilient services',description:'Complete Emergency Data Exchange with 75% ground reliability.',reward:40,support:2},
 {id:'data',name:'Information advantage',description:'Complete Data Fusion Backbone and receive one satellite product.',reward:55,support:2},
 {id:'innovation',name:'Engineering independence',description:'Complete the Academy and qualify one spacecraft design.',reward:65,support:3}
]);
export const THEATRE_IDS=['hadin','fansan','savannah','delta'];
export const EVENTS=Object.freeze([
  {id:'flood',title:'Seasonal flood emergency',brief:'A flood-monitoring request requires verified imagery and rapid processing. How should the programme respond?',options:[
    {id:'contract',label:'Purchase rapid-response partner imagery',cost:45,confidence:12,support:3,integrity:1,deltaRisk:-2,requires:'budget',description:'Fast information, higher immediate cost'},
    {id:'coordinate',label:'Reprioritise existing ground analysis',cost:12,bandwidth:-8,confidence:6,support:1,description:'Lower cost, reduced spare processing capacity'},
    {id:'defer',label:'Delay the assessment',cost:0,confidence:-8,support:-5,deltaRisk:4,description:'No expenditure, public confidence declines'}]},
  {id:'outage',title:'Satellite communications disruption',brief:'A service anomaly threatens nationally contracted communications availability.',options:[
    {id:'redundancy',label:'Activate redundant capacity contracts',cost:65,integrity:3,support:2,reliability:12,description:'Expensive but protects the network'},
    {id:'repair',label:'Run emergency resilience maintenance',cost:24,reliability:6,integrity:1,description:'More economical partial restoration'},
    {id:'accept',label:'Accept degraded service',cost:0,reliability:-12,integrity:-5,support:-2,description:'No cash outlay; operational resilience deteriorates'}]},
  {id:'research',title:'Unexpected research opportunity',brief:'A university partnership offers a component-testing programme at subsidised cost.',options:[
    {id:'invest',label:'Support the research partnership',cost:40,research:14,autonomy:4,description:'Strengthens domestic engineering expertise'},
    {id:'pilot',label:'Fund a limited pilot',cost:15,research:5,description:'Smaller learning benefit'},
    {id:'pass',label:'Decline this opportunity',cost:0,description:'Preserves the budget'}]},
  {id:'debris',title:'Orbital debris advisory',brief:'A conjunction-risk warning affects future spacecraft service planning.',options:[
    {id:'monitor',label:'Fund independent conjunction analysis',cost:30,integrity:2,reliability:5,research:3,description:'Improves planning and risk awareness'},
    {id:'partners',label:'Use external tracking partnerships',cost:12,integrity:1,reliability:2,description:'Limited resilience, lower cost'},
    {id:'ignore',label:'No additional monitoring',cost:0,integrity:-3,reliability:-5,description:'Accept exposure '}]},
  {id:'budget',title:'Annual fiscal review',brief:'Parliamentary priorities are competing with the national space programme. Your response will affect future appropriations.',options:[
    {id:'audit',label:'Demonstrate verified civilian benefits',cost:25,support:3,integrity:2,appropriation:25,description:'Higher future grants, but costs effort'},
    {id:'protect',label:'Protect current projects',cost:0,support:-2,appropriation:0,description:'No immediate expense, weaker public case'},
    {id:'cut',label:'Accept a reduced investment portfolio',cost:0,appropriation:-30,support:1,description:'Maintains public goodwill but loses future revenue'}]},
  {id:'supplier',title:'Space systems procurement delay',brief:'A supply-chain setback threatens delivery schedules for developing spacecraft.',options:[
    {id:'alternate',label:'Pay for qualified alternate suppliers',cost:55,research:2,description:'Avoids the delay with expensive procurement'},
    {id:'delay',label:'Accept a one-quarter schedule slip',cost:0,delay:1,description:'Budget preserved, programme completion postponed'},
    {id:'localise',label:'Invest in domestic integration skills',cost:35,research:8,autonomy:3,description:'Capacity benefit but does not eliminate the delay'}]},
  {id:'coast',title:'Maritime service expansion',brief:'Port authorities request wider vessel-pattern monitoring and more reliable coastal communications. Which service should take priority?',options:[
    {id:'expand',label:'Expand coastal data access',cost:52,confidence:6,deltaRisk:-3,support:2,description:'Improves coastal awareness at high cost'},
    {id:'pilot',label:'Run a targeted harbour pilot',cost:19,confidence:3,deltaRisk:-1,description:'Focused results without a national commitment'},
    {id:'postpone',label:'Postpone the contract',cost:0,support:-2,deltaRisk:3,description:'No cost now; service gaps grow'}]},
  {id:'backlog',title:'Processing backlog',brief:'A surge of Earth-observation data arrives as ground infrastructure approaches peak capacity.',options:[
    {id:'automate',label:'Fund data-processing automation',cost:55,bandwidth:14,reliability:2,description:'Permanent throughput boost, sizeable cost'},
    {id:'triage',label:'Prioritise the most urgent products',cost:12,confidence:3,bandwidth:3,description:'Immediate insight with less capacity gain'},
    {id:'ignore',label:'Maintain the existing queue',cost:0,reliability:-5,support:-2,description:'Preserves cash but slows decisions'}]}
]);
export function milestoneStatus(s){
  return MILESTONES.map(m=>({ ...m,
    earned:!!s.milestones?.[m.id],
    ready:m.id==='resilience'?s.projects?.exchange?.status==='complete'&&s.groundReliability>=75
      :m.id==='data'?s.projects?.fusion?.status==='complete'&&s.missionsCompleted>=1
      :s.projects?.academy?.status==='complete'&&Object.values(s.programmes||{}).some(x=>x==='ready'||x==='deployed') }));
}
function awardMilestones(s){
  for(const item of milestoneStatus(s)){
    if(item.earned||!item.ready)continue;
    s.milestones[item.id]=true;
    s.budget=money(s.budget+item.reward);
    s.support=clamp(s.support+item.support);
    log(s,`MILESTONE: ${item.name}. ₦${item.reward}B programme grant earned; public support +${item.support}.`,'success');
  }
}
export function projectRemaining(s,id){
  const p=s.projects?.[id];return p?.status==='active'?Math.max(0,p.finishTurn-s.turn):0;
}
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const money=n=>Math.round(n*10)/10;
const clone=s=>JSON.parse(JSON.stringify(s));
const stageDefaults=()=>({sat3:'concept',sar:'concept',ais:'concept'});
export function createCampaign(legacy=null){
  const c={version:VERSION,turn:1,maxTurns:MAX_TURNS,budget:1450,bandwidth:48.4,support:72,integrity:94,
    threats:{hadin:68,fansan:62,savannah:57,delta:50},
    intel:{hadin:42,fansan:39,savannah:45,delta:49},
    fuel:{geo:88,sat3:100,sar:100,ais:100},
    progress:{a17:28,m04:52,j11:15},programmes:stageDefaults(),researchTurn:{},researchDelay:{},
    groundLevel:1,groundHealth:85,groundReliability:80,researchCapacity:20,appropriation:115,
    commercialCredits:2,consecutiveShortfalls:0,geoExtension:false,launchFunded:false,projects:{},milestones:{},
    pendingEvent:null,resolvedEvents:{},outcome:null,score:0,
    firstLight:{status:'active',inspected:false,imagery:false,resilience:false,outcome:null,completedTurn:null,choice:null,score:null},
    missionEpochSeconds:0,missionQueue:[],missionHistory:[],dataProducts:[],nextMissionId:1,missionsCompleted:0,
    logs:[{turn:1,type:'success',text:'Q4 2026 baseline established. Build sovereign capability while maintaining public services.'},
          {turn:1,type:'info',text:'The frontier is yours to build. Choose your first long-term investment.'}]};
  if(!legacy||typeof legacy!=='object')return c;
  // v1 migration is deliberately conservative: preserves spending, choices and the turn.
  for(const k of ['turn','budget','bandwidth','support','integrity','groundLevel','groundHealth','groundReliability','researchCapacity','appropriation','commercialCredits','consecutiveShortfalls','geoExtension','launchFunded','pendingEvent','outcome','missionEpochSeconds','nextMissionId','missionsCompleted']) {
    if(legacy[k]!==undefined)c[k]=legacy[k];
  }
  for(const k of ['threats','intel','fuel','progress','programmes','researchTurn','researchDelay','resolvedEvents','projects','milestones']){
    if(legacy[k]&&typeof legacy[k]==='object'&&!Array.isArray(legacy[k]))c[k]={...c[k],...legacy[k]};
  }
  if(Array.isArray(legacy.logs))c.logs=legacy.logs.slice(0,60);
  // Existing saves keep their progress without unexpectedly starting a tutorial.
  c.firstLight=legacy.firstLight && typeof legacy.firstLight==='object'
    ? {...c.firstLight,...legacy.firstLight} : {...c.firstLight,status:'skipped'};
  for(const name of ['missionQueue','missionHistory','dataProducts'])if(Array.isArray(legacy[name]))c[name]=legacy[name].slice(0,50);
  if(!Number.isFinite(c.missionEpochSeconds)||c.missionEpochSeconds<0)c.missionEpochSeconds=(c.turn-1)*MISSION_HORIZON_S;
  c.turn=clamp(Math.trunc(c.turn),1,MAX_TURNS);
  c.budget=money(Math.max(0,Number(c.budget)||0));
  // A completed v1 campaign is not an automatic victory in v2.
  if(Number(legacy.version)<3){
    c.outcome=null;c.pendingEvent=null;c.consecutiveShortfalls=0;
    c.missionEpochSeconds=(c.turn-1)*MISSION_HORIZON_S;
    for(const id of Object.keys(PROGRAMMES)) if(c.programmes[id]==='funded')c.programmes[id]='research';
  }
  c.version=VERSION;c.maxTurns=MAX_TURNS;
  return c;
}
/** Operation First Light is a fictional civilian flood-response tutorial, not a live incident. */
export const FIRST_LIGHT_STEPS = Object.freeze([
  {id:'inspect',title:'Assess the Niger Delta',detail:'Inspect the Delta theatre and review its initial risk and coverage.',button:'FOCUS DELTA'},
  {id:'imagery',title:'Acquire partner imagery',detail:'Use a partner imagery credit (₦12B) for an environmental assessment.',button:'OPEN IMAGERY DIRECTIVE'},
  {id:'resilience',title:'Invest in local resilience',detail:'Fund the regional civilian resilience package (₦90B); intelligence makes it possible.',button:'OPEN RESILIENCE DIRECTIVE'},
  {id:'advance',title:'Advance to Q1 2027',detail:'Progress the strategic clock to see your first national emergency decision.',button:'ADVANCE QUARTER'},
  {id:'decision',title:'Make the flood-response decision',detail:'Choose the response that balances preparedness, cost and public confidence.',button:'REVIEW DECISION'}
]);
export function firstLightProgress(state){
  const x=state.firstLight||{status:'skipped'};
  const done={inspect:!!x.inspected,imagery:!!x.imagery,resilience:!!x.resilience,advance:state.turn>=2,decision:x.status==='complete'};
  const finished=FIRST_LIGHT_STEPS.filter(i=>done[i.id]).length;
  const next=FIRST_LIGHT_STEPS.find(i=>!done[i.id]);
  return {status:x.status,done,finished,total:FIRST_LIGHT_STEPS.length,next,
    score:x.score,outcome:x.outcome,choice:x.choice,completedTurn:x.completedTurn};
}
export function recordFirstLightInspection(state,regionId){
  if(regionId!=='delta'||state.firstLight?.status!=='active'||state.firstLight.inspected)return state;
  const s=clone(state);s.firstLight.inspected=true;
  log(s,'FIRST LIGHT: Niger Delta civilian exercise region inspected. Select the partner imagery directive.','success');
  return s;
}
export function skipFirstLight(state){
  if(state.firstLight?.status!=='active')return state;
  const s=clone(state);s.firstLight.status='skipped';
  log(s,'Operation First Light briefing dismissed. Free strategy campaign remains available.');
  return s;
}
export function campaignDateLabel(turn){
  const quarterIndex=3+Math.max(0,turn-1); // turn 1 = Q4 2026; turn 2 = Q1 2027
  const q=quarterIndex%4+1;
  const year=2026+Math.floor(quarterIndex/4);
  return `Q${q} ${year}`;
}
export function programmeRemaining(s,id){
  const p=PROGRAMMES[id];if(!p||s.programmes[id]!=='research')return 0;
  const accelerator=s.projects?.academy?.status==='complete'?1:0;
  return Math.max(0,p.research-accelerator+(s.researchDelay?.[id]||0)-(s.turn-(s.researchTurn[id]??s.turn)));
}
export function computeMetrics(s){
  const deployed=Object.keys(PROGRAMMES).filter(id=>s.programmes[id]==='deployed');
  const optical=deployed.includes('sat3'),radar=deployed.includes('sar'),ais=deployed.includes('ais');
  const groundFactor=clamp(s.groundHealth)/100 * Math.min(1,0.55+s.groundLevel*0.14);
  const processingFactor=Math.min(1,Math.max(0,s.bandwidth)/100);
  const groundDependency=groundFactor*(.6+.4*processingFactor);
  const partnerBonus=Math.min(8,s.commercialCredits*2);
  const base=13+partnerBonus+Math.min(13,s.groundLevel*3);
  // Capacity is a potential to observe; delivered and analysed data is a separate outcome.
  const potentialCoverage=clamp((base+(optical?29:0)+(radar?33:0)+(ais?12:0))*groundDependency);
  const recent=(s.dataProducts||[]).filter(p=>p.analysedTurn&&s.turn-p.analysedTurn<=4);
  const regionalCoverage=Object.fromEntries(THEATRE_IDS.map(id=>{
    const availability=id==='delta'?(ais?1.2:.76):(id==='hadin'?(radar?1.08:.9):1);
    const products=recent.filter(p=>p.regionId===id);
    const produced=products.reduce((sum,p)=>sum+(p.quality||65)/9,0);
    return [id,clamp(potentialCoverage*.72*availability+Math.min(38,produced))];
  }));
  const coverage=Object.values(regionalCoverage).reduce((a,b)=>a+b,0)/THEATRE_IDS.length;
  const unprocessed=(s.dataProducts||[]).filter(p=>!p.analysedTurn).length;
  const delivered=(s.missionHistory||[]).filter(p=>p.status==='delivered').length;
  const sovereignty=clamp(18+(optical?23:0)+(radar?28:0)+(ais?15:0)+s.researchCapacity*.16+s.groundLevel*2+(s.launchFunded?3:0));
  const resilience=clamp((s.groundReliability*.55+s.integrity*.45)*(.65+.35*groundFactor));
  const meanRisk=Object.values(s.threats).reduce((a,b)=>a+b,0)/4;
  const score=Math.round(clamp(.28*coverage+.21*sovereignty+.18*resilience+.16*s.support+.17*(100-meanRisk)));
  const upkeep=22+Math.max(0,s.groundLevel-1)*7+(s.geoExtension?-2:0)+deployed.reduce((a,id)=>a+PROGRAMMES[id].upkeep,0)+Object.entries(s.projects||{}).reduce((n,[id,v])=>n+(v.status==='complete'?(PROJECTS[id]?.upkeep||0):0),0);
  return {coverage,potentialCoverage,regionalCoverage,sovereignty,resilience,score,upkeep,meanRisk,deployed,processingFactor,groundFactor,unprocessed,delivered};
}
export function assessCampaign(s){
  const m=computeMetrics(s);
  if(s.integrity<=20)return {kind:'defeat',reason:'Critical loss of sovereign resilience',score:m.score};
  if(s.support<=18)return {kind:'defeat',reason:'Public confidence collapsed',score:m.score};
  if(s.consecutiveShortfalls>=3)return {kind:'defeat',reason:'Three quarters of programme insolvency',score:m.score};
  if(s.turn>=MAX_TURNS){return {kind:m.score>=61&&s.integrity>=50&&m.coverage>=50?'victory':'defeat',reason:m.score>=61&&s.integrity>=50&&m.coverage>=50?'Resilient sovereign architecture established':'National space programme fell short of strategic targets',score:m.score};}
  return null;
}
const error=(state,message)=>({state,message,error:true});
function log(s,text,type='info'){s.logs=[{turn:s.turn,text,type},...(s.logs||[])].slice(0,60);}
const deduct=(s,cost)=>{if(s.budget<cost)return false;s.budget=money(s.budget-cost);return true;};
/** Task and process synthetic observation products from physically modelled future orbits. */
export function queueMission(state,assetId,regionId,observationEpochSeconds=state.missionEpochSeconds){
  if(state.outcome)return error(state,'The campaign is complete.');
  if(state.pendingEvent)return error(state,'Resolve the strategic decision before submitting mission requests.');
  if(!MISSION_ASSETS[assetId]||!MISSION_REGIONS[regionId])return error(state,'Select an eligible future mission and exercise region.');
  if(state.programmes[assetId]!=='deployed')return error(state,'Commission the spacecraft before assigning observations.');
  if((state.missionQueue||[]).length>=Math.min(4,state.groundLevel+1))return error(state,'Ground scheduling capacity reached for this quarter. Upgrade the network or advance the turn.');
  const demand=MISSION_ASSETS[assetId].processing;
  if(state.bandwidth<demand)return error(state,`Mission requires ${demand} GB/s of scenario processing capacity.`);
  if(state.groundHealth<35)return error(state,'Receiving network is too degraded to accept new satellite tasking.');
  // Restrict mission planning to the active quarter's representative fourteen-day window.
  const start=Math.max(state.missionEpochSeconds,Math.min(state.missionEpochSeconds+DAY_S*2,Number(observationEpochSeconds)||state.missionEpochSeconds));
  const plan=planMission(assetId,regionId,start,state.groundLevel);
  if(plan.error)return error(state,plan.error);
  if(!plan.receiverAvailable)return error(state,'No receiving opportunity within twelve hours of the observation. Upgrade the ground network.');
  const cost=assetId==='sar'?12:assetId==='sat3'?8:6;
  const s=clone(state);if(!deduct(s,cost))return error(state,'Not enough budget for this observation request.');
  const task={id:`MSN-${String(s.nextMissionId++).padStart(4,'0')}`,assetId,regionId,
    placedTurn:s.turn,status:'queued',cost,passSeconds:plan.pass.peakSeconds,
    downlinkSeconds:plan.pass.downlink.timeSeconds,receiverId:plan.pass.downlink.receiverId,
    receiverName:plan.receiver,closestKm:plan.closestKm,product:plan.product,processing:plan.processing};
  s.missionQueue.push(task);
  log(s,`${task.id}: ${plan.product} task submitted for ${MISSION_REGIONS[regionId].short}; geometric pass and downlink reserved. ₦${cost}B.`,'success');
  return {state:s,message:`${task.id} queued · pass in ${Math.round(plan.hoursUntilPass)} model hours · ${plan.receiver}.`,error:false};
}
function processMissionQueue(s){
  const queue=s.missionQueue||[],completed=[];
  let downlinks=0;
  const maxDownlinks=Math.min(5,Math.max(1,s.groundLevel)+(s.projects?.fusion?.status==='complete'?1:0));
  for(const original of queue){
    const task={...original,completedTurn:s.turn};
    let failure=null;
    if(s.programmes[task.assetId]!=='deployed')failure='spacecraft unavailable';
    else if(!task.receiverId||s.groundHealth<40||s.groundReliability<35)failure='ground reception failed';
    else if(s.bandwidth<task.processing)failure='processing capacity unavailable';
    else if(downlinks>=maxDownlinks)failure='receiving network oversubscribed';
    else if(task.assetId==='sat3'){
      // Deterministic fictional weather; radar/AIS are not affected by optical cloud cover.
      const weather=Math.abs(Math.sin(task.passSeconds*.000032+THEATRE_IDS.indexOf(task.regionId)*1.63));
      if(weather>.84)failure='optical scene cloud-obscured';
    }
    if(failure){task.status='missed';task.reason=failure;log(s,`${task.id}: no usable observation — ${failure}.`,'warning');}
    else{
      task.status='delivered';downlinks++;
      const quality=clamp(Math.round(90-task.closestKm/(MISSION_ASSETS[task.assetId]?.footprintKm||400)*30),45,96);
      s.dataProducts.unshift({id:task.id,assetId:task.assetId,regionId:task.regionId,quality,
        collectedTurn:s.turn,receiverName:task.receiverName,analysedTurn:null,product:task.product});
      s.missionsCompleted=(s.missionsCompleted||0)+1;
      log(s,`${task.id}: ${task.product} product received at ${task.receiverName}. Awaiting analytical processing.`,'success');
    }
    completed.push(task);
  }
  s.missionQueue=[];
  s.missionHistory=[...completed.reverse(),...(s.missionHistory||[])].slice(0,50);
  s.dataProducts=s.dataProducts.slice(0,35);
}
export function analyseProduct(state,productId){
  if(state.outcome)return error(state,'The campaign is complete.');
  if(state.pendingEvent)return error(state,'Resolve the strategic event before processing imagery.');
  const product=(state.dataProducts||[]).find(p=>p.id===productId);
  if(!product||product.analysedTurn)return error(state,'Select an unprocessed observation product.');
  if(state.bandwidth<(MISSION_ASSETS[product.assetId]?.processing||15))return error(state,'Insufficient analysis-processing capacity.');
  if(state.groundHealth<35)return error(state,'Ground data services are unavailable.');
  const s=clone(state),cost=s.projects?.fusion?.status==='complete'?6:9;
  if(!deduct(s,cost))return error(state,'Insufficient funds for imagery processing.');
  const p=s.dataProducts.find(p=>p.id===productId);
  p.analysedTurn=s.turn;
  const confidenceGain=Math.round(9+p.quality/9)+(s.projects?.fusion?.status==='complete'?4:0);
  s.intel[p.regionId]=clamp(s.intel[p.regionId]+confidenceGain);
  log(s,`${p.id}: ${p.product} analysed for ${MISSION_REGIONS[p.regionId].short}. Confidence +${confidenceGain}.`,'success');
  awardMilestones(s);
  return {state:s,message:`${p.id} analysed · regional confidence +${confidenceGain}.`,error:false};
}
export function applyDirective(state,action,id){
  if(state.outcome)return error(state,'The campaign is over. Start a new campaign.');
  if(state.pendingEvent)return error(state,'Resolve the urgent strategic event before authorising new directives.');
  const s=clone(state);let cost=0,message='Directive approved.';
  switch(action){
    case 'project':{
      const p=PROJECTS[id];if(!p)return error(state,'Choose a valid strategic project.');
      if(s.projects?.[id])return error(state,'This project is already funded.');
      if(Object.values(s.projects||{}).filter(x=>x.status==='active').length>=2)return error(state,'Both project teams are committed. Complete an existing project first.');
      if(!deduct(s,p.cost))return error(state,'Not enough funding for this project.');
      cost=p.cost;s.projects[id]={status:'active',startTurn:s.turn,finishTurn:s.turn+p.quarters};
      message=`${p.name}: authorised. Ready in ${p.quarters} quarters. Budget committed upfront; upkeep begins after completion.`;break;
    }
    case 'fund':{
      const p=PROGRAMMES[id];if(!p||s.programmes[id]!=='concept')return error(state,'This programme is not available for new research funding.');
      cost=p.researchCost;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.programmes[id]='research';s.researchTurn[id]=s.turn;s.researchDelay[id]=0;
      message=`${p.name}: research authorised. ${p.research} quarterly turns of qualification required.`;break;}
    case 'deploy':{
      const p=PROGRAMMES[id];if(!p||s.programmes[id]!=='ready')return error(state,'Research and qualification must finish before commissioning.');
      if(s.groundLevel<2)return error(state,'Ground infrastructure Level 2 is required to commission spacecraft.');
      if(s.bandwidth<p.processing+20)return error(state,'Insufficient data-processing capacity for this mission. Upgrade the receiving network.');
      cost=p.commissionCost;if(!deduct(s,cost))return error(state,'Insufficient budget for mission procurement and commissioning.');
      s.programmes[id]='deployed';s.integrity=clamp(s.integrity+2);message=`${p.name}: commissioned. Quarterly upkeep now applies.`;break;}
    case 'upgrade':{
      if(!['geo','abuja','nasrda','toro','epe'].includes(id))return error(state,'Select an appropriate ground or communications asset.');
      if(s.groundLevel>=4)return error(state,'Ground network is already at maximum level.');
      cost=115+30*(s.groundLevel-1);if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.groundLevel++;s.bandwidth=money(s.bandwidth+18);s.groundHealth=clamp(s.groundHealth+8);s.groundReliability=clamp(s.groundReliability+4);
      message=`Ground network upgraded to Level ${s.groundLevel}. Data processing, reliability and future launch readiness improved.`;break;}
    case 'extend':{
      if(s.geoExtension)return error(state,'GEO continuity programme already active.');
      cost=55;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.geoExtension=true;s.groundReliability=clamp(s.groundReliability+5);
      message='GEO service continuity contracts funded. Ground-network operating pressure reduced.';break;}
    case 'launch':{
      if(s.launchFunded)return error(state,'Epe feasibility research is already funded.');
      if(s.researchCapacity<24)return error(state,'Build research capacity before authorising Epe feasibility work.');
      cost=260;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.launchFunded=true;s.researchCapacity=clamp(s.researchCapacity+8);
      message='Epe research feasibility programme funded.';break;}
    case 'observe':{
      if(!THEATRE_IDS.includes(id))return error(state,'Choose a strategic theatre.');
      if(s.commercialCredits<1)return error(state,'No partner imagery credits available. Contract imagery first.');
      if(s.bandwidth<15)return error(state,'Insufficient processing capacity.');
      cost=12;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.commercialCredits--;s.intel[id]=clamp(s.intel[id]+18);s.bandwidth=money(Math.max(0,s.bandwidth-1));
      message='Imagery analysed. Intelligence confidence increased; threat pressure is not automatically reduced.';break;}
    case 'stabilize':{
      if(!THEATRE_IDS.includes(id))return error(state,'Choose a strategic theatre.');
      if(s.intel[id]<47)return error(state,'Regional intelligence confidence is too low. Acquire and analyse observations first.');
      cost=90;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      const effectiveness=Math.round(4+Math.min(6,s.intel[id]/15));
      s.threats[id]=clamp(s.threats[id]-effectiveness);s.support=clamp(s.support+2);s.intel[id]=clamp(s.intel[id]-7);
      message=`Regional resilience strengthened. Pressure reduced by ${effectiveness}; analysis confidence consumed.`;break;}
    case 'contract':{
      cost=52;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.commercialCredits+=4;message='Four partner imagery credits purchased; use them in theatre assessments.';break;}
    case 'maintain': case 'service':{
      cost=45;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.groundHealth=clamp(s.groundHealth+16);s.groundReliability=clamp(s.groundReliability+9);
      if(id in s.fuel&&id!=='geo'&&s.programmes[id]==='deployed')s.fuel[id]=clamp(s.fuel[id]+6);
      message='Maintenance reduced infrastructure wear and improved communications resilience.';break;}
    case 'research':{
      cost=65;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.researchCapacity=clamp(s.researchCapacity+12);message='Domestic research and integration capacity improved.';break;}
    case 'investigate':{
      if(!(id in s.progress))return error(state,'Select an exercise anomaly.');
      cost=35;if(!deduct(s,cost))return error(state,'Insufficient budget.');
      s.progress[id]=clamp(s.progress[id]+(10+Math.round(computeMetrics(s).coverage/10)));
      message='Training exercise assessment advanced using available coverage.';break;}
    case 'scan':return error(state,'Use Mission Control to task a commissioned spacecraft, receive data, and process the product.');
    default:return error(state,'Unknown directive: '+action);
  }
  if(s.firstLight?.status==='active'&&id==='delta'){
    if(action==='observe')s.firstLight.imagery=true;
    if(action==='stabilize')s.firstLight.resilience=true;
  }
  log(s,`${message} (₦${cost}B)`, 'success');
  awardMilestones(s);
  s.outcome=assessCampaign(s);
  return {state:s,message,error:false};
}
export function advanceCampaign(state){
  if(state.outcome)return error(state,'This campaign is complete. Start a new campaign.');
  if(state.pendingEvent)return error(state,'Resolve the current strategic event before advancing.');
  if(state.turn>=MAX_TURNS)return error(state,'Campaign timeline finished.');
  const s=clone(state);s.turn++;
  processMissionQueue(s);
  for(const [id,job] of Object.entries(s.projects||{})){
    if(job.status!=='active'||s.turn<job.finishTurn)continue;
    job.status='complete';job.completedTurn=s.turn;
    if(id==='exchange'){s.groundReliability=clamp(s.groundReliability+10);s.support=clamp(s.support+3);}
    if(id==='fusion'){s.bandwidth=money(clamp(s.bandwidth+30,0,400));s.groundHealth=clamp(s.groundHealth+6);}
    if(id==='academy'){s.researchCapacity=clamp(s.researchCapacity+18);}
    log(s,`${PROJECTS[id].name}: delivered. ${PROJECTS[id].impact}. Ongoing quarterly upkeep ₦${PROJECTS[id].upkeep}B.`,'success');
  }
  s.missionEpochSeconds=(s.turn-1)*MISSION_HORIZON_S;
  const m=computeMetrics(s);
  const appropriation=s.turn%4===1?s.appropriation:0;
  const cost=m.upkeep+Math.max(0,Math.round((100-s.groundHealth)/13));
  s.budget=money(Math.max(0,s.budget+appropriation-cost));
  if(s.budget<25)s.consecutiveShortfalls++;else s.consecutiveShortfalls=0;
  s.groundHealth=clamp(s.groundHealth-2-(s.groundLevel>2?1:0));
  s.groundReliability=clamp(s.groundReliability-(s.groundHealth<60?3:1));
  s.bandwidth=money(clamp(s.bandwidth-0.25,0,400));
  for(const id of Object.keys(PROGRAMMES)){
    if(s.programmes[id]==='research'&&programmeRemaining(s,id)===0){s.programmes[id]='ready';log(s,`${PROGRAMMES[id].name}: research review completed. Awaiting investment and ground-network readiness.`,'success');}
    if(s.programmes[id]==='deployed')s.fuel[id]=clamp(s.fuel[id]-1);
  }
  const coverage=computeMetrics(s).coverage;
  for(const [index,id] of THEATRE_IDS.entries()){
    const pressure=Math.max(0,(Math.sin(s.turn*1.7+index*2.1)>0?2:1)-(s.projects?.exchange?.status==='complete'?1:0));
    const intelligence=s.intel[id]||30;
    s.threats[id]=clamp(s.threats[id]+pressure-(coverage>55&&intelligence>54?2:0),5,99);
    s.intel[id]=clamp(intelligence-2+Math.round((computeMetrics(s).regionalCoverage[id]||0)/30));
  }
  s.support=clamp(s.support+(coverage>55?1:0)-(s.groundReliability<55?2:0)-(s.budget<25?2:0));
  s.integrity=clamp(s.integrity+(s.groundReliability>85?1:0)-(s.groundReliability<58?3:0)-(s.budget<25?2:0));
  log(s,`${campaignDateLabel(s.turn)}: ₦${appropriation}B new allocation; ₦${cost}B recurring operations. Estimated coverage ${Math.round(computeMetrics(s).coverage)}%.`);
  if(s.turn%3===2&&!s.outcome){
    const event=EVENTS[Math.floor((s.turn-2)/3)%EVENTS.length];
    s.pendingEvent=event.id;
    log(s,`Decision required: ${event.title}`,'warning');
  }
  awardMilestones(s);
  s.outcome=assessCampaign(s);
  return {state:s,message:s.pendingEvent?'Quarter advanced — national decision required.':`Advanced to ${campaignDateLabel(s.turn)}.`,error:false};
}
export function resolveEvent(state,optionId){
  if(!state.pendingEvent)return error(state,'There is no unresolved event.');
  const event=EVENTS.find(x=>x.id===state.pendingEvent);if(!event)return error(state,'Event not recognized.');
  const choice=event.options.find(x=>x.id===optionId);if(!choice)return error(state,'Invalid event choice.');
  const s=clone(state);if(!deduct(s,choice.cost))return error(state,'Not enough budget for this response. Choose another option.');
  for(const key of ['support','integrity','researchCapacity','groundReliability','appropriation']){
    const keyMap={researchCapacity:'research',groundReliability:'reliability'};
    const delta=choice[keyMap[key]||key];if(delta!==undefined)s[key]=key==='appropriation'?money(Math.max(30,s[key]+delta)):clamp(s[key]+delta);
  }
  if(choice.bandwidth)s.bandwidth=money(clamp(s.bandwidth+choice.bandwidth,0,400));
  if(choice.confidence)for(const id of THEATRE_IDS)s.intel[id]=clamp(s.intel[id]+choice.confidence);
  if(choice.deltaRisk)s.threats.delta=clamp(s.threats.delta+choice.deltaRisk,5,99);
  if(choice.autonomy)s.researchCapacity=clamp(s.researchCapacity+choice.autonomy);
  if(choice.delay){
    for(const id of Object.keys(PROGRAMMES))if(s.programmes[id]==='research')s.researchDelay[id]=(s.researchDelay[id]||0)+choice.delay;
    for(const job of Object.values(s.projects||{}))if(job.status==='active')job.finishTurn+=choice.delay;
  }
  if(['flood','outage'].includes(event.id)&&s.projects?.exchange?.status==='complete'&&!['defer','accept'].includes(choice.id)){
    s.support=clamp(s.support+2);s.groundReliability=clamp(s.groundReliability+3);
    log(s,'Emergency Data Exchange: coordinated response improved public confidence and service uptime.','success');
  }
  // Readiness earns a measurable benefit; opting to defer lowers the exercise outcome.
  // Only the very first scripted flood event can resolve this onboarding operation.
  if(event.id==='flood'&&s.firstLight?.status==='active'&&s.turn===2){
    const prepared=Number(!!s.firstLight.imagery)+Number(!!s.firstLight.resilience);
    const response=choice.id==='contract'?1:choice.id==='defer'?-1:0;
    const grade=Math.max(0,Math.min(3,prepared+response));
    const outcome=['UNPREPARED','FRAGILE','EFFECTIVE','EXCELLENT'][grade];
    s.firstLight={...s.firstLight,status:'complete',score:grade,outcome,choice:choice.id,completedTurn:s.turn};
    if(grade===3){s.support=clamp(s.support+3);s.threats.delta=clamp(s.threats.delta-2,5,99);}
    else if(grade===2){s.support=clamp(s.support+1);}
    else if(grade===0){s.support=clamp(s.support-2);s.threats.delta=clamp(s.threats.delta+2,5,99);}
    log(s,`OPERATION FIRST LIGHT: ${outcome}. ${prepared}/2 preparedness actions · ${choice.label}. Preparedness matters alongside your chosen response.`,grade>=2?'success':'warning');
  }
  s.resolvedEvents[`${s.turn}-${event.id}`]=choice.id;s.pendingEvent=null;
  log(s,`${event.title}: ${choice.label}. ₦${choice.cost}B allocated.`, 'success');
  awardMilestones(s);
  s.outcome=assessCampaign(s);
  return {state:s,message:'Strategic decision recorded.',error:false};
}