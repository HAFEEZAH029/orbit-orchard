import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,switchRing,dash,angleDistance,RADII,TARGET} from '../src/game-state.js';

test('a harvest has six seeds per ring and fresh independent state',()=>{
  const g=createGame();assert.equal(g.seeds.length,TARGET);
  for(let ring=0;ring<3;ring++)assert.equal(g.seeds.filter(s=>s.ring===ring).length,6);
  g.seeds[0].taken=true;assert.equal(createGame().seeds[0].taken,false);
});
test('collect each seed only once, including across the angle wrap',()=>{
  const g=createGame();g.ring=0;g.radius=RADII[0];g.angle=Math.PI*2-.01;g.pests=[];
  stepGame(g,.016,0);assert.equal(g.collected,1);stepGame(g,.016,0);assert.equal(g.collected,1);
  assert.ok(angleDistance(0,Math.PI*2-.01)<.011);
});
test('a seed on another ring is not collected',()=>{
  const g=createGame();g.radius=RADII[1];g.ring=1;g.angle=0;g.seeds=[{ring:0,angle:0,taken:false}];g.pests=[];
  stepGame(g,.016,0);assert.equal(g.collected,0);
});
test('ring switches stay inside the garden and move smoothly',()=>{
  const g=createGame();switchRing(g,-10);assert.equal(g.ring,0);stepGame(g,.05,0);
  assert.ok(g.radius>RADII[0]&&g.radius<RADII[1]);switchRing(g,10);assert.equal(g.ring,2);
});
test('pests inflict one hit with a grace period, dash blocks a hit',()=>{
  const g=createGame();g.seeds=[];g.pests=[{ring:1,angle:g.angle,speed:0}];
  stepGame(g,.016,0);assert.equal(g.health,2);stepGame(g,.016,0);assert.equal(g.health,2);
  g.invulnerable=0;assert.equal(dash(g),true);stepGame(g,.016,0);assert.equal(g.health,2);assert.equal(dash(g),false);
});
test('dash becomes available after cooldown',()=>{
  const g=createGame();g.pests=[];dash(g);for(let i=0;i<66;i++)stepGame(g,.05,0);assert.equal(dash(g),true);
});
test('harvesting all seeds wins and freezes the result',()=>{
  const g=createGame();g.pests=[];
  for(const seed of g.seeds){g.ring=seed.ring;g.radius=RADII[seed.ring];g.angle=seed.angle;stepGame(g,.016,0);}
  assert.equal(g.result,'won');assert.equal(g.collected,TARGET);const time=g.time;stepGame(g,.05,1);assert.equal(g.time,time);assert.equal(dash(g),false);
});
test('timer and health both end a run',()=>{
  const g=createGame();g.time=.01;stepGame(g,.02,0);assert.equal(g.result,'time');assert.equal(g.time,0);
  const h=createGame();h.health=1;h.pests=[{ring:1,angle:h.angle,speed:0}];stepGame(h,.016,0);assert.equal(h.result,'health');
});
test('a skilled three-ring route can win without losing health',()=>{
  const g=createGame();
  // Circle each ring at walking speed; automatically dash only at an imminent collision.
  for(let ring=0;ring<3;ring++){
    switchRing(g,ring-g.ring);
    for(let i=0;i<400&&!g.result;i++){
      if(g.pests.some(p=>p.ring===g.ring&&angleDistance(g.angle,p.angle)*g.radius<1))dash(g);
      stepGame(g,.016,1);
      if(g.seeds.filter(s=>s.ring===ring).every(s=>s.taken))break;
    }
  }
  assert.equal(g.result,'won');assert.ok(g.time>40);assert.ok(g.health>0);
});
