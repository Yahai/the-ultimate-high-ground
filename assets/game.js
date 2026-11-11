import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCampaign, MAX_TURNS, PROGRAMMES, PROJECTS, MILESTONES, milestoneStatus, projectRemaining, EVENTS, campaignDateLabel, computeMetrics, programmeRemaining, applyDirective, advanceCampaign, resolveEvent, queueMission, analyseProduct, FIRST_LIGHT_STEPS, firstLightProgress, recordFirstLightInspection, skipFirstLight } from './strategy.mjs';
import { propagateOrbit, orbitPeriodSeconds as physicsPeriod, planMission, MISSION_ASSETS, MISSION_REGIONS, RECEIVERS, elevationDeg, formatHours } from './orbital.mjs';
import { AFRICA_LAND, AFRICA_BORDERS } from './africa-geography.mjs';
import { biomeBlend, cloudCover, cloudOpacity, campaignQuarter, QUARTER_NAMES } from './ecoregions.mjs';
import { missionReplayFrame, REPLAY_DURATION_S, groundNetworkSnapshot } from './replay.mjs';
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const NIGERIA = [[8.500288, 4.771983], [7.462108, 4.412108], [7.082596, 4.464689], [6.698072, 4.240594], [5.898173, 4.262453], [5.362805, 4.887971], [5.033574, 5.611802], [4.325607, 6.270651], [3.57418, 6.2583], [2.691702, 6.258817], [2.749063, 7.870734], [2.723793, 8.506845], [2.912308, 9.137608], [3.220352, 9.444153], [3.705438, 10.06321], [3.60007, 10.332186], [3.797112, 10.734746], [3.572216, 11.327939], [3.61118, 11.660167], [3.680634, 12.552903], [3.967283, 12.956109], [4.107946, 13.531216], [4.368344, 13.747482], [5.443058, 13.865924], [6.445426, 13.492768], [6.820442, 13.115091], [7.330747, 13.098038], [7.804671, 13.343527], [9.014933, 12.826659], [9.524928, 12.851102], [10.114814, 13.277252], [10.701032, 13.246918], [10.989593, 13.387323], [11.527803, 13.32898], [12.302071, 13.037189], [13.083987, 13.596147], [13.318702, 13.556356], [13.995353, 12.461565], [14.181336, 12.483657], [14.577178, 12.085361], [14.468192, 11.904752], [14.415379, 11.572369], [13.57295, 10.798566], [13.308676, 10.160362], [13.1676, 9.640626], [12.955468, 9.417772], [12.753672, 8.717763], [12.218872, 8.305824], [12.063946, 7.799808], [11.839309, 7.397042], [11.745774, 6.981383], [11.058788, 6.644427], [10.497375, 7.055358], [10.118277, 7.03877], [9.522706, 6.453482], [9.233163, 6.444491], [8.757533, 5.479666], [8.500288, 4.771983]];
const SATS = [
    { id: 'geo', type: 'satellite', name: 'NigComSat-1R', subtitle: 'IN SERVICE · GEO communications · 42.5°E', altitude: 35786, inclination: 0, fuel: 88, revisit: 0, status: 'IN SERVICE · NIGCOMSAT', tone: '#f4ba65', directive: 'Protect continuity of the simulated satellite communications backbone. This is an existing Nigerian civilian-operated space asset.', detail: 'Verified in service: NIGCOMSAT Ltd operates NigComSat-1R at 42.5°E. Capacity, fuel, downlink traffic and budget values here are NOT real telemetry.', class: 'GEO', factual: 'verified', period: 1436, stage: 'active' },
    { id: 'sat3', type: 'satellite', name: 'NigeriaSat-3 Programme', subtitle: 'PLANNED · future optical Earth observation', altitude: 700, inclination: 98.0, fuel: 100, revisit: 96, status: 'PLANNED · NOT IN ORBIT', tone: '#49caff', directive: 'Fund high-resolution imaging capability, indigenous engineering and national data access; procure and commission a future orbital platform.', detail: 'NigeriaSat-3 is a stated future mission, not a verified operational spacecraft. All proposed orbit, imagery cadence and cost figures in the game are design assumptions.', class: 'SSO', factual: 'planned', period: 99.0, raanDeg: 10.1, phaseDeg: 9.0, stage: 'concept' },
    { id: 'sar', type: 'satellite', name: 'Nigeria SAR Programme', subtitle: 'PROPOSED · all-weather radar observation', altitude: 620, inclination: 97.8, fuel: 100, revisit: 110, status: 'PROPOSED · NOT IN ORBIT', tone: '#bc9cff', directive: 'Invest in future synthetic aperture radar capability for all-weather mapping, disaster monitoring and situational awareness.', detail: 'NASRDA lists a Nigeria SAR mission among its plans. The present game platform, designation, orbit and coverage are illustrative programme targets, not launched assets.', class: 'SSO', factual: 'planned', period: 97.1, raanDeg: 11.4, phaseDeg: -2.8, stage: 'concept' },
    { id: 'ais', type: 'satellite', name: 'Maritime AIS Smallsat', subtitle: 'CONCEPT · maritime monitoring', altitude: 550, inclination: 55.0, fuel: 100, revisit: 125, status: 'CONCEPT · NOT IN ORBIT', tone: '#7fe1cb', directive: 'Study an optional future satellite-based Automatic Identification System receiving capability for civilian maritime awareness.', detail: 'A proposed satellite-based AIS concept for maritime awareness; no operational AIS spacecraft is claimed.', class: 'PROGRADE', factual: 'scenario', period: 95.6, raanDeg: 6.2, phaseDeg: 14.0, stage: 'concept' },
];
const THEATRES = [
    { id: 'hadin', type: 'theatre', name: 'Operation HADIN KAI', subtitle: 'North-East · Borno / Lake Chad', lat: 11.72, lon: 12.25, risk: 68, tone: '#ff927c', directive: 'Improve disaster alerting, satellite image availability and communications resilience for the North-East theatre.', status: 'CURRENT OPERATION' },
    { id: 'fansan', type: 'theatre', name: 'Operation FANSAN YAMMA', subtitle: 'North-West · Sokoto / Zamfara', lat: 11.35, lon: 5.65, risk: 62, tone: '#ffc777', directive: 'Extend hypothetical space-based intelligence support and communications continuity in the North-West.', status: 'CURRENT OPERATION' },
    { id: 'savannah', type: 'theatre', name: 'Operation SAVANNAH SHIELD', subtitle: 'North-Central · strategic support', lat: 8.85, lon: 8.62, risk: 57, tone: '#85c0f8', directive: 'Expand geospatial analysis and emergency communications for the North-Central campaign.', status: 'REPORTED IN 2026' },
    { id: 'delta', type: 'theatre', name: 'Operation DELTA SAFE', subtitle: 'Niger Delta · Gulf of Guinea', lat: 5.4, lon: 6.6, risk: 50, tone: '#6cf3d0', directive: 'Develop hypothetical maritime domain awareness, environmental monitoring and oil-spill alerts.', status: 'CURRENT OPERATION' },
];
const GROUND = [
    { id: 'abuja', type: 'station', name: 'DSA · Abuja', subtitle: 'Defence Space Administration headquarters', lat: 9.0765, lon: 7.3986, tone: '#5ff6cc', status: 'REAL INSTITUTION', directive: 'Direct the national space programme. DSA participates in defence space services; its public headquarters are in Abuja.', detail: 'Map location is a city-scale illustration, not an operational facility coordinate.' },
    { id: 'nasrda', type: 'station', name: 'NASRDA Ground Station', subtitle: 'Abuja · satellite operations / reception', lat: 9.15, lon: 7.48, tone: '#67e9ff', status: 'PUBLIC FACILITY', directive: 'Connect hypothetical data sharing agreements to NASRDA ground receiving and satellite-technology facilities.', detail: 'NASRDA lists a main ground receiving station in Abuja. The map pin is city-level and NOT a surveyed antenna location.' },
    { id: 'toro', type: 'station', name: 'Toro Geodesy Centre', subtitle: 'Bauchi State · geodynamics / geodesy', lat: 10.05, lon: 9.04, tone: '#9dd7ff', status: 'PUBLIC RESEARCH CENTRE', directive: 'Develop geodetic measurement and reference-network research; TT&C relay services would require separate hypothetical investment.', detail: 'NASRDA identifies the Centre for Geodesy and Geodynamics in Toro; it is not verified here as a NigComSat satellite TT&C relay.' },
    { id: 'epe', type: 'station', name: 'CSTP · Epe', subtitle: 'Lagos · research / propulsion centre', lat: 6.56, lon: 3.98, tone: '#ffca75', status: 'R&D CENTRE · NO SPACEPORT', directive: 'Fund a conceptual orbital launch-complex feasibility study at Nigeria’s existing Epe space propulsion research centre.', detail: 'The Centre for Space Transport and Propulsion is real. A fully commissioned satellite launch spaceport and the shown gantry are speculative upgrades.' },
];
const TARGETS = [
    { id: 'a17', type: 'target', name: 'Simulation Alert A-17', subtitle: 'Synthetic spectral cluster', lat: 12.15, lon: 12.74, tone: '#ff817b', progress: 28, status: 'TRAINING CONTACT', directive: 'Run a simulated anomaly assessment; no live adversary data is used.' },
    { id: 'm04', type: 'target', name: 'Environmental Event M-04', subtitle: 'Environmental alert', lat: 5.30, lon: 7.32, tone: '#ffc97b', progress: 52, status: 'ASSESSING', directive: 'Compare coastal imagery for change detection.' },
    { id: 'j11', type: 'target', name: 'Synthetic coverage gap J-11', subtitle: 'Sensor-network exercise', lat: 10.42, lon: 5.74, tone: '#ff817b', progress: 15, status: 'TRAINING CONTACT', directive: 'Close an illustrative coverage gap with planning and calibration.' },
];
const NEIGHBORS = [{ "name": "Niger", "polys": [[[13.5404, 14.3671], [13.9567, 13.9967], [13.9545, 13.3534], [14.5958, 13.3304], [14.4958, 12.8594], [14.2135, 12.802], [14.1813, 12.4837], [13.9954, 12.4616], [13.3187, 13.5564], [13.084, 13.5961], [12.3021, 13.0372], [11.5278, 13.329], [10.9896, 13.3873], [10.701, 13.2469], [10.1148, 13.2773], [9.5249, 12.8511], [9.0149, 12.8267], [7.8047, 13.3435], [7.3307, 13.098], [6.8204, 13.1151], [6.4454, 13.4928], [5.4431, 13.8659], [4.3683, 13.7475], [4.1079, 13.5312], [3.9673, 12.9561], [3.6806, 12.5529], [3.6112, 11.6602], [2.8486, 12.2356], [2.4902, 12.2331], [2.1545, 11.9402], [2.1771, 12.625], [1.1, 12.8369], [1.1, 15.0491], [1.3855, 15.3236], [2.75, 15.4095], [3.2567, 15.5], [13.9117, 15.5], [13.5404, 14.3671]]] }, { "name": "Chad", "polys": [[[15.2795, 7.4219], [15.4361, 7.6928], [15.1209, 8.3822], [14.98, 8.7961], [14.5445, 8.9659], [13.9542, 9.5495], [14.1715, 10.0214], [14.6272, 9.9209], [14.9094, 9.9921], [15.4679, 9.9823], [14.9236, 10.8913], [14.9602, 11.5556], [14.8934, 12.219], [14.4958, 12.8594], [14.5958, 13.3304], [13.9545, 13.3534], [13.9567, 13.9967], [13.5404, 14.3671], [13.9117, 15.5], [15.5, 15.5], [15.5, 7.442], [15.2795, 7.4219]]] }, { "name": "Cameroon", "polys": [[[14.8934, 12.219], [14.9602, 11.5556], [14.9236, 10.8913], [15.4679, 9.9823], [14.9094, 9.9921], [14.6272, 9.9209], [14.1715, 10.0214], [13.9542, 9.5495], [14.5445, 8.9659], [14.98, 8.7961], [15.1209, 8.3822], [15.4361, 7.6928], [15.2795, 7.4219], [14.7765, 6.4085], [14.5366, 6.227], [14.4594, 5.4518], [14.5589, 5.0306], [14.4784, 4.7326], [14.951, 4.2104], [15.0362, 3.8514], [15.4054, 3.3353], [15.5, 3.2687], [15.5, 3.1], [9.7795, 3.1], [9.4044, 3.7345], [8.9481, 3.9041], [8.7449, 4.3522], [8.4888, 4.4956], [8.5003, 4.772], [8.7575, 5.4797], [9.2332, 6.4445], [9.5227, 6.4535], [10.1183, 7.0388], [10.4974, 7.0554], [11.0588, 6.6444], [11.7458, 6.9814], [11.8393, 7.397], [12.0639, 7.7998], [12.2189, 8.3058], [12.7537, 8.7178], [12.9555, 9.4178], [13.1676, 9.6406], [13.3087, 10.1604], [13.5729, 10.7986], [14.4154, 11.5724], [14.4682, 11.9048], [14.5772, 12.0854], [14.1813, 12.4837], [14.2135, 12.802], [14.4958, 12.8594], [14.8934, 12.219]]] }, { "name": "Benin", "polys": [[[1.8652, 6.1422], [1.619, 6.832], [1.6645, 9.1286], [1.463, 9.3346], [1.4251, 9.8254], [1.1, 10.1532], [1.1, 11.0633], [1.2435, 11.1105], [1.4472, 11.5477], [1.936, 11.6412], [2.1545, 11.9402], [2.4902, 12.2331], [2.8486, 12.2356], [3.6112, 11.6602], [3.5722, 11.3279], [3.7971, 10.7347], [3.6001, 10.3322], [3.7054, 10.0632], [3.2204, 9.4442], [2.9123, 9.1376], [2.7238, 8.5068], [2.7491, 7.8707], [2.6917, 6.2588], [1.8652, 6.1422]]] }];
const ASSETS = [...SATS, ...THEATRES, ...GROUND, ...TARGETS];
const PRESETS = ['War Room 3D', 'Orbit View', 'Abuja HQ', 'North-East', 'North-West', 'Niger Delta'];
const INITIAL_LAYERS = { descriptors: true, satellites: true, beams: true, theatres: true, targets: true, stations: true };
const fmtNum = (n, d = 1) => Number(n).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function Icon({ name, size = 16 }) { return React.createElement("i", { "data-lucide": name, style: { width: size, height: size, display: 'inline-flex', flexShrink: 0 }, "aria-hidden": "true" }); }
function pseudo(x, y) { return (Math.sin(x * 127.1 + y * 311.7) * 43758.5453123) % 1; }
function frac(n) { return n - Math.floor(n); }
function noise(x, y) { let ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const h = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453); return (1 - fy) * ((1 - fx) * h(ix, iy) + fx * h(ix + 1, iy)) + fy * ((1 - fx) * h(ix, iy + 1) + fx * h(ix + 1, iy + 1)); }
const NIGER_RIVER = [[4.75, 12.25], [4.55, 11.0], [5.20, 10.1], [5.85, 9.25], [6.52, 8.55], [6.76, 7.8], [6.53, 6.75], [6.35, 5.77], [6.12, 5.04]];
const BENUE_RIVER = [[13.55, 9.22], [12.85, 8.8], [12.01, 8.6], [11.0, 8.05], [9.8, 7.88], [8.7, 7.8], [7.65, 7.77], [6.76, 7.8]];
function distanceToPolyline(lon, lat, poly) { let best = 1e5; for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((lon - a[0]) * dx + (lat - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    best = Math.min(best, Math.hypot(lon - a[0] - dx * t, lat - a[1] - dy * t));
} return best; }
function terrainElevation(lon, lat) {
    const a = noise(lon * 2.7, lat * 2.7) * .88 + noise(lon * 7, lat * 7) * .27 + noise(lon * 21, lat * 21) * .09;
    const jos = 1.65 * Math.exp(-(((lon - 9.2) / 1.52) ** 2 + ((lat - 9.9) / 1.24) ** 2));
    const adamawa = 1.6 * Math.exp(-(((lon - 12.1) / 1.28) ** 2 + ((lat - 8.6) / 1.64) ** 2));
    const mambilla = 2.55 * Math.exp(-(((lon - 11.85) / .88) ** 2 + ((lat - 6.75) / .72) ** 2));
    const coastal = clamp((lat - 4.3) / 2.4, 0, 1);
    const valleys = Math.exp(-((distanceToPolyline(lon, lat, NIGER_RIVER) / .15) ** 2)) * .62 + Math.exp(-((distanceToPolyline(lon, lat, BENUE_RIVER) / .12) ** 2)) * .55;
    return Math.max(.12, .18 + (.47 + a * 1.2 + jos + adamawa + mambilla) * (.20 + .80 * coastal) - valleys);
}
function insidePolygon(lon, lat) { let inside = false; for (let i = 0, j = NIGERIA.length - 1; i < NIGERIA.length; j = i++) {
    let xi = NIGERIA[i][0], yi = NIGERIA[i][1], xj = NIGERIA[j][0], yj = NIGERIA[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
        inside = !inside;
} return inside; }
const geoPos = (lon, lat, y = 0) => new THREE.Vector3((lon - 8.55) * 8.8, y, -(lat - 9.05) * 8.8);
const EARTH_RADIUS_KM = 6371.0;
const GRAVITATIONAL_MU = 398600.4418;
const SIDEREAL_DAY_S = 86164.0905;
const ORBIT_VISUAL_RATE = 6; // orbit pacing: 10x slower, still accelerated
const EARTH_ROTATION_RPS = 2 * Math.PI / SIDEREAL_DAY_S;
const EARTH_J2 = 1.08262668e-3;
const RAD = Math.PI / 180;
const LOCAL_LON = 8.55 * RAD, LOCAL_LAT = 9.05 * RAD;
const KM_TO_TABLE = 8.8 / 111.195;
const ANCHOR_UP = new THREE.Vector3(Math.cos(LOCAL_LAT) * Math.cos(LOCAL_LON), Math.cos(LOCAL_LAT) * Math.sin(LOCAL_LON), Math.sin(LOCAL_LAT));
const ANCHOR_EAST = new THREE.Vector3(-Math.sin(LOCAL_LON), Math.cos(LOCAL_LON), 0);
const ANCHOR_NORTH = new THREE.Vector3(-Math.sin(LOCAL_LAT) * Math.cos(LOCAL_LON), -Math.sin(LOCAL_LAT) * Math.sin(LOCAL_LON), Math.cos(LOCAL_LAT));
const ANCHOR_ECEF = ANCHOR_UP.clone().multiplyScalar(EARTH_RADIUS_KM);
function orbitPeriodSeconds(asset) { return physicsPeriod(asset); }
function orbitState(asset, elapsedSeconds, anomalyOverride = null) {
    // The renderer and Mission Control share ONE orbit propagator, without duplicated physics.
    const o = propagateOrbit(asset, elapsedSeconds, anomalyOverride);
    return {...o, ecef:new THREE.Vector3(o.ecef.x,o.ecef.y,o.ecef.z)};
}
function orbitToTabletop(ecef) {
    const d = ecef.clone().sub(ANCHOR_ECEF);
    return new THREE.Vector3(d.dot(ANCHOR_EAST) * KM_TO_TABLE, d.dot(ANCHOR_UP) * KM_TO_TABLE + 2, -d.dot(ANCHOR_NORTH) * KM_TO_TABLE);
}
function orbitToGlobe(ecef, asset) {
    const displayR = asset.class === 'GEO' ? 114 : 52 + (asset.altitude - 550) * .007;
    const scale = displayR / ecef.length();
    return new THREE.Vector3(ecef.y * scale, ecef.z * scale, -ecef.x * scale);
}
function nearTableSky(p) { return p.y > 4 && p.y < 235 && Math.abs(p.x) < 250 && Math.abs(p.z) < 250; }
function makeLabel(text, sub, color, rich) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = rich ? 126 : 78;
    const c = canvas.getContext('2d');
    const H = canvas.height;
    c.fillStyle = 'rgba(3,18,29,.92)';
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(5, 5, 502, H - 10, rich ? 16 : 21);
    c.fill();
    c.stroke();
    c.fillStyle = color;
    c.fillRect(18, rich ? 21 : 15, 4, rich ? 78 : 48);
    c.font = 'bold 30px system-ui, sans-serif';
    c.fillStyle = '#edfbff';
    c.fillText(text.slice(0, 24), 35, rich ? 55 : 49);
    if (rich) {
        c.font = '22px system-ui, sans-serif';
        c.fillStyle = '#a3c0d2';
        c.fillText(sub.slice(0, 40), 35, 94);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: .95 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(rich ? 27 : 22, rich ? 6.7 : 3.45, 1);
    return sprite;
}
function glowBall(color, r = .8) { const group = new THREE.Group(); const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshBasicMaterial({ color })); group.add(mesh); const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 2.3, 12, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .08, depthWrite: false })); group.add(halo); return { group, hit: mesh }; }
function satelliteMesh(color = '#51bbef', scale = 1) {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: '#bfa05e', metalness: .84, roughness: .32 });
    const blue = new THREE.MeshStandardMaterial({ color: '#174775', metalness: .72, roughness: .35, emissive: '#103457', emissiveIntensity: .35 });
    const steel = new THREE.MeshStandardMaterial({ color: '#a7c3d3', metalness: .85, roughness: .25 });
    const core = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.5, 2.6), gold);
    g.add(core);
    for (const side of [-1, 1]) {
        const mount = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 2.4, 8), steel);
        mount.rotation.z = Math.PI / 2;
        mount.position.x = side * 2.55;
        g.add(mount);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(6.5, .12, 3.25), blue);
        wing.position.x = side * 6.6;
        g.add(wing);
        const gridMat = new THREE.LineBasicMaterial({ color: 0x6ab4e2, transparent: true, opacity: .56 });
        for (let k = -3; k <= 3; k++) {
            let x = side * 6.6 + k * .92;
            const gridLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, .08, -1.62), new THREE.Vector3(x, .08, 1.62)]), gridMat);
            g.add(gridLine);
        }
        for (let k = -1; k <= 1; k++) {
            let z = k * .8;
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(side * 3.4, .08, z), new THREE.Vector3(side * 9.8, .08, z)]), gridMat);
            g.add(line);
        }
    }
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.85, .88, 1.5, 24), steel);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 2.15;
    g.add(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), new THREE.MeshBasicMaterial({ color: 0x061c2e }));
    glass.position.z = 3.0;
    g.add(glass);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .08, 8, 24), new THREE.MeshBasicMaterial({ color }));
    ring.position.z = 3.01;
    g.add(ring);
    g.scale.setScalar(scale);
    return g;
}
function makeEarthTexture() {
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 512;
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const pixels = c.createImageData(W, H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const n = noise(x / 65, y / 65) * .5 + noise(x / 18, y / 18) * .3 + noise(x / 6, y / 6) * .2;
            const i = (y * W + x) * 4;
            pixels.data[i] = 7 + n * 12;
            pixels.data[i + 1] = 39 + n * 21;
            pixels.data[i + 2] = 73 + n * 27;
            pixels.data[i + 3] = 255;
        }
    }
    c.putImageData(pixels, 0, 0);
    const pt = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
    const drawLand = (points) => { c.beginPath(); points.forEach(([lo, la], i) => { const [x, y] = pt(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); let grad = c.createLinearGradient(0, 130, 0, 450); grad.addColorStop(0, '#9b8350'); grad.addColorStop(.5, '#88754e'); grad.addColorStop(.67, '#2d7050'); grad.addColorStop(1, '#435c3f'); c.fillStyle = grad; c.fill(); c.strokeStyle = 'rgba(182,195,123,.5)'; c.lineWidth = 1.6; c.stroke(); };
    for(const poly of AFRICA_LAND)drawLand(poly);
    c.lineWidth=.7;c.strokeStyle='rgba(179,219,197,.42)';
    for(const border of AFRICA_BORDERS){c.beginPath();border.forEach(([lo,la],i)=>{const [x,y]=pt(lo,la);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();}
    drawLand([[-11, 37], [-11, 45], [3, 50], [14, 54], [30, 55], [40, 47], [35, 37], [13, 35]]);
    drawLand([[43, -13], [50, -13], [50, -24], [45, -27]]);
    c.beginPath();
    NIGERIA.forEach(([lo, la], i) => { let [x, y] = pt(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    c.fillStyle = '#338a59';
    c.fill();
    c.strokeStyle = '#69fcd4';
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < 850; i++) {
        let x = 650 + frac(Math.sin(i * 52.1) * 153.9) * 300, y = 125 + frac(Math.sin(i * 17.2) * 458.9) * 280;
        let v = noise(x * .05, y * .05);
        if (v > .58) {
            c.fillStyle = `rgba(210,222,195,${.02 + .11 * v})`;
            c.fillRect(x, y, 1 + v * 8, 1 + v * 3);
        }
    }
    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}
class TacticalScene {
    constructor(node, onPick) { this.epochSeconds = null; this.commissioned = { geo: true }; this.node = node; this.onPick = onPick; this.clock = 0; this.orbitalSeconds = 0; this.orbitalPlay = true; this.orbitPathAccumulator = 0; this.mode = 'War Room 3D'; this.labels = true; this.layers = { ...INITIAL_LAYERS }; this.speed = 1; this.cleanupFns = []; this.pickables = []; this.markers = []; this.satObjects = []; this.orbitSats = []; this.beams = []; this.groups = {}; this.init(); }
    init() {
        const w = this.node.clientWidth || 1000, h = this.node.clientHeight || 700;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#020b14');
        this.scene.fog = new THREE.FogExp2('#020b14', .00155);
        this.camera = new THREE.PerspectiveCamera(46, w / h, .1, 2500);
        this.camera.position.set(127, 117, 156);
        try { this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}); } catch(primaryError) { console.warn('Retrying 3D with compatibility settings',primaryError); this.renderer = new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'default',precision:'mediump'}); }
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.15 : 1.35));
        this.renderer.setSize(w, h);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
        this.node.appendChild(this.renderer.domElement);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = .085;
        this.renderer.domElement.style.touchAction = 'none';
        this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
        this.controls.minDistance = 17;
        this.controls.maxDistance = 420;
        this.controls.maxPolarAngle = Math.PI * .49;
        this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
        this.scene.add(new THREE.HemisphereLight(0x8acbdf, 0x001421, 1.9));
        const light = new THREE.DirectionalLight(0xb9e7ff, 2.3);
        light.position.set(-50, 105, 50);
        this.scene.add(light);
        const rim = new THREE.PointLight(0x2bd4db, 1400, 220);
        rim.position.set(0, 72, -40);
        this.scene.add(rim);
        this.makeBackground();
        this.makeTable();
        this.makeTerrainDetails();
        this.makeCloudLayer();
        this.makeAfrica();
        this.makeGlobe();
        this.makeMarkers();
        this.makeMissionOverlay();
        this.makeLaunchGantry();
        this.makeSatellites();
        this.setMode('War Room 3D', true);
        const click = (e) => { if (this.dragged)
            return; const rect = this.renderer.domElement.getBoundingClientRect(); const mouse = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, this.camera); const hits = ray.intersectObjects(this.pickables, true); if (hits.length) {
            let obj = hits[0].object;
            while (obj && !obj.userData.assetId)
                obj = obj.parent;
            if (obj?.userData.assetId)
                this.onPick(obj.userData.assetId);
        } };
        let start = null;
        this.renderer.domElement.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; this.dragged = false; });
        this.renderer.domElement.addEventListener('pointermove', e => { if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 7)
            this.dragged = true; });
        this.renderer.domElement.addEventListener('pointerup', e => { if (start && !this.dragged)
            click(e); start = null; });
        this.renderer.domElement.addEventListener('pointerleave', () => { start = null; });
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.node);
        let last = performance.now();
        this.animate = (now) => { if (this.disposed)
            return; const delta = Math.min((now - last) / 1000, .05); last = now; this.clock += delta; if (this.orbitalPlay)
            this.orbitalSeconds += delta * ORBIT_VISUAL_RATE; if (this.replayTask) { const frame=missionReplayFrame(this.replayTask,(now-this.replayStartMs)/1000); if(frame)this.orbitalSeconds=frame.epochSeconds; } this.update(delta); this.controls.update(); this.renderer.render(this.scene, this.camera); this.raf = requestAnimationFrame(this.animate); };
        this.raf = requestAnimationFrame(this.animate);
    }
    makeBackground() {
        const stars = [];
        for (let i = 0; i < 1400; i++) {
            let a = frac(Math.sin(i * 18.71) * 578.5) * Math.PI * 2;
            let r = 180 + frac(Math.sin(i * 121.3) * 985.1) * 480;
            let y = (frac(Math.sin(i * 38.31) * 519.8) - .4) * 290;
            stars.push(Math.cos(a) * r, y, Math.sin(a) * r);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
        const points = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0x5b98b0, size: .75, transparent: true, opacity: .4, sizeAttenuation: true }));
        this.scene.add(points);
        const grid = new THREE.GridHelper(450, 90, 0x123a50, 0x0a283b);
        grid.position.y = -7;
        grid.material.transparent = true;
        grid.material.opacity = .33;
        this.scene.add(grid);
    }
    makeTable() {
        this.tableGroup = new THREE.Group();
        this.scene.add(this.tableGroup);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(108, 112, 8, 96), new THREE.MeshStandardMaterial({ color: 0x0c1b29, metalness: .8, roughness: .32 }));
        base.position.y = -7;
        this.tableGroup.add(base);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(103, 103, .5, 96), new THREE.MeshBasicMaterial({ color: 0x052337 }));
        inner.position.y = -2.7;
        this.tableGroup.add(inner);
        for (let r of [106, 100, 95]) {
            let ring = new THREE.Mesh(new THREE.TorusGeometry(r, r === 106 ? .32 : .13, 6, 120), new THREE.MeshBasicMaterial({ color: r === 106 ? 0x3cf0cd : 0x1c88af, transparent: true, opacity: r === 106 ? .76 : .35 }));
            ring.rotation.x = Math.PI / 2;
            ring.position.y = -2.15;
            this.tableGroup.add(ring);
        }
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(205, 170), new THREE.MeshBasicMaterial({ color: 0x0b3541, side: THREE.DoubleSide }));
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2.25;
        this.tableGroup.add(plane);
        this.neighborGroup = new THREE.Group();
        this.tableGroup.add(this.neighborGroup);
        for (const nation of NEIGHBORS) {
            for (const coords of nation.polys) {
                if (coords.length < 4)
                    continue;
                const ns = new THREE.Shape();
                coords.forEach(([lo, la], i) => { const x = (lo - 8.55) * 8.8, y = (la - 9.05) * 8.8; i ? ns.lineTo(x, y) : ns.moveTo(x, y); });
                ns.closePath();
                const nmesh = new THREE.Mesh(new THREE.ShapeGeometry(ns), new THREE.MeshStandardMaterial({ color: 0x236371, transparent: true, opacity: .19, side: THREE.DoubleSide, depthWrite: false, metalness: .12, roughness: .8 }));
                nmesh.rotation.x = -Math.PI / 2;
                nmesh.position.y = -1.86;
                this.neighborGroup.add(nmesh);
            }
        }
        const shape = new THREE.Shape();
        NIGERIA.forEach(([lon, lat], i) => { const x = (lon - 8.55) * 8.8, y = (lat - 9.05) * 8.8; i ? shape.lineTo(x, y) : shape.moveTo(x, y); });
        shape.closePath();
        const side = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 1 }), [new THREE.MeshStandardMaterial({ color: 0x144c3a, metalness: .15, roughness: .65 }), new THREE.MeshStandardMaterial({ color: 0x0b6b67, metalness: .45, roughness: .42 })]);
        side.rotation.x = -Math.PI / 2;
        side.position.y = -1.6;
        this.tableGroup.add(side);
        // Smooth indexed terrain: shared vertices produce continuous normals and no hard biome bands.
        const verts=[],colors=[],indices=[],vertices=new Map();
        const nx=205,ny=164,lo0=2.65,lo1=14.63,la0=4.20,la1=13.95;
        const vertex=(lo,la,i,j)=>{
            const key=`${i},${j}`;
            if(vertices.has(key))return vertices.get(key);
            const h=terrainElevation(lo,la);
            const pt=geoPos(lo,la,1.4+h);
            const pattern=noise(lo*3.6,la*4.4)*.65+noise(lo*11,la*10)*.35;
            const color=biomeBlend(lo,la,h,pattern);
            const id=verts.length/3;
            verts.push(pt.x,pt.y,pt.z);colors.push(...color);vertices.set(key,id);
            return id;
        };
        for(let i=0;i<nx;i++){
            const lo=lo0+(lo1-lo0)*i/nx,hi=lo0+(lo1-lo0)*(i+1)/nx;
            for(let j=0;j<ny;j++){
                const lat=la0+(la1-la0)*j/ny,top=la0+(la1-la0)*(j+1)/ny;
                if(!insidePolygon((lo+hi)/2,(lat+top)/2))continue;
                const a=vertex(lo,lat,i,j),b=vertex(hi,lat,i+1,j),c=vertex(lo,top,i,j+1),d=vertex(hi,top,i+1,j+1);
                indices.push(a,d,c,a,b,d);
            }
        }
        const terrainGeo=new THREE.BufferGeometry();
        terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
        terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        terrainGeo.setIndex(indices);terrainGeo.computeVertexNormals();
        const land=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.94,metalness:.015}));
        this.tableGroup.add(land);
        // Fill the polygon underneath the terrain triangles. An explicit terrain skirt closes
        // the open edge and prevents underside gaps in oblique camera angles.
        const underGeo = new THREE.ShapeGeometry(shape);
        const under = new THREE.Mesh(underGeo, new THREE.MeshStandardMaterial({color:0x163b33,side:THREE.DoubleSide,roughness:1}));
        under.rotation.x=-Math.PI/2;
        under.position.y=1.18;
        this.tableGroup.add(under);
        const skirtVerts=[];
        for(let i=0;i<NIGERIA.length-1;i++){
            const a=NIGERIA[i], b=NIGERIA[i+1];
            const segmentSteps=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*15));
            for(let j=0;j<segmentSteps;j++){
                const t0=j/segmentSteps,t1=(j+1)/segmentSteps;
                const v0=[a[0]+(b[0]-a[0])*t0,a[1]+(b[1]-a[1])*t0];
                const v1=[a[0]+(b[0]-a[0])*t1,a[1]+(b[1]-a[1])*t1];
                const top0=geoPos(v0[0],v0[1],1.4+terrainElevation(...v0));
                const top1=geoPos(v1[0],v1[1],1.4+terrainElevation(...v1));
                const base0=top0.clone().setY(-2.3),base1=top1.clone().setY(-2.3);
                [top0,base0,top1,top1,base0,base1].forEach(pt=>skirtVerts.push(pt.x,pt.y,pt.z));
            }
        }
        const skirtGeo=new THREE.BufferGeometry();
        skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(skirtVerts,3));
        skirtGeo.computeVertexNormals();
        const skirt=new THREE.Mesh(skirtGeo,new THREE.MeshStandardMaterial({color:0x1e7257,metalness:.15,roughness:.8,side:THREE.DoubleSide}));
        this.tableGroup.add(skirt);
        const points = NIGERIA.map(([lo, la]) => geoPos(lo, la, 1.9 + terrainElevation(lo, la)));
        const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x6bf4cd, transparent: true, opacity: .9 }));
        this.tableGroup.add(outline);
        const haloLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => p.clone().add(new THREE.Vector3(0, -.35, 0)))), new THREE.LineBasicMaterial({ color: 0x168da3, transparent: true, opacity: .5 }));
        this.tableGroup.add(haloLine);
        const emerald = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 260, .22, 6, true), new THREE.MeshBasicMaterial({ color: 0x33f8a8, transparent: true, opacity: .65, depthWrite: false }));
        this.tableGroup.add(emerald);
        for (let lat = 5.5; lat < 13.3; lat += 1.2) {
            let segment = [];
            for (let lo = 2.7; lo < 14.5; lo += .13) {
                if (insidePolygon(lo, lat)) {
                    segment.push(geoPos(lo, lat, 1.52 + terrainElevation(lo, lat)));
                }
                else if (segment.length > 1) {
                    this.tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(segment), new THREE.LineBasicMaterial({ color: 0x6be5ca, transparent: true, opacity: .14 })));
                    segment = [];
                }
            }
            if (segment.length > 1)
                this.tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(segment), new THREE.LineBasicMaterial({ color: 0x6be5ca, transparent: true, opacity: .14 })));
        }
    }
    makeCloudLayer(){
        // Soft alpha cloud sprites. Their opacity is computed from the campaign quarter.
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
        const ctx=canvas.getContext('2d');
        // Asymmetric overlapping cloud lobes avoid a spherical 'smoke-ball' appearance.
        ctx.clearRect(0,0,128,128);
        for(const [x,y,r,weight] of [[46,62,43,.58],[70,53,37,.68],[84,70,36,.56],[57,79,34,.45],[38,52,27,.4]]){
            const g=ctx.createRadialGradient(x,y,4,x,y,r);
            g.addColorStop(0,`rgba(255,255,255,${weight})`);
            g.addColorStop(.5,`rgba(246,250,255,${weight*.52})`);
            g.addColorStop(1,'rgba(230,239,246,0)');
            ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
        }
        this.cloudTexture=new THREE.CanvasTexture(canvas);
        this.cloudDeck=new THREE.Group();this.tableGroup.add(this.cloudDeck);
        this.cloudObjects=[];
        for(let i=0;i<115;i++){
            const lon=2.72+frac(Math.sin(i*23.143+3.5)*4195.7)*11.72;
            const lat=4.48+frac(Math.sin(i*61.23+9.7)*987.3)*9.15;
            if(!insidePolygon(lon,lat))continue;
            const pattern=noise(lon*2.05,lat*2.3);
            const material=new THREE.SpriteMaterial({map:this.cloudTexture,color:0xf8fbff,transparent:true,opacity:0,depthWrite:false,depthTest:true});
            const sprite=new THREE.Sprite(material);
            const h=terrainElevation(lon,lat);
            sprite.position.copy(geoPos(lon,lat,8.3+h+frac(i*.713)*2.7));
            sprite.scale.set(13+pattern*9,7+pattern*5,1);
            sprite.renderOrder=8;
            this.cloudDeck.add(sprite);
            this.cloudObjects.push({sprite,lon,lat,pattern,home:sprite.position.clone(),phase:i*.67});
        }
        this.season=null;
        this.setSeason(4);
    }
    setSeason(quarter){
        const q=Number(quarter)||4;if(this.season===q)return;this.season=q;
        for(const c of this.cloudObjects||[]){
            c.sprite.material.opacity=cloudOpacity(c.lon,c.lat,q,c.pattern)*.66;
            const shade=cloudCover(c.lon,c.lat,q,c.pattern);
            c.sprite.scale.set((12+c.pattern*9)*(0.72+shade*.75),(6+c.pattern*5)*(0.72+shade*.7),1);
        }
    }
    makeAfrica() {
        // The Africa overview uses a single consistent projection for all country boundaries.
        // Nigeria remains large and richly detailed in the original tabletop view.
        const group = new THREE.Group();
        this.africaGroup=group;
        this.scene.add(group);
        const proj=(lon,lat,y=-.7)=>new THREE.Vector3((lon-16)*2.55,y,-(lat-1)*2.55);
        const deck=new THREE.Mesh(new THREE.CylinderGeometry(114,118,5,96),new THREE.MeshStandardMaterial({color:0x151e26,metalness:.5,roughness:.55}));
        deck.position.y=-6;
        group.add(deck);
        const ocean=new THREE.Mesh(new THREE.CircleGeometry(112,96),new THREE.MeshStandardMaterial({color:0x0a2a34,roughness:.9,metalness:.15}));
        ocean.rotation.x=-Math.PI/2;ocean.position.y=-3.3;group.add(ocean);
        const landmat=new THREE.MeshStandardMaterial({color:0x34594f,roughness:.93,metalness:.03,side:THREE.DoubleSide});
        const coastlineMat=new THREE.LineBasicMaterial({color:0x668b80,transparent:true,opacity:.72});
        for(const coords of AFRICA_LAND){
            if(coords.length<3)continue;
            const sh=new THREE.Shape();
            coords.forEach(([lon,lat],i)=>{
                const x=(lon-16)*2.55, z=(lat-1)*2.55;
                i?sh.lineTo(x,z):sh.moveTo(x,z);
            });
            sh.closePath();
            const mesh=new THREE.Mesh(new THREE.ShapeGeometry(sh),landmat);
            mesh.rotation.x=-Math.PI/2;mesh.position.y=-2.75;group.add(mesh);
            const boundary=new THREE.Line(new THREE.BufferGeometry().setFromPoints(coords.map(([lon,lat])=>proj(lon,lat,-2.58))),coastlineMat);
            group.add(boundary);
        }
        const borders=new THREE.LineBasicMaterial({color:0x89afa4,transparent:true,opacity:.58,depthWrite:false});
        for(const coords of AFRICA_BORDERS){
            if(coords.length<2)continue;
            const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(coords.map(([lon,lat])=>proj(lon,lat,-2.52))),borders);
            group.add(line);
        }
        // Nigeria highlighted at its actual geographic location, not an enlarged inset.
        const ns=new THREE.Shape();
        NIGERIA.forEach(([lon,lat],i)=>{const x=(lon-16)*2.55,z=(lat-1)*2.55;i?ns.lineTo(x,z):ns.moveTo(x,z)});
        ns.closePath();
        const selected=new THREE.Mesh(new THREE.ShapeGeometry(ns),new THREE.MeshBasicMaterial({color:0x138f70,side:THREE.DoubleSide,transparent:true,opacity:.93,depthWrite:false}));
        selected.rotation.x=-Math.PI/2;selected.position.y=-2.3;group.add(selected);
        const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(NIGERIA.map(([lon,lat])=>proj(lon,lat,-2.13))),new THREE.LineBasicMaterial({color:0x73f5c1,transparent:true,opacity:.95}));
        group.add(border);
        const badge=makeLabel('NIGERIA','SPACE PROGRAMME HQ','#6deac3',true);
        badge.scale.set(9,2.3,1);badge.position.copy(proj(8.55,9.05,4));group.add(badge);
        for(const [name,lon,lat] of [['ALGERIA',3,28],['EGYPT',30,26],['NIGER',8.5,17.6],['CHAD',18.5,15.4],['CAMEROON',12,5.8],['GHANA',-1.2,7],['KENYA',37.5,.5],['SOUTH AFRICA',24,-28]]){
            const label=makeLabel(name,'','#a6c8bd',false);
            label.scale.set(10,1.65,1);label.position.copy(proj(lon,lat,2.4));group.add(label);
        }
        group.visible=false;
    }
    makeTerrainDetails() {
        const riverMaterial = new THREE.MeshBasicMaterial({ color: 0x4acdf4, transparent: true, opacity: .74, depthWrite: false });
        for (const river of [NIGER_RIVER, BENUE_RIVER]) {
            const curve = new THREE.CatmullRomCurve3(river.map(([lon, lat]) => geoPos(lon, lat, 2.05 + terrainElevation(lon, lat))));
            const stream = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, .18, 6, false), riverMaterial);
            this.tableGroup.add(stream);
            const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, .42, 5, false), new THREE.MeshBasicMaterial({ color: 0x1a7ec7, transparent: true, opacity: .13, depthWrite: false }));
            this.tableGroup.add(glow);
        }
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x2a937a, metalness: .2, roughness: .7, transparent: true, opacity: .83 });
        for (let i = 0; i < 64; i++) {
            const lo = 5.25 + frac(Math.sin(i * 39.28) * 437.5) * 3.50;
            const la = 4.4 + frac(Math.sin(i * 52.12) * 128.4) * 1.3;
            if (insidePolygon(lo, la))
                continue;
            const r = .22 + frac(Math.sin(i * 7.1) * 385.2) * .55;
            const obj = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), islandMat);
            obj.position.copy(geoPos(lo, la, -1.03));
            obj.scale.y = .15;
            this.tableGroup.add(obj);
        }
        for (let i = -8; i <= 8; i++) {
            const x = i * 12.1;
            const z = i * 12.1;
            const material = new THREE.LineBasicMaterial({ color: 0x3792ae, transparent: true, opacity: i % 4 === 0 ? .19 : .075, depthWrite: false });
            this.tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -1.94, -98), new THREE.Vector3(x, -1.94, 98)]), material));
            this.tableGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-98, -1.94, z), new THREE.Vector3(98, -1.94, z)]), material));
        }
        for (const [lo, la, r] of [[9.2, 9.8, 9], [12.1, 8.6, 8], [11.85, 6.75, 6]]) {
            const g = new THREE.Mesh(new THREE.RingGeometry(r - .15, r, 64), new THREE.MeshBasicMaterial({ color: 0xc3d4a2, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
            g.rotation.x = -Math.PI / 2;
            g.position.copy(geoPos(lo, la, 5.8));
            this.tableGroup.add(g);
        }
    }
    makeLaunchGantry() {
        const g = new THREE.Group();
        g.position.copy(geoPos(3.98, 6.56, 2.1 + terrainElevation(3.98, 6.56)));
        const steel = new THREE.MeshStandardMaterial({ color: 0x82b1bc, metalness: .8, roughness: .35 });
        const amber = new THREE.MeshBasicMaterial({ color: 0xffc878 });
        const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.22, .46, 12), new THREE.MeshStandardMaterial({ color: 0x143747, metalness: .7, roughness: .39 }));
        g.add(deck);
        for (const x of [-1.18, 1.18]) {
            for (const z of [-.75, .75]) {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(.18, 7.6, .18), steel);
                rail.position.set(x, 3.9, z);
                g.add(rail);
            }
        }
        for (let y = 1.6; y < 8; y += 1.5) {
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, .17, 1.7), steel);
            bridge.position.y = y;
            g.add(bridge);
        }
        const rocket = new THREE.Mesh(new THREE.CylinderGeometry(.40, .49, 6.2, 12), new THREE.MeshStandardMaterial({ color: 0xd6ecf0, metalness: .65, roughness: .38 }));
        rocket.position.set(.22, 3.55, 0);
        g.add(rocket);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.8, 12), amber);
        nose.position.set(.22, 7.5, 0);
        g.add(nose);
        for (const [x, z] of [[.2, .4], [.2, -.4], [-.2, .4]]) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(.13, 1.4, .35), steel);
            fin.position.set(x, 1.1, z);
            g.add(fin);
        }
        this.layerGroups.stations.add(g);
        this.gantry = g;
        const hit = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
        hit.userData.assetId = 'epe';
        g.add(hit);
        this.pickables.push(hit);
        const pulse = new THREE.PointLight(0xffaa67, 12, 13);
        pulse.position.y = 6;
        g.add(pulse);
    }
    makeGlobe() {
        this.globeGroup = new THREE.Group();
        this.globeGroup.position.y = 10;
        this.scene.add(this.globeGroup);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(43, 64, 44), new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: .85, metalness: 0 }));
        this.globeGroup.add(globe);
        this.earth = globe;
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(44.15, 56, 36), new THREE.MeshBasicMaterial({ color: 0x238df5, side: THREE.BackSide, transparent: true, opacity: .14, depthWrite: false }));
        this.globeGroup.add(atmosphere);
        const limb = new THREE.Mesh(new THREE.TorusGeometry(43.6, .3, 10, 132), new THREE.MeshBasicMaterial({ color: 0x3ac7ff, transparent: true, opacity: .20 }));
        limb.rotation.x = Math.PI / 4;
        this.globeGroup.add(limb);
        this.orbitSats = [];
        SATS.forEach((a, i) => {
            const trackCount = 200;
            const trackGeometry = new THREE.BufferGeometry();
            trackGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trackCount * 3), 3));
            const track = new THREE.LineLoop(trackGeometry, new THREE.LineBasicMaterial({ color: a.tone, transparent: true, opacity: a.class === 'GEO' ? .35 : .62, depthWrite: false }));
            this.globeGroup.add(track);
            const sat = satelliteMesh(a.tone, a.class === 'GEO' ? .8 : .42);
            sat.userData.assetId = a.id;
            this.globeGroup.add(sat);
            this.pickables.push(sat);
            const marker = makeLabel(a.name, a.class === 'GEO' ? 'GEO · fixed longitude' : 'DESIGN ORBIT', a.tone, false);
            marker.scale.multiplyScalar(.42);
            this.globeGroup.add(marker);
            this.orbitSats.push({ obj: sat, marker, index: i, a, track, trackCount });
        });
        const lo = 8.55 * RAD, la = 9.05 * RAD, r = 43.25;
        const pt = glowBall('#6af6b5', .75);
        pt.group.position.set(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), -r * Math.cos(la) * Math.cos(lo));
        this.globeGroup.add(pt.group);
        this.globeGroup.visible = false;
    }
    makeGroundAntenna(holder,item){
        const metal=new THREE.MeshStandardMaterial({color:0x6c818e,metalness:.74,roughness:.3});
        const white=new THREE.MeshStandardMaterial({color:0xdce5e4,metalness:.37,roughness:.43,side:THREE.DoubleSide});
        const rimMat=new THREE.MeshStandardMaterial({color:0xf0f5ef,metalness:.7,roughness:.26});
        const facility=new THREE.Group();facility.scale.setScalar(item.id==='nasrda'?1.07:.94);
        holder.add(facility);
        const pad=new THREE.Mesh(new THREE.BoxGeometry(4.8,.3,4.8),new THREE.MeshStandardMaterial({color:0x3e5255,metalness:.29,roughness:.71}));pad.position.y=.10;facility.add(pad);
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.53,.7,1.75,16),metal);pole.position.y=1.02;facility.add(pole);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.105,8,24),rimMat);ring.rotation.x=Math.PI/2;ring.position.y=1.91;facility.add(ring);
        const pivot=new THREE.Group();pivot.position.y=2.2;facility.add(pivot);
        const azFrame=new THREE.Mesh(new THREE.BoxGeometry(.63,.72,.64),metal);pivot.add(azFrame);
        const reflectorGeometry=new THREE.BufferGeometry(),v=[],ix=[];
        const nr=16,nphi=48,rad=1.63;
        for(let k=0;k<=nr;k++){
            const r=rad*k/nr;
            for(let j=0;j<=nphi;j++){
                const phi=j/nphi*Math.PI*2;
                v.push(r*Math.cos(phi),r*Math.sin(phi),.255*r*r);
                if(k<nr&&j<nphi){const a=k*(nphi+1)+j,b=a+nphi+1;ix.push(a,b,a+1,a+1,b,b+1);}
            }
        }
        reflectorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));reflectorGeometry.setIndex(ix);reflectorGeometry.computeVertexNormals();
        const dish=new THREE.Mesh(reflectorGeometry,white);pivot.add(dish);
        const rim=new THREE.Mesh(new THREE.TorusGeometry(rad,.058,8,48),rimMat);rim.position.z=.255*rad*rad;pivot.add(rim);
        const feedLocal=new THREE.Vector3(0,0,1.63);
        const feedHorn=new THREE.Mesh(new THREE.CylinderGeometry(.12,.19,.29,12),metal);
        feedHorn.rotation.x=Math.PI/2;feedHorn.position.copy(feedLocal);pivot.add(feedHorn);
        const tip=new THREE.Mesh(new THREE.SphereGeometry(.145,12,8),rimMat);
        tip.position.copy(feedLocal);pivot.add(tip);
        for(const theta of [0,Math.PI*2/3,Math.PI*4/3]){
            const from=new THREE.Vector3(Math.cos(theta)*rad*.89,Math.sin(theta)*rad*.89,.255*rad*rad*.79);
            const d=feedLocal.clone().sub(from),beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,d.length(),8),metal);
            beam.position.copy(from.clone().add(feedLocal).multiplyScalar(.5));
            beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());pivot.add(beam);
        }
        if(item.id==='nasrda'||item.id==='toro'){
            const shell=new THREE.Mesh(new THREE.SphereGeometry(2.43,32,20),new THREE.MeshStandardMaterial({color:0xe3eae9,metalness:0,roughness:.62,transparent:true,opacity:.48,depthWrite:false,side:THREE.FrontSide}));
            shell.position.copy(pivot.position);facility.add(shell);
            const equator=new THREE.Mesh(new THREE.TorusGeometry(2.43,.024,6,64),rimMat);equator.rotation.x=Math.PI/2;equator.position.copy(pivot.position);facility.add(equator);
            // Geodesic seams convey a weatherproof radome, not an opaque sphere pasted over a dish.
            for(const angle of [0,Math.PI/3,2*Math.PI/3]){
                const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:96},(_,j)=>{
                    const t=j/96*Math.PI*2;
                    return new THREE.Vector3(2.46*Math.cos(t)*Math.cos(angle),pivot.position.y+2.46*Math.sin(t),2.46*Math.cos(t)*Math.sin(angle));
                })),new THREE.LineBasicMaterial({color:0x899da1,transparent:true,opacity:.25,depthWrite:false}));
                facility.add(seam);
            }
        }
        return {facility,pivot,feedLocal,tip,groundId:item.id,targetId:'geo'};
    }
    aimGroundDish(model,target,dt=1){
        if(!model||!target)return;
        // Feed-horn is the physical endpoint. Aim the dish bore-sight toward the spacecraft.
        const origin=new THREE.Vector3();model.pivot.getWorldPosition(origin);
        const aim=target.clone().sub(origin).normalize();
        const desired=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),aim);
        model.pivot.quaternion.slerp(desired,Math.min(1,dt*2.7));
        model.targetId=target.userData?.assetId||model.targetId;
    }
    stationFeedWorld(model){
        model.pivot.updateWorldMatrix(true,false);
        return model.pivot.localToWorld(model.feedLocal.clone());
    }
    makeMarkers() {
        this.stationModels=new Map();
        this.layerGroups = { theatres: new THREE.Group(), targets: new THREE.Group(), stations: new THREE.Group() };
        Object.values(this.layerGroups).forEach(g => this.tableGroup.add(g));
        for (const item of [...THEATRES, ...GROUND, ...TARGETS]) {
            const gp = this.layerGroups[item.type === 'theatre' ? 'theatres' : item.type === 'station' ? 'stations' : 'targets'];
            const p = geoPos(item.lon, item.lat, 2.0 + terrainElevation(item.lon, item.lat));
            const holder = new THREE.Group();
            holder.position.copy(p);
            holder.userData.assetId = item.id;
            gp.add(holder);
            const glow = glowBall(item.tone, item.type === 'theatre' ? 1.22 : .85);
            holder.add(glow.group);
            if(item.type==='station'){
                // A true concave parabolic reflector with feedhorn, struts and az-el mount.
                // Selected facilities have protective translucent spherical radomes.
                const model=this.makeGroundAntenna(holder,item);
                this.stationModels.set(item.id,model);
            }
            glow.hit.userData.assetId = item.id;
            this.pickables.push(glow.hit);
            let ring = new THREE.Mesh(new THREE.TorusGeometry(item.type === 'theatre' ? 2.5 : 1.85, .10, 6, 40), new THREE.MeshBasicMaterial({ color: item.tone, transparent: true, opacity: .8, depthWrite: false }));
            ring.rotation.x = Math.PI / 2;
            ring.position.y = .12;
            holder.add(ring);
            const column = new THREE.Mesh(new THREE.CylinderGeometry(.06, .19, item.type === 'theatre' ? 3.8 : 2.7, 8), new THREE.MeshBasicMaterial({ color: item.tone, transparent: true, opacity: .48 }));
            column.position.y = -.92;
            holder.add(column);
            if (item.type === 'theatre') {
                const radius = item.id === 'hadin' ? 18 : item.id === 'fansan' ? 17 : 15;
                let area = new THREE.Mesh(new THREE.RingGeometry(radius - .25, radius, 64), new THREE.MeshBasicMaterial({ color: item.tone, side: THREE.DoubleSide, transparent: true, opacity: .23, depthWrite: false }));
                area.rotation.x = -Math.PI / 2;
                area.position.y = -1.3;
                holder.add(area);
            }
            const rich = makeLabel(item.name, item.subtitle, item.tone, true);
            rich.position.set(0, 8, 0);
            holder.add(rich);
            const simple = makeLabel(item.name, '', item.tone, false);
            simple.position.set(0, 6.7, 0);
            holder.add(simple);
            rich.userData.assetId = item.id;
            simple.userData.assetId = item.id;
            this.pickables.push(rich, simple);
            this.markers.push({ item, holder, ring, rich, simple });
        }
    }
    makeMissionOverlay() {
        // Single reusable visual: no allocations in the animation loop.
        this.missionGraphics = new THREE.Group();
        this.tableGroup.add(this.missionGraphics);
        const ring = (color, radius) => {
            const mesh = new THREE.Mesh(new THREE.RingGeometry(radius, radius+.25, 64),
                new THREE.MeshBasicMaterial({color, transparent:true,opacity:.85,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
            mesh.rotation.x=-Math.PI/2; mesh.renderOrder=48;
            this.missionGraphics.add(mesh); return mesh;
        };
        this.missionTargetRing=ring(0x72fbd3,4.0);
        this.missionReceiverRing=ring(0xffc971,3.1);
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
        this.missionBeam=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x65ecdb,transparent:true,opacity:.92,depthTest:false,depthWrite:false}));
        this.missionBeam.renderOrder=49;
        this.missionGraphics.add(this.missionBeam);
        this.missionGraphics.visible=false;
    }
    setMissionReplay(task) {
        const key=task?.replayToken||null;
        if(key===this.replayToken)return;
        this.replayToken=key;
        this.replayTask=task||null;
        this.replayStartMs=performance.now();
    }
    drawMissionReplay() {
        const frame=this.replayTask?missionReplayFrame(this.replayTask,(performance.now()-this.replayStartMs)/1000):null;
        this.currentReplayFrame=frame;
        if(!frame){this.missionGraphics.visible=false;return;}
        this.missionGraphics.visible=true;
        const region=MISSION_REGIONS[frame.regionId];
        const receiver=RECEIVERS.find(s=>s.id===frame.receiverId);
        const target=geoPos(region.lon,region.lat,7.4);
        this.missionTargetRing.position.copy(target);
        this.missionTargetRing.visible=frame.phase==='acquisition';
        this.missionReceiverRing.visible=frame.phase==='downlink'&&!!receiver;
        if(receiver)this.missionReceiverRing.position.copy(geoPos(receiver.lon,receiver.lat,7.4));
        const spacecraft=SATS.find(a=>a.id===frame.assetId);
        if(!spacecraft||!frame.location||!frame.linkValid||frame.phase==='complete'){
            this.missionBeam.visible=false;return;
        }
        const pos=orbitToTabletop(orbitState(spacecraft,frame.epochSeconds).ecef);
        this.missionBeam.visible=nearTableSky(pos);
        if(this.missionBeam.visible){
            const goal=geoPos(frame.location.lon,frame.location.lat,7.4);
            const attrs=this.missionBeam.geometry.attributes.position;
            attrs.setXYZ(0,pos.x,pos.y,pos.z);
            attrs.setXYZ(1,goal.x,goal.y,goal.z);
            attrs.needsUpdate=true;
            this.missionBeam.material.color.set(frame.phase==='acquisition'?0x65ecdb:0xffc971);
        }
        const pulse=1+Math.sin(this.clock*4)*.08;
        this.missionTargetRing.scale.setScalar(pulse);
        this.missionReceiverRing.scale.setScalar(pulse);
    }
    makeSatellites() {
        this.satGroup = new THREE.Group();
        this.tableGroup.add(this.satGroup);
        this.beamGroup = new THREE.Group();
        this.tableGroup.add(this.beamGroup);
        this.orbitTrackGroup = new THREE.Group();
        this.tableGroup.add(this.orbitTrackGroup);
        this.satObjects = [];
        this.beams = [];
        this.reticles = [];
        const geoAsset = SATS[0], geoState = orbitState(geoAsset, 0);
        const geoDirection = orbitToTabletop(geoState.ecef).sub(new THREE.Vector3(0, 2, 0)).normalize();
        const geoPosition = geoDirection.multiplyScalar(154).add(new THREE.Vector3(0, 2, 0));
        const geo = satelliteMesh(geoAsset.tone, .72);
        geo.position.copy(geoPosition);
        geo.userData.assetId = geoAsset.id;
        geo.rotation.set(.2, -.6, .02);
        this.satGroup.add(geo);
        this.pickables.push(geo);
        const geoRich = makeLabel('NIGCOMSAT-1R', 'GEO · STATIONARY · DISTANCE COMPRESSED', geoAsset.tone, true);
        geoRich.scale.multiplyScalar(.72);
        geoRich.position.copy(geo.position).add(new THREE.Vector3(0, 9, 0));
        this.satGroup.add(geoRich);
        const geoSimple = makeLabel('NIGCOMSAT-1R', '', geoAsset.tone, false);
        geoSimple.scale.multiplyScalar(.75);
        geoSimple.position.copy(geo.position).add(new THREE.Vector3(0, 6, 0));
        this.satGroup.add(geoSimple);
        this.satObjects.push({ sat: geo, rich: geoRich, simple: geoSimple, a: geoAsset, i: 0, isGeo: true });
        const source = geo.position.clone(), target = new THREE.Vector3(0, 11.0, 0), diff = source.clone().sub(target), len = diff.length();
        const beam = new THREE.Mesh(new THREE.ConeGeometry(52, len, 56, 1, true), new THREE.MeshBasicMaterial({ color: 0xae7bdd, transparent: true, opacity: .043, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        beam.position.copy(source).add(target).multiplyScalar(.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
        this.beamGroup.add(beam);
        const beamInner = new THREE.Mesh(new THREE.ConeGeometry(38, len, 42, 1, true), new THREE.MeshBasicMaterial({ color: 0xf8bf63, transparent: true, opacity: .065, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        beamInner.position.copy(beam.position);
        beamInner.quaternion.copy(beam.quaternion);
        this.beamGroup.add(beamInner);
        const footprint = new THREE.Mesh(new THREE.CircleGeometry(45, 80), new THREE.MeshBasicMaterial({ color: 0xe6a454, transparent: true, opacity: .045, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
        footprint.rotation.x = -Math.PI / 2;
        footprint.position.y = 10.65;
        footprint.renderOrder = 24;
        this.beamGroup.add(footprint);
        const footprintOuter = new THREE.Mesh(new THREE.RingGeometry(44, 44.6, 84), new THREE.MeshBasicMaterial({ color: 0xfaca76, transparent: true, opacity: .30, side: THREE.DoubleSide, depthWrite: false, depthTest: false }));
        footprintOuter.rotation.x = -Math.PI / 2;
        footprintOuter.position.y = 10.7;
        footprintOuter.renderOrder = 25;
        this.beamGroup.add(footprintOuter);
        this.geoLinks=[];
        const pulseGeometry=new THREE.SphereGeometry(.36,9,7);
        GROUND.forEach((station,i)=>{
            const model=this.stationModels.get(station.id);
            const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),source]);
            const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:i%2===0?0xeebd77:0x91cce2,transparent:true,opacity:.46,depthTest:false,depthWrite:false}));
            line.renderOrder=36;this.beamGroup.add(line);
            const pulses=[];
            for(let p=0;p<3;p++){
                const glow=new THREE.Mesh(pulseGeometry,new THREE.MeshBasicMaterial({color:i%2===0?0xffdf9d:0xc4f5ff,transparent:true,opacity:.92,depthTest:false,depthWrite:false}));
                glow.renderOrder=37;this.beamGroup.add(glow);pulses.push(glow);
            }
            this.geoLinks.push({model,station,line,pulses,source,level:i<2?1:i===2?3:2});
        });
        this.contactLinks=[];
        SATS.slice(1).forEach((a,k)=>{
            for(const station of RECEIVERS){
                const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
                const line=new THREE.Line(geom,new THREE.LineDashedMaterial({color:a.tone,transparent:true,opacity:.9,dashSize:1.7,gapSize:.8,depthTest:false,depthWrite:false}));
                line.visible=false;line.renderOrder=40;
                this.beamGroup.add(line);
                this.contactLinks.push({asset:a,station,line,k,wasVisible:false});
            }
        });
        SATS.slice(1).forEach((a, k) => {
            const sat = satelliteMesh(a.tone, .52);
            sat.userData.assetId = a.id;
            this.satGroup.add(sat);
            this.pickables.push(sat);
            const rich = makeLabel(a.name, 'DESIGN PREVIEW · NOT DEPLOYED', a.tone, true);
            rich.scale.multiplyScalar(.66);
            this.satGroup.add(rich);
            const simple = makeLabel(a.name, '', a.tone, false);
            simple.scale.multiplyScalar(.69);
            this.satGroup.add(simple);
            const count = 190;
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
            geometry.setDrawRange(0, 0);
            const track = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: a.tone, transparent: true, opacity: .57, depthWrite: false }));
            this.orbitTrackGroup.add(track);
            const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 1, 28, 1, true), new THREE.MeshBasicMaterial({ color: a.tone, transparent: true, opacity: .115, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
            this.beamGroup.add(cone);
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 20, 0)]), new THREE.LineBasicMaterial({ color: a.tone, transparent: true, opacity: .7, depthWrite: false }));
            this.beamGroup.add(line);
            const reticle = new THREE.Group();
            reticle.renderOrder = 30;
            this.beamGroup.add(reticle);
            const mk = (geo, opacity, order) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: a.tone, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.renderOrder = order; reticle.add(m); return m; };
            mk(new THREE.CircleGeometry(6.3, 48), .07, 30);
            const outer = mk(new THREE.RingGeometry(6.0, 6.24, 64), .85, 31);
            const second = mk(new THREE.RingGeometry(3.85, 3.96, 64), .57, 32);
            const bracket = new THREE.Group();
            reticle.add(bracket);
            for (let j = 0; j < 4; j++) {
                const angle = j * Math.PI / 2 + Math.PI / 4, pts = [];
                for (let n = 0; n <= 8; n++) {
                    const theta = angle - .18 + n * .36 / 8;
                    pts.push(new THREE.Vector3(Math.cos(theta) * 4.9, .08, Math.sin(theta) * 4.9));
                }
                const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: a.tone, transparent: true, opacity: .97, depthWrite: false, depthTest: false }));
                arc.renderOrder = 34;
                bracket.add(arc);
            }
            for (const axis of [0, 1]) {
                const cross = new THREE.Mesh(new THREE.BoxGeometry(axis ? 2.65 : .14, .05, axis ? .14 : 2.65), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .82, depthTest: false, depthWrite: false }));
                cross.position.y = .2;
                cross.renderOrder = 34;
                reticle.add(cross);
            }
            this.reticles.push({ reticle, outer, second, bracket, k });
            this.beams.push({ cone, line });
            this.satObjects.push({ sat, rich, simple, a, i: k + 1, isGeo: false, track, trackCount: count });
        });
    }
    update(dt) {
        if (this.transition) {
            const t = clamp((performance.now() - this.transition.start) / this.transition.duration, 0, 1);
            const e = 1 - Math.pow(1 - t, 3);
            this.camera.position.lerpVectors(this.transition.from, this.transition.to, e);
            this.controls.target.lerpVectors(this.transition.targetFrom, this.transition.targetTo, e);
            if (t >= 1)
                this.transition = null;
        }
        this.drawMissionReplay();
        this.markers.forEach(({ ring }, i) => { const s = 1 + Math.sin(this.clock * 1.8 + i) * .06; ring.scale.setScalar(s); ring.material.opacity = .6 + .22 * Math.sin(this.clock * 1.6 + i); });
        const t = this.orbitalSeconds;
        SATS.slice(1).forEach((a, k) => {
            const s = orbitState(a, t), position = orbitToTabletop(s.ecef), onSky = nearTableSky(position);
            const so = this.satObjects[k + 1], isActive = !!this.commissioned[a.id];
            so.sat.position.copy(position);
            so.sat.rotation.set(.12, -this.clock * .075, .04);
            so.sat.visible = onSky && this.layers.satellites;
            so.rich.position.copy(position).add(new THREE.Vector3(0, 5, 0));
            so.simple.position.copy(position).add(new THREE.Vector3(0, 4, 0));
            so.rich.visible = onSky && this.layers.satellites && this.labels && this.layers.descriptors;
            so.simple.visible = onSky && this.layers.satellites && this.labels && !this.layers.descriptors;
            const overNigeria = insidePolygon(s.lon, s.lat);
            const activePass = isActive && onSky && overNigeria && this.layers.satellites && this.layers.beams;
            const { reticle, outer, second, bracket } = this.reticles[k], beam = this.beams[k];
            reticle.visible = activePass;
            beam.cone.visible = activePass;
            beam.line.visible = activePass;
            if(activePass && !this.lastPass?.[a.id] && this.onPass){
                this.onPass({kind:'pass',asset:a.name,region:'NIGERIA'});
            }
            if(!this.lastPass)this.lastPass={};
            this.lastPass[a.id]=activePass;
            if (activePass) {
                const ground = geoPos(s.lon, s.lat, 9.5 + terrainElevation(s.lon,s.lat));
                reticle.position.copy(ground);
                outer.scale.setScalar(1 + .035 * Math.sin(this.clock * 2 + k));
                second.scale.setScalar(1 - .06 * Math.sin(this.clock * 1.8 + k));
                bracket.rotation.y = this.clock * .08;
                const diff = position.clone().sub(ground), height = diff.length();
                beam.cone.position.copy(position).add(ground).multiplyScalar(.5);
                beam.cone.scale.y = height;
                beam.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
                const pp = beam.line.geometry.attributes.position;
                pp.setXYZ(0, position.x, position.y, position.z);
                pp.setXYZ(1, ground.x, ground.y, ground.z);
                pp.needsUpdate = true;
            }
        });
        const trackingStations=new Set();
        for(const link of this.contactLinks){
            const a=link.asset;
            const state=orbitState(a,t);
            const position=orbitToTabletop(state.ecef);
            const eligible=link.station.level<=this.groundLevel && !!this.commissioned[a.id]
                && this.layers.beams && this.layers.satellites && nearTableSky(position)
                && elevationDeg(state.ecef,link.station.lat,link.station.lon)>=12;
            const dishId=link.station.id==='abuja'?'nasrda':link.station.id==='coastal'?'epe':'toro';
            const model=this.stationModels.get(dishId);
            const active=eligible&&!trackingStations.has(dishId);
            link.line.visible=active;
            if(active){
                trackingStations.add(dishId);
                this.aimGroundDish(model,position,dt);
                const pt=model?this.stationFeedWorld(model):geoPos(link.station.lon,link.station.lat,9+terrainElevation(link.station.lon,link.station.lat));
                const attr=link.line.geometry.attributes.position;
                attr.setXYZ(0,position.x,position.y,position.z);
                attr.setXYZ(1,pt.x,pt.y,pt.z);
                attr.needsUpdate=true;link.line.computeLineDistances();
                if(!link.wasVisible && this.onPass && (!this.lastContactAt || this.clock-this.lastContactAt>14)){
                    this.lastContactAt=this.clock;
                    this.onPass({kind:'contact',asset:a.name,station:link.station.name});
                }
            }
            link.wasVisible=eligible;
        }
        // GEO stays Earth-fixed. The dish tracks a stable bearing; travelling photons are
        // represented by packets between the true feed-horn tip and satellite mesh centre.
        for(const link of this.geoLinks){
            const model=link.model,leased=this.groundLevel>=link.level;
            const tracking=trackingStations.has(link.station.id);
            link.line.visible=leased&&!tracking;
            link.pulses.forEach(p=>p.visible=link.line.visible);
            if(!link.line.visible)continue;
            this.aimGroundDish(model,link.source,dt);
            const feed=this.stationFeedWorld(model);
            const pos=link.line.geometry.attributes.position;
            pos.setXYZ(0,feed.x,feed.y,feed.z);
            pos.setXYZ(1,link.source.x,link.source.y,link.source.z);
            pos.needsUpdate=true;
            link.pulses.forEach((pulse,k)=>{
                const frac=((this.clock*.24+k/3)%1+1)%1;
                pulse.position.copy(feed).lerp(link.source,frac);
                pulse.scale.setScalar(.65+.55*Math.sin(Math.PI*frac));
                pulse.material.opacity=.25+.69*Math.sin(Math.PI*frac);
            });
        }
        if(!this.geoContactAnnounced&&this.onPass&&this.geoLinks.some(l=>l.line.visible)){
            this.geoContactAnnounced=true;
            this.onPass({kind:'contact',asset:'NigComSat-1R',station:'Ground network'});
        }
        this.orbitSats.forEach(({ obj, marker, a }) => {
            const state = orbitState(a, t), p = orbitToGlobe(state.ecef, a);
            obj.position.copy(p);
            obj.rotation.y = a.class==='GEO' ? -.08 : -t*.0008;
            marker.position.copy(p).add(new THREE.Vector3(0, 4, 0));
            const active = !!this.commissioned[a.id];
            obj.visible = this.layers.satellites;
            marker.visible = this.labels && this.layers.descriptors && this.layers.satellites && obj.visible;
        });
        this.orbitPathAccumulator += dt;
        if (this.orbitPathAccumulator > .32 || !this.tracksInitialized) {
            this.orbitPathAccumulator = 0;
            this.tracksInitialized = true;
            this.orbitSats.forEach(({ a, track, trackCount }) => {
                const pos = track.geometry.attributes.position;
                for (let j = 0; j < trackCount; j++) {
                    const phase = j / trackCount * Math.PI * 2;
                    const state = orbitState(a, t, phase);
                    const gp = orbitToGlobe(state.ecef, a);
                    pos.setXYZ(j, gp.x, gp.y, gp.z);
                }
                pos.needsUpdate = true;
            });
            this.satObjects.filter(s => !s.isGeo).forEach(({ a, track, trackCount }) => {
                const arr = track.geometry.attributes.position;
                let verts = 0;
                const period = orbitPeriodSeconds(a);
                for (let i = 0; i < trackCount; i++) {
                    const ta = t + (i / trackCount - .5) * period;
                    const tb = t + ((i + 1) / trackCount - .5) * period;
                    const pa = orbitToTabletop(orbitState(a, ta).ecef);
                    const pb = orbitToTabletop(orbitState(a, tb).ecef);
                    if (nearTableSky(pa) && nearTableSky(pb)) {
                        arr.setXYZ(verts++, pa.x, pa.y, pa.z);
                        arr.setXYZ(verts++, pb.x, pb.y, pb.z);
                    }
                }
                track.geometry.setDrawRange(0, verts);
                arr.needsUpdate = true;
            });
        }
    }
    configure({ mode, layers, labels, speed, commissioned, groundLevel, launchFunded, orbitalPlay, epochSeconds, replayTask, quarter }) {
        if (Number.isFinite(epochSeconds) && this.epochSeconds !== epochSeconds) { this.epochSeconds=epochSeconds; this.orbitalSeconds=epochSeconds; }
        this.layers = layers;
        this.setSeason(quarter);
        this.labels = labels;
        this.speed = speed;
        this.orbitalPlay = orbitalPlay !== false;
        this.commissioned = commissioned || { geo: true };
        this.groundLevel = Number(groundLevel) || 1;
        this.setMissionReplay(replayTask);
        if (this.gantry)
            this.gantry.visible = !!launchFunded;
        if (mode !== this.mode)
            this.setMode(mode);
        const orbitMode = mode === 'Orbit View';
        const africaMode = mode === 'Africa View';
        this.tableGroup.visible = !orbitMode && !africaMode;
        this.globeGroup.visible = orbitMode;
        this.africaGroup.visible = africaMode;
        this.controls.maxPolarAngle = orbitMode ? Math.PI * .98 : Math.PI * .495;
        this.layerGroups.theatres.visible = !!layers.theatres;
        this.layerGroups.targets.visible = !!layers.targets;
        this.layerGroups.stations.visible = !!layers.stations;
        this.satGroup.visible = !!layers.satellites;
        this.orbitTrackGroup.visible = !!layers.satellites;
        this.beamGroup.visible = !!layers.beams && !!layers.satellites;
        for (let m of this.markers) {
            m.rich.visible = !!labels && !!layers.descriptors;
            m.simple.visible = !!labels && !layers.descriptors;
        }
        for (let m of this.satObjects) {
            const active = !!this.commissioned[m.a.id];
            if (!m.isGeo) {
                m.sat.traverse(o => { if (o.isMesh && o.material) {
                    o.material.transparent = true;
                    o.material.opacity = active ? 1 : .22;
                    o.material.depthWrite = active;
                } });
                m.sat.scale.setScalar(active ? 1 : .70);
                m.rich.material.opacity = active ? .96 : .55;
                m.simple.material.opacity = active ? .96 : .55;
                m.track.material.opacity = active ? .68 : .32;
            }
            else {
                m.rich.visible = !!labels && !!layers.descriptors;
                m.simple.visible = !!labels && !layers.descriptors;
            }
        }
        this.orbitSats.forEach(({ obj, marker, a, track }) => {
            const active = !!this.commissioned[a.id];
            obj.traverse(o => { if (o.isMesh && o.material) {
                o.material.transparent = true;
                o.material.opacity = active ? 1 : .25;
                o.material.depthWrite = active;
            } });
            track.material.opacity = active ? (a.class === 'GEO' ? .38 : .72) : .30;
            marker.material.opacity = active ? .94 : .5;
            obj.visible = !!layers.satellites;
            marker.visible = !!layers.satellites && !!labels && !!layers.descriptors;
            track.visible = !!layers.satellites;
        });
    }
    setMode(mode, immediate = false) {
        this.mode = mode;
        this.controls.maxPolarAngle = mode === 'Orbit View' ? Math.PI * .98 : Math.PI * .495;
        let pos, tgt;
        switch (mode) {
            case 'Africa View':
                pos = [115, 125, 165];
                tgt = [0, 0, 0];
                break;
            case 'Orbit View':
                pos = [66, 100, 210];
                tgt = [0, 10, 0];
                break;
            case 'Abuja HQ': {
                let a = geoPos(7.3986, 9.0765, 3);
                pos = [a.x + 27, 59, a.z + 42];
                tgt = [a.x, 3, a.z];
                break;
            }
            case 'North-East': {
                let a = geoPos(12.25, 11.72, 3);
                pos = [a.x + 28, 70, a.z + 33];
                tgt = [a.x, 3, a.z];
                break;
            }
            case 'North-West': {
                let a = geoPos(5.4, 11.15, 3);
                pos = [a.x - 22, 67, a.z + 42];
                tgt = [a.x, 3, a.z];
                break;
            }
            case 'Niger Delta': {
                let a = geoPos(6.6, 5.4, 3);
                pos = [a.x - 15, 61, a.z + 42];
                tgt = [a.x, 3, a.z];
                break;
            }
            default:
                pos = [127, 117, 156];
                tgt = [0, 1, 0];
        }
        if (immediate) {
            this.camera.position.set(...pos);
            this.controls.target.set(...tgt);
        }
        else
            this.startTransition(new THREE.Vector3(...pos), new THREE.Vector3(...tgt), 1100);
    }
    focusAsset(id) { const item = ASSETS.find(a => a.id === id); if (!item)
        return; if (item.type === 'satellite') {
        if (this.mode === 'Orbit View') {
            const oi = SATS.findIndex(s => s.id === id);
            const orbit = this.orbitSats[oi];
            if (orbit) {
                const p = orbit.obj.getWorldPosition(new THREE.Vector3());
                const offset = p.clone().sub(this.globeGroup.position).normalize().multiplyScalar(26);
                this.startTransition(p.clone().add(offset), p, 900);
            }
            return;
        }
        const sat = this.satObjects.find(s => s.a.id === id);
        if (!sat)
            return;
        let p = sat.sat.position.clone();
        this.startTransition(p.clone().add(new THREE.Vector3(26, 19, 29)), p, 850);
    }
    else {
        if (this.mode === 'Orbit View')
            return;
        const p = geoPos(item.lon, item.lat, 3 + terrainElevation(item.lon, item.lat));
        this.startTransition(p.clone().add(new THREE.Vector3(25, 32, 39)), p, 900);
    } }
    startTransition(pos, tgt, duration) { this.transition = { from: this.camera.position.clone(), to: pos, targetFrom: this.controls.target.clone(), targetTo: tgt, start: performance.now(), duration }; }
    resize() { if (this.disposed)
        return; const w = this.node.clientWidth || 500, h = this.node.clientHeight || 400; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
    zoom(n) { this.transition = null; const v = this.camera.position.clone().sub(this.controls.target); this.camera.position.copy(this.controls.target.clone().add(v.multiplyScalar(n))); }
    dispose() { this.disposed = true; cancelAnimationFrame(this.raf); this.resizeObserver?.disconnect(); this.controls.dispose(); this.scene.traverse(o => { if (o.geometry)
        o.geometry.dispose(); if (o.material) {
        for (let m of (Array.isArray(o.material) ? o.material : [o.material])) {
            if (m.map)
                m.map.dispose();
            m.dispose();
        }
    } }); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
function Scene3D({ engineRef, onPick, onPass, mode, layers, labels, speed, commissioned, groundLevel, launchFunded, orbitalPlay, epochSeconds, replayTask, quarter }) { const el = useRef(null); const [graphicsError,setGraphicsError]=useState(null); const picker = useRef(onPick); const passListener=useRef(onPass); picker.current = onPick;passListener.current=onPass; useEffect(() => {
    if (!el.current) return;
    let engine;
    try { engine = new TacticalScene(el.current, id => picker.current(id)); }
    catch (error) {
        console.error('Unable to initialize WebGL tactical scene:', error);
        el.current?.replaceChildren();
        setGraphicsError(error?.message||'The 3D renderer could not start.');
        return;
    }
    engineRef.current = engine;engine.onPass=event=>passListener.current?.(event);
    const canvas=engine.renderer.domElement;
    const onContextLost=event=>{event.preventDefault();setGraphicsError('WebGL context lost. Restart browser or update graphics settings.');};
    const onContextRestored=()=>setGraphicsError(null);
    canvas.addEventListener('webglcontextlost',onContextLost);
    canvas.addEventListener('webglcontextrestored',onContextRestored);
    return () => {canvas.removeEventListener('webglcontextlost',onContextLost);canvas.removeEventListener('webglcontextrestored',onContextRestored);engineRef.current = null; engine.dispose();};
}, []); useEffect(() => {
    try{engineRef.current?.configure({ mode, layers, labels, speed, commissioned, groundLevel, launchFunded, orbitalPlay, epochSeconds, replayTask, quarter });}
    catch(error){console.error('3D configuration failed',error);setGraphicsError(error?.message||'3D configuration failed');}
}, [mode, layers, labels, speed, commissioned, groundLevel, launchFunded, orbitalPlay, epochSeconds, replayTask, quarter]);
return React.createElement('div',{className:'scene-canvas-host'},
    React.createElement('div',{ref:el,className:'scene-canvas','aria-label':'Interactive Nigeria 3D tactical map'}),
    graphicsError && React.createElement('section',{className:'graphics-error',role:'alert'},
       React.createElement('h2',null,'3D VIEW UNAVAILABLE'),
       React.createElement('p',null,'Your browser could not display the scene. Your campaign data remains safe.'),
       React.createElement('p',{className:'graphics-error-detail'},graphicsError),
       React.createElement('p',null,'Enable graphics acceleration in browser settings, restart the browser and reload. If the problem persists, update your graphics driver.'),
       React.createElement('button',{onClick:()=>window.location.reload()},'RETRY 3D VIEW'))
); }
function Meter({ value, color }) { return React.createElement("div", { className: "meter-track" },
    React.createElement("div", { style: { width: clamp(value, 0, 100) + '%', background: color || '#54e3cb' } })); }
const SAVE_KEY = 'tuhg-campaign-v5';
const V4_SAVE_KEY = 'tuhg-campaign-v4';
const V3_SAVE_KEY = 'tuhg-campaign-v3';
const PREVIOUS_SAVE_KEY = 'tuhg-campaign-v2';
const OLD_SAVE_KEY = 'tuhg-campaign-v1';
function isTouchGameDevice() {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= 820;
}
function requestLandscapeFullscreen() {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
        Promise.resolve(root.requestFullscreen({ navigationUI: 'hide' }))
            .then(() => window.screen?.orientation?.lock?.('landscape'))
            .catch(() => {});
    } else if (document.fullscreenElement && window.screen?.orientation?.lock) {
        Promise.resolve(window.screen.orientation.lock('landscape')).catch(() => {});
    }
}
function exitGameFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
        Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
}

function readCampaignSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(V4_SAVE_KEY) || localStorage.getItem(V3_SAVE_KEY) || localStorage.getItem(PREVIOUS_SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        return saved && typeof saved.turn === 'number' ? saved : null;
    } catch (error) { console.warn('Campaign save unavailable:', error); return null; }
}
function App() {
    const saved = useMemo(readCampaignSave, []);
    const [campaign, setCampaign] = useState(() => createCampaign(saved));
    const [entered, setEntered] = useState(false);
    const [firstLightOpen,setFirstLightOpen]=useState(!saved);
    const [firstLightBriefing,setFirstLightBriefing]=useState(!saved);
    const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
    const [isPortraitPhone, setIsPortraitPhone] = useState(() => isTouchGameDevice() && window.innerHeight > window.innerWidth);
    const [portraitOverride, setPortraitOverride] = useState(false);

    const [orbitalPlay, setOrbitalPlay] = useState(saved?.orbitalPlay ?? true);
    const [mode, setMode] = useState(saved?.mode ?? 'War Room 3D');
    const [layers, setLayers] = useState({ ...INITIAL_LAYERS, ...(saved?.layers || {}) });
    const [labels, setLabels] = useState(saved?.labels ?? true);
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [speed, setSpeed] = useState(0);
    useEffect(() => {
        const syncDisplay = () => {
            const portrait = isTouchGameDevice() && window.innerHeight > window.innerWidth;
            setIsPortraitPhone(portrait);
            setIsFullscreen(Boolean(document.fullscreenElement));
            if (!portrait) setPortraitOverride(false);
        };
        window.addEventListener('resize', syncDisplay);
        window.addEventListener('orientationchange', syncDisplay);
        document.addEventListener('fullscreenchange', syncDisplay);
        return () => {
            window.removeEventListener('resize', syncDisplay);
            window.removeEventListener('orientationchange', syncDisplay);
            document.removeEventListener('fullscreenchange', syncDisplay);
        };
    }, []);

    const [selectedId, setSelectedId] = useState('geo');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [briefingOpen,setBriefingOpen]=useState(false);
    const [passNotice,setPassNotice]=useState(null);
    const passNoticeTimer=useRef(null);
    const [tab, setTab] = useState('Overview');
    const [simClock, setSimClock] = useState(saved?.simClock ?? 14 * 60 + 30);
    const [toast, setToast] = useState('');
    const [orbitalInfo, setOrbitalInfo] = useState(null);
    const [missionOpen, setMissionOpen] = useState(false);
    const [missionView, setMissionView] = useState('tasking');
    const [replayTask, setReplayTask] = useState(null);
    const [replayPhase, setReplayPhase] = useState('acquisition');
    const [missionAsset, setMissionAsset] = useState('sat3');
    const [missionRegion, setMissionRegion] = useState('savannah');
    const [plannerEpoch, setPlannerEpoch] = useState(0);
    const { budget, bandwidth, support, integrity, turn, threats, fuel, launchFunded, geoExtension, programmes, researchTurn, progress, logs } = campaign;
    const metrics = useMemo(() => computeMetrics(campaign), [campaign]);
    const milestones = useMemo(() => milestoneStatus(campaign), [campaign]);
    const projectCount = Object.values(campaign.projects||{}).filter(p=>p.status==='active').length;
    const firstLight = useMemo(() => firstLightProgress(campaign), [campaign]);
    const ended = Boolean(campaign.outcome);
    const commissioned = useMemo(() => ({ geo: true, ...Object.fromEntries(Object.entries(programmes).map(([id, stage]) => [id, stage === 'deployed'])) }), [programmes]);
    const upcomingPass = useMemo(()=>{
        const active=Object.keys(MISSION_ASSETS).filter(id=>commissioned[id]);
        if(!active.length)return null;
        const items=active.map(id=>planMission(id,id==='ais'?'delta':'savannah',campaign.missionEpochSeconds||0,campaign.groundLevel||1)).filter(q=>!q.error);
        return items.sort((a,b)=>a.hoursUntilPass-b.hoursUntilPass)[0]||null;
    },[commissioned,campaign.missionEpochSeconds,campaign.groundLevel]);
    // Save V3, preserving prior campaign versions and supporting new mission data.
    useEffect(() => {
        if (!entered) return;
        try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...campaign,
            updatedAt: new Date().toISOString(), simClock, orbitalPlay, mode, layers, labels })); }
        catch (error) { console.warn('Could not save campaign:', error); }
    }, [entered, campaign, simClock, orbitalPlay, mode, layers, labels]);
    const engineRef = useRef(null);
    const accum = useRef(0);
    const toastTimeout = useRef(null);
    const selected = ASSETS.find(a => a.id === selectedId) || SATS[0];
    const stage = selected.type === 'satellite' ? (programmes[selected.id] || 'active') : null;
    const inService = stage === 'active' || stage === 'deployed';
    const statusLine = selected.type === 'satellite' ? (stage === 'concept' ? selected.status : stage === 'research' ? `R&D IN PROGRESS · ${programmeRemaining(campaign, selected.id)} QUARTERS LEFT` : stage === 'ready' ? 'QUALIFIED · AWAITING COMMISSIONING' : stage === 'deployed' ? 'DEPLOYED ' : selected.status) : selected.status;
    const risk = threats[selected.id] ?? selected.risk ?? 0;
    const inform = (msg) => { setToast(msg); clearTimeout(toastTimeout.current); toastTimeout.current = setTimeout(() => setToast(''), 3600); };
    const choose = (id) => { if(id==='delta'&&campaign.firstLight?.status==='active')setCampaign(s=>recordFirstLightInspection(s,'delta')); setSelectedId(id); setTab('Overview'); setDrawerOpen(true); const item = ASSETS.find(a => a.id === id); if (mode === 'Orbit View' && item?.type !== 'satellite') {
        setMode('War Room 3D');
        engineRef.current?.setMode('War Room 3D');
    } engineRef.current?.focusAsset(id); };
    const camera = (m) => { setMode(m); setDrawerOpen(m === 'Orbit View' || m === 'Africa View' ? false : drawerOpen); setBriefingOpen(false); };
    const passMessage=evt=>{ setPassNotice(evt);clearTimeout(passNoticeTimer.current);passNoticeTimer.current=setTimeout(()=>setPassNotice(null),5400); };
    const enterGame = (view = 'War Room 3D') => {
        if (isTouchGameDevice()) requestLandscapeFullscreen();
        setEntered(true);
        setMode(view);
        setSpeed(0);
        if(campaign.firstLight?.status==='active'){setFirstLightOpen(true);setFirstLightBriefing(true);}
        if (isTouchGameDevice()) setDrawerOpen(false);
    };
    const toggleFullscreen = () => {
        if (document.fullscreenElement) exitGameFullscreen();
        else requestLandscapeFullscreen();
    };

    const firstLightJump=()=>{
        const step=firstLight.next?.id;
        setFirstLightBriefing(false);
        if(step==='inspect'){setMissionOpen(false);setBriefingOpen(true);choose('delta');setDrawerOpen(true);setTab('Overview');}
        else if(step==='imagery'||step==='resilience'){setMissionOpen(false);setBriefingOpen(true);choose('delta');setDrawerOpen(true);setTab('Directives');}
        else if(step==='advance'){setMissionOpen(false);turnForward();}
        else if(step==='decision'&&campaign.pendingEvent){setFirstLightOpen(false);}
        else if(step==='decision')inform('Advance the quarter to receive the national decision.');
    };
    const resetFirstLight=()=>{setCampaign(createCampaign());setEntered(true);setFirstLightOpen(true);setFirstLightBriefing(true);setDrawerOpen(false);setMode('War Room 3D');setSpeed(0);};
    const turnForward = () => {
        const result = advanceCampaign(campaign);
        if (result.error) { inform(result.message); setSpeed(0); return; }
        setCampaign(result.state);
        setPlannerEpoch(result.state.missionEpochSeconds);
        if (result.state.pendingEvent || result.state.outcome) setSpeed(0);
        inform(result.message);
    };
    const turnRef = useRef(turn);
    turnRef.current = turn;
    const forwardRef = useRef(turnForward);
    forwardRef.current = turnForward;
    useEffect(() => { const timer = setInterval(() => { if (!entered || !speed || ended)
        return; setSimClock(c => (c + speed * 12) % (24 * 60)); accum.current += speed; if (accum.current >= 24) {
        accum.current = 0;
        forwardRef.current();
    } }, 1000); return () => clearInterval(timer); }, [entered, speed, ended]);
    useEffect(() => {
        if (!entered)
            return;
        const sample = () => {
            const a = SATS.find(v => v.id === selectedId), engine = engineRef.current;
            if (!a || !engine)
                return;
            const o = orbitState(a, engine.orbitalSeconds);
            setOrbitalInfo({ id: a.id, lat: o.lat, lon: o.lon, period: o.period / 60, overNigeria: insidePolygon(o.lon, o.lat) });
        };
        sample();
        const id = setInterval(sample, 850);
        return () => clearInterval(id);
    }, [entered, selectedId]);
    useEffect(() => { try {
        window.lucide?.createIcons({ attrs: { 'stroke-width': 1.8 } });
    }
    catch (e) { } }, [entered, selectedId, drawerOpen, mode, layers, labels, speed, overlayOpen, turn, tab, logs.length, toast, ended]);
    const act = (kind) => {
        const result = applyDirective(campaign, kind, selectedId);
        if (!result.error) setCampaign(result.state);
        inform(result.message);
    };
    const startProject = (id) => {
        const result = applyDirective(campaign,'project',id);
        if(!result.error)setCampaign(result.state);
        inform(result.message);
    };
    const decide = (choiceId) => {
        const result = resolveEvent(campaign, choiceId);
        if (!result.error) {setCampaign(result.state);if(result.state.firstLight?.status==='complete')setFirstLightOpen(true);}
        inform(result.message);
    };
    const openMission = (asset=null,region=null) => {
        const activeAsset=Object.keys(programmes).find(id=>programmes[id]==='deployed') || 'sat3';
        if(asset&&MISSION_ASSETS[asset])setMissionAsset(asset);
        else setMissionAsset(activeAsset);
        if(region&&MISSION_REGIONS[region])setMissionRegion(region);
        setPlannerEpoch(Math.max(campaign.missionEpochSeconds,Math.min(campaign.missionEpochSeconds+2*86400,engineRef.current?.orbitalSeconds??campaign.missionEpochSeconds)));
        setMissionView('tasking');
        setMissionOpen(true);
        setSpeed(0);
    };
    const missionPlan=useMemo(()=>missionOpen?planMission(missionAsset,missionRegion,plannerEpoch,campaign.groundLevel):null,[missionOpen,missionAsset,missionRegion,plannerEpoch,campaign.groundLevel]);
    const missionOperational=programmes[missionAsset]==='deployed';
    const groundOps=useMemo(()=>groundNetworkSnapshot(campaign),[campaign]);
    const startReplay=(task)=>{ if(!task?.passSeconds&&task?.passSeconds!==0)return; setReplayTask({...task,replayToken:Date.now()}); setReplayPhase('acquisition'); setMissionOpen(false); setMode('War Room 3D'); setSpeed(0); setOrbitalPlay(false); };
    useEffect(()=>{if(!replayTask)return;const timer=setInterval(()=>setReplayPhase(engineRef.current?.currentReplayFrame?.phase||'acquisition'),250);return()=>clearInterval(timer)},[replayTask]);
    const submitMission=()=>{
        const result=queueMission(campaign,missionAsset,missionRegion,plannerEpoch);
        if(!result.error)setCampaign(result.state);
        inform(result.message);
    };
    const processProduct=(id)=>{
        const result=analyseProduct(campaign,id);
        if(!result.error)setCampaign(result.state);
        inform(result.message);
    };
    const missionPanel=missionOpen && React.createElement('section',{className:'mission-control panel',role:'dialog','aria-label':'Orbital Mission Control'},
      React.createElement('div',{className:'mission-heading'},
        React.createElement('div',null,React.createElement('small',null,'ORBITAL OPERATIONS · MISSION PLANNING'),React.createElement('h2',null,'MISSION CONTROL')),
        React.createElement('button',{className:'mission-close',onClick:()=>setMissionOpen(false),'aria-label':'Close Mission Control'},React.createElement(Icon,{name:'x',size:19}))),
      React.createElement('div',{className:'mission-tabs'},
        React.createElement('button',{className:missionView==='tasking'?'active':'',onClick:()=>setMissionView('tasking')},'SATELLITE TASKING'),
        React.createElement('button',{className:missionView==='network'?'active':'',onClick:()=>setMissionView('network')},'GROUND NETWORK')),
      missionView==='tasking'?React.createElement(React.Fragment,null,
        React.createElement('p',{className:'mission-intro'},'Task a commissioned spacecraft. Receive and analyse the observation to improve intelligence confidence.'),
        React.createElement('div',{className:'mission-controls'},
          React.createElement('label',null,'SPACECRAFT',React.createElement('select',{value:missionAsset,onChange:e=>setMissionAsset(e.target.value)},
            Object.keys(MISSION_ASSETS).map(id=>React.createElement('option',{key:id,value:id},`${id.toUpperCase()} · ${programmes[id]==='deployed'?'COMMISSIONED':'NOT DEPLOYED'}`)))),
          React.createElement('label',null,'OPERATION AREA',React.createElement('select',{value:missionRegion,onChange:e=>setMissionRegion(e.target.value)},
            Object.entries(MISSION_REGIONS).map(([id,r])=>React.createElement('option',{key:id,value:id},r.short))))),
        React.createElement('div',{className:'mission-forecast'},
          React.createElement('div',{className:'mission-forecast-title'},React.createElement(Icon,{name:'orbit',size:16}),'14-DAY GEOMETRIC PASS FORECAST'),
          missionPlan?.error?React.createElement('p',{className:'mission-alert'},missionPlan.error):React.createElement(React.Fragment,null,
            React.createElement('div',{className:'mission-stats'},
              [['PASSES',missionPlan?.passCount??0],['NEXT PASS',formatHours(missionPlan?.hoursUntilPass)],['CLOSEST APPROACH',`${missionPlan?.closestKm} km`],['RECEIVER',missionPlan?.receiverAvailable?'ACCESSIBLE':'UNAVAILABLE']].map(([l,v])=>React.createElement('div',{key:l},React.createElement('small',null,l),React.createElement('b',null,v)))),
            React.createElement('p',{className:'mission-receiver'},`Scheduled receiving point: ${missionPlan?.receiver}. ${missionPlan?.groundWaitHours==null?'No predicted contact.':`Wait ${formatHours(missionPlan.groundWaitHours)} following acquisition.`}`)),
          React.createElement('p',{className:'mission-note'},'Forecasts depend on orbital geometry, contact windows and receiving availability.')),
        React.createElement('div',{className:'mission-actions'},
          React.createElement('button',{disabled:!missionOperational||!!missionPlan?.error||!missionPlan?.receiverAvailable||!!campaign.pendingEvent||ended,onClick:submitMission},React.createElement(Icon,{name:'satellite',size:17}),missionOperational?'QUEUE OBSERVATION':'COMMISSION SATELLITE FIRST'),
          React.createElement('span',null,`${groundOps.queued}/${groundOps.schedulingSlots} QUEUED · ${groundOps.receivingSlots} RECEIVING SLOTS`)),
        React.createElement('div',{className:'mission-lists'},
          React.createElement('h3',null,'SCHEDULED MISSIONS'),
          !groundOps.queued?React.createElement('p',{className:'mission-empty'},'No requests scheduled.'):campaign.missionQueue.map(task=>React.createElement('div',{className:'mission-entry',key:task.id},
            React.createElement('div',null,React.createElement('b',null,`${task.id} · ${task.product}`),React.createElement('small',null,`${MISSION_REGIONS[task.regionId]?.short} · ${task.receiverName}`)),
            React.createElement('button',{className:'mission-replay-button',onClick:()=>startReplay(task)},'PREVIEW PASS'))),
          React.createElement('h3',null,`RECEIVED DATA · ${metrics.unprocessed} UNPROCESSED`),
          !campaign.dataProducts?.length?React.createElement('p',{className:'mission-empty'},'No received products.'):campaign.dataProducts.slice(0,8).map(product=>React.createElement('div',{className:'mission-entry product',key:product.id},
            React.createElement('div',null,React.createElement('b',null,`${product.id} · ${product.product}`),React.createElement('small',null,`${MISSION_REGIONS[product.regionId]?.short} · QUALITY ${product.quality}/100`)),
            product.analysedTurn?React.createElement('span',{className:'mission-done'},'ANALYSED'):React.createElement('button',{disabled:!!campaign.pendingEvent,onClick:()=>processProduct(product.id)},'ANALYSE · ₦9B'))),
          React.createElement('h3',null,'MISSION HISTORY'),
          !(campaign.missionHistory||[]).length?React.createElement('p',{className:'mission-empty'},'No past missions.'):campaign.missionHistory.slice(0,6).map(task=>React.createElement('div',{className:'mission-entry',key:task.id},
            React.createElement('div',null,React.createElement('b',null,`${task.id} · ${task.status.toUpperCase()}`),React.createElement('small',null,task.reason||`${MISSION_REGIONS[task.regionId]?.short} · ${task.receiverName}`)),
            React.createElement('button',{className:'mission-replay-button',onClick:()=>startReplay(task)},'REPLAY')))))
      :React.createElement('div',{className:'ground-dashboard'},
        React.createElement('p',{className:'mission-intro'},'Upgraded capacity enables additional downlinks. Reliability is shared across receiving stations.'),
        React.createElement('div',{className:'mission-stats'},
          [['NETWORK',`LEVEL ${groundOps.level}`],['HEALTH',`${groundOps.health}%`],['RELIABILITY',`${groundOps.reliability}%`],['RECEIVERS',groundOps.accessibleCount],['TASK QUEUE',`${groundOps.queued}/${groundOps.schedulingSlots}`],['DOWNLINK SLOTS',groundOps.receivingSlots],['BACKLOG',groundOps.unprocessed],['PROCESSING',`${Math.round(bandwidth)} GB/s`]].map(([name,value])=>React.createElement('div',{key:name},React.createElement('small',null,name),React.createElement('b',null,value)))),
        React.createElement('h3',null,'RECEIVING NODES'),
        groundOps.receivers.map(station=>React.createElement('div',{className:'ground-station-row',key:station.id},
          React.createElement('div',null,React.createElement('b',null,station.name),React.createElement('small',null,station.level===1?'Partner station access':'Expanded receiving network')),
          React.createElement('span',{className:station.enabled?'active':''},station.enabled?'ENABLED':`LEVEL ${station.level} REQUIRED`))),
        React.createElement('p',{className:'mission-note'},'Receiving capacity and availability are managed through your ground network.'),
        React.createElement('div',{className:'ground-actions'},
          React.createElement('button',{disabled:!!campaign.pendingEvent||groundOps.level>=4||ended,onClick:()=>{const r=applyDirective(campaign,'upgrade','nasrda');if(!r.error)setCampaign(r.state);inform(r.message);}},'UPGRADE NETWORK'),
          React.createElement('button',{disabled:!!campaign.pendingEvent||ended,onClick:()=>{const r=applyDirective(campaign,'maintain','nasrda');if(!r.error)setCampaign(r.state);inform(r.message);}},'SERVICE INFRASTRUCTURE'))));
    const clockString = `${String(Math.floor(simClock / 60)).padStart(2, '0')}:${String(simClock % 60).padStart(2, '0')}`;
    const layerLabels = [['descriptors', 'Descriptors', 'tags'], ['satellites', 'Satellites', 'satellite'], ['beams', 'Sensor Beams', 'scan-line'], ['theatres', 'Theatres', 'layers'], ['targets', 'Targets', 'crosshair'], ['stations', 'Ground Stations', 'radio-tower']];
    const badge = (value, cls = '') => React.createElement("span", { className: 'chip ' + cls }, value);
    return React.createElement("div", { className: "app-shell" },
        React.createElement("header", { className: "topbar" },
            React.createElement("div", { className: "brand" },
                React.createElement("div", { className: "flag" },
                    React.createElement("span", null),
                    React.createElement("span", null),
                    React.createElement("span", null)),
                React.createElement("div", null,
                    React.createElement("div", { className: "brand-top" }, "THE ULTIMATE HIGH GROUND"),
                    React.createElement("div", { className: "brand-sub" },
                        "DOMINATE ",
                        React.createElement("span", null, "THE FINAL FRONTIER")))),
            React.createElement("div", { className: "resources" },
                React.createElement("div", { className: "resource" },
                    React.createElement("span", { className: "res-icon gold" },
                        React.createElement(Icon, { name: "layers-3", size: 21 })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "res-label" }, "TREASURY"),
                        React.createElement("div", { className: "res-value" },
                            "\u20A6 ",
                            fmtNum(budget),
                            " ",
                            React.createElement("small", null, "BN")))),
                React.createElement("div", { className: "resource" },
                    React.createElement("span", { className: "res-icon blue" },
                        React.createElement(Icon, { name: "radio-tower", size: 21 })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "res-label" }, "SIM. INTELLIGENCE PROCESSING"),
                        React.createElement("div", { className: "res-value" },
                            fmtNum(bandwidth),
                            " ",
                            React.createElement("small", null, "GB/s")))),
                React.createElement("div", { className: "resource" },
                    React.createElement("span", { className: "res-icon green" },
                        React.createElement(Icon, { name: "users", size: 21 })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "res-label" }, "PUBLIC SUPPORT"),
                        React.createElement("div", { className: "res-value" },
                            support,
                            React.createElement("small", null, "%")))),
                React.createElement("div", { className: "resource" },
                    React.createElement("span", { className: "res-icon teal" },
                        React.createElement(Icon, { name: "shield-check", size: 21 })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "res-label" }, "SOVEREIGN INTEGRITY"),
                        React.createElement("div", { className: "res-value" },
                            integrity,
                            React.createElement("small", null, "%"))))),
            React.createElement("div", { className: "mobile-meta", "aria-label": "Campaign overview" },
                React.createElement("span", null, `₦${Math.round(budget)}B`),
                React.createElement("span", null, `${support}% SUPPORT`),
                React.createElement("span", null, `Q${turn}/${MAX_TURNS}`)),
            React.createElement("button", { className: "fullscreen-toggle", onClick: toggleFullscreen,
                title: isFullscreen ? 'Exit fullscreen' : 'Open fullscreen and request landscape',
                'aria-label': isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen and landscape mode' },
                React.createElement(Icon, { name: isFullscreen ? 'minimize' : 'maximize', size: 18 })),
            React.createElement("div", { className: "timecontrols" },
                React.createElement("div", { className: "turn-clock" },
                    React.createElement("span", null,
                        "TURN ",
                        String(turn).padStart(2, '0'),
                        " ",
                        React.createElement("em", null, `/ ${MAX_TURNS}`)),
                    React.createElement("small", null,
                        campaignDateLabel(turn),
                        " \u00B7 ",
                        clockString)),
                React.createElement("div", { className: "transport" },
                    React.createElement("button", { title: "Pause simulation", className: speed === 0 ? 'current' : '', onClick: () => setSpeed(0) },
                        React.createElement(Icon, { name: "pause", size: 16 })),
                    React.createElement("button", { title: "Normal 1x speed", className: speed === 1 ? 'current' : '', onClick: () => setSpeed(1) }, "1x"),
                    React.createElement("button", { title: "Fast 2x speed", className: speed === 2 ? 'current' : '', onClick: () => setSpeed(2) }, "2x"),
                    React.createElement("button", { title: "Advance one quarterly turn", disabled: Boolean(campaign.pendingEvent||ended), className: "advance", onClick: () => turnForward() },
                        React.createElement(Icon, { name: "skip-forward", size: 17 }),
                        React.createElement("span", null, "TURN"))))),
        React.createElement("main", { className: "game-stage" },
            React.createElement(Scene3D, { engineRef: engineRef, onPick: choose, onPass: passMessage, mode: mode, layers: layers, labels: labels, speed: entered ? speed : 0, commissioned: commissioned, groundLevel:campaign.groundLevel, quarter:campaignQuarter(campaign.turn), launchFunded: launchFunded, orbitalPlay: orbitalPlay, epochSeconds: campaign.missionEpochSeconds, replayTask }),
            React.createElement("div", { className: "scene-vignette" }),
            entered && React.createElement('nav',{className:'desktop-command-rail','aria-label':'Main command navigation'},
              [['overview','layout-dashboard','Command overview',()=>{setBriefingOpen(v=>!v);setMissionOpen(false)}],
               ['map','map','Nigeria tabletop',()=>camera('War Room 3D')],
               ['africa','earth','Africa continent',()=>camera('Africa View')],
               ['orbit','orbit','Orbital view',()=>camera('Orbit View')],
               ['assets','satellite','Selected asset',()=>setDrawerOpen(v=>!v)],
               ['missions','radio-tower','Mission control',()=>{setMissionOpen(v=>!v);setBriefingOpen(false)}],
               ['projects','briefcase-business','Strategic projects',()=>{setBriefingOpen(true);setTimeout(()=>document.getElementById('project-portfolio')?.scrollIntoView({behavior:'smooth',block:'start'}),90)}],
               ['layers','layers-3','Map layers',()=>setOverlayOpen(v=>!v)]].map(([key,icon,title,handler])=>
                  React.createElement('button',{key,className:'rail-control '+((key==='overview'&&briefingOpen)||(key==='orbit'&&mode==='Orbit View')||(key==='africa'&&mode==='Africa View')||(key==='map'&&mode==='War Room 3D')?'active':''),title,'aria-label':title,onClick:handler},React.createElement(Icon,{name:icon,size:20})))),
            entered && React.createElement('div',{className:'view-heading'},
               React.createElement('span',{className:'eyebrow'},mode==='Orbit View'?'ORBITAL NETWORK':mode==='Africa View'?'REGIONAL OVERVIEW':'NATIONAL THEATRE'),
               React.createElement('strong',null,mode==='Orbit View'?'Earth & Orbit':mode==='Africa View'?'Africa':'Nigeria'),
               React.createElement('span',{className:'view-heading-detail'}, mode==='Orbit View'?'Satellite trajectories and stations':mode==='Africa View'?'Continental context · Nigeria highlighted':'Strategic Command · War Room'),
               mode==='War Room 3D' && React.createElement('span',{className:'season-indicator'},
                 React.createElement(Icon,{name:'cloud-sun',size:13}),
                 `Q${campaignQuarter(campaign.turn)} · ${QUARTER_NAMES[campaignQuarter(campaign.turn)-1]}`)),
            entered && React.createElement('div',{className:'pass-forecast','aria-label':'Next satellite pass'},
                React.createElement(Icon,{name:'satellite',size:14}),
                React.createElement('div',null,React.createElement('span',null,'NEXT OBSERVATION PASS'),
                    React.createElement('strong',null,upcomingPass?`${SATS.find(a=>a.id===upcomingPass.assetId)?.name||upcomingPass.assetId} · ${formatHours(upcomingPass.hoursUntilPass)} to pass`:'Deploy an EO satellite to plan passes'))),
            entered && passNotice && React.createElement('div',{className:'pass-alert',role:'status'},
               React.createElement(Icon,{name:passNotice.kind==='contact'?'radio-tower':'satellite',size:18}),
               React.createElement('div',null,React.createElement('strong',null,passNotice.kind==='contact'?'LINK ESTABLISHED':'PASS ALERT'),React.createElement('span',null,passNotice.asset+' · '+(passNotice.station||passNotice.region))),
               React.createElement('button',{'aria-label':'Dismiss pass alert',onClick:()=>setPassNotice(null)},React.createElement(Icon,{name:'x',size:15}))),
            entered && React.createElement("nav", { className: "mobile-bottom-nav", 'aria-label': 'Mobile game controls' },
                React.createElement("button", { onClick: () => { setDrawerOpen(false); setMissionOpen(false); setOverlayOpen(false); },
                    className: !drawerOpen && !missionOpen && !overlayOpen ? 'active' : '', 'aria-label': 'Show map' },
                    React.createElement(Icon, { name: 'map', size: 18 }), React.createElement('span', null, 'MAP')),
                React.createElement("button", { onClick: () => { setDrawerOpen(v => !v); setMissionOpen(false); setOverlayOpen(false); },
                    className: drawerOpen ? 'active' : '', 'aria-label': 'Toggle asset dossier' },
                    React.createElement(Icon, { name: 'satellite', size: 18 }), React.createElement('span', null, 'ASSETS')),
                React.createElement("button", { onClick: () => { if(missionOpen)setMissionOpen(false);else openMission();setOverlayOpen(false); },
                    className: missionOpen ? 'active' : '', 'aria-label': 'Open or close mission control' },
                    React.createElement(Icon, { name: 'satellite-dish', size: 18 }), React.createElement('span', null, 'MISSIONS')),
                React.createElement("button", { onClick: () => {setMode(mode === 'Orbit View' ? 'War Room 3D' : 'Orbit View');setDrawerOpen(false);setMissionOpen(false);},
                    className: mode === 'Orbit View' ? 'active' : '', 'aria-label': 'Toggle orbit view' },
                    React.createElement(Icon, { name: 'orbit', size: 18 }), React.createElement('span', null, 'ORBIT')),
                React.createElement("button", { onClick: () => {setOverlayOpen(v => !v);setMissionOpen(false);},
                    className: overlayOpen ? 'active' : '', 'aria-label': 'Toggle map overlays' },
                    React.createElement(Icon, { name: 'layers', size: 18 }), React.createElement('span', null, 'LAYERS'))),
            missionPanel,
            replayTask&&React.createElement('div',{className:'replay-hud',role:'status'},
                React.createElement('div',null,React.createElement('small',null,'MISSION REPLAY'),React.createElement('strong',null,`${replayTask.id} · ${replayPhase==='acquisition'?'OBSERVATION':replayPhase==='downlink'?'GROUND DOWNLINK':'REPLAY COMPLETE'}`),React.createElement('span',null,`${MISSION_REGIONS[replayTask.regionId]?.short||'REGION'} · ${replayTask.assetId.toUpperCase()}`)),
                React.createElement('button',{onClick:()=>{setReplayTask(null);setOrbitalPlay(true)}},'EXIT REPLAY')),
            React.createElement("aside", { className: "leftpanel panel scroll-area " + (briefingOpen ? "open" : "collapsed") },
                React.createElement("div", { className: "panel-heading" },
                    React.createElement("span", { className: "smalloverline" }, "OPERATIONAL INTELLIGENCE"),
                    React.createElement("button", { title: "Game briefing and source notes", onClick: () => setEntered(false) },
                        React.createElement(Icon, { name: "info", size: 16 }))),
                React.createElement("button",{className:'mission-launch',onClick:()=>openMission(selected.type==='satellite'?selected.id:null,selected.type==='theatre'?selected.id:null)},
                    React.createElement(Icon,{name:'satellite-dish',size:17}),
                    React.createElement('span',null,React.createElement('b',null,'OPEN MISSION CONTROL'),React.createElement('small',null,`${(campaign.missionQueue||[]).length} tasked · ${metrics.unprocessed} awaiting analysis`))),
                React.createElement('button',{className:'portfolio-jump',onClick:()=>document.getElementById('project-portfolio')?.scrollIntoView({behavior:'smooth',block:'start'})},
                    React.createElement(Icon,{name:'briefcase-business',size:15}), 'STRATEGIC PROJECTS · ',`${projectCount}/2 ACTIVE`,React.createElement(Icon,{name:'chevron-right',size:14})),
                React.createElement("div", { className: "theatre-head" },
                    React.createElement("h2", null, "ACTIVE THEATRES"),
                    React.createElement("span", null,
                        THEATRES.length.toString().padStart(2, '0'),
                        " SECTORS")),
                THEATRES.map(item => React.createElement("button", { key: item.id, className: 'theatre-card ' + (selectedId === item.id ? 'selected' : ''), onClick: () => choose(item.id) },
                    React.createElement("div", { className: "theatre-top" },
                        React.createElement("div", { className: "theatre-name" },
                            React.createElement("span", { className: "status-dot", style: { background: item.tone } }),
                            item.name),
                        React.createElement("span", { className: "risk-label" },
                            threats[item.id],
                            " ",
                            React.createElement("small", null, "RISK"))),
                    React.createElement(Meter, { value: threats[item.id], color: item.tone }),
                    React.createElement("div", { className: "theatre-info" },
                        item.subtitle.toUpperCase(),
                        " ",
                        React.createElement(Icon, { name: "arrow-up-right", size: 13 })))),
                React.createElement("div", { className: "section-separator" }),
                React.createElement("div", { className: "section-label" },
                    React.createElement(Icon, { name: "chart-no-axes-column-increasing", size: 15 }),
                    " NATIONAL SPACE PROGRAMME"),
                React.createElement("div", { className: "strategy-snapshot" },
                    [['Operational observation', `${Math.round(metrics.coverage)}%`],
                     ['Sovereign autonomy', `${Math.round(metrics.sovereignty)}%`],
                     ['Infrastructure resilience', `${Math.round(metrics.resilience)}%`],
                     ['Strategic score', `${metrics.score}/100`],
                     ['Ground network', `LEVEL ${campaign.groundLevel}`],
                     ['Partner imagery', `${campaign.commercialCredits} credits`],
                     ['Mission products', `${campaign.missionsCompleted||0} received`],
                     ['Unprocessed imagery', `${metrics.unprocessed} products`]].map(([k,v])=>
                        React.createElement("div", {className: "strategy-cell",key:k},
                            React.createElement("small",null,k),React.createElement("b",null,v)))),
                React.createElement("div", { className: "strategy-cashflow" },
                    `NEXT ANNUAL APPROPRIATION ₦${campaign.appropriation}B · OPERATING COST ~₦${Math.round(metrics.upkeep)}B / QUARTER`),
                React.createElement("div", { className: "strategy-quick" },
                    React.createElement("button", {onClick:()=>act('contract')}, "BUY IMAGERY · ₦52B"),
                    React.createElement("button", {onClick:()=>act('research')}, "FUND RESEARCH · ₦65B"),
                    React.createElement("button", {onClick:()=>act('maintain')}, "MAINTENANCE · ₦45B")),
                React.createElement('div',{id:'project-portfolio',className:'portfolio-panel'},
                    React.createElement('div',{className:'section-label'},React.createElement(Icon,{name:'briefcase-business',size:15}),' STRATEGIC PROJECTS',React.createElement('span',{className:'portfolio-slots'},`${projectCount}/2 IN PROGRESS`)),
                    React.createElement('p',{className:'portfolio-hint'},'Choose carefully. Construction takes several quarters and ties up capital. Completed projects add benefits and operating costs.'),
                    Object.entries(PROJECTS).map(([id,project])=>{
                        const job=campaign.projects?.[id];
                        const state=job?.status==='complete'?'COMPLETE':job?.status==='active'?`${projectRemaining(campaign,id)} QTR LEFT`:'AVAILABLE';
                        const disabled=!!job||projectCount>=2||budget<project.cost||!!campaign.pendingEvent||ended;
                        return React.createElement('div',{key:id,className:'portfolio-project '+(job?.status||'available')},
                            React.createElement('div',{className:'portfolio-project-head'},React.createElement(Icon,{name:project.icon,size:16}),React.createElement('b',null,project.name),React.createElement('small',null,state)),
                            React.createElement('p',null,project.summary),
                            React.createElement('div',{className:'portfolio-impact'},project.impact),
                            React.createElement('div',{className:'portfolio-action'},
                                React.createElement('span',null,`₦${project.cost}B · ${project.quarters} quarters`,React.createElement('small',null,`Upkeep ₦${project.upkeep}B/qtr after delivery`)),
                                React.createElement('button',{disabled,onClick:()=>startProject(id),'aria-label':`Fund ${project.name}`},job?'FUNDED':'AUTHORISE')));
                    })),
                React.createElement('div',{className:'milestone-section'},
                    React.createElement('div',{className:'section-label'},React.createElement(Icon,{name:'flag',size:15}),' PROGRAMME MILESTONES',React.createElement('span',{className:'portfolio-slots'},`${milestones.filter(x=>x.earned).length}/3 EARNED`)),
                    milestones.map(item=>React.createElement('div',{key:item.id,className:'milestone-card '+(item.earned?'earned':'')},
                        React.createElement(Icon,{name:item.earned?'check-circle-2':'circle-dot',size:16}),
                        React.createElement('div',null,React.createElement('b',null,item.name),React.createElement('small',null,item.description)),
                        React.createElement('span',null,item.earned?'CLAIMED':`₦${item.reward}B`)))),
                React.createElement("div", { className: "section-separator" }),
                React.createElement("div", { className: "section-label" },
                    React.createElement(Icon, { name: "satellite", size: 15 }),
                    " FUTURE SPACE PROGRAMMES"),
                React.createElement("div", { className: "programme-list" }, SATS.slice(1).map(a => React.createElement("button", { key: a.id, className: 'programme-item ' + (programmes[a.id] === 'deployed' ? 'live' : ''), onClick: () => choose(a.id) },
                    React.createElement("span", { className: "programme-dot", style: { background: a.tone } }),
                    React.createElement("span", null,
                        React.createElement("b", null, a.name),
                        React.createElement("small", null, programmes[a.id] === 'deployed' ? 'Commissioned' : programmes[a.id] === 'research' ? `R&D qualification · ${programmeRemaining(campaign,a.id)} quarters` : programmes[a.id] === 'ready' ? 'Ready for commissioning' : 'Awaiting investment')),
                    React.createElement(Icon, { name: "chevron-right", size: 14 })))),
                React.createElement("div", { className: "section-separator" }),
                React.createElement("div", { className: "section-label" },
                    React.createElement(Icon, { name: "radar", size: 15 }),
                    " STRATEGIC OBJECTIVES"),
                React.createElement("div", { className: "directive" },
                    React.createElement("div", { className: "directive-num" }, "01"),
                    React.createElement("div", null,
                        React.createElement("b", null, "Establish observation coverage"),
                        React.createElement("span", null, "Reach 50% independent observation")),
                    React.createElement(Icon, { name: metrics.coverage >= 50 ? 'check-circle-2' : 'alert-triangle', size: 16 })),
                React.createElement("div", { className: "directive" },
                    React.createElement("div", { className: "directive-num" }, "02"),
                    React.createElement("div", null,
                        React.createElement("b", null, "Build strategic resilience"),
                        React.createElement("span", null, "Keep service resilience above 70%")),
                    React.createElement(Icon, { name: metrics.resilience >= 70 ? 'check-circle-2' : 'alert-triangle', size: 16 })),
                React.createElement("div", { className: "directive" },
                    React.createElement("div", { className: "directive-num" }, "03"),
                    React.createElement("div", null,
                        React.createElement("b", null, "Commission sovereign spacecraft"),
                        React.createElement("span", null, "Build ground capacity and commission two missions")),
                    React.createElement(Icon, { name: metrics.deployed.length >= 2 ? 'check-circle-2' : 'alert-triangle', size: 16 })),
                React.createElement("div", { className: "section-separator" }),
                React.createElement("div", { className: "section-label" },
                    React.createElement(Icon, { name: "activity", size: 15 }),
                    " COMMAND LOG ",
                    React.createElement("span", { className: "log-live" }, "\u25CF COMMAND LOG")),
                React.createElement("div", { className: "eventlog" }, logs.slice(0, 5).map((l, i) => React.createElement("div", { className: 'event ' + l.type, key: i },
                    React.createElement("span", { className: "event-time" },
                        "T",
                        l.turn),
                    React.createElement("p", null, l.text))))),
            React.createElement("div", { className: "workbench-toolbar" },
                React.createElement("div", { className: "toolbar-top" },
                    React.createElement("div", { className: "operation-tag" },
                        React.createElement("span", { className: "pulse-dot" }),
                        " ",
                        React.createElement("strong", null, "DSA \u00B7 WAR ROOM C4ISR"),
                        " ",
                        React.createElement("span", null, "SPACE STRATEGY")),
                    React.createElement("div", { className: "top-quick-actions" },
                        React.createElement('button',{className:'mission-top-button',onClick:()=>openMission()},React.createElement(Icon,{name:'satellite-dish',size:15}),' MISSIONS'),
                        React.createElement("button", { className: 'orbit-motion ' + (orbitalPlay ? 'active' : ''), title: "Orbital motion is a separate educational playback, independent of the paused strategy campaign", onClick: () => setOrbitalPlay(v => !v) },
                            React.createElement(Icon, { name: orbitalPlay ? 'pause-circle' : 'play-circle', size: 15 }),
                            " ORBITS ",
                            orbitalPlay ? '60×' : 'PAUSED'),
                        React.createElement("button", { className: 'labels-pill ' + (labels ? 'on' : ''), onClick: () => setLabels(v => !v) },
                            React.createElement(Icon, { name: "tags", size: 15 }),
                            " Labels: ",
                            labels ? 'ON' : 'OFF'),
                        React.createElement("div", { className: "overlays-wrap" },
                            React.createElement("button", { className: 'overlay-button ' + (overlayOpen ? 'open' : ''), onClick: () => setOverlayOpen(v => !v) },
                                React.createElement(Icon, { name: "layers", size: 16 }),
                                " Overlays ",
                                React.createElement(Icon, { name: "chevron-down", size: 14 })),
                            overlayOpen && React.createElement("div", { className: "overlays-menu" },
                                React.createElement("div", { className: "overlays-title" },
                                    "MAP LAYERS ",
                                    React.createElement("button", { onClick: () => setOverlayOpen(false) },
                                        React.createElement(Icon, { name: "x", size: 14 }))),
                                layerLabels.map(([key, label, ic]) => React.createElement("label", { key: key, className: "overlay-option" },
                                    React.createElement("span", null,
                                        React.createElement(Icon, { name: ic, size: 15 }),
                                        label),
                                    React.createElement("input", { type: "checkbox", checked: layers[key], onChange: e => setLayers(v => ({ ...v, [key]: e.target.checked })) }),
                                    React.createElement("span", { className: "toggle" }))))))),
                React.createElement("div", { className: "preset-row" }, PRESETS.map(m => React.createElement("button", { key: m, className: 'preset ' + (mode === m ? 'active' : ''), onClick: () => camera(m) },
                    React.createElement(Icon, { name: m === 'Orbit View' ? 'orbit' : m === 'War Room 3D' ? 'box' : m === 'Abuja HQ' ? 'landmark' : m === 'Niger Delta' ? 'waves' : 'map-pin', size: 15 }),
                    m)))),
            React.createElement("div", { className: "map-legend" },
                React.createElement("div", { className: "legend-flag" }, "\uD83C\uDDF3\uD83C\uDDEC"),
                React.createElement("div", null,
                    React.createElement("strong", null, mode === 'Orbit View' ? 'EARTH ORBITAL DOMAIN' : 'NIGERIA · HOLOGRAPHIC WAR ROOM'),
                    React.createElement("small", null, mode === 'Orbit View' ? 'Inclined 3D orbital planes · 60× model with J2 precession · not live ephemerides' : 'Moving LEO local-sky arcs · GEO station-kept · 60× model clock'))),
            React.createElement("div", { className: "scene-bottom" },
                React.createElement("div", { className: "compass" },
                    React.createElement("div", { className: "compass-top" }, "N"),
                    React.createElement(Icon, { name: "crosshair", size: 22 }),
                    React.createElement("div", { className: "compass-bottom" }, "S")),
                React.createElement("div", { className: "interaction-tip" },
                    React.createElement(Icon, { name: "mouse-pointer-2", size: 14 }),
                    " DRAG TO ORBIT ",
                    React.createElement("span", null, "\u00B7"),
                    " SCROLL TO ZOOM ",
                    React.createElement("span", null, "\u00B7"),
                    " RIGHT-DRAG TO PAN"),
                React.createElement("div", { className: "zoom-buttons" },
                    React.createElement("button", { onClick: () => engineRef.current?.zoom(.78), title: "Zoom in" },
                        React.createElement(Icon, { name: "plus", size: 16 })),
                    React.createElement("button", { onClick: () => engineRef.current?.zoom(1.25), title: "Zoom out" },
                        React.createElement(Icon, { name: "minus", size: 16 })),
                    React.createElement("button", { onClick: () => camera('War Room 3D'), title: "Reset view" },
                        React.createElement(Icon, { name: "maximize", size: 16 })))),
            drawerOpen && React.createElement("aside", { className: "dossier panel scroll-area" },
                React.createElement("div", { className: "dossier-header" },
                    React.createElement("div", null,
                        React.createElement("span", { className: "smalloverline" }, "STRATEGIC ASSET INTELLIGENCE"),
                        React.createElement("h2", null, "ASSET DOSSIER")),
                    React.createElement("button", { className: "close-drawer", onClick: () => setDrawerOpen(false), title: "Close dossier" },
                        React.createElement(Icon, { name: "x", size: 18 }))),
                React.createElement("div", { className: "asset-visual", style: selected.type === 'satellite' ? { backgroundImage: 'linear-gradient(180deg,rgba(2,12,23,.05),rgba(2,12,23,.64)),url(assets/satellite-dossier.jpg)' } : {} },
                    React.createElement("div", { className: "asset-visual-id" },
                        React.createElement("span", { className: "asset-symbol" },
                            React.createElement(Icon, { name: selected.type === 'satellite' ? 'satellite' : selected.type === 'station' ? 'radio-tower' : selected.type === 'theatre' ? 'radar' : 'crosshair', size: 21 })),
                        React.createElement("div", null,
                            React.createElement("strong", null, selected.name),
                            React.createElement("span", null, selected.subtitle)))),
                React.createElement("div", { className: "asset-status-line" },
                    React.createElement("span", { className: "status-indicator" }),
                    React.createElement("b", null, statusLine),
                    React.createElement("span", { className: "asset-type" },
                        selected.type.toUpperCase(),
                        " \u00B7 ",
                        selected.type === 'target' ? 'TRAINING EVENT' : selected.type === 'theatre' ? 'OPERATION THEATRE' : selected.type === 'station' ? 'GROUND NETWORK' : selected.factual === 'verified' ? 'CURRENT ASSET' : selected.factual === 'planned' ? 'FUTURE PROGRAMME' : 'DESIGN CONCEPT')),
                React.createElement("div", { className: "asset-picker" },
                    React.createElement("span", null, "ASSET INDEX"),
                    React.createElement("select", { "aria-label": "Select an asset dossier", value: selectedId, onChange: e => choose(e.target.value) },
                        React.createElement("optgroup", { label: "SATELLITES" }, SATS.map(a => React.createElement("option", { key: a.id, value: a.id }, a.name))),
                        React.createElement("optgroup", { label: "THEATRES" }, THEATRES.map(a => React.createElement("option", { key: a.id, value: a.id }, a.name))),
                        React.createElement("optgroup", { label: "GROUND STATIONS" }, GROUND.map(a => React.createElement("option", { key: a.id, value: a.id }, a.name))),
                        React.createElement("optgroup", { label: "ANOMALIES" }, TARGETS.map(a => React.createElement("option", { key: a.id, value: a.id }, a.name))))),
                React.createElement("div", { className: "dossier-tabs" }, ['Overview', 'Telemetry', 'Directives', 'Sources'].map(s => React.createElement("button", { key: s, onClick: () => setTab(s), className: tab === s ? 'active' : '' }, s))),
                tab === 'Overview' && React.createElement("div", { className: "dossier-body" },
                    React.createElement("div", { className: "section-label" }, "MISSION PROFILE"),
                    React.createElement("p", { className: "asset-description" }, selected.directive),
                    selected.type === 'satellite' && React.createElement("div", { className: "stage-ribbon" },
                        React.createElement("span", null, "PROGRAMME STATUS"),
                        React.createElement("strong", null, statusLine)),
                    selected.type === 'satellite' && PROGRAMMES[selected.id] && React.createElement("p", {className:"procurement-note"},
                        `Commissioning: ₦${PROGRAMMES[selected.id].commissionCost}B after ${PROGRAMMES[selected.id].research} quarters of R&D, ground network level 2 and ${PROGRAMMES[selected.id].processing+20} GB/s processing. Recurring upkeep ₦${PROGRAMMES[selected.id].upkeep}B per quarter.`),
                    React.createElement("div", { className: "data-grid" }, selected.type === 'satellite' ? React.createElement(React.Fragment, null,
                        React.createElement("div", null,
                            React.createElement("small", null, "ORBITAL ALTITUDE"),
                            React.createElement("strong", null,
                                selected.altitude.toLocaleString(),
                                " ",
                                React.createElement("em", null, "km"))),
                        React.createElement("div", null,
                            React.createElement("small", null, "INCLINATION"),
                            React.createElement("strong", null,
                                selected.inclination,
                                " ",
                                React.createElement("em", null, "\u00B0"))),
                        React.createElement("div", null,
                            React.createElement("small", null, "FUEL RESERVE"),
                            React.createElement("strong", null,
                                selected.id === 'geo' ? 'UNDISCLOSED' : inService ? fuel[selected.id] : '—',
                                " ",
                                React.createElement("em", null, selected.id === 'geo' ? '' : inService ? '%' : ''))),
                        React.createElement("div", null,
                            React.createElement("small", null, "ORBITAL PERIOD"),
                            React.createElement("strong", null,
                                selected.class === 'GEO' ? '23h 56m' : (orbitPeriodSeconds(selected) / 60).toFixed(1),
                                " ",
                                React.createElement("em", null, selected.class === 'GEO' ? 'sidereal' : 'min')))) : selected.type === 'theatre' ? React.createElement(React.Fragment, null,
                        React.createElement("div", null,
                            React.createElement("small", null, "RISK INDEX"),
                            React.createElement("strong", null,
                                risk,
                                " ",
                                React.createElement("em", null, "/ 100"))),
                        React.createElement("div", null,
                            React.createElement("small", null, "STATUS"),
                            React.createElement("strong", { className: "small-value" }, selected.status)),
                        React.createElement("div", null,
                            React.createElement("small", null, "COVERAGE"),
                            React.createElement("strong", null,
                                Math.round(metrics.regionalCoverage[selected.id] ?? 0),
                                React.createElement("em", null, "%"))),
                        React.createElement("div", null,
                            React.createElement("small", null, "PRIORITY"),
                            React.createElement("strong", { className: "small-value" }, risk > 65 ? 'HIGH' : 'STANDARD'))) : selected.type === 'target' ? React.createElement(React.Fragment, null,
                        React.createElement("div", null,
                            React.createElement("small", null, "ASSESSMENT"),
                            React.createElement("strong", null,
                                progress[selected.id],
                                React.createElement("em", null, "%"))),
                        React.createElement("div", null,
                            React.createElement("small", null, "CLASSIFICATION"),
                            React.createElement("strong", { className: "small-value" }, "MODELLED"))) : React.createElement(React.Fragment, null,
                        React.createElement("div", null,
                            React.createElement("small", null, "LINK STATUS"),
                            React.createElement("strong", { className: "small-value" }, selected.status)),
                        React.createElement("div", null,
                            React.createElement("small", null, "UPLINK"),
                            React.createElement("strong", { className: "small-value" }, "MODELLED")))),
                    selected.detail && React.createElement("p", { className: "fact-note" }, selected.detail),
                    React.createElement("div", { className: "section-label space-top" }, "CURRENT STRATEGIC DIRECTIVE"),
                    React.createElement("div", { className: "directive-block" },
                        React.createElement(Icon, { name: "target", size: 18 }),
                        React.createElement("p", null, selected.directive))),
                tab === 'Telemetry' && React.createElement("div", { className: "dossier-body" },
                    React.createElement("div", { className: "section-label" }, "MISSION SYSTEMS"),
                    (selected.type === 'satellite' ? [['Spacecraft', 'Scenario model / digital twin'], ['Altitude', `${selected.altitude} km`], ['Inclination', `${selected.inclination}°`], ['Fuel reserve', selected.id === 'geo' ? 'Not publicly verified' : inService ? `${fuel[selected.id]}% · ESTIMATE` : 'NOT DEPLOYED'], ['Payload health', 'Mission model'], ['Telemetry link', 'Game'], ['Modelled orbital period', selected.class === 'GEO' ? '23 h 56 min' : `${(orbitPeriodSeconds(selected) / 60).toFixed(2)} min`], ['Ground subpoint', orbitalInfo?.id === selected.id ? `${orbitalInfo.lat.toFixed(2)}° latitude / ${orbitalInfo.lon.toFixed(2)}° longitude` : 'Loading model'], ['Over Nigeria now', selected.class === 'GEO' ? 'Fixed at 42.5°E · footprint schematic' : orbitalInfo?.id === selected.id ? (orbitalInfo.overNigeria ? 'YES · geometric overpass' : 'NO · orbital pass outside country') : 'Computing'], ['Orbital playback', orbitalPlay ? 'RUNNING · 60× accelerated' : 'PAUSED · campaign clock separate']] : selected.type === 'theatre' ? [['Risk index', `${risk}/100`], ['Operational coverage', `${Math.round(metrics.regionalCoverage[selected.id] ?? 0)}%`], ['Communications link', `${Math.round(metrics.resilience)}% resilience index`], ['Last update', `Turn ${turn}`]] : selected.type === 'target' ? [['Analysis complete', `${progress[selected.id]}%`], ['Cross-check', 'Pending confirmation'], ['Confidence', 'Simulated only'], ['Last update', `Turn ${turn}`]] : [['Node health', selected.status], ['Service uptime', 'Model estimate'], ['Traffic', 'Data throughput'], ['Power supply', 'Unverified']]).map(([l, v]) => React.createElement("div", { className: "telemetry-row", key: l },
                        React.createElement("span", null, l),
                        React.createElement("b", null, v))),
                    React.createElement("div", { className: "telemetry-note" }, "Spacecraft fuel, health, economics, tactical risks and satellite orbits are game models. Only the specifically attributed system and institution facts are externally verified. All moving future satellites are translucent DESIGN PREVIEWS until commissioned. Orbital inclination, period, Earth rotation and J2 nodal precession are represented in a simplified propagation model, not verified active ephemerides.")),
                tab === 'Directives' && React.createElement("div", { className: "dossier-body" },
                    React.createElement("div", { className: "section-label" }, "COMMAND AUTHORIZATION"),
                    React.createElement("p", { className: "asset-description" }, "Commit your resources carefully. Each decision changes your campaign."),
                    React.createElement("div", { className: "directive-block" },
                        React.createElement(Icon, { name: "shield", size: 18 }),
                        React.createElement("p", null, selected.directive))),
                tab === 'Sources' && React.createElement("div", { className: "dossier-body" },
                    React.createElement("div", { className: "section-label" }, "FACT-CHECKED REFERENCES \u00B7 NOV 2026"),
                    React.createElement("p", { className: "asset-description" }, "Primary sources establish institutions, official operations, satellite identity and mission plans. The game does not imply access to current orbital ephemerides, telemetry, deployments or operational intelligence."),
                    React.createElement("div", { className: "source-list" },
                        React.createElement("a", { href: "https://dsa.mil.ng/about-us/", target: "_blank", rel: "noopener noreferrer" }, "DSA \u2014 official name and mandate \u2197"),
                        React.createElement("a", { href: "https://dsa.mil.ng/cds-directs-dsa-to-expand-space-based-intelligence-support-to-north-west-north-central/", target: "_blank", rel: "noopener noreferrer" }, "DSA \u2014 Oct 2026 operational support \u2197"),
                        React.createElement("a", { href: "https://defence.gov.ng/operations.html", target: "_blank", rel: "noopener noreferrer" }, "Ministry of Defence \u2014 joint operations \u2197"),
                        React.createElement("a", { href: "https://www.nigcomsat.gov.ng/index.php/fleet/nigcomsat", target: "_blank", rel: "noopener noreferrer" }, "NIGCOMSAT \u2014 official 42.5\u00B0E fleet \u2197"),
                        React.createElement("a", { href: "https://central.nasrda.gov.ng/faq/", target: "_blank", rel: "noopener noreferrer" }, "NASRDA \u2014 planned EO & SAR and receiving sites \u2197"),
                        React.createElement("a", { href: "https://database.eohandbook.com/database/agencysummary.aspx?agencyID=134", target: "_blank", rel: "noopener noreferrer" }, "CEOS \u2014 NigeriaSat-2 / -X mission status \u2197"),
                        React.createElement("a", { href: "https://space.oscar.wmo.int/satellites/view/nigeriasat_2", target: "_blank", rel: "noopener noreferrer" }, "WMO \u2014 NigeriaSat-2 status caveat \u2197"),
                        React.createElement("a", { href: "https://www.nasrda.gov.ng/center-for-space-transport-and-propulsion/", target: "_blank", rel: "noopener noreferrer" }, "NASRDA \u2014 Epe CSTP research centre \u2197"),
                        React.createElement("a", { href: "https://nasrda.gov.ng/center-for-geodesy-and-geodynamic/", target: "_blank", rel: "noopener noreferrer" }, "NASRDA \u2014 Toro geodesy centre \u2197")),
                    React.createElement("div", { className: "telemetry-note" }, "Corrected: HADARIN DAJI is not the current N-West operation name; DELSAT-AIS and NIG-SAR-1 are not verified launched spacecraft; Epe is not a verified operational orbital spaceport. NigComSat-1R beam geometry is schematic, not an RF coverage certification.")),
                React.createElement("div", { className: "command-actions" },
                    React.createElement("div", { className: "section-label" },
                        React.createElement(Icon, { name: "zap", size: 15 }),
                        " AVAILABLE DIRECTIVES"),
                    selected.type === 'satellite' ? selected.id === 'geo' ? React.createElement(React.Fragment, null,
                        React.createElement("button", { onClick: () => act('upgrade') },
                            React.createElement(Icon, { name: "network", size: 17 }),
                            " Upgrade national ground network ",
                            React.createElement("span", null, "\u20A6120B")),
                        React.createElement("button", { disabled: geoExtension, onClick: () => act('extend') },
                            React.createElement(Icon, { name: "wrench", size: 17 }),
                            " ",
                            geoExtension ? 'GEO continuity plan funded' : 'Fund GEO continuity plan',
                            " ",
                            React.createElement("span", null, "\u20A655B"))) : stage === 'concept' ? React.createElement("button", { onClick: () => act('fund') },
                        React.createElement(Icon, { name: "flask-conical", size: 17 }),
                        " Authorise multi-quarter R&D ",
                        React.createElement("span", null, `₦${PROGRAMMES[selected.id]?.researchCost ?? 0}B`)) : stage === 'research' || stage === 'ready' ? React.createElement("button", { disabled: stage !== 'ready', onClick: () => act('deploy') },
                        React.createElement(Icon, { name: "satellite", size: 17 }),
                        " ",
                        stage !== 'ready' ? `Qualification · ${programmeRemaining(campaign,selected.id)} quarter(s) remaining` : 'Commission future spacecraft',
                        " ",
                        React.createElement("span", null, "\u20A6170B")) : React.createElement(React.Fragment, null,
                        React.createElement('button',{onClick:()=>openMission(selected.id)},React.createElement(Icon,{name:'satellite-dish',size:17}),' Plan orbital observation',React.createElement('span',null,'MISSION CONTROL')),
                        React.createElement("button", { onClick: () => act('service') },
                            React.createElement(Icon, { name: "wrench", size: 17 }),
                            " Ground and payload maintenance ",
                            React.createElement("span", null, "₦45B"))) : selected.type === 'theatre' ? React.createElement(React.Fragment, null,
                        React.createElement('button',{onClick:()=>openMission(null,selected.id)},React.createElement(Icon,{name:'satellite-dish',size:17}),' Assign orbital observations'),
                        React.createElement("button", { onClick: () => act('observe') },
                            React.createElement(Icon, { name: "radar", size: 17 }),
                            " Analyse partner imagery (1 credit) ",
                            React.createElement("span", null, "₦12B")),
                        React.createElement("button", { onClick: () => act('stabilize') },
                            React.createElement(Icon, { name: "shield-plus", size: 17 }),
                            " Fund resilience package ",
                            React.createElement("span", null, "\u20A690B"))) : selected.type === 'target' ? React.createElement("button", { onClick: () => act('investigate') },
                        React.createElement(Icon, { name: "search-check", size: 17 }),
                        " Analyse exercise anomaly ",
                        React.createElement("span", null, "\u20A635B")) : React.createElement(React.Fragment, null,
                        React.createElement("button", { onClick: () => act('upgrade') },
                            React.createElement(Icon, { name: "network", size: 17 }),
                            " Upgrade national ground network ",
                            React.createElement("span", null, "\u20A6120B")),
                        selected.id === 'epe' && React.createElement("button", { disabled: launchFunded, onClick: () => act('launch') },
                            React.createElement(Icon, { name: "rocket", size: 17 }),
                            " ",
                            launchFunded ? 'Feasibility study funded' : 'Fund launch feasibility research',
                            " ",
                            React.createElement("span", null, "\u20A6260B")))),
                React.createElement("div", { className: "dossier-footer" },
                    React.createElement(Icon, { name: "lock-keyhole", size: 13 }),
                    " THE ULTIMATE HIGH GROUND")),
            !drawerOpen && React.createElement("button", { className: "open-drawer", onClick: () => setDrawerOpen(true) },
                React.createElement(Icon, { name: "panel-right-open", size: 16 }),
                " DOSSIER"),
            entered && campaign.firstLight?.status==='active' && firstLightOpen && !campaign.pendingEvent && !missionOpen && React.createElement('section',{className:'firstlight-guide panel',role:'region','aria-label':'Operation First Light tutorial'},
                React.createElement('div',{className:'firstlight-top'},
                    React.createElement('span',null,React.createElement(Icon,{name:'sunrise',size:16}),' OPERATION FIRST LIGHT'),
                    React.createElement('button',{'aria-label':'Hide First Light guide',onClick:()=>setFirstLightOpen(false)},React.createElement(Icon,{name:'x',size:16}))),
                React.createElement('div',{className:'firstlight-track',role:'progressbar','aria-valuemin':0,'aria-valuemax':firstLight.total,'aria-valuenow':firstLight.finished,'aria-label':'First Light tutorial progress'},
                    React.createElement('span',{style:{width:`${firstLight.finished/firstLight.total*100}%`}})),
                React.createElement('small',{className:'firstlight-counter'},`${firstLight.finished} / ${firstLight.total} BRIEFING OBJECTIVES`),
                firstLightBriefing ? React.createElement(React.Fragment,null,
                    React.createElement('h2',null,'Protect the Delta'),
                    React.createElement('p',null,'Seasonal flooding threatens civilian infrastructure. With limited sovereign imagery, you must use partner data, invest in resilience, and make a national response decision. Every choice affects the campaign.'),
                    React.createElement('div',{className:'firstlight-actions'},
                        React.createElement('button',{className:'primary',onClick:()=>setFirstLightBriefing(false)},'BEGIN OPERATION'),
                        React.createElement('button',{onClick:()=>{setCampaign(s=>skipFirstLight(s));setFirstLightOpen(false);}},'SKIP TUTORIAL'))) : React.createElement(React.Fragment,null,
                    React.createElement('h2',null,firstLight.next?.title||'First briefing completed'),
                    React.createElement('p',null,firstLight.next?.detail||'Review your command log.'),
                    React.createElement('div',{className:'firstlight-actions'},
                        React.createElement('button',{className:'primary',onClick:firstLightJump},firstLight.next?.button||'CONTINUE'),
                        React.createElement('button',{onClick:()=>setFirstLightOpen(false)},'HIDE')))),
            entered && campaign.firstLight?.status==='active' && !firstLightOpen && !campaign.pendingEvent && React.createElement('button',{className:'firstlight-reopen',onClick:()=>setFirstLightOpen(true)},React.createElement(Icon,{name:'sunrise',size:15}),' FIRST LIGHT'),
            entered && campaign.firstLight?.status==='complete' && firstLightOpen && React.createElement('section',{className:'firstlight-debrief panel',role:'dialog','aria-label':'First Light mission debrief'},
                React.createElement('div',{className:'firstlight-kicker'},'MISSION DEBRIEF '),
                React.createElement('h2',null,`OPERATION ${firstLight.outcome}`),
                React.createElement('p',null,firstLight.score>=2?'Your preparedness improved the response to the flood scenario. Early evidence and resilience spending made a measurable difference.':'The scenario exposed gaps in preparation. You can still build a stronger space and ground infrastructure during the full campaign.'),
                React.createElement('div',{className:'firstlight-milestones'},FIRST_LIGHT_STEPS.map(step=>React.createElement('span',{key:step.id,className:firstLight.done[step.id]?'done':'missed'},React.createElement(Icon,{name:firstLight.done[step.id]?'check-circle-2':'circle',size:14}),step.title))),
                React.createElement('div',{className:'firstlight-actions'},React.createElement('button',{className:'primary',onClick:()=>setFirstLightOpen(false)},'CONTINUE CAMPAIGN'),React.createElement('button',{onClick:()=>{if(window.confirm('Start a new campaign? This will replace the current local save.'))resetFirstLight();}},'REPLAY FIRST LIGHT'))),
            entered && campaign.firstLight?.status==='complete' && !firstLightOpen && React.createElement('button',{className:'firstlight-reopen',onClick:()=>setFirstLightOpen(true)},React.createElement(Icon,{name:'award',size:15}),' FIRST LIGHT DEBRIEF'),
            toast && React.createElement("div", { className: "toast" },
                React.createElement(Icon, { name: "check-circle-2", size: 17 }),
                toast),
            ended && React.createElement("div", { className: "finish" },
                React.createElement("div", { className: "finish-inner" },
                    React.createElement("div", { className: "smalloverline" }, "FINAL NATIONAL REVIEW"),
                    React.createElement("h2", null, campaign.outcome?.kind === 'victory' ? 'STRATEGIC VICTORY' : 'CAMPAIGN DEFEAT'),
                    React.createElement("p", null, campaign.outcome?.reason),
                    React.createElement("div", { className: "finish-stats" },
                        React.createElement("div", null, metrics.score, "/100", React.createElement("small", null, "Strategy score")),
                        React.createElement("div", null, Math.round(metrics.coverage), "%", React.createElement("small", null, "Independent coverage")),
                        React.createElement("div", null, `₦${fmtNum(budget)}B`, React.createElement("small", null, "Funds remaining"))),
                    React.createElement("button", { onClick: () => { setCampaign(createCampaign()); setFirstLightOpen(true); setFirstLightBriefing(true); setSpeed(0); setSimClock(14*60+30); } }, "NEW CAMPAIGN ", React.createElement(Icon, { name: "rotate-cw", size: 17 }))))),
            campaign.pendingEvent && !ended && React.createElement("div", { className: "event-decision-overlay", role: "dialog", 'aria-modal': true, 'aria-label': "Strategic event decision" },
                React.createElement("div", { className: "event-decision-card" },
                    React.createElement("div", { className: "smalloverline" }, `${campaignDateLabel(turn)} · DECISION REQUIRED`),
                    React.createElement("h2", null, EVENTS.find(e => e.id === campaign.pendingEvent)?.title),
                    React.createElement("p", null, EVENTS.find(e => e.id === campaign.pendingEvent)?.brief),
                    React.createElement("div", { className: "event-choices" },
                        (EVENTS.find(e => e.id === campaign.pendingEvent)?.options || []).map(option =>
                            React.createElement("button", { key: option.id, disabled: budget < option.cost, onClick: () => decide(option.id) },
                                React.createElement("span", null,
                                    React.createElement("strong", null, option.label),
                                    React.createElement("small", null, option.description)),
                                React.createElement("b", null, option.cost ? `₦${option.cost}B` : 'NO COST')))),
                    React.createElement("p", { className: "event-hint" }, "Every response has consequences. Advance Turn is locked until a choice is made."))),
        entered && isPortraitPhone && !portraitOverride && React.createElement("div", { className: "rotate-device", role: "dialog", 'aria-label': 'Landscape recommended' },
            React.createElement("div", { className: "rotate-device-content" },
                React.createElement(Icon, { name: 'smartphone', size: 44 }),
                React.createElement("h2", null, "Rotate for the full war room"),
                React.createElement("p", null, "Turn your phone sideways for the 3D command table and tactical controls. Fullscreen and orientation lock depend on your browser."),
                React.createElement("div", { className: "rotate-actions" },
                    React.createElement("button", { onClick: toggleFullscreen }, 'TRY FULLSCREEN'),
                    React.createElement("button", { onClick: () => setPortraitOverride(true) }, 'PLAY IN PORTRAIT')))),
        !entered && React.createElement("div", { className: "splash" },
            React.createElement("div", { className: "splash-photo" }),
            React.createElement("div", { className: "splash-overlay" }),
            React.createElement("div", { className: "splash-content" },
                React.createElement("div", { className: "splash-kicker" },
                    React.createElement("span", { className: "pulse-dot" }),
                    " NIGERIA \u00B7 2026 BASELINE / FUTURE SPACE STRATEGY ",
                    React.createElement("span", { className: "splash-pip" }, "// BUILD 08 / STRATEGIC DEPTH")),
                React.createElement("div", { className: "splash-logo" },
                    "SPACE STRATEGY GAME ",
                    React.createElement("span", null, "\u25C8"),
                    " DSA WAR ROOM C4ISR"),
                React.createElement("h1", null,
                    "THE ULTIMATE",
                    React.createElement("br", null),
                    React.createElement("em", null, "HIGH GROUND.")),
                React.createElement("div", { className: "splash-tagline" }, "DOMINATE THE FINAL FRONTIER"),
                React.createElement("p", null,
                    "Start from Nigeria\u2019s verified 2026 space capability and build the orbital future.",
                    React.createElement("br", null),
                    "Develop EO, radar, communications resilience, and launch science in a cinematic strategy simulation."),
                React.createElement("div", { className: "splash-buttons" },
                    React.createElement("button", { className: "enter-btn", onClick: () => enterGame() },
                        React.createElement(Icon, { name: "play", size: 18 }),
                        saved ? " CONTINUE CAMPAIGN " : " ENTER WAR ROOM ",
                        React.createElement(Icon, { name: "arrow-up-right", size: 18 })),
                    saved && React.createElement("button", { className: "quiet-btn", onClick: () => {resetFirstLight(); if (isTouchGameDevice()) requestLandscapeFullscreen();} },
                        React.createElement(Icon, { name: "sunrise", size: 18 }),
                        " NEW CAMPAIGN / FIRST LIGHT"),
                    React.createElement("button", { className: "quiet-btn", onClick: () => enterGame('Orbit View') },
                        React.createElement(Icon, { name: "orbit", size: 18 }),
                        " EXPLORE ORBIT VIEW")),
                React.createElement("div", { className: "splash-facts" },
                    React.createElement("div", null,
                        React.createElement("span", null, "01"),
                        " CONFIRMED GEO PLATFORM"),
                    React.createElement("div", null,
                        React.createElement("span", null, "03"),
                        " FUTURE SPACE PROGRAMMES"),
                    React.createElement("div", null,
                        React.createElement("span", null, String(MAX_TURNS)),
                        " QUARTERLY TURNS"))),
            React.createElement("div", { className: "splash-aside" },
                React.createElement("div", { className: "side-label" }, "FEATURED ORBITAL PLATFORM"),
                React.createElement("div", { className: "splash-sat-img" }),
                React.createElement("div", { className: "side-caption" },
                    React.createElement("strong", null, "NIGCOMSAT-1R"),
                    React.createElement("span", null, "42.5\u00B0E GEO \u00B7 VERIFIED SERVICE / SCENARIO DATA"))),
            React.createElement("div", { className: "splash-disclaimer" }, "INDEPENDENT / UNOFFICIAL GAME \u00B7 PUBLIC-SOURCE 2026 BASELINE \u00B7 MODELLED FUTURE SYSTEMS \u00B7 NO LIVE MILITARY DATA")));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
