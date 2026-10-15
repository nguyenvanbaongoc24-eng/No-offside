export function latestAnnouncements(notices=[]){
  return notices.filter(n=>n && (n.title || n.content)).map((notice,index)=>({notice,index})).sort((a,b)=>{
    const first=Date.parse(a.notice.createdAt),second=Date.parse(b.notice.createdAt);
    return Number.isFinite(first)&&Number.isFinite(second)?second-first:a.index-b.index;
  }).slice(0,2).map(x=>x.notice);
}
export function birthdaysToday(members=[],timeZone='Asia/Ho_Chi_Minh',now=new Date()){
  let parts;try{parts=new Intl.DateTimeFormat('en',{timeZone,month:'2-digit',day:'2-digit'}).formatToParts(now);}catch{parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',month:'2-digit',day:'2-digit'}).formatToParts(now);}
  const month=parts.find(p=>p.type==='month').value,day=parts.find(p=>p.type==='day').value;
  return members.filter(m=>m.membershipStatus!=='removed' && /^\d{4}-\d{2}-\d{2}$/.test(m.birthday||'') && m.birthday.slice(5)===`${month}-${day}`);
}
