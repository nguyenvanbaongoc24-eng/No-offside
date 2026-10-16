import {serverRequest} from './serverRequest.js';
const KEY='no_offside_push_installation_v1';
const DB='no-offside-push-context';
export function installation(){
 let value;try{value=JSON.parse(localStorage.getItem(KEY));}catch{}
 if(value?.id&&value?.secret)return value;
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 value={id:crypto.randomUUID(),secret:btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
 localStorage.setItem(KEY,JSON.stringify(value));return value;
}
export async function notificationRequest(token,body){
 const {response,data}=await serverRequest('/api/notifications',body?{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}:{headers:{Authorization:`Bearer ${token}`}});
 if(!response.ok||!data.success)throw Error(data.error||'Không tải được thông báo.');return data;
}
export function deviceBody(){const i=installation();return {installationId:i.id,installationSecret:i.secret};}
export async function workerContext(accountId){
 if(typeof indexedDB==='undefined')return;
 await new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put({accountId:accountId||null},'session');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};});
 const registration=await navigator.serviceWorker?.getRegistration();
 if(registration){const notifications=await registration.getNotifications();for(const n of notifications)if(n.data?.accountId!==accountId)n.close();}
}
export async function disconnectPushDevice(){
 await workerContext(null).catch(()=>{});
 await navigator.clearAppBadge?.().catch(()=>{});
 let failure;
 try {
  const registration=await navigator.serviceWorker?.getRegistration();
  const sub=await registration?.pushManager?.getSubscription();
  if(sub)await sub.unsubscribe();
 } catch(e) { failure=e; }
 try { await notificationRequest(null,{action:'detach',...deviceBody()}); } catch(e) { failure=failure||e; }
 if(failure)throw failure;
}
let accountSync=Promise.resolve();
export function synchronizePushAccount(accountId){
 // Serialize rapid account transitions; an old asynchronous cleanup must not
 // detach a newly registered account on the same installation.
 const task=accountSync.then(async()=>{
  const current=installation();
  if(current.owner&&current.owner!==accountId)await disconnectPushDevice().catch(()=>{});
  try { await workerContext(accountId); }
  catch { await disconnectPushDevice().catch(()=>{}); }
  localStorage.setItem(KEY,JSON.stringify({...current,owner:accountId||null}));
 });
 accountSync=task.catch(()=>{});return task;
}
export async function reconcileAppBadge(accountId,count,observedAt){
 let allowed=true;
 if(typeof indexedDB!=='undefined')allowed=await new Promise(resolve=>{
  const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onerror=()=>resolve(false);
  req.onsuccess=()=>{
   const db=req.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state');let accepted=false;
   const session=store.get('session');session.onsuccess=()=>{
    if((session.result?.accountId||null)!==(accountId||null))return;
    const previous=store.get('badge');previous.onsuccess=()=>{
     if(accountId && (!observedAt || (previous.result?.accountId===accountId && new Date(previous.result.at)>new Date(observedAt))))return;
     store.put({accountId,count,at:observedAt||new Date().toISOString()},'badge');accepted=true;
    };
   };
   tx.oncomplete=()=>{db.close();resolve(accepted);};tx.onerror=()=>{db.close();resolve(false);};
  };
 });
 if(!allowed)return;
 if(count>0)await navigator.setAppBadge?.(count);else await navigator.clearAppBadge?.();
}
export function platformPushState(){
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
 if(ios&&!standalone)return 'install';
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'unsupported';
 return Notification.permission==='denied'?'blocked':'supported';
}
export function vapidBytes(key){const padded=(key+'='.repeat((4-key.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));}
export function safePushTarget(value){
 try{const url=new URL(value,window.location.origin);if(url.origin!==window.location.origin||url.pathname!=='/')return null;const team=url.searchParams.get('team'),view=url.searchParams.get('view'),account=url.searchParams.get('for');if(!/^[\w-]{2,100}$/.test(team||'')||!['chat','dashboard','fund','governance'].includes(view))return null;const match=url.searchParams.get('match'),member=url.searchParams.get('member');if((match&&!/^[\w-]{1,100}$/.test(match))||(member&&!/^[\w-]{1,100}$/.test(member)))return null;return {teamId:team,view,accountId:account||null,...(match?{matchId:match}:{}),...(member?{memberId:member}:{})};}catch{return null;}
}
