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
export async function askStartNg(message,replyType,timeout=5000){
  if(!PLATFORM)return null;
  let frame;try{frame=await getFrame();}catch{return null;}
  return new Promise(resolve=>{
    const requestId=crypto.randomUUID();
    const done=result=>{clearTimeout(timer);removeEventListener('message',receive);resolve(result);};
    const timer=setTimeout(()=>done(null),timeout);
    function receive(event){
      if(event.origin!==PLATFORM||event.source!==frame.contentWindow||event.data?.type!==replyType||event.data.requestId!==requestId)return;
      done(event.data);
    }
    addEventListener('message',receive);frame.contentWindow.postMessage({...message,requestId},PLATFORM);
  });
}
export async function getUser(){
  if(!PLATFORM)return {user:null,available:true};
  const reply=await askStartNg({type:'startng:whoami'},'startng:user');
  if(!reply)return {user:null,available:false};
  const u=reply.user,valid=u&&(typeof u.id==='string'||typeof u.id==='number')&&typeof u.name==='string';
  return {user:valid?{id:String(u.id),name:u.name,style:u.style&&typeof u.style==='object'?u.style:{}}:null,available:true};
}
export async function getLeaderboard(){
  if(!PLATFORM)return {ok:false,error:'The shared leaderboard connects on the published start.ng game.'};
  return await askStartNg({type:'startng:leaderboard',limit:10},'startng:leaderboardData')??{ok:false,error:'The leaderboard could not be reached. Please try again.'};
}
export async function submitScore(stats,playerId){
  if(!PLATFORM)return {ok:false,error:'Shared scores connect on start.ng. Your local best is saved.'};
  const current=await getUser();
  if(!current.available)return {ok:false,error:'Could not verify your account. Please try again.'};
  if(!current.user||current.user.id!==String(playerId))return {ok:false,error:'Your account changed. This harvest was not submitted.'};
  return await askStartNg({type:'startng:score',stats},'startng:scoreSaved')??{ok:false,error:'Score saving timed out. Please try again.'};
}
export function signIn(){if(PLATFORM)location.href=`${PLATFORM}/?return_to=${encodeURIComponent(location.href)}`;}
