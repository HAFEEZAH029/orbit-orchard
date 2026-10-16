// Public protocol: https://lanedash.start.ng/src/platform.js
export const PLATFORM=location.hostname.endsWith('.start.ng')?'https://start.ng':null;
let framePromise;
function getFrame(){
  if(framePromise)return framePromise;
  framePromise=new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');frame.hidden=true;frame.title='start.ng account connection';
    const timer=setTimeout(()=>{frame.remove();framePromise=null;reject(new Error('Connection timeout'));},5000);
    frame.onload=()=>{clearTimeout(timer);resolve(frame);};
    frame.onerror=()=>{clearTimeout(timer);frame.remove();framePromise=null;reject(new Error('Connection failed'));};
    frame.src=`${PLATFORM}/connect`;document.body.append(frame);
  });return framePromise;
}
export async function getUser(){
  if(!PLATFORM)return {user:null,available:true};
  let frame;try{frame=await getFrame();}catch{return {user:null,available:false};}
  return new Promise(resolve=>{
    const requestId=crypto.randomUUID();
    const done=result=>{clearTimeout(timer);removeEventListener('message',receive);resolve(result);};
    const timer=setTimeout(()=>done({user:null,available:false}),3500);
    function receive(event){
      if(event.origin!==PLATFORM||event.source!==frame.contentWindow||event.data?.type!=='startng:user'||event.data.requestId!==requestId)return;
      const u=event.data.user,valid=u&&(typeof u.id==='string'||typeof u.id==='number')&&typeof u.name==='string';
      done({user:valid?{id:String(u.id),name:u.name,style:u.style&&typeof u.style==='object'?u.style:{}}:null,available:true});
    }
    addEventListener('message',receive);frame.contentWindow.postMessage({type:'startng:whoami',requestId},PLATFORM);
  });
}
export function signIn(){if(PLATFORM)location.href=`${PLATFORM}/?return_to=${encodeURIComponent(location.href)}`;}
