import React, { useState } from 'react';
import { Shield, Users, RefreshCw, Share2, ChevronLeft, Check, Sparkles } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

export default function LineupBuilder({ onBack }) {
  const [formation, setFormation] = useState('2-3-1');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Positions on 7-a-side pitch (0 to 100% coordinates: top, left)
  const formations = {
    '2-3-1': [
      { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
      { id: 'cb1', role: 'LCB', name: 'Ngọc Hải', number: 3, top: '70%', left: '26%' },
      { id: 'cb2', role: 'RCB', name: 'Duy Mạnh', number: 28, top: '70%', left: '74%' },
      { id: 'lm', role: 'LM', name: 'Văn Thanh', number: 17, top: '48%', left: '18%' },
      { id: 'cm', role: 'CM', name: 'Hoàng Đức', number: 14, top: '50%', left: '50%' },
      { id: 'rm', role: 'RM', name: 'Quang Hải', number: 19, top: '48%', left: '82%' },
      { id: 'st', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '22%', left: '50%', isUser: true },
    ],
    '3-2-1': [
      { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
      { id: 'lb', role: 'LB', name: 'Văn Hậu', number: 5, top: '72%', left: '18%' },
      { id: 'cb', role: 'CB', name: 'Ngọc Hải', number: 3, top: '75%', left: '50%' },
      { id: 'rb', role: 'RB', name: 'Trọng Hoàng', number: 8, top: '72%', left: '82%' },
      { id: 'cm1', role: 'LCM', name: 'Tuấn Anh', number: 11, top: '48%', left: '35%' },
      { id: 'cm2', role: 'RCM', name: 'Hoàng Đức', number: 14, top: '48%', left: '65%' },
      { id: 'st', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '22%', left: '50%', isUser: true },
    ]
  };

  const currentLineup = formations[formation];

  return (
    <div className="relative min-h-screen text-white pb-28 pt-2 px-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white p-2 rounded-xl bg-white/10"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" /> Sa Bàn Chiến Thuật Sân 7
        </h2>
        <div className="w-8"></div>
      </div>

      {/* Formation Selector */}
      <div className="flex gap-2 mb-4 bg-white/5 p-1.5 rounded-2xl border border-white/10">
        <button
          onClick={() => setFormation('2-3-1')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            formation === '2-3-1'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,255,102,0.4)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sơ đồ 2-3-1 (Tấn công)
        </button>
        <button
          onClick={() => setFormation('3-2-1')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            formation === '3-2-1'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(0,255,102,0.4)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sơ đồ 3-2-1 (Chắc chắn)
        </button>
      </div>

      {/* Tactical Football Pitch (Sân bóng kính mờ dạng Neon) */}
      <div className="relative w-full aspect-[9/13] rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(0,255,102,0.15)] bg-emerald-950/40 backdrop-blur-xl">
        {/* Pitch Lines */}
        <div className="absolute inset-0 opacity-25">
          {/* Outer Border */}
          <div className="absolute inset-4 border-2 border-white rounded-2xl pointer-events-none"></div>
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white -translate-y-1/2 pointer-events-none"></div>
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          {/* Center Spot */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          {/* Top Penalty Box */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-44 h-20 border-b-2 border-l-2 border-r-2 border-white rounded-b-xl pointer-events-none"></div>
          {/* Bottom Penalty Box */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-44 h-20 border-t-2 border-l-2 border-r-2 border-white rounded-t-xl pointer-events-none"></div>
        </div>

        {/* Players on Pitch */}
        {currentLineup.map((player) => (
          <div
            key={player.id}
            onClick={() => setSelectedPlayer(player)}
            style={{ top: player.top, left: player.left }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10 flex flex-col items-center"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-lg transition-all ${
              player.isUser 
                ? 'bg-emerald-400 text-slate-950 border-white ring-4 ring-emerald-400/50 shadow-[0_0_20px_rgba(0,255,102,0.8)]' 
                : player.role === 'GK'
                ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-amber-400/40'
                : 'bg-slate-900/90 text-white border-white/40 ring-2 ring-white/20'
            }`}>
              {player.number}
            </div>
            <div className="mt-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[10px] font-bold whitespace-nowrap text-center">
              {player.name}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Player Details Card */}
      {selectedPlayer && (
        <GlassCard className="mt-4 border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">
                #{selectedPlayer.number}
              </div>
              <div>
                <h4 className="font-extrabold text-sm">{selectedPlayer.name}</h4>
                <p className="text-xs text-slate-400">Vị trí: {selectedPlayer.role} • Đá chính</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedPlayer(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button 
          variant="secondary" 
          size="md" 
          className="flex-1 text-xs"
          icon={<Share2 className="w-3.5 h-3.5" />}
          onClick={() => alert('Đã sao chép liên kết đội hình để gửi vào nhóm Zalo!')}
        >
          Chia sẻ lên Zalo Đội
        </Button>
        <Button 
          variant="primary" 
          size="md" 
          className="flex-1 text-xs text-slate-950 font-bold"
          icon={<Check className="w-3.5 h-3.5" />}
          onClick={() => alert('Chiến thuật đã được lưu thành công!')}
        >
          Lưu Chiến Thuật
        </Button>
      </div>
    </div>
  );
}
