import React, {useEffect, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {CheckCircle2, CircleAlert, X} from "./icons";
import Pressable from './Pressable';
export default function FeedbackToast() {
  const [toast, setToast] = useState(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const receive = event => setToast({...event.detail, id: Date.now()});
    window.addEventListener('no-offside-toast', receive);
    return () => window.removeEventListener('no-offside-toast', receive);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), toast.type === 'error' ? 6000 : 4000); return () => clearTimeout(timer); }, [toast]);
  const Icon = toast?.type === 'error' ? CircleAlert : CheckCircle2;
  return <div className="feedback-host"><AnimatePresence>{toast && <motion.div key={toast.id} className={'feedback-toast ' + (toast.type === 'error' ? 'is-error' : 'is-success')} role={toast.type === 'error' ? 'alert' : 'status'} initial={{opacity:0,y:reduced?0:-16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-12}} transition={{duration:reduced?0:0.2}}><Icon size={22} aria-hidden="true"/><p>{toast.message}</p><Pressable type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={18}/></Pressable></motion.div>}</AnimatePresence></div>;
}
