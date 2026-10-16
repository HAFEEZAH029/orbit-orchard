import {createGame,stepGame,switchRing,dash,RADII,TARGET} from './game-state.js';
import {PLATFORM,getUser,signIn,getLeaderboard,submitScore} from './platform.js';
import {harvestStats} from './scoring.js';
const $=id=>document.getElementById(id);
let mode='loading',game=createGame(),user=null,hero,camera,renderer;
const held=new Set();let refreshNumber=0;
let boardRequest=0,savingRun=null;
const storageKey=()=>`orbit-orchard:best:${user?.id??'guest'}`;
function best(){try{const v=JSON.parse(localStorage.getItem(storageKey()));return v&&Number.isFinite(v.seeds)&&Number.isFinite(v.time)?v:null;}catch{return null;}}
function showBest(){const b=best();$('best').textContent=b?`${b.score??harvestStats({collected:b.seeds,elapsed:b.time}).score} points · ${b.seeds}/${TARGET} seeds · ${b.time.toFixed(1)}s`:'Your first harvest awaits';}
function saveBest(){
  const value=harvestStats(game),old=best();
  const oldScore=old?(old.score??harvestStats({collected:old.seeds,elapsed:old.time}).score):-1;
  if(!old||value.score>oldScore||(value.score===oldScore&&value.time<old.time)){try{localStorage.setItem(storageKey(),JSON.stringify(value));}catch{/* Storage is optional. */}}
  showBest();
}
function updateHud(){
  $('harvest').textContent=`${game.collected} / ${TARGET}`;$('time').textContent=`${Math.ceil(game.time)}s`;
  $('health').textContent='♥ '.repeat(game.health).trim()||'—';$('dash-status').textContent=game.cooldown>0?`${game.cooldown.toFixed(1)}s`:'Ready';
}
function start(){game=createGame();mode='running';held.clear();boardRequest++;$('leaderboard-modal').hidden=true;$('retry-score').hidden=true;document.body.classList.add('playing');$('intro').hidden=true;$('modal').hidden=true;$('hud').hidden=false;$('touch').hidden=false;$('pause').focus();updateHud();resize();}
function pause(){
  if(mode!=='running')return;mode='paused';held.clear();$('modal-title').textContent='Garden paused';$('modal-message').textContent='Your seeds can wait. Take a moment, then return to your orbit.';
  $('score-summary').hidden=true;$('save-status').hidden=true;$('retry-score').hidden=true;
  $('resume').hidden=false;$('modal').hidden=false;$('touch').hidden=true;$('resume').focus();
}
function resume(){if(mode!=='paused')return;mode='running';$('modal').hidden=true;$('touch').hidden=false;$('pause').focus();}
function returnToShed(){
  if(!['paused','over'].includes(mode))return;
  game=createGame();mode='ready';held.clear();boardRequest++;
  $('leaderboard-modal').hidden=true;$('modal').hidden=true;$('hud').hidden=true;$('touch').hidden=true;
  document.body.classList.remove('playing');$('intro').hidden=false;showBest();resize();$('play').focus();
}
async function saveSharedScore(){
  const run=game,playerId=user?.id;
  if(mode!=='over'||!run.result||savingRun===run)return;
  $('save-status').hidden=false;$('retry-score').hidden=true;
  if(!playerId){$('save-status').textContent=PLATFORM?'Saved on this browser. Sign in before your next run to join the shared leaderboard.':'Local best saved. Shared scores connect on the published start.ng game.';return;}
  savingRun=run;$('save-status').textContent='Saving your harvest to start.ng…';
  try{
    const reply=await submitScore(harvestStats(run),playerId);
    if(game!==run||user?.id!==playerId)return;
    if(reply.ok){
      const rank=reply.result?.rank;
      $('save-status').textContent=`${reply.result?.improved?'New best harvest saved!':'Harvest saved. Your best run stays on the board.'}${Number.isInteger(rank)?` Your rank: #${rank}.`:''}`;
    }else{$('save-status').textContent=typeof reply.error==='string'?reply.error:'Your score could not be saved. Please try again.';$('retry-score').hidden=false;}
  }catch{if(game===run&&user?.id===playerId){$('save-status').textContent='Your score could not be saved. Please try again.';$('retry-score').hidden=false;}}
  finally{if(savingRun===run)savingRun=null;}
}
function openBoard(){
  if(mode==='running')pause();$('modal').hidden=true;$('leaderboard-modal').hidden=false;
  $('board-close').textContent=['paused','over'].includes(mode)?'Back to harvest':'Back to shed';
  $('board-close').focus();loadBoard();
}
function closeBoard(){
  boardRequest++;$('leaderboard-modal').hidden=true;
  if(['paused','over'].includes(mode)){$('modal').hidden=false;$(mode==='paused'?'resume':'restart').focus();}
  else $('scores').focus();
}
async function loadBoard(){
  const request=++boardRequest;$('board-refresh').disabled=true;$('board-status').textContent='Loading harvests…';$('board-rows').replaceChildren();$('board-table-wrap').hidden=true;
  $('board-guest').hidden=!!user;$('board-signin').hidden=!!user||!PLATFORM;
  try{
    const reply=await getLeaderboard();if(request!==boardRequest)return;
    if(!reply.ok||!Array.isArray(reply.entries)){$('board-status').textContent=typeof reply.error==='string'?reply.error:'The leaderboard is unavailable. Please try again.';return;}
    const entries=reply.entries.slice(0,10);
    $('board-status').textContent=entries.length?'Best harvests across start.ng. Your row is highlighted.':'No harvests yet. Be the first gardener on the board!';
    for(const entry of entries){
      const row=document.createElement('tr'),mine=!!user&&String(entry.player_id)===user.id;
      if(mine)row.classList.add('own-score');
      const numeric=value=>Number.isFinite(value)?String(value):'—';
      const time=entry.stats?.time;
      const cells=[numeric(entry.rank),`${typeof entry.name==='string'?entry.name:'Gardener'}${mine?' (you)':''}`,numeric(entry.stats?.score??entry.score),numeric(entry.stats?.seeds),Number.isFinite(time)?`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`:'—'];
      for(const text of cells){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}$('board-rows').append(row);
    }
    $('board-table-wrap').hidden=!entries.length;
  }catch{if(request===boardRequest)$('board-status').textContent='The leaderboard could not be reached. Please try again.';}
  finally{if(request===boardRequest)$('board-refresh').disabled=false;}
}
function finish(){
  mode='over';held.clear();saveBest();$('modal-title').textContent=game.result==='won'?'A beautiful harvest.':game.result==='time'?'The sun has set.':'Even gardeners need a rest.';
  $('modal-message').textContent=`${user?.name??'Gardener'}, you gathered ${game.collected} of ${TARGET} seeds in ${game.elapsed.toFixed(1)} seconds.${game.result==='won'?' Your orchard is in full bloom!':' Switch rings when a pest gets close, or dash straight through.'}`;
  $('resume').hidden=true;$('modal').hidden=false;$('touch').hidden=true;$('restart').focus();
  $('score-summary').hidden=false;$('score-summary').textContent=`${harvestStats(game).score} harvest points`;
  saveSharedScore();
}
async function refreshUser(){
  const request=++refreshNumber,result=await getUser();if(request!==refreshNumber)return;
  if(!result.available){$('connection').textContent='Account connection unavailable · guest play is still available';return;}
  const changed=(user?.id??null)!==(result.user?.id??null);
  if(changed&&mode==='running')pause();
  if(changed&&['paused','over'].includes(mode))returnToShed();
  user=result.user;hero?.applyStyle(user?.style);$('identity').textContent=user?user.name:'Guest gardener';$('signin').hidden=!PLATFORM||!!user;
  $('connection').textContent=user?'Your start.ng look is growing here. Change your profile, then return to update it.':PLATFORM?'Playing as a guest · sign in to wear your start.ng look':'Local garden · guest play. Your start.ng look connects after deployment.';
  showBest();if(renderer)resize();if(!$('leaderboard-modal').hidden)loadBoard();
}
function resize(){
  if(!renderer)return;const mobile=innerWidth<700,preview=mode==='ready';renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
  camera.position.set(0,mobile?16:13,mobile?12:10);
  camera.fov=Math.max(mobile?51:44,2*Math.atan(6.2/(camera.position.length()*camera.aspect))*180/Math.PI);
  camera.lookAt(preview&&!mobile?-4:0,preview&&mobile?4:0,0);camera.updateProjectionMatrix();
}
async function boot(){
  const [THREE,{createCharacter}]=await Promise.all([import('three'),import('./character.js')]);
  renderer=new THREE.WebGLRenderer({canvas:$('garden'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#102e29');camera=new THREE.PerspectiveCamera(44,1,.1,100);
  scene.add(new THREE.HemisphereLight('#fff4d6','#264d43',2.5));const sun=new THREE.DirectionalLight('#ffedca',3);sun.position.set(4,12,6);scene.add(sun);
  const garden=new THREE.Group();scene.add(garden);
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
  const earth=mat('#76654c'),grass=mat('#789961'),path=mat('#bfd08b'),bark=mat('#816243'),leaves=mat('#adc976'),gold=mat('#eef79c',{emissive:'#a3bd3d',emissiveIntensity:.65});
  function mesh(geometry,material,x,y,z,parent=garden){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);parent.add(o);return o;}
  mesh(new THREE.CylinderGeometry(5.45,3.8,1.6,14),earth,0,-.85,0);mesh(new THREE.CylinderGeometry(5.48,5.45,.18,14),grass,0,.04,0);
  for(const r of RADII){const m=mesh(new THREE.RingGeometry(r-.28,r+.28,100),path,0,.145,0);m.rotation.x=-Math.PI/2;}
  mesh(new THREE.CylinderGeometry(.16,.25,1.4,8),bark,0,.8,0);mesh(new THREE.IcosahedronGeometry(.85,1),leaves,0,1.9,0);mesh(new THREE.IcosahedronGeometry(.55,0),mat('#d2df8f'),.4,1.6,.2);
  const blossoms=[],pink=mat('#efc5a8');for(let i=0;i<18;i++){const a=i/18*Math.PI*2;blossoms.push(mesh(new THREE.IcosahedronGeometry(.12),i%2?pink:gold,Math.cos(a)*5.15,.24,Math.sin(a)*5.15));}
  const seeds=game.seeds.map(s=>mesh(new THREE.OctahedronGeometry(.15),gold,Math.cos(s.angle)*RADII[s.ring],.5,Math.sin(s.angle)*RADII[s.ring]));
  const pestMat=mat('#a56b8d'),wingMat=mat('#dfc0db',{transparent:true,opacity:.7}),eyeMat=mat('#fff7dd');
  const pests=game.pests.map(()=>{const root=new THREE.Group();garden.add(root);mesh(new THREE.IcosahedronGeometry(.28,1),pestMat,0,0,0,root);for(const x of [-.28,.28]){const w=mesh(new THREE.SphereGeometry(.18,8,6),wingMat,x,.1,0,root);w.scale.set(1,.15,1.4);}for(const x of [-.1,.1])mesh(new THREE.SphereGeometry(.055,8,6),eyeMat,x,.04,.24,root);return root;});
  hero=createCharacter();hero.applyStyle(user?.style);garden.add(hero.root);const halo=mesh(new THREE.TorusGeometry(.48,.035,6,40),gold,0,.18,0);halo.rotation.x=-Math.PI/2;
  mode='ready';$('play').disabled=false;$('play').textContent='Start your harvest ↗';resize();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,clock=new THREE.Clock();let animation=0;
  renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);animation+=dt;
    if(mode==='running'){stepGame(game,dt,(held.has('right')?1:0)-(held.has('left')?1:0));updateHud();if(game.result)finish();}
    const t=reduced?0:animation;garden.position.y=mode==='ready'?Math.sin(t*.7)*.08:0;
    hero.root.position.set(Math.cos(game.angle)*game.radius,.16,Math.sin(game.angle)*game.radius);hero.root.rotation.y=-game.angle+(held.has('left')?Math.PI:0);
    hero.root.visible=game.invulnerable<=0||Math.floor(animation*12)%2===0;hero.animate(animation,mode==='running'&&(held.has('left')||held.has('right')));
    halo.position.set(hero.root.position.x,.19,hero.root.position.z);halo.visible=game.dash>0;
    seeds.forEach((s,i)=>{s.visible=!game.seeds[i].taken;s.position.y=.52+Math.sin(t*2+i)*.1;s.rotation.y=t+i;});
    pests.forEach((pest,i)=>{const p=game.pests[i];pest.position.set(Math.cos(p.angle)*RADII[p.ring],.55+Math.sin(t*5+i)*.07,Math.sin(p.angle)*RADII[p.ring]);pest.rotation.y=-p.angle;});
    blossoms.forEach((b,i)=>b.scale.setScalar(game.result==='won'?1.4+Math.sin(t*3+i)*.2:1));renderer.render(scene,camera);
  });await refreshUser();
}
const controls={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'inward',KeyW:'inward',ArrowDown:'outward',KeyS:'outward'};
function activate(control){if(mode!=='running')return;if(control==='inward')switchRing(game,-1);else if(control==='outward')switchRing(game,1);else held.add(control);}
addEventListener('keydown',e=>{
  const dialog=!$('leaderboard-modal').hidden?$('leaderboard-modal'):!$('modal').hidden?$('modal'):null;
  if(dialog&&e.code==='Tab'){
    const buttons=[...dialog.querySelectorAll('button:not([hidden]):not(:disabled)')];
    const index=buttons.indexOf(document.activeElement);
    e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();return;
  }
  if(!$('leaderboard-modal').hidden){if(e.code==='Escape'&&!e.repeat){e.preventDefault();closeBoard();}return;}
  if(e.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if(mode==='running'&&(controls[e.code]||e.code==='Space'))e.preventDefault();
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){if(mode==='running')pause();else if(mode==='paused')resume();return;}
  if(e.repeat)return;if(controls[e.code])activate(controls[e.code]);if(e.code==='Space'&&mode==='running')dash(game);
});
addEventListener('keyup',e=>held.delete(controls[e.code]));
for(const button of document.querySelectorAll('[data-control]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);activate(button.dataset.control);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(button.dataset.control));}
$('dash-button').onclick=()=>{if(mode==='running')dash(game);};$('play').onclick=start;$('restart').onclick=start;$('pause').onclick=pause;$('resume').onclick=resume;$('signin').onclick=signIn;
$('shed').onclick=returnToShed;$('scores').onclick=openBoard;$('scores-results').onclick=openBoard;
$('board-close').onclick=closeBoard;$('board-refresh').onclick=loadBoard;$('board-signin').onclick=signIn;$('retry-score').onclick=saveSharedScore;
addEventListener('resize',resize);addEventListener('blur',()=>{held.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();pause();}else refreshUser();});addEventListener('focus',()=>refreshUser());
$('signin').hidden=!PLATFORM;
showBest();boot().catch(error=>{console.error(error);$('play').disabled=true;$('play').textContent='Garden unavailable';$('render-status').hidden=false;$('render-status').textContent='The 3D garden could not load. Check your internet connection and WebGL support, then refresh.';});
