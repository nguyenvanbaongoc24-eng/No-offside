import {useCallback,useEffect,useRef,useState} from 'react';
import {serverRequest} from '../lib/serverRequest';
import {supabase} from '../lib/supabase';
import {watchTeamUpdates} from '../lib/teamUpdates';
import {withPendingWrite} from '../lib/pendingWrites';
export const emptyMatchmaking={offers:[],proposals:[],terms:[],confirmations:[],messages:[],links:[],reports:[],assets:[],history:[],entitlement:{enabled:false,features:[]},canManage:false};
export function useMatchmaking({teamId,accountId,token,demo=false}){
 const scope=[teamId||'public',accountId||'guest',demo].join(':'),active=useRef(scope);active.current=scope;
 const [bundle,setBundle]=useState({scope,data:emptyMatchmaking,loading:true,error:''}),[busy,setBusy]=useState(false);
 const seq=useRef(0),lock=useRef(null),retry=useRef(null);
 const request=useCallback(async(action='state',payload={},key=null)=>{
  if(demo)throw Error('Bản trải nghiệm không đăng tin công khai. Đăng nhập để đại diện đội.');
  const publicOnly=!teamId||!token;
  if(publicOnly&&action!=='state')throw Error('Tạo hoặc gia nhập đội để thực hiện thao tác này.');
  const {response,data}=await serverRequest(publicOnly?'/api/sync?public=matchmaking':'/api/sync',publicOnly?{}:{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'matchmaking',teamId,matchmakingAction:action,payload,requestKey:key})});
  if(!response.ok||!data.success)throw Object.assign(Error(data.error||'Không tải được Tìm đối.'),{status:response.status});return data;
 },[teamId,token,demo]);
 const refresh=useCallback(async()=>{const n=++seq.current;try{const data=await request();if(active.current===scope&&n===seq.current)setBundle({scope,data:{...emptyMatchmaking,...data},loading:false,error:''});}catch(e){if(active.current===scope&&n===seq.current)setBundle(old=>({scope,data:![401,403].includes(e.status)&&old.scope===scope?old.data:emptyMatchmaking,loading:false,error:e.message}));}},[scope,request]);
 useEffect(()=>{active.current=scope;setBundle({scope,data:emptyMatchmaking,loading:true,error:''});refresh();const stop=watchTeamUpdates(supabase,'mm:'+scope,teamId||'mm-public',refresh);return()=>{++seq.current;if(active.current===scope)active.current=null;stop();};},[scope,teamId,refresh]);
 const mutate=async(action,payload={})=>{
  if(lock.current===scope)throw Error('Thao tác trước đang xử lý.');
  lock.current=scope;setBusy(true);++seq.current;
  const signature=JSON.stringify([scope,action,payload]);if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
  try{const result=await withPendingWrite(()=>request(action,payload,retry.current.key));if(active.current===scope){retry.current=null;await refresh();}return result;}
  catch(e){if(active.current===scope&&[401,403].includes(e.status))setBundle({scope,data:emptyMatchmaking,loading:false,error:e.message});throw e;}
  finally{if(lock.current===scope){lock.current=null;if(active.current===scope)setBusy(false);}}
 };
 return {...(bundle.scope===scope?bundle:{data:emptyMatchmaking,loading:true,error:''}),busy:busy&&lock.current===scope,refresh,mutate};
}
