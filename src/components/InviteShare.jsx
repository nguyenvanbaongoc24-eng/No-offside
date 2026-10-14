import React,{useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion} from 'framer-motion';
import {QRCodeSVG} from 'qrcode.react';
import {X,Copy,Share2,ExternalLink,RotateCw,Ban,Loader2} from 'lucide-react';
import Avatar from './Avatar';

export default function InviteShare({isOpen=true,onClose,teamName='',teamLogo='',teamCode='',clubCode,inviteStatus='active',loading=false,error='',onRetry,isLeader=false,currentUserRole,onRegenerateCode,onCreateInvite,onRevokeCode,onRevokeInvite,onPreviewLanding}) {
  const [notice,setNotice]=useState(''),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false),[confirmRevoke,setConfirmRevoke]=useState(false);
  const lock=useRef(false),alive=useRef(true);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const code=clubCode || teamCode || '';
  const active=Boolean(code) && inviteStatus==='active' && !error;
  const canAnimate=typeof document!=='undefined' && typeof document.createElement==='function';
  const Overlay=canAnimate ? motion.div : 'div', Sheet=canAnimate ? motion.section : 'section';
  const leader=isLeader || ['owner','admin'].includes(currentUserRole);
  const create=onRegenerateCode || onCreateInvite, revoke=onRevokeCode || onRevokeInvite;
  const url=code ? `${typeof window==='undefined' ? '' : window.location.origin}/invite/${encodeURIComponent(code)}` : '';
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  useEffect(()=>{
    if(!isOpen || !closeRef.current || !window.history?.pushState)return;
    const marker=`invite-${Date.now()}`;let popped=false;
    window.history.pushState({...window.history.state,noOffsideInvite:marker},'',window.location.href);
    const back=()=>{popped=true;closeRef.current?.();};
    window.addEventListener('popstate',back);
    return ()=>{window.removeEventListener('popstate',back);if(!popped && window.history.state?.noOffsideInvite===marker)window.history.back();};
  },[isOpen]);
  useEffect(()=>{setNotice('');setFailure('');setConfirmRevoke(false);},[code,isOpen]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2200);return ()=>clearTimeout(timer);},[notice]);
  const run=async(action)=>{
    if(lock.current || loading)return;
    lock.current=true;setBusy(true);setFailure('');setNotice('');
    try{await action();}catch(err){if(alive.current)setFailure(err.message || 'Không thực hiện được. Vui lòng thử lại.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  };
  const copy=async(value,label)=>{
    if(!navigator.clipboard?.writeText)throw Error('Trình duyệt chưa hỗ trợ sao chép. Chọn mã hoặc liên kết bên dưới để sao chép thủ công.');
    try{await navigator.clipboard.writeText(value);}catch{throw Error('Không sao chép được. Chọn mã hoặc liên kết để sao chép thủ công.');}
    if(alive.current)setNotice(label);
  };
  const share=async()=>{
    if(!navigator.share){await copy(url,'Đã sao chép liên kết để chia sẻ.');return;}
    try{await navigator.share({title:`Gia nhập ${teamName} trên No Offside`,text:`Mã Club: ${code}`,url});}
    catch(err){if(err.name!=='AbortError')await copy(url,'Không mở được chia sẻ. Đã sao chép liên kết.');}
  };
  return <AnimatePresence>{isOpen && <Overlay key="invite" role="dialog" aria-modal="true" aria-label="Mời thành viên" className="invite-share-overlay" {...(canAnimate ? {initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2}} : {})}>
    <Sheet className="invite-share-sheet" {...(canAnimate ? {initial:{y:20,opacity:0},animate:{y:0,opacity:1},exit:{y:20,opacity:0},transition:{duration:.26,ease:[.22,.61,.36,1]}} : {})}>
      <header className="invite-share-heading"><Avatar src={teamLogo} name={teamName} className="team-logo-avatar"/><div><h2>Mời thành viên</h2><p>{teamName || 'Đội đang chọn'}</p></div>{onClose && <button type="button" aria-label="Đóng" onClick={onClose}><X size={20}/></button>}</header>
      {loading ? <p role="status" className="invite-feedback"><Loader2 className="animate-spin" size={20}/>Đang tải mã mời…</p> : null}
      {(error || failure) && <p role="alert" className="form-error">{failure || error}</p>}
      {error && onRetry && !loading && <button type="button" className="choice-button" disabled={busy} onClick={()=>run(onRetry)}>Thử lại</button>}
      {!loading && !code && <div className="invite-feedback"><p>Chưa có mã mời khả dụng cho đội này.</p>{onRetry && !error && <button type="button" className="primary-button" disabled={busy} onClick={()=>run(onRetry)}>Thử lại</button>}</div>}
      {!loading && code && <>
        <p className="field-hint">{active ? 'Đang hoạt động' : error ? 'Chưa xác minh được mã mời.' : 'Mã đã thu hồi — không dùng để gia nhập.'}</p>
        {active && <div className="invite-qr"><QRCodeSVG value={url} size={180} level="M" includeMargin fgColor="#14201A" bgColor="#FFFFFF"/><span>Quét để gia nhập {teamName}</span></div>}
        <div className="invite-copy-row"><div><span className="field-hint">Mã Club</span><p className="invite-code">{code}</p></div><button type="button" disabled={!active || busy} aria-label="Sao chép mã Club" onClick={()=>run(()=>copy(code,'Đã sao chép mã Club.'))}><Copy size={18}/>Sao chép</button></div>
        <div className="invite-copy-row"><div><span className="field-hint">Liên kết mời</span><p className="invite-url">{url}</p></div><button type="button" disabled={!active || busy} aria-label="Sao chép liên kết mời" onClick={()=>run(()=>copy(url,'Đã sao chép liên kết.'))}><Copy size={18}/></button></div>
        <button type="button" className="primary-button invite-share-action" disabled={!active || busy} onClick={()=>run(share)}><Share2 size={18}/>Chia sẻ lời mời</button>
        {onPreviewLanding && active && <button type="button" className="choice-button invite-share-action" onClick={onPreviewLanding}><ExternalLink size={18}/>Xem trang gia nhập</button>}
        {leader && <div className="invite-admin-actions">
          {create && <button type="button" className="choice-button" disabled={busy} onClick={()=>{if(window.confirm('Tạo mã mới sẽ vô hiệu hóa mã Club và QR hiện tại. Tiếp tục?'))run(create);}}><RotateCw size={18}/>Tạo mã mới</button>}
          {revoke && active && <button type="button" className="danger-button" disabled={busy} onClick={()=>confirmRevoke ? run(async()=>{await revoke();if(alive.current)setConfirmRevoke(false);}) : setConfirmRevoke(true)}><Ban size={18}/>{confirmRevoke ? 'Xác nhận thu hồi' : 'Thu hồi'}</button>}
          {confirmRevoke && <button type="button" disabled={busy} className="choice-button" onClick={()=>setConfirmRevoke(false)}>Hủy</button>}
        </div>}
      </>}
      {busy && <p role="status" className="field-hint">Đang xử lý…</p>}
      {notice && <p role="status" className="invite-notice">{notice}</p>}
    </Sheet>
  </Overlay>}</AnimatePresence>;
}
