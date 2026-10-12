import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Send, Smile, Users, Shield, Sparkles, MessageSquare, Cake, Gift } from 'lucide-react';

export default function Chat({ user, members = [] }) {
  // Tìm thành viên có sinh nhật hôm nay
  const todayBirthdayMember = useMemo(() => {
    const today = new Date();
    if (members && members.length > 0) {
      const match = members.find(m => {
        if (!m.birthday) return false;
        const b = new Date(m.birthday);
        return b.getDate() === today.getDate() && b.getMonth() === today.getMonth();
      });
      if (match) return match;
    }
    // Mặc định cho demo nếu chưa có dữ liệu: Nguyễn Quang Hải (13/10)
    return {
      name: 'Nguyễn Quang Hải',
      number: 19,
      role: 'Tiền Vệ',
      birthday: '1997-10-13'
    };
  }, [members]);

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
      sender: user?.name || 'Tuấn Hưng',
      number: user?.number || 9,
      role: user?.role || 'Tiền Đạo',
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
      text: 'Đã sẵn sàng! Trận này quyết tâm lấy 3 điểm anh em ơi 🔥⚽',
      time: '18:35',
      isMe: true,
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  // Hàm bắn pháo giấy Confetti mượt mà
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#22c55e', '#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6']
      });
    } catch (err) {
      console.warn('Canvas confetti execution error:', err);
    }
  };

  // Tự động bắn pháo giấy khi vào phòng chat nếu hôm nay có sinh nhật
  useEffect(() => {
    if (todayBirthdayMember) {
      const timer = setTimeout(() => {
        triggerConfetti();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [todayBirthdayMember]);

  const quickMessages = [
    `Chúc mừng sinh nhật ${todayBirthdayMember?.name || 'đồng đội'}! 🎂`,
    'Thứ 6 mặc áo nào?',
    'Chiến thôi anh em! ⚽🔥',
    'Tôi có mặt trước 15p nhé!',
  ];

  const handleSend = (textToSend) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    // Nếu tin nhắn chúc mừng hoặc hôm nay có sinh nhật, bắn pháo giấy
    if (text.includes('🎂') || text.includes('sinh nhật') || text.includes('🎉')) {
      triggerConfetti();
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: user?.name || 'Tuấn Hưng',
        number: user?.number || 9,
        role: user?.role || 'Tiền Đạo',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ]);
    if (!textToSend) setInputVal('');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-safe font-['Be_Vietnam_Pro'] antialiased select-none flex flex-col justify-between">
      
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

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/10 whitespace-nowrap flex-shrink-0">
            Nội Bộ Đội
          </span>
        </div>
      </section>

      {/* 2. Messages Stream với mb-32 pb-16 để cuộn không bao giờ bị thanh nav đè lên */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto mb-32 pb-12">
        
        {/* Tin nhắn 1 & 2 */}
        {messages.slice(0, 2).map((msg) => (
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
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-br-sm shadow-md shadow-emerald-500/20' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
            }`}>
              {!msg.isMe && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-bold text-[11px] text-gray-900 whitespace-nowrap">{msg.sender}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap">
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

        {/* =========================================================
            YÊU CẦU 3: TIN NHẮN HỆ THỐNG ĐẶC BIỆT (SYSTEM MESSAGE SINH NHẬT)
            - Căn giữa (centered)
            - Chữ màu xám / xanh lá nhẹ
            - Có icon hộp quà 🎁
            - Nội dung: "Hôm nay là sinh nhật của [Tên Cầu Thủ]! Chúc tuổi mới bùng nổ trên sân cỏ nhé! 🎉"
            ========================================================= */}
        {todayBirthdayMember && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="my-4 mx-auto max-w-[92%] sm:max-w-sm text-center"
          >
            <div className="bg-gradient-to-b from-emerald-50/90 via-slate-50/80 to-pink-50/60 border border-emerald-200/80 rounded-2xl p-3.5 shadow-sm">
              {/* Icon hộp quà 🎁 */}
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base mx-auto mb-1.5 shadow-xs animate-bounce">
                🎁
              </div>

              {/* Tag System Message */}
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full inline-block">
                Hệ Thống Tự Động
              </span>

              {/* Nội dung chúc mừng sinh nhật căn giữa */}
              <p className="text-xs font-bold text-gray-600 mt-1.5 leading-relaxed">
                Hôm nay là sinh nhật của <span className="text-emerald-700 font-extrabold">{todayBirthdayMember.name}</span>! Chúc tuổi mới bùng nổ trên sân cỏ nhé! 🎉
              </p>

              {/* Nút bấm tương tác kích hoạt Confetti */}
              <button 
                type="button"
                onClick={triggerConfetti}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-[11px] shadow-sm shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                title="Bấm để bắn pháo hoa chúc mừng"
              >
                <span>🎉 Bắn pháo giấy chúc mừng</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Các tin nhắn tiếp theo */}
        {messages.slice(2).map((msg) => (
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
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-br-sm shadow-md shadow-emerald-500/20' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
            }`}>
              {!msg.isMe && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-bold text-[11px] text-gray-900 whitespace-nowrap">{msg.sender}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap">
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

      {/* 3. Quick Chips & Input Bar - Neo phía trên Bottom Nav (bottom-20 / pb-safe) */}
      <div className="p-3 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 fixed bottom-20 left-0 right-0 max-w-md mx-auto z-30 shadow-lg">
        {/* Quick Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {quickMessages.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="text-[11px] font-bold whitespace-nowrap flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-full bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 transition-all border border-gray-200 active:scale-95 cursor-pointer"
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
          {/* Nút pháo giấy sinh nhật cạnh ô chat */}
          <button
            type="button"
            onClick={triggerConfetti}
            className="w-10 h-10 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Bắn pháo giấy confetti"
          >
            <span>🎉</span>
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Nhắn tin với anh em trong đội..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium shadow-inner"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white flex items-center justify-center shrink-0 whitespace-nowrap shadow-lg shadow-green-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
