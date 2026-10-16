import test from 'node:test';
import assert from 'node:assert/strict';

test('platform connection rejects forged messages and accepts the matching user response',async()=>{
  globalThis.location={hostname:'orbit-orchard.start.ng',href:'https://orbit-orchard.start.ng/'};
  const listeners=new Set();
  globalThis.addEventListener=(name,fn)=>{if(name==='message')listeners.add(fn);};
  globalThis.removeEventListener=(name,fn)=>listeners.delete(fn);
  const send=event=>{for(const listener of [...listeners])listener(event);};
  let request;
  const window={postMessage(data,origin){request={data,origin};}};
  const frame={contentWindow:window,remove(){}};
  globalThis.document={createElement(){return frame;},body:{append(f){queueMicrotask(()=>f.onload());}}};
  const platform=await import('../src/platform.js');
  const result=platform.getUser();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(request.origin,'https://start.ng');assert.equal(request.data.type,'startng:whoami');
  const data={type:'startng:user',requestId:request.data.requestId,user:{id:'42',name:'Gardener',style:{hat:'cap'}}};
  send({origin:'https://evil.example',source:window,data});assert.equal(listeners.size,1);
  send({origin:'https://start.ng',source:{},data});assert.equal(listeners.size,1);
  send({origin:'https://start.ng',source:window,data:{...data,requestId:'other'}});assert.equal(listeners.size,1);
  send({origin:'https://start.ng',source:window,data});
  assert.deepEqual(await result,{available:true,user:{id:'42',name:'Gardener',style:{hat:'cap'}}});assert.equal(listeners.size,0);

  const boardPromise=platform.getLeaderboard();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(request.data.type,'startng:leaderboard');assert.equal(request.data.limit,10);
  const boardData={type:'startng:leaderboardData',requestId:request.data.requestId,ok:true,entries:[{rank:1,player_id:42,name:'Gardener',stats:{score:2000,seeds:18,time:55}}]};
  send({origin:'https://evil.example',source:window,data:boardData});assert.equal(listeners.size,1);
  send({origin:'https://start.ng',source:window,data:boardData});assert.equal((await boardPromise).entries[0].player_id,42);

  const stats={score:2000,seeds:18,time:55};
  const scorePromise=platform.submitScore(stats,'42');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(request.data.type,'startng:whoami');
  send({origin:'https://start.ng',source:window,data:{...data,requestId:request.data.requestId}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(request.data.type,'startng:score');assert.deepEqual(request.data.stats,stats);
  send({origin:'https://start.ng',source:window,data:{type:'startng:scoreSaved',requestId:request.data.requestId,ok:true,result:{rank:1,improved:true}}});
  assert.equal((await scorePromise).result.rank,1);

  const switched=platform.submitScore(stats,'42');await new Promise(resolve=>setImmediate(resolve));
  send({origin:'https://start.ng',source:window,data:{...data,requestId:request.data.requestId,user:{id:'different',name:'Other'}}});
  assert.equal((await switched).ok,false);assert.equal(request.data.type,'startng:whoami','must not submit after account switch');
  const guest=platform.submitScore(stats,'42');await new Promise(resolve=>setImmediate(resolve));
  send({origin:'https://start.ng',source:window,data:{...data,requestId:request.data.requestId,user:null}});
  assert.equal((await guest).ok,false);

  const timeout=await platform.askStartNg({type:'startng:leaderboard'},'startng:leaderboardData',10);
  assert.equal(timeout,null);assert.equal(listeners.size,0,'timeouts must clean up listeners');
  platform.signIn();assert.ok(location.href.startsWith('https://start.ng/?return_to='));
});
