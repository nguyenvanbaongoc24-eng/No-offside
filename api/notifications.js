import {getUserClient,getAuthUser,bearerToken,apiError,setCorsHeaders} from './_storageHelper.js';
import {pushConfigured,validSubscription,isWorker,dispatchPush,dispatchAfterCommit} from './_push.js';
export default async function handler(req,res){
 setCorsHeaders(res);
 res.setHeader('Cache-Control','private, no-store');
 if(req.method==='OPTIONS')return res.status(200).end();
 try{
  const params=new URL(req.url,'https://no-offside.vercel.app').searchParams;
  if(params.get('worker')==='1'){
   if(!isWorker(req))return res.status(401).json({error:'Worker authorization required'});
   return res.status(200).json({success:true,...await dispatchPush({limit:20})});
  }
  if(req.method==='GET'&&params.get('config')==='1')return res.status(200).json({configured:pushConfigured(),publicKey:pushConfigured()?process.env.VAPID_PUBLIC_KEY:null});
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{return res.status(400).json({error:'Invalid JSON'});}
  if(!body || typeof body!=='object' || Array.isArray(body))return res.status(400).json({error:'Invalid body'});
  if(!bearerToken(req)&&!(req.method==='POST'&&body.action==='detach'))return res.status(401).json({error:'Vui lòng đăng nhập lại.'});
  const client=getUserClient(req);
  if(req.method==='POST'&&['detach','presence','state','subscribe'].includes(body.action)&&!(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(body.installationId||'')))return res.status(400).json({error:'Invalid installation'});
  if(req.method==='POST'&&body.action==='detach'){
   if(!/^[a-f\d-]{36}$/i.test(body.installationId||'')||typeof body.installationSecret!=='string'||(body.installationSecret.length<43||body.installationSecret.length>128))return res.status(400).json({error:'Invalid installation'});
   const result=await client.rpc('no_push_detach',{p_id:body.installationId,p_secret:body.installationSecret});if(result.error)throw result.error;return res.status(200).json(result.data);
  }
  if(!bearerToken(req)||!await getAuthUser(req,client))return res.status(401).json({error:'Vui lòng đăng nhập lại.'});
  let result;
  if(req.method==='GET'){result=await client.rpc('no_chat_unread');if(!result.error)await dispatchAfterCommit();}
  else if(req.method==='POST'){
   switch(body.action){
    case 'settings':result=await client.rpc('no_notification_settings',{p_patch:body.preferences ?? null});break;
    case 'read':result=await client.rpc('no_chat_mark_read',{p_team_id:body.teamId,p_message_id:body.messageId});break;
    case 'presence':result=await client.rpc('no_chat_presence_update',{p_id:body.installationId,p_team_id:body.teamId,p_visible:body.visible===true});break;
    case 'state':result=await client.rpc('no_push_device_state',{p_id:body.installationId,p_secret:body.installationSecret});break;
    case 'subscribe':
     if(!pushConfigured())return res.status(503).json({error:'Máy chủ chưa cấu hình Web Push; badge trong app vẫn hoạt động.'});
     if(!validSubscription(body.subscription)||typeof body.installationSecret!=='string'||(body.installationSecret.length<43||body.installationSecret.length>128))return res.status(400).json({error:'Subscription không hợp lệ hoặc trình duyệt chưa được hỗ trợ.'});
     result=await client.rpc('no_push_register',{p_id:body.installationId,p_secret:body.installationSecret,p_subscription:body.subscription,p_groups:body.groups||{},p_hide_preview:body.hidePreview!==false});break;
    default:return res.status(400).json({error:'Invalid notification action'});
   }
  }else return res.status(405).json({error:'Method not allowed'});
  if(result.error)throw result.error;return res.status(200).json(result.data);
 }catch(error){return apiError(res,error);}
}
