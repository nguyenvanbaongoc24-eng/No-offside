import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion';
import {X,Bell,ChevronRight} from 'lucide-react';
import {latestAnnouncements} from '../lib/announcements';
import BirthdayBanner from './BirthdayBanner';
import Pressable from './Pressable';
export default function WelcomeAnnouncementModal({accountId='anonymous',notices=[],birthdays=[],onOpenNotice}){
  const key=`no_offside_welcome_hidden_${accountId}`;
  const [open,setOpen]=useState(()=>{try{return sessionStorage.getItem(key)!=='true';}catch{return true;}});
  const [hide,setHide]=useState(false),preference=useRef(false),reduced=useReducedMotion();
  const close=()=>{if(preference.current){try{sessionStorage.setItem(key,'true');}catch{}}setOpen(false);};
  const closeRef=useRef(close);closeRef.current=close;
  useEffect(()=>{if(!open)return;const timer=setTimeout(()=>closeRef.current(),5000);return()=>clearTimeout(timer);},[open]);
  if(typeof document==='undefined')return null;
  const latest=latestAnnouncements(notices);
  return createPortal(<AnimatePresence>{open && <motion.div className="welcome-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:0.2}} onClick={close}>
    <motion.section role="dialog" aria-modal="true" aria-label="Chào mừng trở lại" className="welcome-card" initial={reduced?{opacity:0}:{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}} transition={{duration:reduced?0:0.2}} onClick={e=>e.stopPropagation()}>
      <header><span className="welcome-icon"><Bell size={22}/></span><Pressable type="button" aria-label="Đóng" onClick={close}><X size={21}/></Pressable></header>
      <p className="welcome-eyebrow">HẸN NHAU RA SÂN</p><h2>Chào mừng trở lại</h2><p className="field-hint">Thông tin mới nhất từ đội của bạn.</p>
      <BirthdayBanner members={birthdays} accountId={accountId} celebrate/>
      <div className="welcome-notices">{latest.length?latest.map((notice,index)=><Pressable type="button" key={notice.id||index} className="welcome-notice" onClick={()=>{close();onOpenNotice?.(notice);}}><span><strong>{notice.title||'Thông báo đội'}</strong><span>{notice.content}</span></span><ChevronRight size={18}/></Pressable>):<p className="welcome-empty">Chưa có thông báo mới. Cùng chuẩn bị cho buổi ra sân tiếp theo.</p>}</div>
      <label className="welcome-preference"><input type="checkbox" checked={hide} onChange={event=>{preference.current=event.target.checked;setHide(event.target.checked);}}/>Không hiển thị lại trong phiên này</label><p className="welcome-auto-close">Tự đóng sau 5 giây</p>
    </motion.section>
  </motion.div>}</AnimatePresence>,document.body);
}
