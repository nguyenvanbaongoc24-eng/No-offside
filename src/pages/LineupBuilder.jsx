import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  PlusCircle, 
  Check, 
  ChevronLeft, 
  Share2, 
  CheckCircle2, 
  Edit3, 
  X,
  Sparkles
} from 'lucide-react';

export default function LineupBuilder({ onBack }) {
  const [selectedFormationId, setSelectedFormationId] = useState('2-3-1');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showCreateFormationModal, setShowCreateFormationModal] = useState(false);
  const [newFormationName, setNewFormationName] = useState('');

  // Available players pool to swap
  const teamRoster = [
    { name: 'Tuấn Hưng (Bạn)', number: 9, role: 'ST' },
    { name: 'Quang Hải', number: 19, role: 'RM' },
    { name: 'Hoàng Đức', number: 14, role: 'CM' },
    { name: 'Tuấn Anh', number: 11, role: 'LCM' },
    { name: 'Văn Thanh', number: 17, role: 'LM' },
    { name: 'Ngọc Hải', number: 3, role: 'CB' },
    { name: 'Duy Mạnh', number: 28, role: 'CB' },
    { name: 'Văn Hậu', number: 5, role: 'LB' },
    { name: 'Trọng Hoàng', number: 8, role: 'RB' },
    { name: 'Văn Lâm', number: 1, role: 'GK' },
    { name: 'Bùi Tấn Trường', number: 23, role: 'GK' },
    { name: 'Tiến Linh', number: 22, role: 'ST' },
  ];

  // Formations state (can be expanded by Admin)
  const [formationsList, setFormationsList] = useState([
    {
      id: '2-3-1',
      name: 'Sơ đồ 2-3-1 (Tấn công trung lộ)',
      tag: 'Phổ biến nhất Sân 7',
      players: [
        { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
        { id: 'cb1', role: 'LCB', name: 'Ngọc Hải', number: 3, top: '70%', left: '26%' },
        { id: 'cb2', role: 'RCB', name: 'Duy Mạnh', number: 28, top: '70%', left: '74%' },
        { id: 'lm', role: 'LM', name: 'Văn Thanh', number: 17, top: '48%', left: '18%' },
        { id: 'cm', role: 'CM', name: 'Hoàng Đức', number: 14, top: '50%', left: '50%' },
        { id: 'rm', role: 'RM', name: 'Quang Hải', number: 19, top: '48%', left: '82%' },
        { id: 'st', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '22%', left: '50%', isUser: true },
      ]
    },
    {
      id: '3-2-1',
      name: 'Sơ đồ 3-2-1 (Phòng ngự phản công)',
      tag: 'Chắc chắn',
      players: [
        { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
        { id: 'lb', role: 'LB', name: 'Văn Hậu', number: 5, top: '72%', left: '18%' },
        { id: 'cb', role: 'CB', name: 'Ngọc Hải', number: 3, top: '75%', left: '50%' },
        { id: 'rb', role: 'RB', name: 'Trọng Hoàng', number: 8, top: '72%', left: '82%' },
        { id: 'cm1', role: 'LCM', name: 'Tuấn Anh', number: 11, top: '48%', left: '35%' },
        { id: 'cm2', role: 'RCM', name: 'Hoàng Đức', number: 14, top: '48%', left: '65%' },
        { id: 'st', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '22%', left: '50%', isUser: true },
      ]
    },
    {
      id: '2-1-2-1',
      name: 'Sơ đồ 2-1-2-1 (Kim cương ảo)',
      tag: 'Kiểm soát bóng',
      players: [
        { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
        { id: 'cb1', role: 'LCB', name: 'Ngọc Hải', number: 3, top: '72%', left: '28%' },
        { id: 'cb2', role: 'RCB', name: 'Duy Mạnh', number: 28, top: '72%', left: '72%' },
        { id: 'dm', role: 'DM', name: 'Hoàng Đức', number: 14, top: '56%', left: '50%' },
        { id: 'am1', role: 'LAM', name: 'Tuấn Anh', number: 11, top: '38%', left: '32%' },
        { id: 'am2', role: 'RAM', name: 'Quang Hải', number: 19, top: '38%', left: '68%' },
        { id: 'st', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '18%', left: '50%', isUser: true },
      ]
    }
  ]);

  const currentFormation = formationsList.find(f => f.id === selectedFormationId) || formationsList[0];

  const handleSwapPlayer = (newPlayer) => {
    if (!selectedPlayer) return;
    setFormationsList(prev => prev.map(f => {
      if (f.id !== selectedFormationId) return f;
      return {
        ...f,
        players: f.players.map(p => {
          if (p.id === selectedPlayer.id) {
            return {
              ...p,
              name: newPlayer.name,
              number: newPlayer.number,
              isUser: newPlayer.name.includes('Bạn'),
            };
          }
          return p;
        })
      };
    }));
    setSelectedPlayer(null);
  };

  const handleCreateNewFormation = () => {
    if (!newFormationName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newForm = {
      id: newId,
      name: newFormationName.trim(),
      tag: 'Tùy chỉnh Admin',
      players: [
        { id: 'gk', role: 'GK', name: 'Văn Lâm', number: 1, top: '88%', left: '50%' },
        { id: 'cb1', role: 'CB', name: 'Ngọc Hải', number: 3, top: '72%', left: '30%' },
        { id: 'cb2', role: 'CB', name: 'Duy Mạnh', number: 28, top: '72%', left: '70%' },
        { id: 'cm1', role: 'CM', name: 'Hoàng Đức', number: 14, top: '50%', left: '35%' },
        { id: 'cm2', role: 'CM', name: 'Tuấn Anh', number: 11, top: '50%', left: '65%' },
        { id: 'st1', role: 'ST', name: 'Tuấn Hưng (Bạn)', number: 9, top: '24%', left: '35%', isUser: true },
        { id: 'st2', role: 'ST', name: 'Tiến Linh', number: 22, top: '24%', left: '65%' },
      ]
    };
    setFormationsList(prev => [...prev, newForm]);
    setSelectedFormationId(newId);
    setNewFormationName('');
    setShowCreateFormationModal(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. Header Dark Geometric Style */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-4 px-5 rounded-b-[32px] shadow-lg bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>
          
          <h1 className="text-base font-black text-white flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Sa Bàn Chiến Thuật Sân 7</span>
          </h1>

          <button
            onClick={() => setShowCreateFormationModal(true)}
            className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Tạo sơ đồ</span>
          </button>
        </div>
      </section>

      {/* 2. Tactical Football Pitch (Sân bóng tone xanh lục bảo sẫm, độ tương phản cao) */}
      <div className="px-4 mt-3">
        <div className="relative w-full aspect-[9/13] rounded-[32px] overflow-hidden border-2 border-emerald-950/40 shadow-xl bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#011c16] relative">
          
          {/* Turf lines pattern */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white/80 rounded-2xl"></div>
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/80 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-44 h-20 border-b-2 border-l-2 border-r-2 border-white/80 rounded-b-xl"></div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-44 h-20 border-t-2 border-l-2 border-r-2 border-white/80 rounded-t-xl"></div>
          </div>

          {/* Player Pins */}
          {currentFormation.players.map((player) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              style={{ top: player.top, left: player.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 flex flex-col items-center active:scale-95 transition-transform"
            >
              {/* Number Circle */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-2xl transition-all ${
                player.isUser 
                  ? 'bg-emerald-400 text-slate-950 border-white ring-4 ring-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.8)]' 
                  : player.role === 'GK'
                  ? 'bg-amber-400 text-slate-950 border-amber-100 ring-2 ring-amber-400/50'
                  : 'bg-slate-900 text-white border-white/80 ring-2 ring-black/40'
              }`}>
                {player.number}
              </div>

              {/* High-Contrast White Name Badge */}
              <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-white/25 shadow-lg text-[10px] font-black text-white whitespace-nowrap text-center drop-shadow-md">
                {player.name}
              </div>
            </div>
          ))}

          {/* Hint Overlay */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-emerald-200/80 font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            💡 Nhấn vào cầu thủ để đổi người
          </div>
        </div>
      </div>

      {/* 3. Tactics List (Render thành một danh sách có Checkmark) */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            DANH SÁCH CHIẾN THUẬT ({formationsList.length})
          </span>
          <span className="text-[11px] font-bold text-emerald-600">
            Chạm để kích hoạt
          </span>
        </div>

        <div className="space-y-2">
          {formationsList.map((item) => {
            const isActive = item.id === selectedFormationId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedFormationId(item.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between active:scale-98 ${
                  isActive 
                    ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                    : 'bg-white/80 border-gray-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    ⚽
                  </div>
                  <div>
                    <h4 className={`text-xs font-extrabold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-semibold">{item.tag}</span>
                  </div>
                </div>

                {isActive ? (
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đang dùng</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-bold">Chọn</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Bottom Sheet Đổi người khi click vào cầu thủ */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">
                  Đổi Cầu Thủ Ở Vị Trí {selectedPlayer.role}
                </h3>
                <p className="text-[11px] text-gray-400">Đang chọn: {selectedPlayer.name} (#{selectedPlayer.number})</p>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto flex-1 pr-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 block px-1">Chọn từ danh sách đội</span>
              {teamRoster.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSwapPlayer(p)}
                  className="p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      #{p.number}
                    </span>
                    <span className="text-xs font-bold text-gray-900">{p.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-full py-2.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Sơ Đồ Mới */}
      {showCreateFormationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-gray-900">Tạo Sơ Đồ Mới</h3>
              </div>
              <button onClick={() => setShowCreateFormationModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-bold">Tên sơ đồ chiến thuật</label>
                <input
                  type="text"
                  value={newFormationName}
                  onChange={(e) => setNewFormationName(e.target.value)}
                  placeholder="Ví dụ: Đội hình tử thủ 3-2-1"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="mt-5 pt-2">
              <button
                onClick={handleCreateNewFormation}
                className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                Lưu Và Kích Hoạt Sơ Đồ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
