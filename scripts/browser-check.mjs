// Optional real-browser smoke check. Uses installed Edge, no npm dependencies.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
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
  let id=0;const pending=new Map(),errors=[];
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));else p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);};
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
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('touch')).display"),'flex');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await writeFile(path.join(artifacts,'mobile.png'),Buffer.from((await cdp('Page.captureScreenshot')).data,'base64'));
  assert.deepEqual(errors,[]);passed=true;console.log('Browser checks passed: boot, profile shapes, movement/collection, pause/resume, restart, mobile layout. Screenshots: .browser-check/');
  await cdp('Browser.close').catch(()=>{});
}finally{
  socket?.close();browser.kill();server.kill();
  // Edge can retain the debugging WebSocket during shutdown. Bound CLI teardown.
  setTimeout(()=>process.exit(passed?0:1),500);
}
