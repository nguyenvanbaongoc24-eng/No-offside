import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, CheckCircle, HelpCircle, XCircle, Navigation, Flame } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';

export default function MatchCard({ attendance, onAttendanceChange }) {
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const teammates = [
    { name: 'Quang Hải', number: 19, status: 'attending', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' },
    { name: 'Hoàng Đức', number: 14, status: 'attending', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60' },
    { name: 'Văn Lâm', number: 1, status: 'attending', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60' },
    { name: 'Quế Ngọc Hải', number: 3, status: 'attending', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=60' },
    { name: 'Tuấn Anh', number: 11, status: 'maybe', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&auto=format&fit=crop&q=60' },
    { name: 'Tiến Linh', number: 22, status: 'absent', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&auto=format&fit=crop&q=60' },
  ];

  const handleSelect = (status, text) => {
    onAttendanceChange(status);
    setFeedbackMsg(text);
    setTimeout(() => setFeedbackMsg(''), 2500);
  };

  const attendingCount = 13 + (attendance === 'attending' ? 1 : 0);
  const maybeCount = 2 + (attendance === 'maybe' ? 1 : 0);
  const absentCount = 1 + (attendance === 'absent' ? 1 : 0);

  return (
    <GlassCard className="relative overflow-hidden border-emerald-500/20" glow={attendance === 'attending'}>
      {/* Decorative match badge banner */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Trận Sắp Tới
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-400" /> Kèo Sân 7
        </span>
      </div>

      {/* Opponent & Match Title */}
      <div className="bg-gradient-to-r from-white/[0.07] to-transparent p-3.5 rounded-xl border border-white/10 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Đối thủ</p>
            <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
              FC Hàng Xóm
              <span className="text-xs px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-bold rounded">Đá Căng</span>
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Chia tiền sân 50/50
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium">Thứ 6, 24/10</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold text-white">18:30 - 20:00</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-xs text-slate-300 mt-2">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white">Sân Chuyên Việt (Sân 3)</span>
            <p className="text-[11px] text-slate-400 line-clamp-1">18D Cộng Hòa, Phường 4, Tân Bình, TP.HCM</p>
          </div>
          <a
            href="https://maps.google.com" 
            target="_blank" 
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors shrink-0"
            title="Xem chỉ đường"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          </a>
        </div>
      </div>

      {/* Attendance Action Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            Trạng thái của bạn:
          </span>
          {attendance === 'attending' && (
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Đã chốt đá!
            </span>
          )}
          {attendance === 'maybe' && (
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> Chưa chắc chắn
            </span>
          )}
          {attendance === 'absent' && (
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Đã báo nghỉ
            </span>
          )}
        </div>

        {/* 2 Main Action Buttons: Có mặt & Báo vắng */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="md"
            active={attendance === 'attending'}
            variant="primary"
            onClick={() => handleSelect('attending', 'Đã xác nhận có mặt! Chuẩn bị ra sân nào!')}
            className={`flex-col py-3 px-1 transition-all ${
              attendance === 'attending' 
                ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(0,255,102,0.5)]' 
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
          >
            <span className="text-lg">⚽</span>
            <span className="text-xs font-bold mt-1">Có mặt</span>
          </Button>

          <Button
            size="md"
            active={attendance === 'absent'}
            variant="danger"
            onClick={() => handleSelect('absent', 'Đã báo vắng. Hẹn bạn trận tiếp theo!')}
            className={`flex-col py-3 px-1 transition-all ${
              attendance === 'absent'
                ? 'bg-danger text-white font-bold ring-2 ring-rose-400 shadow-[0_0_20px_rgba(255,76,76,0.5)]'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
          >
            <span className="text-lg">❌</span>
            <span className="text-xs font-bold mt-1">Báo vắng</span>
          </Button>
        </div>

        {/* Feedback toast toast notification inside card */}
        {feedbackMsg && (
          <div className="mt-2 text-center text-xs text-emerald-300 bg-emerald-500/15 py-1.5 px-3 rounded-lg border border-emerald-500/30 animate-pulse">
            {feedbackMsg}
          </div>
        )}
      </div>

      {/* Teammates Attendance Status */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2 overflow-hidden">
            {teammates.slice(0, 4).map((tm, idx) => (
              <img
                key={idx}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-[#0f172a] object-cover"
                src={tm.avatar}
                alt={tm.name}
                title={`${tm.name} (#${tm.number})`}
              />
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            +{attendingCount > 4 ? attendingCount - 4 : 0} người khác
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
            {attendingCount} Có mặt
          </span>
          <span className="text-[11px] text-slate-400 ml-1.5">
            ({maybeCount} lưỡng lự)
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
