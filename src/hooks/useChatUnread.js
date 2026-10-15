import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {notificationRequest,deviceBody,synchronizePushAccount,reconcileAppBadge} from '../lib/pushDevice';
export function useChatUnread(accountId,token,ready=true){
 const [state,setState]=useState({accountId:null,teams:[],total:0,error:''});
 const scope=useRef(accountId);scope.current=accountId;
 const request=useRef(0);
 const presenceQueue=useRef(Promise.resolve());
 const apply=useCallback(result=>{if(scope.current!==accountId)return;setState(prev=>prev.accountId===accountId&&prev.observedAt>result.observedAt?prev:{accountId,...result,error:''});},[accountId]);
 const refresh=useCallback(async()=>{if(!token||accountId==='demo'||accountId==='anonymous')return;const seq=++request.current;try{const result=await notificationRequest(token);if(request.current===seq)apply(result);}catch(e){if(scope.current===accountId)setState(prev=>({...prev,accountId,teams:prev.accountId===accountId?prev.teams:[],total:prev.accountId===accountId?prev.total:0,error:e.message}));}},[accountId,token,apply]);
 useEffect(()=>{
  if(!ready)return;
  if(!token){setState({accountId,teams:[],total:0,error:''});synchronizePushAccount(null).catch(()=>{});reconcileAppBadge(null,0).catch(()=>{});return;}
  let live=true;synchronizePushAccount(accountId).catch(()=>{});refresh();
  const onFocus=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('focus',onFocus);window.addEventListener('online',onFocus);document.addEventListener('visibilitychange',onFocus);
  const timer=setInterval(onFocus,20000);
  const channel=supabase?.channel('unread:'+accountId).on('postgres_changes',{event:'INSERT',schema:'public',table:'no_team_messages'},()=>{if(live)refresh();}).on('postgres_changes',{event:'*',schema:'public',table:'no_chat_reads',filter:`user_id=eq.${accountId}`},()=>{if(live)refresh();}).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
  return ()=>{live=false;request.current++;clearInterval(timer);window.removeEventListener('focus',onFocus);window.removeEventListener('online',onFocus);document.removeEventListener('visibilitychange',onFocus);if(channel)supabase.removeChannel(channel);};
 },[accountId,token,refresh,ready]);
 const current=state.accountId===accountId?state:{teams:[],total:0,error:''};
 useEffect(()=>{if(!ready||!token||!current.observedAt)return;reconcileAppBadge(accountId,current.total,current.observedAt).catch(()=>{});},[accountId,token,ready,current.total,current.observedAt]);
 const markViewed=useCallback(async(teamId,messageId)=>{if(!token||document.visibilityState!=='visible'||!document.hasFocus())return;const result=await notificationRequest(token,{action:'read',teamId,messageId});apply(result);},[token,apply]);
 const presence=useCallback((teamId,visible)=>{if(!token)return Promise.resolve();const body={action:'presence',teamId,visible,...deviceBody()};const task=presenceQueue.current.catch(()=>{}).then(()=>notificationRequest(token,body));presenceQueue.current=task;return task;},[token]);
 return {...current,refresh,markViewed,presence,countFor:team=>current.teams.find(t=>t.teamId===team)?.unread||0};
}
