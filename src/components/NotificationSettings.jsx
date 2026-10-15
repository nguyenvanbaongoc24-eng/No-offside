import React,{useEffect,useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {serverRequest} from '../lib/serverRequest';
import {platformPushState,notificationRequest,deviceBody,vapidBytes,disconnectPushDevice,workerContext} from '../lib/pushDevice';
async function pushRegistration(){
 const current=await navigator.serviceWorker.getRegistration();
 if(current?.active)return current;
 let timeout;try{return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Service worker chưa sẵn sàng. Hãy cập nhật ứng dụng rồi thử lại.')),8000);})]);}finally{clearTimeout(timeout);}
}
const DEFAULT={messages:true,matches:false,funds:false,governance:false};
export default function NotificationSettings({token,accountId,demo=false}){
 const [platform,setPlatform]=useState(()=>typeof navigator==='undefined'?'unsupported':platformPushState()),[enabled,setEnabled]=useState(false),[linked,setLinked]=useState(false),[groups,setGroups]=useState(DEFAULT),[hidePreview,setHidePreview]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[config,setConfig]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;if(demo){setLoading(false);return;}const updatePlatform=()=>setPlatform(platformPushState());window.addEventListener('focus',updatePlatform);(async()=>{try{const result=await serverRequest('/api/notifications?config=1');if(!live)return;setConfig(result.data);if(token){const state=await notificationRequest(token,{action:'state',...deviceBody()});const sub=await (await navigator.serviceWorker?.getRegistration())?.pushManager?.getSubscription();if(live){setLinked(state.enabled===true);setEnabled(Boolean(state.enabled&&sub&&typeof Notification!=='undefined'&&Notification.permission==='granted'));setGroups(state.groups||DEFAULT);setHidePreview(state.hidePreview!==false);}}}catch(e){if(live)setError(e.message);}finally{if(live)setLoading(false);}})();return()=>{live=false;window.removeEventListener('focus',updatePlatform);};},[token,demo]);
 const save=async(subscription,nextGroups=groups,nextHide=hidePreview)=>{const result=await notificationRequest(token,{action:'subscribe',...deviceBody(),subscription:subscription.toJSON(),groups:nextGroups,hidePreview:nextHide});if(accountId)await workerContext(accountId);return result;};
 const enable=async()=>{
  setBusy(true);setError('');try{
   // The permission request stays in the direct click handler, before any await.
   const permission=await Notification.requestPermission();if(permission!=='granted'){setPlatform(permission==='denied'?'blocked':'supported');return;}
   const reg=await pushRegistration();const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(config.publicKey)});
   await save(subscription);setLinked(true);setEnabled(true);
  }catch(e){setError(e.message||'Không bật được thông báo.');}finally{setBusy(false);}
 };
 const update=async(nextGroups,nextHide)=>{setBusy(true);setError('');try{const sub=await (await pushRegistration()).pushManager.getSubscription();if(!sub)throw Error('Thiết bị chưa đăng ký thông báo. Hãy bật lại thông báo.');await save(sub,nextGroups,nextHide);setGroups(nextGroups);setHidePreview(nextHide);}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <section className="settings-card m-4 notification-settings" aria-label="Cài đặt thông báo">
  <h2 className="flex gap-2 items-center"><Bell size={20}/>Thông báo</h2>
  <p className="field-hint">Số tin chưa đọc trong app luôn hoạt động khi đăng nhập, kể cả khi không bật thông báo đẩy. Số trên icon ứng dụng là tổng tin chưa đọc của tất cả đội đang hoạt động.</p>
  <p className="font-semibold mt-4" role="status">{loading?'Đang kiểm tra…':platform==='install'?'Chưa hỗ trợ trong tab trình duyệt này':platform==='unsupported'?'Không hỗ trợ':platform==='blocked'?'Bị chặn':enabled?'Đã bật trên thiết bị này':'Chưa bật'}</p>
  {platform==='install'&&<p className="field-hint">Trên iPhone/iPad: dùng Chia sẻ → Thêm vào Màn hình chính, rồi mở No Offside từ icon để bật thông báo. Cần iOS/iPadOS 16.4 trở lên hỗ trợ thông báo đẩy.</p>}
  {platform==='unsupported'&&<p className="field-hint">Trình duyệt này chưa cung cấp Web Push. Bạn vẫn xem số chưa đọc và thông báo trong app.</p>}
  {platform==='blocked'&&<p className="field-hint">Thông báo đã bị từ chối. Hãy mở cài đặt thông báo của trình duyệt hoặc ứng dụng để cấp lại quyền.</p>}
  {config&&!config.configured&&<p className="field-hint">Thông báo đẩy chưa sẵn sàng trên máy chủ. Số chưa đọc trong app vẫn hoạt động.</p>}
  {demo&&<p className="field-hint">Bản trải nghiệm không đăng ký push hoặc gửi thông báo thật.</p>}
  {!enabled&&platform==='supported'&&<button className="primary-button mt-4" disabled={busy||loading||!token||demo||!config?.configured} onClick={enable}>Bật thông báo</button>}
  {(linked||enabled)&&<button className="choice-button mt-4" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await disconnectPushDevice();setEnabled(false);setLinked(false);}catch(e){setError(e.message);}finally{setBusy(false);}}}><BellOff size={18}/>Tắt trên thiết bị này</button>}
  {enabled&&<>
   <label className="notification-option"><input type="checkbox" checked={hidePreview} disabled={busy} onChange={e=>update(groups,e.target.checked)}/>Ẩn nội dung trên màn hình khóa</label>
   <fieldset><legend className="font-semibold mt-4">Nhóm thông báo trên thiết bị này</legend>{Object.entries({messages:'Tin nhắn mới',matches:'Lịch thi đấu mới hoặc cập nhật',funds:'Quỹ và đối soát',governance:'Nội quy và quản trị'}).map(([id,label])=><label className="notification-option" key={id}><input type="checkbox" checked={groups[id]===true} disabled={busy} onChange={e=>update({...groups,[id]:e.target.checked},hidePreview)}/>{label}</label>)}</fieldset>
   <p className="field-hint">Nhắc điểm danh tự động chưa có lịch gửi riêng. Các nhóm ngoài tin nhắn chỉ gửi khi tính năng hiện có tạo sự kiện phù hợp; không mặc định bật tất cả.</p>
  </>}
  {error&&<p role="alert" className="form-error mt-3">{error}</p>}
 </section>;
}
