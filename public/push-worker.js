/* Imported by the existing Workbox worker. No skipWaiting or cache changes. */
function pushStore(action){
 return new Promise((resolve,reject)=>{const request=indexedDB.open('no-offside-push-context',1);request.onupgradeneeded=()=>request.result.createObjectStore('state');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readwrite');let result;action(tx.objectStore('state'),value=>{result=value;});tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};};});
}
async function pushRead(key){return pushStore((store,done)=>{const r=store.get(key);r.onsuccess=()=>done(r.result);});}
function safeNotificationUrl(value){try{const url=new URL(value,self.location.origin);if(url.origin!==self.location.origin||url.pathname!=='/'||!['chat','dashboard','fund','governance'].includes(url.searchParams.get('view'))||!/^[\w-]{2,100}$/.test(url.searchParams.get('team')||''))return '/';return url.href;}catch{return '/';}}
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const context=await pushRead('session').catch(()=>null);
  let matches=Boolean(context?.accountId&&context.accountId===data.accountId);
  const badge=await pushRead('badge').catch(()=>null);
  if(matches&&Number.isFinite(data.unreadTotal)&&(!badge||badge.accountId!==data.accountId||new Date(data.observedAt)>=new Date(badge.at))){
   await pushStore((store)=>store.put({accountId:data.accountId,count:data.unreadTotal,at:data.observedAt},'badge')).catch(()=>{});
   try{if(data.unreadTotal>0)await self.navigator.setAppBadge?.(data.unreadTotal);else await self.navigator.clearAppBadge?.();}catch{}
  }
  // A late push after logout must not reveal the old team's name or text.
  // Keep a visible generic notification instead of abusing silent push on iOS.
  const latestContext=await pushRead('session').catch(()=>null);
  matches=matches&&latestContext?.accountId===data.accountId;
  await self.registration.showNotification(matches?(data.title||'No Offside'):'No Offside',{
   body:matches?(data.body||'Có cập nhật mới.'):'Mở No Offside để kiểm tra thông báo.',
   icon:'/pwa-192x192.png',badge:'/pwa-192x192.png',tag:matches?String(data.tag||'no-offside'):'no-offside-session',renotify:false,
   data:{accountId:matches?data.accountId:null,url:matches?safeNotificationUrl(data.url):'/',eventId:data.eventId}
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const context=await pushRead('session').catch(()=>null),data=event.notification.data||{};
  const target=data.accountId&&context?.accountId===data.accountId?safeNotificationUrl(data.url):'/';
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(w=>new URL(w.url).origin===self.location.origin);
  if(client){await client.focus();client.postMessage({type:'NO_OFFSIDE_PUSH_OPEN',url:target});}
  else await self.clients.openWindow(target);
 })());
});
