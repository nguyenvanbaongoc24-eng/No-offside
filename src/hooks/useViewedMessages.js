import {useEffect,useRef} from 'react';

// A boundary is acknowledged only after a rendered message has occupied the
// visible, focused chat viewport. Cached/optimistic messages have no boundary.
export function highestVisibleMessage(list, viewportHeight = window.innerHeight) {
  const root = list.getBoundingClientRect();
  let result = null;
  for (const node of list.querySelectorAll('[data-message-sequence]')) {
    const rect = node.getBoundingClientRect();
    const seen = Math.min(rect.bottom,root.bottom,viewportHeight)-Math.max(rect.top,root.top,0);
    if (rect.height <= 0 || seen < Math.min(rect.height * 0.6, 48)) continue;
    const sequence = node.dataset.messageSequence;
    if (!/^\d+$/.test(sequence || '')) continue;
    if (!result || BigInt(sequence)>BigInt(result.sequence)) result={id:node.dataset.messageId,sequence};
  }
  return result;
}

export function useViewedMessages({stream,teamId,messages,ready,onMarkViewed,onPresence}) {
  const callbacks=useRef({onMarkViewed,onPresence}); callbacks.current={onMarkViewed,onPresence};
  const acknowledged=useRef('0');
  useEffect(()=>{
    const list=stream.current;
    if(!ready || !list) return;
    let disposed=false,timer,inFlight=false,lastPresence;
    const focused=()=>document.visibilityState==='visible' && document.hasFocus();
    const inspect=()=>{
      clearTimeout(timer);
      if(!focused())return;
      timer=setTimeout(async()=>{
        if(disposed || !focused() || inFlight)return;
        const viewed=highestVisibleMessage(list);
        if(!viewed || BigInt(viewed.sequence)<=BigInt(acknowledged.current))return;
        inFlight=true;
        try { await callbacks.current.onMarkViewed?.(teamId,viewed.id); if(!disposed)acknowledged.current=viewed.sequence; }
        catch { /* The next focus/heartbeat retries; never clear the badge locally. */ }
        finally { inFlight=false; }
      },220);
    };
    const presence=(force=false)=>{
      const atEnd=list.scrollHeight-list.scrollTop-list.clientHeight<64;
      const visible=focused()&&atEnd;
      if(force===true || visible!==lastPresence){lastPresence=visible;callbacks.current.onPresence?.(teamId,visible).catch(()=>{});}
      inspect();
    };
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(inspect,{root:list,threshold:[0,0.6,1]});
    for(const node of list.querySelectorAll('[data-message-sequence]'))observer?.observe(node);
    list.addEventListener('scroll',presence,{passive:true});
    window.addEventListener('focus',presence);window.addEventListener('blur',presence);document.addEventListener('visibilitychange',presence);
    const heartbeat=setInterval(()=>presence(true),15000);presence();
    return ()=>{disposed=true;clearTimeout(timer);clearInterval(heartbeat);observer?.disconnect();list.removeEventListener('scroll',presence);window.removeEventListener('focus',presence);window.removeEventListener('blur',presence);document.removeEventListener('visibilitychange',presence);callbacks.current.onPresence?.(teamId,false).catch(()=>{});};
  },[stream,teamId,messages,ready]);
}
