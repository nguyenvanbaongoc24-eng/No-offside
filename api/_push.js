import webpush from 'web-push';
import {getAdminClient} from './_storageHelper.js';
import {createHash,timingSafeEqual} from 'node:crypto';
export function pushConfigured(){return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);}
export function validSubscription(subscription){
 try {
  const url=new URL(subscription?.endpoint);
  const allowed=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com');
  if(url.protocol!=='https:'||!allowed||url.username||url.password||url.port||url.hash||url.href.length>2048)return false;
  const key=Buffer.from(subscription.keys?.p256dh||'','base64url'),auth=Buffer.from(subscription.keys?.auth||'','base64url');
  return key.length===65&&key[0]===4&&auth.length===16;
 }catch{return false;}
}
export function isWorker(req){
 const supplied=req.headers?.authorization||'';
 const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:'';
 return Boolean(expected&&typeof supplied==='string'&&Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)));
}
// Awaited, bounded dispatch. Durable leases and outbox survive a serverless crash.
// "accepted" means the push provider accepted it, never a delivery/read receipt.
export async function dispatchPush({client,send,limit=8}={}){
 if(!send&&!pushConfigured())return {configured:false,accepted:0};
 const admin=client||getAdminClient();
 const {data:jobs,error}=await admin.rpc('no_push_claim',{p_limit:limit});if(error)throw error;
 const deliver=send||((subscription,payload,options)=>webpush.sendNotification(subscription,payload,{...options,vapidDetails:{subject:process.env.VAPID_SUBJECT,publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY}}));
 let accepted=0;
 await Promise.all((jobs||[]).map(async job=>{
  let outcome='retry',status=null;
  try{
   if(!validSubscription(job.subscription)){outcome='expired';status=400;}
   else{const result=await deliver(job.subscription,JSON.stringify(job.payload),{TTL:600,timeout:5000,urgency:'normal',topic:createHash('sha256').update(job.deviceId+job.payload.tag).digest('base64url').slice(0,32)});status=result.statusCode;outcome=status>=200&&status<300?'accepted':'retry';if(outcome==='accepted')accepted++;}
  }catch(error){status=Number(error.statusCode)||null;outcome=[404,410].includes(status)?'expired':'retry';}
  const finished=await admin.rpc('no_push_finish',{p_id:job.id,p_lease:job.lease,p_outcome:outcome,p_status:status});if(finished.error)throw finished.error;
 }));
 return {configured:true,claimed:jobs?.length||0,accepted};
}
export async function dispatchAfterCommit(){try{return await dispatchPush();}catch(error){console.error('push_dispatch_pending',{code:error.code||error.name});return {pending:true};}}
