import React, { useState } from 'react';
import { Send, Smile, Users, Shield, Sparkles, MessageSquare } from 'lucide-react';

export default function Chat({ user }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Quế Ngọc Hải',
      number: 3,
      role: 'Đội Trưởng',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=60',
      text: 'Anh em thứ 6 tuần này đúng 18h15 có mặt tại Sân 3 Chuyên Việt nhé!',
      time: '18:20',
      isMe: false,
    },
    {
      id: 2,
      sender: 'Nguyễn Quang Hải',
      number: 19,
      role: 'Tiền Vệ',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60',
      text: 'Trận này mặc áo xanh neon hay áo trắng vậy đội trưởng?',
      time: '18:22',
      isMe: false,
    },
    {
      id: 3,
      sender: 'Quế Ngọc Hải',
      number: 3,
      role: 'Đội Trưởng',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=60',
      text: 'Áo xanh neon nhé em! Quần đen tất đen.',
      time: '18:23',
      isMe: false,
    },
    {
      id: 4,
      sender: 'Đoàn Văn Hậu',
      number: 5,
      role: 'Hậu Vệ',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60',
      text: 'Em vừa chuyển khoản quỹ tháng 10 qua VietQR rồi nhé anh Hải.',
      time: '18:30',
      isMe: false,
    },
    {
      id: 5,
      sender: user.name,
      number: user.number,
      role: user.role,
      avatar: user.avatar,
      text: 'Đã sẵn sàng! Trận này quyết tâm lấy 3 điểm anh em ơi 🔥⚽',
      time: '18:35',
      isMe: true,
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  const quickMessages = [
    'Thứ 6 mặc áo nào?',
    'Ai có xe đón tôi không?',
    'Chiến thôi anh em! ⚽🔥',
    'Tôi có mặt trước 15p nhé!',
  ];

  const handleSend = (textToSend) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: user.name,
        number: user.number,
        role: user.role,
        avatar: user.avatar,
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ]);
    if (!textToSend) setInputVal('');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none flex flex-col justify-between">
      
      {/* 1. Header Dark Geometric Style */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-4 px-5 rounded-b-[32px] shadow-lg bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Phòng Thay Đồ FC</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h1>
              <p className="text-[11px] text-gray-400">14 cầu thủ đang online</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/10">
            Nội Bộ Đội
          </span>
        </div>
      </section>

      {/* 2. Messages Stream */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-end gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'}`}
          >
            {!msg.isMe && (
              <img 
                src={msg.avatar} 
                alt={msg.sender} 
                className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 shrink-0 mb-1" 
              />
            )}

            <div className={`max-w-[78%] rounded-[22px] p-3 shadow-soft ${
              msg.isMe 
                ? 'bg-emerald-600 text-white rounded-br-sm' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
            }`}>
              {!msg.isMe && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-bold text-[11px] text-gray-900">{msg.sender}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.2 rounded-full">
                    #{msg.number}
                  </span>
                </div>
              )}

              <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
              
              <span className={`text-[9px] block text-right mt-1 font-mono ${
                msg.isMe ? 'text-emerald-100' : 'text-gray-400'
              }`}>
                {msg.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Quick Chips & Input Bar */}
      <div className="p-3 bg-white/90 backdrop-blur-md border-t border-gray-200/80 sticky bottom-20 z-20">
        {/* Quick Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {quickMessages.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="text-[11px] font-bold whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 transition-all border border-gray-200 active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 mt-1"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Nhắn tin với anh em trong đội..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
          />
          <button
            type="submit"
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
