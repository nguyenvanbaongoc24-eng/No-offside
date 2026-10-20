import {useEffect,useRef} from 'react';
// A local sheet gets its own same-screen entry, so Back closes it first.
export function useLayerBack(open,onClose){
 const close=useRef(onClose);close.current=onClose;const entry=useRef(null),mounted=useRef(false);
 useEffect(()=>{
  if(open){
   if(!entry.current || window.history?.state?.noOffsideLayer!==entry.current){entry.current=crypto.randomUUID();window.history?.pushState({...window.history.state,noOffsideLayer:entry.current},'');}
  }
  else if(entry.current && window.history?.state?.noOffsideLayer===entry.current){entry.current=null;window.history.back();}
 },[open]);
 useEffect(()=>{
  mounted.current=true;const target=window;
  const pop=e=>{if(entry.current && e.state?.noOffsideLayer!==entry.current){entry.current=null;close.current();}};
  target.addEventListener('popstate',pop);
  return()=>{
   mounted.current=false;target.removeEventListener('popstate',pop);const owned=entry.current;
   // StrictMode replays effects before this microtask. A real unmount must retire
   // its history entry, while navigation to another route must stay untouched.
   queueMicrotask(()=>{if(!mounted.current && owned && target.history?.state?.noOffsideLayer===owned){entry.current=null;target.history.back();}});
  };
 },[]);
}
