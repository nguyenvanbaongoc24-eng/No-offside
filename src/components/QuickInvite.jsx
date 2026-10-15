import React,{useEffect,useRef} from 'react';
import {useTeamInvite} from '../hooks/useTeamInvite';
import InviteShare from './InviteShare';
export default function QuickInvite({team,role,onClose,onCreate,onRead,onRevoke}){
  const invite=useTeamInvite(team,role,onCreate,onRevoke,onRead);
  const loaded=useRef(null);
  useEffect(()=>{if(loaded.current===team.id)return;loaded.current=team.id;invite.load().catch(()=>{});},[team.id]);
  return <InviteShare onClose={onClose} teamName={team.teamName} teamLogo={team.logo} teamCode={invite.code} inviteStatus={invite.status} loading={invite.loading} error={invite.error} onRetry={()=>invite.load()} isLeader onRegenerateCode={()=>invite.load(true)} onRevokeCode={invite.revoke}/>;
}
