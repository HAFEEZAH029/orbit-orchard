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
  platform.signIn();assert.ok(location.href.startsWith('https://start.ng/?return_to='));
});
