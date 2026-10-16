// Optional real-browser smoke check. Uses installed Edge, no npm dependencies.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const artifacts=path.resolve('.browser-check');await mkdir(artifacts,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'5187'},windowsHide:true,stdio:'ignore'});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--remote-debugging-port=9223',`--user-data-dir=${path.join(artifacts,'profile')}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let socket,passed=false;
async function waitFor(fn){let error;for(let i=0;i<100;i++){try{const r=await fn();if(r)return r;}catch(e){error=e;}await sleep(200);}throw error||new Error('Timed out');}
try{
  await waitFor(async()=>{const r=await fetch('http://127.0.0.1:5187/');return r.ok;});
  const page=await waitFor(async()=>{const r=await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'});return r.json();});
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0,onPaused;const pending=new Map(),errors=[];
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));else p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);else if(msg.method==='Fetch.requestPaused')onPaused?.(msg.params).catch(error=>errors.push(error.message));};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{
    const request=++id;
    const timer=setTimeout(()=>{pending.delete(request);reject(new Error(`Browser command timed out: ${method}`));},15000);
    pending.set(request,{resolve:result=>{clearTimeout(timer);resolve(result);},reject:error=>{clearTimeout(timer);reject(error);}});
    socket.send(JSON.stringify({id:request,method,params}));
  });
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await cdp('Page.enable');await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:5187/'});
  await waitFor(()=>evaluate("document.getElementById('play') && !document.getElementById('play').disabled"));
  const styles=await cdp('Runtime.evaluate',{expression:`(async()=>{
    const {createCharacter}=await import('./src/character.js');
    const hero=createCharacter();
    for(const hair of ['short','afro','braids','bun','ponytail','dreads','bald'])
      for(const hat of ['none','cap','beanie','tophat','crown'])
        for(const accessory of ['none','glasses','earrings','beard','scarf','backpack'])
          hero.applyStyle({hair,hat,accessory,body:'female',primaryColor:'#123456'});
    hero.applyStyle({primaryColor:'invalid',hair:'unknown',hat:'unknown',accessory:'unknown'});
    return hero.root.children.length>0;
  })()`,awaitPromise:true,returnByValue:true});
  assert.equal(styles.result.value,true,'all supported profile shapes should build without errors');
  await writeFile(path.join(artifacts,'desktop.png'),Buffer.from((await cdp('Page.captureScreenshot')).data,'base64'));
  await evaluate("document.getElementById('play').click()");
  assert.equal(await evaluate("document.getElementById('hud').hidden"),false);
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await sleep(1800);
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.ok(parseInt(await evaluate("document.getElementById('harvest').textContent"))>0,'movement must collect seeds');
  await evaluate("document.getElementById('pause').click()");
  const time=await evaluate("document.getElementById('time').textContent");await sleep(1100);
  assert.equal(await evaluate("document.getElementById('time').textContent"),time,'pause must freeze timer');
  await evaluate("document.getElementById('resume').click()");assert.equal(await evaluate("document.getElementById('modal').hidden"),true);
  await evaluate("document.getElementById('pause').click();document.getElementById('restart').click()");
  assert.equal(await evaluate("document.getElementById('harvest').textContent"),'0 / 18');
  await evaluate("document.getElementById('pause').click();document.getElementById('shed').click()");
  assert.equal(await evaluate("document.getElementById('intro').hidden"),false);
  assert.equal(await evaluate("document.getElementById('hud').hidden"),true);
  await evaluate("document.getElementById('scores').click()");
  await waitFor(()=>evaluate("document.getElementById('board-status').textContent.includes('published start.ng')"));
  await evaluate("document.getElementById('board-close').click();document.getElementById('play').click()");
  assert.equal(await evaluate("document.getElementById('harvest').textContent"),'0 / 18');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('touch')).display"),'flex');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await writeFile(path.join(artifacts,'mobile.png'),Buffer.from((await cdp('Page.captureScreenshot')).data,'base64'));

  // Simulate hosted HTTPS + the documented platform bridge in this isolated browser.
  // All game and frame requests below are fulfilled locally; no real scores are sent.
  const fixtureFrame=`<!doctype html><script>
    const user={id:42,name:'Test Gardener',style:{primaryColor:'#123456',hat:'cap'}};
    addEventListener('message',event=>{
      const request=event.data;let reply;
      if(request.type==='startng:whoami')reply={type:'startng:user',user};
      if(request.type==='startng:leaderboard')reply={type:'startng:leaderboardData',ok:true,entries:[
        {rank:1,player_id:99,name:'<img src=x onerror=alert(1)>',stats:{score:2500,seeds:18,time:5}},
        {rank:2,player_id:42,name:'Test Gardener',stats:{score:2000,seeds:18,time:55}}
      ]};
      if(request.type==='startng:score'){
        event.source.postMessage({type:'test:saved',stats:request.stats},event.origin);
        reply={type:'startng:scoreSaved',ok:true,result:{rank:2,improved:true}};
      }
      if(reply)event.source.postMessage({...reply,requestId:request.requestId},event.origin);
    });
  </script>`;
  onPaused=async event=>{
    const url=new URL(event.request.url);
    if(url.origin==='https://start.ng'){
      await cdp('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from(fixtureFrame).toString('base64')});return;
    }
    const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    const allowed=['index.html','favicon.svg','src/main.js','src/platform.js','src/game-state.js','src/scoring.js','src/character.js','src/styles.css'];
    if(!allowed.includes(file)){await cdp('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:404,body:''});return;}
    const data=await readFile(path.resolve(file));
    const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html';
    await cdp('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:type+'; charset=utf-8'}],body:data.toString('base64')});
  };
  await cdp('Fetch.enable',{patterns:[{urlPattern:'https://orbit-orchard.start.ng/*'},{urlPattern:'https://start.ng/connect'}]});
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:"window.__savedRuns=[];addEventListener('message',e=>{if(e.origin==='https://start.ng'&&e.data?.type==='test:saved')window.__savedRuns.push(e.data.stats);});"});
  await cdp('Page.navigate',{url:'https://orbit-orchard.start.ng/'});
  await waitFor(()=>evaluate("document.getElementById('identity')?.textContent==='Test Gardener' && !document.getElementById('play').disabled"));
  await evaluate("document.getElementById('scores').click()");
  await waitFor(()=>evaluate("document.querySelectorAll('#board-rows tr').length===2"));
  assert.equal(await evaluate("document.querySelector('#board-rows .own-score').textContent.includes('(you)')"),true);
  assert.equal(await evaluate("document.querySelectorAll('#board-rows img').length"),0,'player names must be plain text');
  await writeFile(path.join(artifacts,'leaderboard-mobile.png'),Buffer.from((await cdp('Page.captureScreenshot')).data,'base64'));
  await evaluate("document.getElementById('board-close').click();document.getElementById('play').click();document.getElementById('pause').click();document.getElementById('scores-results').click()");
  await evaluate("document.getElementById('board-close').click()");
  assert.equal(await evaluate("document.getElementById('modal').hidden"),false,'closing board should return to pause menu');
  await evaluate("document.getElementById('shed').click()");
  assert.equal(await evaluate('window.__savedRuns.length'),0,'abandoning a run must not submit a score');
  await evaluate("document.getElementById('play').click()");
  const key=async(code,type='keyDown')=>cdp('Input.dispatchKeyEvent',{type,code,key:code});
  await key('ArrowUp');await key('ArrowUp','keyUp');await key('ArrowRight');
  for(let ring=0;ring<3;ring++){
    for(let i=0;i<9;i++){
      if(i%6===0){await key('Space');await key('Space','keyUp');}await sleep(500);
      if(await evaluate("!document.getElementById('save-status').hidden"))break;
    }
    if(ring<2){await key('ArrowDown');await key('ArrowDown','keyUp');}
  }
  await key('ArrowRight','keyUp');
  await waitFor(()=>evaluate("document.getElementById('save-status').textContent.includes('rank: #2')"));
  assert.equal(await evaluate('window.__savedRuns.length'),1,'finished run should save once');
  assert.equal(await evaluate('Object.values(window.__savedRuns[0]).every(Number.isInteger)'),true);
  await evaluate("document.getElementById('shed').click()");assert.equal(await evaluate("document.getElementById('intro').hidden"),false);
  assert.deepEqual(errors,[]);passed=true;console.log('Browser checks passed: gameplay, shed/reset, leaderboard, safe names, own row, hosted score submission, mobile layout. Screenshots: .browser-check/');
  await cdp('Browser.close').catch(()=>{});
}finally{
  socket?.close();browser.kill();server.kill();
  // Edge can retain the debugging WebSocket during shutdown. Bound CLI teardown.
  setTimeout(()=>process.exit(passed?0:1),500);
}
