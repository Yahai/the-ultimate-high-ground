/** Artistic terrain-climate model for a West African tabletop diorama.
 * Not a land-cover raster or a weather forecast. Values are deterministic.
 */
export const QUARTER_NAMES = ['Dry season', 'Early rains', 'Peak monsoon', 'Retreating rains'];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const colors={
  coastal:[0.084,0.24,0.20],
  rainforest:[0.080,0.31,0.17],
  forestSavannah:[0.26,0.35,0.18],
  woodland:[0.43,0.38,0.22],
  drySavannah:[0.54,0.44,0.27],
  sahel:[0.64,0.53,0.35],
  rock:[0.38,0.37,0.33]
};
function interpolate(a,b,t){return a.map((v,i)=>mix(v,b[i],clamp(t)))}
export function biomeBlend(lon,lat,elevation=1,pattern=0.5){
  const d=clamp(pattern);
  // Irregular ecotones, rather than discrete latitude stripes.
  const humidLat=lat+0.42*Math.sin(lon*0.94)+0.22*Math.sin(lon*2.1)+(.5-d)*0.56;
  const coastal=1-smooth(5.0,6.2,humidLat);
  const rainforest=1-smooth(6.5,8.0,humidLat);
  const woodland=smooth(6.4,9.1,humidLat);
  const dry=smooth(9.0,11.8,humidLat);
  const sahel=smooth(11.35,13.55,humidLat);
  const hills=clamp(smooth(2.8,5.5,elevation)*.45);
  const variation=(d-.5)*.07;
  let rgb=interpolate(colors.rainforest,colors.forestSavannah,woodland);
  rgb=interpolate(rgb,colors.woodland,dry*.7);
  rgb=interpolate(rgb,colors.drySavannah,dry*.38);
  rgb=interpolate(rgb,colors.sahel,sahel);
  rgb=interpolate(rgb,colors.coastal,coastal*.8);
  rgb=interpolate(rgb,colors.rainforest,rainforest*.23);
  rgb=interpolate(rgb,colors.rock,hills);
  return rgb.map(v=>clamp(v+variation,0,1));
}
export function cloudCover(lon,lat,quarter,pattern=0.5){
  const q=((Math.floor(quarter)-1)%4+4)%4;
  const westCoast=1-smooth(6.0,9.5,lat);
  const humidSouth=1-smooth(9.1,13.2,lat);
  const mountain=clamp(Math.exp(-(((lon-11.4)/1.9)**2+((lat-7.0)/2.2)**2)));
  const seasonal=[0.13,0.37,0.78,0.31][q];
  const northernBoost=[0.01,0.07,0.28,0.03][q];
  const base=0.03+seasonal*(0.17+humidSouth*.51+westCoast*.17)+northernBoost*smooth(8.5,13,lat);
  return clamp(base+mountain*.12*seasonal+(clamp(pattern)-.5)*.26,0,.93);
}
export function cloudOpacity(lon,lat,quarter,pattern=0.5){
  return clamp((cloudCover(lon,lat,quarter,pattern)-.13)*1.4,0,.77);
}
export function campaignQuarter(turn){return (3+(Math.max(1,Math.floor(Number(turn)||1))-1))%4+1;}