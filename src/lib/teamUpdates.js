// One signal channel per client/team. Each consumer fetches its authorized snapshot.
const clients = new Map();
export function watchTeamUpdates(client, scope, teamId, refresh, intervalMs = 15000) {
  let teams=clients.get(client);
  if(!teams){teams=new Map();clients.set(client,teams);}
  let group=teams.get(teamId);
  const subscriber={refresh,intervalMs,live:true};
  if(!group){
    group={subscribers:new Set(),channel:null,timer:null};teams.set(teamId,group);
    group.sync=()=>{
      if(document.hidden)return;
      for(const entry of group.subscribers)Promise.resolve().then(()=>entry.live && entry.refresh()).catch(()=>{});
    };
    group.subscribers.add(subscriber);
    group.channel=client?.channel?.('team-signal:'+teamId).on('postgres_changes',{event:'*',schema:'public',table:'no_team_updates',filter:'team_id=eq.'+teamId},group.sync).subscribe(status=>{if(status==='SUBSCRIBED')group.sync();});
    window.addEventListener('focus',group.sync);window.addEventListener('online',group.sync);document.addEventListener?.('visibilitychange',group.sync);
  }else group.subscribers.add(subscriber);
  const resetTimer=()=>{clearInterval(group.timer);group.timer=setInterval(group.sync,Math.min(...[...group.subscribers].map(x=>x.intervalMs)));};
  resetTimer();
  return()=>{
    if(!subscriber.live)return;subscriber.live=false;group.subscribers.delete(subscriber);
    if(group.subscribers.size){resetTimer();return;}
    clearInterval(group.timer);window.removeEventListener('focus',group.sync);window.removeEventListener('online',group.sync);document.removeEventListener?.('visibilitychange',group.sync);
    if(group.channel)Promise.resolve(client.removeChannel(group.channel)).catch(()=>{});
    teams.delete(teamId);if(!teams.size)clients.delete(client);
  };
}
