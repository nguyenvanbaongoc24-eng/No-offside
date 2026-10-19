import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {serverRequest} from '../lib/serverRequest';
import {withPendingWrite} from '../lib/pendingWrites';
import {watchTeamUpdates} from '../lib/teamUpdates';
export function useMatchDetails({teamId,matchId,accountId,token,onUpdated,demo}) {
 const scope=[teamId,matchId,accountId].join(':'),active=useRef(scope);active.current=scope;
 const [bundle,setBundle]=useState({scope,data:null,loading:true,error:''}),[busy,setBusy]=useState(false);
 const sequence=useRef(0),lock=useRef(null),retry=useRef(null),updated=useRef(onUpdated);updated.current=onUpdated;
 const request=useCallback(async(action,payload={},key=null)=>{
  if(demo)throw Error('Chi tiết nghiệp vụ cần tài khoản và máy chủ xác nhận; dữ liệu trải nghiệm không được ghi lên server.');
  if(!token||!matchId)throw Error('Chưa có phiên đăng nhập hoặc mã trận.');
  const {response,data}=await serverRequest('/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({teamId,matchId,action:'match',matchAction:action,payload,requestKey:key})});
  if(!response.ok||!data.success)throw Error(data.error||'Không tải/lưu được thông tin trận.');return data;
 },[teamId,matchId,token,demo]);
 const refresh=useCallback(async()=>{
  if(lock.current===scope)return;
  const n=++sequence.current;
  try{const data=await request('state');if(active.current===scope&&n===sequence.current)setBundle({scope,data,receivedAt:Date.now(),loading:false,error:''});}
  catch(e){if(active.current===scope&&n===sequence.current)setBundle(prev=>({scope,data:prev.scope===scope?prev.data:null,receivedAt:prev.receivedAt,loading:false,error:e.message}));}
 },[scope,request]);
 useEffect(()=>{setBundle(prev=>prev.scope===scope?{...prev,loading:!prev.data}:{scope,data:null,loading:true,error:''});refresh();const stop=watchTeamUpdates(supabase,'match:'+scope,teamId,refresh);return()=>{++sequence.current;stop();};},[scope,refresh,teamId]);
 const mutate=async(action,payload={})=>{
  if(lock.current===scope)throw Error('Thao tác trước đang xử lý.');
  lock.current=scope;setBusy(true);++sequence.current;
  const signature=JSON.stringify([scope,action,payload]);
  if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
  try{
   const data=await withPendingWrite(()=>request(action,payload,retry.current.key));
   if(active.current===scope){setBundle({scope,data,receivedAt:Date.now(),loading:false,error:''});retry.current=null;try{await updated.current?.();}catch{}}
   return data;
  }finally{if(lock.current===scope){lock.current=null;setBusy(false);}}
 };
 return {...(bundle.scope===scope?bundle:{data:null,loading:true,error:''}),busy,refresh,mutate};
}
