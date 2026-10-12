import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Shield, 
  Users, 
  Calendar, 
  MapPin, 
  Check, 
  Sparkles, 
  Phone, 
  User, 
  Hash, 
  Trophy,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

export default function InviteLanding({ 
  teamData = {
    name: 'FC Hàng Xóm',
    captain: 'Đạt',
    membersCount: 18,
    category: 'Kèo Sân 7',
    venue: 'Sân Chuyên Việt (18D Cộng Hòa, Tân Bình)',
    matchSchedule: 'Thứ 6 hàng tuần • 18:30',
    logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=160&auto=format&fit=crop&q=80',
  },
  onJoinSuccess,
  onBackToApp
}) {
  const [step, setStep] = useState('landing'); // 'landing' | 'auth' | 'profile'
  
  // Auth step state
  const [phone, setPhone] = useState('0912345678');
  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);

  // Profile step state
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('Tiền đạo (ST)');
  const [jerseyNumber, setJerseyNumber] = useState(10);

  const positions = [
    { id: 'st', label: 'Tiền đạo (ST)', icon: '⚽' },
    { id: 'mf', label: 'Tiền vệ (MF)', icon: '🎯' },
    { id: 'df', label: 'Hậu vệ (DF)', icon: '🛡️' },
    { id: 'gk', label: 'Thủ môn (GK)', icon: '🧤' },
  ];

  const popularNumbers = [7, 9, 10, 11, 14, 19, 22];

  const handleStartJoin = () => {
    setStep('auth');
  };

  const handleVerifyAuth = (e) => {
    e.preventDefault();
    setStep('profile');
  };

  const handleFinishJoin = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên của bạn!');
      return;
    }

    const newMemberProfile = {
      name: fullName.trim(),
      role: position,
      number: parseInt(jerseyNumber) || 10,
      teamName: teamData.name,
      teamCategory: teamData.category,
      currentUserRole: 'member',
      isFundPaid: false,
    };

    if (onJoinSuccess) {
      onJoinSuccess(newMemberProfile);
    }
  };

  return (
    <div className="relative min-h-screen text-gray-900 font-['Be_Vietnam_Pro'] antialiased select-none flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#0f172a]">
      
      {/* Stylized Pitch Lines Pattern (Stylized Soccer Field Markings) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-2 border-emerald-400"></div>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 -translate-y-1/2"></div>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-72 h-36 border-b-2 border-l-2 border-r-2 border-emerald-400 rounded-b-3xl"></div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-36 border-t-2 border-l-2 border-r-2 border-emerald-400 rounded-t-3xl"></div>
        <div className="absolute inset-4 border-2 border-emerald-400/40 rounded-[40px]"></div>
      </div>

      {/* Top Navbar */}
      <div className="relative z-10 p-4 flex items-center justify-between max-w-md mx-auto w-full">
        {onBackToApp && (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onBackToApp}
            className="flex items-center gap-1 text-xs font-bold text-gray-200 hover:text-white px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </motion.button>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-black text-white ml-auto">
          <span>⚽</span>
          <span>NO OFFSIDE</span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 max-w-md mx-auto w-full px-4 flex-1 flex flex-col justify-center py-4">
        
        <AnimatePresence mode="wait">
          {/* ========================================================
              MÀN HÌNH 1: LANDING PAGE THU HÚT (WOW EFFECT)
              ======================================================== */}
          {step === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white/95 backdrop-blur-2xl rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-white/40 p-7 text-center"
            >
              
              {/* Logo của đội bóng đang mời ở trên cùng - Spring Animation */}
              <motion.div 
                initial={{ scale: 0.4, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                className="relative w-28 h-28 mx-auto mb-4"
              >
                <div className="w-full h-full rounded-[30px] overflow-hidden ring-4 ring-emerald-500 shadow-2xl bg-slate-900 flex items-center justify-center">
                  {teamData.logo ? (
                    <img 
                      src={teamData.logo} 
                      alt={teamData.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Shield className="w-14 h-14 text-emerald-400" />
                  )}
                </div>
                <span className="absolute -bottom-2 -right-1 bg-slate-900 text-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full border-2 border-white shadow">
                  {teamData.category}
                </span>
              </motion.div>

              {/* Tiêu đề lời mời - Slide up */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Đội trưởng <strong>{teamData.captain}</strong> đang mời bạn gia nhập
                </p>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
                  {teamData.name}
                </h1>
              </motion.div>

              {/* Team Specs Card */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-5 p-4 bg-slate-50/90 rounded-2xl border border-gray-100 text-left space-y-2.5 text-xs shadow-inner"
              >
                <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Quân số: <strong>{teamData.membersCount} thành viên</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="truncate">{teamData.venue}</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Lịch đá: <strong>{teamData.matchSchedule}</strong></span>
                </div>
              </motion.div>

              {/* NÚT HÀNH ĐỘNG CHÍNH: ĐĂNG NHẬP & THAM GIA NGAY (PULSE & TAP SCALE 0.95) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleStartJoin}
                  className="w-full h-14 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 cursor-pointer animate-pulse"
                >
                  <span>Đăng nhập & Tham gia ngay</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </motion.button>
                <p className="text-[11px] text-gray-500 mt-2.5 font-medium">
                  Gia nhập để điểm danh, nộp quỹ và nhận sơ đồ chiến thuật tự động
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ========================================================
              MÀN HÌNH 2: BƯỚC XÁC THỰC SỐ ĐIỆN THOẠI & OTP
              ======================================================== */}
          {step === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="bg-white/95 backdrop-blur-2xl rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-white/40 p-7"
            >
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 mb-2">
                  Bước 1 / 2 • Xác thực nhanh
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  Nhập số điện thoại
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Để ghi danh vào danh sách thi đấu của {teamData.name}
                </p>
              </div>

              <form onSubmit={handleVerifyAuth} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                    Số điện thoại của bạn
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 flex items-center gap-1 text-xs font-extrabold text-gray-700 bg-white py-1 px-2 rounded-full border border-gray-200 shadow-xs pointer-events-none">
                      <span>🇻🇳</span>
                      <span>+84</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full h-14 bg-gray-100 border border-gray-200/80 rounded-full pl-24 pr-4 text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                    Mã OTP (Mô phỏng 6 số)
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        defaultValue={d}
                        className="w-full aspect-square text-center font-mono font-black text-lg bg-gray-100 border border-gray-200 rounded-xl focus:bg-white focus:border-[#22C55E] focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full h-14 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer mt-2"
                >
                  <span>Xác nhận & Điền thông tin cầu thủ</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </motion.button>

                <button
                  type="button"
                  onClick={() => setStep('landing')}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  Quay lại trang thông tin đội
                </button>
              </form>
            </motion.div>
          )}

          {/* ========================================================
              MÀN HÌNH 3: NHẬP PROFILE CẦU THỦ (TÊN, VỊ TRÍ, SỐ ÁO)
              ======================================================== */}
          {step === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="bg-white/95 backdrop-blur-2xl rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-white/40 p-7"
            >
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 mb-2">
                  Bước 2 / 2 • Hoàn tất hồ sơ
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  Thông tin thi đấu của bạn
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đồng đội sẽ thấy số áo và vị trí của bạn trên Sa bàn
                </p>
              </div>

              <form onSubmit={handleFinishJoin} className="space-y-4">
                
                {/* Họ và tên */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                    Họ và tên của bạn *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full h-14 bg-gray-100 border border-gray-200/80 rounded-full px-5 text-sm font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
                  />
                </div>

                {/* Vị trí sở trường dạng Chip buttons */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 block">
                    Vị trí sở trường
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {positions.map((p) => {
                      const isSelected = position === p.label;
                      return (
                        <motion.button
                          key={p.id}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setPosition(p.label)}
                          className={`h-12 rounded-2xl px-3 border font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#22C55E] text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200/70'
                          }`}
                        >
                          <span className="text-base">{p.icon}</span>
                          <span className="truncate">{p.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Số áo yêu thích */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                    Số áo yêu thích
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      required
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                      className="w-20 h-14 bg-gray-100 border border-gray-200/80 rounded-full text-center font-mono font-black text-xl text-[#22C55E] focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
                    />
                    
                    {/* Quick Pick Chips */}
                    <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1">
                      {popularNumbers.map((num) => (
                        <motion.button
                          key={num}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setJerseyNumber(num)}
                          className={`w-9 h-9 rounded-full font-mono text-xs font-black border transition-all duration-200 cursor-pointer shrink-0 flex items-center justify-center ${
                            parseInt(jerseyNumber) === num
                              ? 'bg-slate-900 text-emerald-400 border-slate-900 shadow-xs'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {num}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nút Hoàn tất gia nhập */}
                <div className="pt-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="w-full h-14 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hoàn Tất & Vào Sân Đấu</span>
                  </motion.button>
                </div>

              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Footer */}
      <div className="relative z-10 py-4 text-center text-xs text-emerald-200/60 font-medium">
        No Offside • Quản lý đội bóng phong trào 4.0
      </div>

    </div>
  );
}
