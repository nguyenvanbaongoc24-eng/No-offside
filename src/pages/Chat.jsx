import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, MessageSquare, PartyPopper } from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';
import { uid } from '../lib/teamModel';
export default function Chat({user,members=[],teamId,birthdayEnabled=true}) {
  const [messages,setMessages]=usePersistentState('no_offside_messages_'+teamId,[]);
  const [input,setInput]=useState('');
  const end=useRef(null);
  const birthdays=useMemo(()=>members.filter(m=>{const today=new Date(),parts=(m.birthday||'').split('-');return Number(parts[1])===today.getMonth()+1&&Number(parts[2])===today.getDate();}),[members]);
  useEffect(()=>{end.current?.scrollIntoView({block:'end',behavior:'smooth'});},[messages.length]);
  const send=text=>{if(!text.trim())return;setMessages(prev=>[...prev,{id:uid(),senderId:user.id,sender:user.name,avatar:user.avatar,text:text.trim().slice(0,2000),createdAt:new Date().toISOString()}]);setInput('');};
  return <div className="chat-page"><header className="bg-slate-900 text-white px-5 pt-safe-hero pb-5 rounded-b-3xl"><div className="flex gap-3 items-center"><MessageSquare className="text-emerald-400"/><div><h1 className="text-xl font-semibold">Tin nhắn</h1><p className="text-sm text-slate-300 mt-1">{members.length} thành viên • lưu trên thiết bị này</p></div></div></header>
    <div className="chat-stream p-4 space-y-4" aria-live="polite" aria-relevant="additions">
      {birthdayEnabled&&birthdays.map(m=><div key={m.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center"><PartyPopper className="mx-auto text-emerald-600"/><p className="text-sm text-emerald-800 mt-2">Chúc mừng sinh nhật {m.name}!</p><button className="choice-button mt-3 mx-auto" onClick={()=>send('Chúc mừng sinh nhật '+m.name+'! ')}>Gửi lời chúc</button></div>)}
      {!messages.length&&<p className="text-center text-slate-500 text-sm py-8">Chưa có tin nhắn. Bắt đầu cuộc trò chuyện nhé.</p>}
      {messages.map(m=><article key={m.id} className={'flex '+(m.senderId===user.id?'justify-end':'justify-start')}><div className={'max-w-[85%] rounded-2xl p-3 '+(m.senderId===user.id?'bg-emerald-700 text-white':'bg-white border border-slate-200 text-slate-900')}><p className="text-xs opacity-80 mb-1">{m.sender}</p><p className="text-base leading-relaxed break-words whitespace-pre-wrap">{m.text}</p><time className="block text-xs opacity-75 text-right mt-2">{new Date(m.createdAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time></div></article>)}
      <div ref={end}/>
    </div>
    <form className="chat-composer" onSubmit={e=>{e.preventDefault();send(input);}}><label className="sr-only" htmlFor="chat-input">Tin nhắn</label><input id="chat-input" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50" placeholder="Nhắn tin với đồng đội…" value={input} maxLength={2000} onChange={e=>setInput(e.target.value)}/><button type="submit" aria-label="Gửi tin nhắn" disabled={!input.trim()} className="primary-button w-12 h-12 p-0"><Send size={20}/></button></form>
  </div>;
}