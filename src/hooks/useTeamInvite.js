import {useEffect, useRef, useState} from 'react';
// Presentation state only. Creation/revocation still uses the existing guarded callbacks.
export function useTeamInvite(team, role, create, revoke, read) {
  const scope = team?.id || '';
  const [state,setState]=useState({scope,code:team?.inviteCode || '',status:team?.inviteStatus || 'active',loading:false,error:''});
  const latest=useRef(scope), pending=useRef(null), mounted=useRef(true), timers=useRef(new Set());
  latest.current=scope;
  useEffect(()=>{mounted.current=true; return ()=>{mounted.current=false;timers.current.forEach(clearTimeout);timers.current.clear();};},[]);
  useEffect(()=>{pending.current=null;setState({scope,code:team?.inviteCode || '',status:team?.inviteStatus || 'active',loading:false,error:''});},[scope]);
  const current=state.scope===scope ? state : {scope,code:team?.inviteCode || '',status:team?.inviteStatus || 'active',loading:false,error:''};
  const update=patch=>{if(mounted.current && latest.current===scope)setState(prev=>({...prev,...patch,scope}));};
  const wait=async(request)=>{
    let timer;
    try {return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Server chưa phản hồi. Bạn có thể đóng bảng và thử lại sau.')),15000);timers.current.add(timer);})]);}
    finally {clearTimeout(timer);timers.current.delete(timer);}
  };
  const load=async(force=false)=>{
    if(pending.current?.scope===scope)return pending.current.promise;
    const action=(async()=>{
      try {
        if(!scope)throw Error('Chưa chọn đội.');
        if(!force && current.code){
          if(!read){update({error:''});return {code:current.code,status:current.status};}
          update({loading:true,error:''});
          const result=await wait(read(current.code,scope));
          if(!mounted.current || latest.current!==scope)throw Error('Đội đang chọn đã thay đổi.');
          if(!result?.valid || result.teamId!==scope){update({status:'revoked'});throw Error('Mã mời không còn hợp lệ cho đội này. Hãy tạo mã mới.');}
          update({code:result.code,status:'active'});return result;
        }
        if(!['owner','admin'].includes(role))throw Error('Chỉ chủ đội hoặc quản trị viên có quyền tạo lời mời.');
        if(!create)throw Error('Chức năng mời chưa sẵn sàng.');
        update({loading:true,error:''});
        const result=await wait(create(scope));
        if(!mounted.current || latest.current!==scope)throw Error('Đội đang chọn đã thay đổi.');
        if(!result?.code)throw Error('Server chưa trả mã mời. Vui lòng thử lại.');
        if(result.teamId && result.teamId!==scope)throw Error('Mã mời trả về không thuộc đội đang chọn.');
        update({code:result.code,status:result.status || 'active'});
        return result;
      } catch(error){update({error:error.message || 'Không tải được lời mời.'});throw error;}
      finally{update({loading:false});}
    })();
    pending.current={scope,promise:action};
    try{return await action;}finally{if(pending.current?.promise===action)pending.current=null;}
  };
  const revokeCode=async()=>{if(!revoke)throw Error('Chức năng thu hồi chưa sẵn sàng.');const result=await wait(revoke(scope));if(result?.success===false)throw Error('Không thể thu hồi mã mời.');update({status:'revoked'});return result;};
  return {...current,load,revoke:revoke ? revokeCode : undefined};
}
