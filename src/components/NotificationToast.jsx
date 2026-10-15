import Pressable from './Pressable';
import React, { useState } from 'react';
import { Bell, X, CheckCircle, Calendar, DollarSign, Shield, ChevronRight } from 'lucide-react';

export default function NotificationToast({ isOpen, onClose, onOpenHistory }) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] max-w-md mx-auto p-3 pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-[0_12px_36px_rgba(0,0,0,0.12)] rounded-2xl p-3.5 flex items-start gap-3 animate-in slide-in-from-top duration-300">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0" onClick={onOpenHistory} role="button">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
              <span>FC No Offside</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-gray-400">Vừa xong</span>
          </div>
          <p className="text-xs text-gray-700 font-medium mt-0.5 line-clamp-2">
            ⚡ <strong>Đội trưởng Hải:</strong> "Thứ 6 tuần này nhớ mang áo đấu xanh neon và có mặt lúc 18h15 khởi động nhé cả đội!"
          </p>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-0.5">
            Xem tất cả thông báo <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <Pressable
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </Pressable>
      </div>
    </div>
  );
}

export function NotificationHistoryModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'match',
      icon: <Calendar className="w-4 h-4 text-emerald-600" />,
      bg: 'bg-emerald-50',
      title: 'Lịch thi đấu mới',
      content: 'Kèo Sân 7 gặp FC Hàng Xóm lúc 18:30 Thứ 6, 24/10 tại Sân Chuyên Việt.',
      time: '10 phút trước',
      unread: true,
    },
    {
      id: 2,
      type: 'fund',
      icon: <DollarSign className="w-4 h-4 text-amber-600" />,
      bg: 'bg-amber-50',
      title: 'Nhắc nhở quỹ đội',
      content: 'Hạn đóng quỹ tháng 10 là ngày 25/10. Vui lòng hoàn tất nghĩa vụ quỹ 150.000đ.',
      time: '2 giờ trước',
      unread: true,
    },
    {
      id: 3,
      type: 'tactic',
      icon: <Shield className="w-4 h-4 text-blue-600" />,
      bg: 'bg-blue-50',
      title: 'Chiến thuật cập nhật',
      content: 'Đội trưởng đã cập nhật sơ đồ chiến thuật 2-3-1 cho trận đấu sắp tới.',
      time: 'Hôm qua',
      unread: false,
    },
  ]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 max-h-[85vh] flex flex-col shadow-2xl border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900">Lịch Sử Thông Báo</h3>
          </div>
          <div className="flex items-center gap-2">
            <Pressable
              onClick={markAllAsRead}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-full bg-emerald-50"
            >
              Đã đọc tất cả
            </Pressable>
            <Pressable onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
              <X className="w-5 h-5" />
            </Pressable>
          </div>
        </div>

        {/* Notifications List */}
        <div className="mt-3 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {notifications.map((item) => (
            <div 
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.unread 
                  ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' 
                  : 'bg-gray-50 border-gray-100 opacity-90'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">{item.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom button */}
        <div className="pt-3 mt-3 border-t border-gray-100">
          <Pressable
            onClick={onClose}
            className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all active:scale-95"
          >
            Đóng
          </Pressable>
        </div>

      </div>
    </div>
  );
}
