import {beginPendingWrite} from '../lib/pendingWrites';
import Pressable from './Pressable';
import {notify} from '../lib/feedback';
import React,{useEffect,useState,useRef} from 'react';
import {Bell,BellOff} from "./icons";
import {serverRequest} from '../lib/serverRequest';
import {platformPushState,notificationRequest,deviceBody,vapidBytes,disconnectPushDevice,workerContext} from '../lib/pushDevice';
async function pushRegistration(){
 const current=await navigator.serviceWorker.getRegistration();
 if(current?.active)return current;
 let timeout;try{return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Service worker chưa sẵn sàng. Hãy cập nhật ứng dụng rồi thử lại.')),8000);})]);}finally{clearTimeout(timeout);}
}
const DEFAULT={messages:true,matches:false,funds:false,governance:false};
export default function NotificationSettings({token,accountId,demo=false}){
 const currentToken=useRef(token);currentToken.current=token;const saveLock=useRef(false),settingsEpoch=useRef(0);
 const [accountEnabled,setAccountEnabled]=useState(true),[preferencesReady,setPreferencesReady]=useState(false);
 const [platform,setPlatform]=useState(()=>typeof navigator==='undefined'?'unsupported':platformPushState()),[enabled,setEnabled]=useState(false),[linked,setLinked]=useState(false),[groups,setGroups]=useState(DEFAULT),[hidePreview,setHidePreview]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[config,setConfig]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;++settingsEpoch.current;saveLock.current=false;setBusy(false);setError('');setLoading(true);setPreferencesReady(false);if(demo){setLoading(false);return;}const updatePlatform=()=>setPlatform(platformPushState());window.addEventListener('focus',updatePlatform);(async()=>{try{const result=await serverRequest('/api/notifications?config=1');if(!live)return;setConfig(result.data);if(token){const saved=await notificationRequest(token,{action:'settings'});if(!live)return;if(!saved?.success || !saved.preferences)throw Error('Chưa tải được cài đặt tài khoản. Hãy mở lại mục Thông báo.');setAccountEnabled(saved.preferences.enabled!==false);setGroups(saved.preferences.groups||DEFAULT);setHidePreview(saved.preferences.hidePreview!==false);setPreferencesReady(true);const state=await notificationRequest(token,{action:'state',...deviceBody()});const sub=await (await navigator.serviceWorker?.getRegistration())?.pushManager?.getSubscription();if(live){setLinked(state.enabled===true);setEnabled(Boolean(state.enabled&&sub&&typeof Notification!=='undefined'&&Notification.permission==='granted'));}}}catch(e){if(live)setError(e.message);}finally{if(live)setLoading(false);}})();return()=>{live=false;++settingsEpoch.current;window.removeEventListener('focus',updatePlatform);};},[token,demo]);
 const save=async(subscription,nextGroups=groups,nextHide=hidePreview)=>{const result=await notificationRequest(token,{action:'subscribe',...deviceBody(),subscription:subscription.toJSON(),groups:nextGroups,hidePreview:nextHide});if(accountId)await workerContext(accountId);return result;};
 const enable=async()=>{
  setBusy(true);setError('');try{
   // The permission request stays in the direct click handler, before any await.
   const permission=await Notification.requestPermission();if(permission!=='granted'){setPlatform(permission==='denied'?'blocked':'supported');return;}
   const reg=await pushRegistration();const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(config.publicKey)});
   await save(subscription);setLinked(true);setEnabled(true);notify('Đã bật thông báo trên thiết bị này');
  }catch(e){setError(e.message||'Không bật được thông báo.');notify(e.message||'Không bật được thông báo.','error');}finally{setBusy(false);}
 };
 const updatePreferences=async(patch)=>{
  if(saveLock.current || !preferencesReady)return;saveLock.current=true;setBusy(true);setError('');const ownerToken=token,epoch=settingsEpoch.current,finish=beginPendingWrite();
  try{const result=await notificationRequest(token,{action:'settings',preferences:patch});if(currentToken.current!==ownerToken || settingsEpoch.current!==epoch)return;if(!result?.success || !result.preferences)throw Error('Chưa lưu được cài đặt.');setGroups(result.preferences.groups);setHidePreview(result.preferences.hidePreview);setAccountEnabled(result.preferences.enabled);notify('Đã lưu cài đặt thông báo');}
  catch(e){if(currentToken.current===ownerToken && settingsEpoch.current===epoch){setError(e.message);notify(e.message||'Có lỗi xảy ra, thử lại sau','error');}}
  finally{finish();if(settingsEpoch.current===epoch){saveLock.current=false;if(currentToken.current===ownerToken)setBusy(false);}}
 };
 return <section className="settings-card m-4 notification-settings" aria-label="Cài đặt thông báo">
  <h2 className="flex gap-2 items-center"><Bell size={20}/>Thông báo</h2>
  <p className="field-hint">Số tin chưa đọc trong app luôn hoạt động khi đăng nhập, kể cả khi không bật thông báo đẩy. Số trên icon ứng dụng là tổng tin chưa đọc của tất cả đội đang hoạt động.</p>
  <p className="font-semibold mt-4" role="status">{loading?'Đang kiểm tra…':platform==='install'?'Chưa hỗ trợ trong tab trình duyệt này':platform==='unsupported'?'Không hỗ trợ':platform==='blocked'?'Bị chặn':enabled?'Đã bật trên thiết bị này':'Chưa bật'}</p>
  {platform==='install'&&<p className="field-hint">Trên iPhone/iPad: dùng Chia sẻ → Thêm vào Màn hình chính, rồi mở No Offside từ icon để bật thông báo. Cần iOS/iPadOS 16.4 trở lên hỗ trợ thông báo đẩy.</p>}
  {platform==='unsupported'&&<p className="field-hint">Trình duyệt này chưa cung cấp Web Push. Bạn vẫn xem số chưa đọc và thông báo trong app.</p>}
  {platform==='blocked'&&<p className="field-hint">Thông báo đã bị từ chối. Hãy mở cài đặt thông báo của trình duyệt hoặc ứng dụng để cấp lại quyền.</p>}
  {config&&!config.configured&&<p className="field-hint">Thông báo đẩy chưa sẵn sàng trên máy chủ. Số chưa đọc trong app vẫn hoạt động.</p>}
  {demo&&<p className="field-hint">Bản trải nghiệm không đăng ký push hoặc gửi thông báo thật.</p>}
  {!enabled&&platform==='supported'&&<Pressable className="primary-button mt-4" disabled={busy||loading||!token||demo||!config?.configured} onClick={enable}>Bật thông báo</Pressable>}
  {(linked||enabled)&&<Pressable className="choice-button mt-4" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await disconnectPushDevice();setEnabled(false);setLinked(false);notify('Đã tắt thông báo trên thiết bị này');}catch(e){setError(e.message);notify(e.message,'error');}finally{setBusy(false);}}}><BellOff size={18}/>Tắt trên thiết bị này</Pressable>}
  <fieldset disabled={busy||loading||demo||!preferencesReady} className="account-notification-preferences"><legend className="font-semibold mt-4">Thông báo tài khoản · đồng bộ các thiết bị</legend>
   <label className="notification-option"><input type="checkbox" checked={accountEnabled} onChange={e=>updatePreferences({enabled:e.target.checked})}/>Cho phép thông báo của tài khoản</label>
   <label className="notification-option"><input type="checkbox" checked={hidePreview} onChange={e=>updatePreferences({hidePreview:e.target.checked})}/>Ẩn nội dung trên màn hình khóa</label>
   {Object.entries({messages:'Tin nhắn mới',matches:'Lịch thi đấu mới hoặc cập nhật',funds:'Quỹ và đối soát',governance:'Nội quy và quản trị'}).map(([id,label])=><label className="notification-option" key={id}><input type="checkbox" checked={groups[id]===true} onChange={e=>updatePreferences({groups:{[id]:e.target.checked}})}/>{label}</label>)}
  </fieldset>
  <p className="field-hint">Các lựa chọn trên được lưu vào tài khoản. Mỗi thiết bị vẫn cần được bạn cấp quyền thông báo riêng; đăng nhập trên thiết bị mới không tự bật quyền của trình duyệt.</p>
  {error&&<p role="alert" className="form-error mt-3">{error}</p>}
 </section>;
}
