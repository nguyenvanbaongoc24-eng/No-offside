import {useEffect,useRef} from 'react';
// A local sheet gets its own same-screen entry, so Back closes it first.
export function useLayerBack(open,onClose){
 const close=useRef(onClose);close.current=onClose;const entry=useRef(null);
 useEffect(()=>{
  if(open){entry.current=crypto.randomUUID();window.history?.pushState({...window.history.state,noOffsideLayer:entry.current},'');}
  else if(entry.current && window.history?.state?.noOffsideLayer===entry.current){entry.current=null;window.history.back();}
 },[open]);
 useEffect(()=>{const pop=e=>{if(entry.current && e.state?.noOffsideLayer!==entry.current){entry.current=null;close.current();}};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
}
