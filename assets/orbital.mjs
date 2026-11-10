/** Fictional orbital digital twin — no live ephemerides or operational target tracking.
 * Circular Kepler/J2 approximation and Earth rotation, shared by 3D and mission control.
 * Mission lat/lon points are broad scenario regions, not surveyed target locations.
 */
export const EARTH_RADIUS_KM = 6371;
export const GRAVITATIONAL_MU = 398600.4418;
export const SIDEREAL_DAY_S = 86164.0905;
export const EARTH_ROTATION_RPS = 2 * Math.PI / SIDEREAL_DAY_S;
export const EARTH_J2 = 1.08262668e-3;
export const RAD = Math.PI / 180;
export const DAY_S = 86400;
export const MISSION_HORIZON_S = 14 * DAY_S;
export const PASS_SAMPLE_S = 75;
export const MISSION_ASSETS = Object.freeze({
  sat3:{id:'sat3',class:'SSO',altitude:700,inclination:98,raanDeg:10.1,phaseDeg:9,footprintKm:380,processing:16,product:'OPTICAL'},
  sar:{id:'sar',class:'SSO',altitude:620,inclination:97.8,raanDeg:11.4,phaseDeg:-2.8,footprintKm:330,processing:34,product:'RADAR'},
  ais:{id:'ais',class:'PROGRADE',altitude:550,inclination:55,raanDeg:6.2,phaseDeg:14,footprintKm:1150,processing:9,product:'MARITIME AIS'}
});
export const MISSION_REGIONS = Object.freeze({
  hadin:{id:'hadin',name:'North-East monitoring exercise',lat:11.72,lon:12.25,short:'NORTH-EAST'},
  fansan:{id:'fansan',name:'North-West monitoring exercise',lat:11.35,lon:5.65,short:'NORTH-WEST'},
  savannah:{id:'savannah',name:'North-Central monitoring exercise',lat:8.85,lon:8.62,short:'NORTH-CENTRAL'},
  delta:{id:'delta',name:'Niger Delta environmental exercise',lat:5.4,lon:6.6,short:'NIGER DELTA'}
});
export const RECEIVERS = Object.freeze([
  {id:'abuja',name:'Abuja receiving network (scenario access)',lat:9.15,lon:7.48,level:1},
  {id:'coastal',name:'Coastal receiver (fictional future investment)',lat:6.56,lon:3.98,level:2},
  {id:'north',name:'Northern relay (fictional future investment)',lat:10.05,lon:9.04,level:3}
]);
export function orbitPeriodSeconds(asset){const r=EARTH_RADIUS_KM+asset.altitude;return 2*Math.PI*Math.sqrt((r*r*r)/GRAVITATIONAL_MU);}
export function propagateOrbit(asset,elapsedSeconds,anomalyOverride=null){
  const r=EARTH_RADIUS_KM+asset.altitude;
  if(asset.class==='GEO'){
    const lon=(anomalyOverride===null?42.5*RAD:anomalyOverride);
    return {ecef:{x:r*Math.cos(lon),y:r*Math.sin(lon),z:0},lat:0,lon:lon/RAD,alt:asset.altitude,period:SIDEREAL_DAY_S};
  }
  const i=asset.inclination*RAD;
  const meanMotion=Math.sqrt(GRAVITATIONAL_MU/(r*r*r));
  const nodalRate=-1.5*EARTH_J2*meanMotion*(EARTH_RADIUS_KM/r)**2*Math.cos(i);
  const O=(asset.raanDeg||0)*RAD+nodalRate*elapsedSeconds;
  const u=anomalyOverride===null?(asset.phaseDeg||0)*RAD+elapsedSeconds*meanMotion:anomalyOverride;
  const cu=Math.cos(u),su=Math.sin(u),cO=Math.cos(O),sO=Math.sin(O),ci=Math.cos(i),si=Math.sin(i);
  const xi=r*(cO*cu-sO*su*ci), yi=r*(sO*cu+cO*su*ci), z=r*su*si;
  const theta=elapsedSeconds*EARTH_ROTATION_RPS,ct=Math.cos(theta),st=Math.sin(theta);
  const x=ct*xi+st*yi,y=-st*xi+ct*yi;
  return {ecef:{x,y,z},lat:Math.atan2(z,Math.hypot(x,y))/RAD,lon:Math.atan2(y,x)/RAD,alt:asset.altitude,period:orbitPeriodSeconds(asset)};
}
export function greatCircleKm(aLat,aLon,bLat,bLon){
  const dLat=(bLat-aLat)*RAD,dLon=(bLon-aLon)*RAD;
  const q=Math.sin(dLat/2)**2+Math.cos(aLat*RAD)*Math.cos(bLat*RAD)*Math.sin(dLon/2)**2;
  return EARTH_RADIUS_KM*2*Math.atan2(Math.sqrt(Math.max(0,q)),Math.sqrt(Math.max(0,1-q)));
}
export function elevationDeg(ecef,lat,lon){
  const phi=lat*RAD,lam=lon*RAD;
  const ux=Math.cos(phi)*Math.cos(lam),uy=Math.cos(phi)*Math.sin(lam),uz=Math.sin(phi);
  const vx=ecef.x-EARTH_RADIUS_KM*ux,vy=ecef.y-EARTH_RADIUS_KM*uy,vz=ecef.z-EARTH_RADIUS_KM*uz;
  const range=Math.hypot(vx,vy,vz);
  return Math.asin(Math.max(-1,Math.min(1,(vx*ux+vy*uy+vz*uz)/range)))/RAD;
}
export function forecastPasses(asset,region,startSeconds,opts={}){
  if(!asset||!region||asset.class==='GEO')return [];
  const horizon=opts.horizonSeconds??MISSION_HORIZON_S;
  const step=opts.stepSeconds??PASS_SAMPLE_S;
  const radius=opts.radiusKm??asset.footprintKm??350;
  const passes=[];let active=null;
  // Scan simulated ECEF positions, then group contiguous geometrical observation windows.
  for(let t=startSeconds;t<=startSeconds+horizon+step;t+=step){
    const state=propagateOrbit(asset,t);
    const dist=greatCircleKm(state.lat,state.lon,region.lat,region.lon);
    if(t<=startSeconds+horizon&&dist<=radius){
      if(!active)active={startSeconds:t,endSeconds:t,peakSeconds:t,closestKm:dist};
      active.endSeconds=t;
      if(dist<active.closestKm){active.closestKm=dist;active.peakSeconds=t;}
    }else if(active){passes.push(active);active=null;}
  }
  if(active)passes.push(active);
  return passes;
}
export function findGroundContact(asset,fromSeconds,receivers,untilSeconds=fromSeconds+12*3600){
  if(!receivers?.length)return null;
  const step=60;
  for(let t=fromSeconds;t<=untilSeconds;t+=step){
    const state=propagateOrbit(asset,t);
    for(const receiver of receivers){
      if(elevationDeg(state.ecef,receiver.lat,receiver.lon)>=12){
        return {timeSeconds:t,receiverId:receiver.id,receiverName:receiver.name,elevationDeg:Math.round(elevationDeg(state.ecef,receiver.lat,receiver.lon))};
      }
    }
  }
  return null;
}
export function planMission(assetId,regionId,startSeconds,groundLevel=1){
  const asset=MISSION_ASSETS[assetId],region=MISSION_REGIONS[regionId];
  if(!asset||!region)return {error:'Unknown spacecraft or exercise area'};
  if(assetId==='ais'&&regionId!=='delta')return {error:'The simulated maritime receiver is assigned to the Niger Delta exercise only.'};
  const passes=forecastPasses(asset,region,startSeconds);
  if(!passes.length)return {error:'No geometrically eligible observation within the next 14 simulated days.'};
  const receivers=RECEIVERS.filter(r=>r.level<=groundLevel);
  const candidates=passes.map(pass=>({
    ...pass,
    downlink:findGroundContact(asset,pass.peakSeconds,receivers,pass.peakSeconds+12*3600)
  }));
  const chosen=candidates.find(p=>p.downlink)||candidates[0];
  return {assetId,regionId,fromSeconds:startSeconds,passCount:passes.length,pass:chosen,
    receiverAvailable:Boolean(chosen.downlink),receiver:chosen.downlink?.receiverName||'No accessible ground receiver',
    groundWaitHours:chosen.downlink?Math.max(0,(chosen.downlink.timeSeconds-chosen.peakSeconds)/3600):null,
    hoursUntilPass:Math.max(0,(chosen.peakSeconds-startSeconds)/3600),
    closestKm:Math.round(chosen.closestKm),product:asset.product,
    processing:asset.processing,footprintKm:asset.footprintKm};
}
export function formatHours(hours){if(hours==null)return 'Unavailable';const d=Math.floor(hours/24),h=Math.floor(hours%24),m=Math.floor(hours*60%60);return `${d?`D+${d} `:''}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}