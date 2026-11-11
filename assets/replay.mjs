/** Educational mission replay for simulated spacecraft only.
 * The timeline deliberately shows acquisition and reception as separate events:
 * a physical link is drawn ONLY when geometric conditions are met.
 */
import { MISSION_ASSETS, MISSION_REGIONS, RECEIVERS, propagateOrbit, greatCircleKm, elevationDeg } from './orbital.mjs';
export const REPLAY_DURATION_S = 16;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function missionReplayFrame(task, replayElapsedSeconds=0){
  if(!task||!MISSION_ASSETS[task.assetId]||!MISSION_REGIONS[task.regionId])return null;
  const elapsed=clamp(Number(replayElapsedSeconds)||0,0,REPLAY_DURATION_S);
  const phase=elapsed<8?'acquisition':elapsed<REPLAY_DURATION_S?'downlink':'complete';
  const acquiring=phase==='acquisition';
  const anchor=acquiring?task.passSeconds:task.downlinkSeconds;
  if(!Number.isFinite(anchor))return null;
  const phaseTime=acquiring?elapsed:Math.min(elapsed-8,8);
  // 8 seconds of cinematic playback spans 4 minutes of simulated orbital motion.
  const epochSeconds=anchor+(phaseTime-4)*30;
  const asset=MISSION_ASSETS[task.assetId], state=propagateOrbit(asset,epochSeconds);
  const location=acquiring?MISSION_REGIONS[task.regionId]:RECEIVERS.find(s=>s.id===task.receiverId);
  const distanceKm=location?greatCircleKm(state.lat,state.lon,location.lat,location.lon):Infinity;
  const elevation=location?elevationDeg(state.ecef,location.lat,location.lon):-90;
  const linkValid=acquiring?distanceKm<=asset.footprintKm:elevation>=12;
  return {phase,epochSeconds,assetId:task.assetId,regionId:task.regionId,
    receiverId:task.receiverId||null,location,linkValid,groundDistanceKm:Math.round(distanceKm),
    elevationDeg:Math.round(elevation),progress:elapsed/REPLAY_DURATION_S,
    label:phase==='acquisition'?'OBSERVATION WINDOW':phase==='downlink'?'GROUND RECEPTION WINDOW':'REPLAY COMPLETE'};
}
export function groundNetworkSnapshot(state){
  const level=clamp(Number(state.groundLevel)||1,1,4);
  const queue=Array.isArray(state.missionQueue)?state.missionQueue:[];
  const products=Array.isArray(state.dataProducts)?state.dataProducts:[];
  const availableReceivers=RECEIVERS.filter(r=>r.level<=level);
  const health=clamp(Number(state.groundHealth)||0,0,100);
  const reliability=clamp(Number(state.groundReliability)||0,0,100);
  return {level,health,reliability,
    operational:health>=40&&reliability>=35,
    schedulingSlots:Math.min(4,level+1),receivingSlots:Math.min(4,level),
    queued:queue.length,unprocessed:products.filter(p=>!p.analysedTurn).length,
    receivers:RECEIVERS.map(receiver=>({...receiver,enabled:receiver.level<=level})),
    accessibleCount:availableReceivers.length};
}
