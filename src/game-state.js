export const RADII = [1.8, 3.2, 4.6];
export const TARGET = 18;
export const DURATION = 75;
export const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b)));
export function createGame() {
  return {angle:Math.PI/2, ring:1, radius:RADII[1], time:DURATION, health:3, collected:0,
    elapsed:0, dash:0, cooldown:0, invulnerable:0, result:null,
    seeds:Array.from({length:TARGET},(_,i)=>({ring:i%3,angle:Math.floor(i/3)*Math.PI/3+(i%3)*.19,taken:false})),
    pests:[0,1,2].map(ring=>({ring,angle:Math.PI+ring*1.4,speed:(ring%2?-1:1)*(.46+ring*.05)}))};
}
export function switchRing(g, delta) {if(!g.result)g.ring=Math.max(0,Math.min(2,g.ring+delta));}
export function dash(g) {if(g.result||g.cooldown>0)return false;g.dash=.42;g.cooldown=3.2;return true;}
export function stepGame(g,dt,direction) {
  if(g.result)return;
  dt=Math.max(0,Math.min(dt,.05));g.elapsed+=dt;g.time=Math.max(0,g.time-dt);
  g.cooldown=Math.max(0,g.cooldown-dt);g.dash=Math.max(0,g.dash-dt);g.invulnerable=Math.max(0,g.invulnerable-dt);
  g.angle+=Math.sign(direction)*(g.dash>0?3.5:1.65)*dt;
  g.radius+=(RADII[g.ring]-g.radius)*Math.min(1,dt*13);
  for(const s of g.seeds)if(!s.taken&&Math.abs(g.radius-RADII[s.ring])<.38&&angleDistance(g.angle,s.angle)*g.radius<.46){s.taken=true;g.collected++;}
  for(const p of g.pests){p.angle+=p.speed*dt;if(g.dash<=0&&g.invulnerable<=0&&Math.abs(g.radius-RADII[p.ring])<.48&&angleDistance(g.angle,p.angle)*g.radius<.62){g.health--;g.invulnerable=1.6;}}
  if(g.collected===TARGET)g.result='won';else if(g.health<=0)g.result='health';else if(g.time<=0)g.result='time';
}
