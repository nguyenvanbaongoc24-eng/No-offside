export const BASIC_EMOJI = ['😀','😂','👏','👍','❤️','🔥','🎉','💪','⚽','🥅','🏆','✅','🙌','🤝','😅','🙏'];
const folded = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export function mentionAt(text, caret=text.length) {
  const before=text.slice(0,caret), match=/(^|\s)@([^@\n]{0,60})$/.exec(before);
  return match ? {start:before.length-match[2].length-1,end:caret,query:match[2]} : null;
}
export const mentionLabel = member => String(member.username || member.name || '').trim();
export function mentionCandidates(members, query) {
  const search=folded(query.trim());
  return members.filter(m=>m.membershipStatus!=='removed' && mentionLabel(m) && folded(mentionLabel(m)).includes(search)).slice(0,6);
}
export function insertComposerText(text,from,to,addition,limit=2000) {
  const next=text.slice(0,from)+addition+text.slice(to);
  return next.length<=limit ? {text:next,caret:from+addition.length} : null;
}
// Plain text only: no HTML injection, no new notification or mention delivery semantics.
export function messageParts(text,members) {
  const labels=[...new Set(members.map(mentionLabel).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const result=[];let cursor=0,plain='';
  while(cursor<text.length) {
    const label=text[cursor]==='@' && (cursor===0 || /\s/.test(text[cursor-1])) ? labels.find(name=>text.startsWith('@'+name,cursor) && (cursor+name.length+1===text.length || /[\s.,!?;:)]/.test(text[cursor+name.length+1]))) : null;
    if(label){if(plain){result.push({text:plain});plain='';}result.push({text:'@'+label,mention:true});cursor+=label.length+1;}
    else plain+=text[cursor++];
  }
  if(plain)result.push({text:plain});return result;
}
