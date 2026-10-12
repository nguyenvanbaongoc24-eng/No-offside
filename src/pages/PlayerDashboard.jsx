import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Check, 
  HelpCircle, 
  X, 
  QrCode, 
  Bell, 
  ChevronRight, 
  Copy, 
  CheckCircle2, 
  Crown,
  Trophy,
  Shield,
  Sparkles,
  Users2
} from 'lucide-react';

export default function PlayerDashboard({ 
  user, 
  currentUserRole = 'player', 
  onToggleRole, 
  onAttendanceChange, 
  onMarkPaid, 
  onResetPaid, 
  onNavigate 
}) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);

  // 3 Teammate avatars for attendance strip
  const teammates = [
    { name: 'Quang Hải', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' },
    { name: 'Hoàng Đức', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60' },
    { name: 'Văn Lâm', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60' },
  ];

  const bankInfo = {
    bankName: 'MB Bank (Quân Đội)',
    accountNumber: '998877665544',
    accountHolder: 'NGUYEN HOANG HAI (THỦ QUỸ)',
    amount: '150.000 đ',
    content: `NO OFFSIDE SO ${user.number} DONG QUY T10`,
    qrUrl: `https://api.vietqr.io/image/970422-998877665544-compact2.png?amount=150000&addInfo=NO%20OFFSIDE%20SO%20${user.number}%20DONG%20QUY%20T10&accountName=NGUYEN%20HOANG%20HAI`
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className="relative min-h-screen text-white pt-2 pb-24 px-1">
      {/* Subtle Liquid Gradient Blobs background effects */}
      <div className="fixed top-[-10%] left-[-15%] w-[320px] h-[320px] rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none"></div>
      <div className="fixed top-[35%] right-[-20%] w-[360px] h-[360px] rounded-full bg-blue-600/15 blur-[110px] pointer-events-none"></div>

      {/* Dev Role Switcher - Gọn nhẹ, tinh tế */}
      <div className="mb-3 px-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Dev Mode
        </span>
        <button
          onClick={onToggleRole}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all border ${
            currentUserRole === 'admin'
              ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
          }`}
          title="Đổi quyền kiểm thử"
        >
          {currentUserRole === 'admin' ? (
            <>
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Đội Trưởng (Admin)</span>
            </>
          ) : (
            <span>Cầu Thủ (Số 9)</span>
          )}
        </button>
      </div>

      {/* 1. HEADER (Gọn gàng hơn) */}
      <header className="flex items-center justify-between mb-4 px-1">
        {/* Nằm ngang: [Avatar] + Cột dọc chữ */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/15"
            />
            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-primary text-[10px] font-black px-1.5 py-0.2 rounded-full border border-primary/40">
              #{user.number}
            </span>
          </div>

          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              Hi, Cầu thủ Số {user.number}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {user.teamName} • {user.role}
            </p>
          </div>
        </div>

        {/* Góc phải: Nút chuông thông báo (Icon kính mờ) */}
        <div className="relative">
          <button 
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="p-2.5 rounded-2xl backdrop-blur-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors relative"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          </button>

          {/* Popup thông báo nhẹ */}
          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl backdrop-blur-xl bg-slate-900/90 border border-white/15 shadow-2xl z-30 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span>🔔 Thông báo đội</span>
                <button onClick={() => setNotificationOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Thứ 6 mang áo xanh neon và có mặt trước 15p khởi động nhé anh em!
              </p>
            </div>
          )}
        </div>
      </header>

      {/* 2. HERO CARD: TRẬN ĐẤU TIẾP THEO (Gộp thông tin & bo góc rounded-3xl) */}
      <section className="rounded-3xl backdrop-blur-lg bg-white/5 border border-white/10 p-5 relative overflow-hidden transition-all duration-300 shadow-xl">
        
        {/* Top bar của thẻ: "Kèo Sân 7" (Badge) | Đếm ngược: "2 ngày 14:30" (Chữ xanh neon) */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            Kèo Sân 7
          </span>
          <span className="text-xs font-bold text-primary font-mono tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            2 ngày 14:30
          </span>
        </div>

        {/* Main info: Tên đối thủ cực to và nổi bật, các tag nhỏ nhắn */}
        <div className="mt-2 mb-3">
          <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
            FC Hàng Xóm
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full text-slate-300 bg-white/10 border border-white/5 font-medium">
              Đá Căng
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full text-slate-300 bg-white/10 border border-white/5 font-medium">
              Cưa 50/50
            </span>
          </div>
        </div>

        {/* Details: Icon Lịch + Thời gian | Icon Map + Sân (Text xám sáng dịu mắt) */}
        <div className="pt-3.5 border-t border-white/10 space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-200">18:30 • Thứ 6, 24/10</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-200">Sân Chuyên Việt (Sân 3)</span>
          </div>
        </div>

        {/* 3. ATTENDANCE ACTION (Khu vực Vote thanh thoát) */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2.5">
            {/* 1. Nút Có mặt */}
            <button
              onClick={() => onAttendanceChange('attending')}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 ${
                user.nextMatchAttendance === 'attending'
                  ? 'border-2 border-primary text-primary shadow-[0_0_15px_rgba(0,255,102,0.3)] bg-primary/10 font-bold'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>⚽</span>
                {user.nextMatchAttendance === 'attending' && (
                  <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                )}
              </div>
              <span className="font-bold">Có mặt</span>
            </button>

            {/* 2. Nút 50/50 */}
            <button
              onClick={() => onAttendanceChange('maybe')}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 ${
                user.nextMatchAttendance === 'maybe'
                  ? 'border-2 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-amber-400/10 font-bold'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>🤔</span>
                {user.nextMatchAttendance === 'maybe' && (
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                )}
              </div>
              <span className="font-bold">50 / 50</span>
            </button>

            {/* 3. Nút Báo vắng */}
            <button
              onClick={() => onAttendanceChange('absent')}
              className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 ${
                user.nextMatchAttendance === 'absent'
                  ? 'border-2 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-500/10 font-bold'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>❌</span>
                {user.nextMatchAttendance === 'absent' && (
                  <X className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                )}
              </div>
              <span className="font-bold">Báo vắng</span>
            </button>
          </div>

          {/* Dải nhỏ góc dưới: 3 avatar đồng đội xếp chồng + text */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {teammates.map((tm, idx) => (
                  <img
                    key={idx}
                    className="w-6 h-6 rounded-full ring-2 ring-slate-900 object-cover"
                    src={tm.avatar}
                    alt={tm.name}
                  />
                ))}
              </div>
              <span className="text-slate-400 text-xs font-medium">
                14 người đã chốt có mặt
              </span>
            </div>

            <span className="text-[11px] font-semibold text-primary/80">
              Đủ 2 đội ⚽
            </span>
          </div>
        </div>
      </section>

      {/* 4. FINANCE CARD (Quỹ Đội) */}
      <section className="rounded-3xl backdrop-blur-lg bg-white/5 border border-white/10 p-5 mt-4 transition-all duration-300 shadow-xl">
        {/* Tiêu đề nhỏ: "QUỸ ĐỘI THÁNG 10" - Label đỏ: "Chưa đóng" (hoặc xanh: "Đã đóng đủ") */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            QUỸ ĐỘI THÁNG 10
          </span>
          {user.isFundPaid ? (
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" /> Đã đóng đủ
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
              Chưa đóng
            </span>
          )}
        </div>

        {/* Trung tâm: Số tiền "-150.000 đ" thật to, màu đỏ; Chi tiết nhỏ bên dưới "(Tiền sân + Nước)" */}
        <div className="mt-3.5 mb-4">
          {user.isFundPaid ? (
            <div className="text-3xl font-black text-primary font-mono tracking-tight">
              0 đ
            </div>
          ) : (
            <div className="text-3xl font-black text-red-400 font-mono tracking-tight">
              -150.000 đ
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1 font-medium">
            (Tiền sân + Nước)
          </p>
        </div>

        {/* Nút "Quét QR đóng quỹ": Ghost Button (Viền Xanh Neon, chữ Xanh Neon, nền trong suốt) */}
        {user.isFundPaid ? (
          <button
            onClick={onResetPaid}
            className="w-full py-3 rounded-2xl border border-white/15 text-slate-400 hover:text-white hover:bg-white/5 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            Reset lại trạng thái nợ để thử nghiệm
          </button>
        ) : (
          <button
            onClick={() => setShowQrModal(true)}
            className="w-full py-3 rounded-2xl border border-primary text-primary hover:bg-primary/10 font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.15)] active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4" />
            <span>Quét QR đóng quỹ</span>
          </button>
        )}
      </section>

      {/* 5. THỐNG KÊ CÁ NHÂN MÙA NÀY (Thanh thoát, bo tròn rounded-3xl) */}
      <section className="rounded-3xl backdrop-blur-lg bg-white/5 border border-white/10 p-5 mt-4 transition-all duration-300 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Thống Kê Cá Nhân Mùa Này</h3>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            Mùa Giải 2026
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Số trận</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">{user.stats.matches}</p>
            <span className="text-[10px] text-slate-400">Đá chính 100%</span>
          </div>

          <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20">
            <p className="text-xs text-primary font-medium">Bàn thắng</p>
            <p className="text-2xl font-black text-primary mt-1 font-mono">{user.stats.goals}</p>
            <span className="text-[10px] text-primary/80 font-bold">2.4 bàn/trận</span>
          </div>

          <div className="bg-white/[0.04] p-3 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Kiến tạo</p>
            <p className="text-2xl font-black text-amber-300 mt-1 font-mono">{user.stats.assists}</p>
            <span className="text-[10px] text-slate-400">Top 2 của đội</span>
          </div>
        </div>
      </section>

      {/* 6. SA BÀN CHIẾN THUẬT TEASER */}
      <section 
        onClick={() => onNavigate && onNavigate('lineup')}
        className="rounded-3xl backdrop-blur-lg bg-white/5 border border-white/10 p-4 mt-4 cursor-pointer hover:border-primary/40 transition-all duration-300 group flex items-center justify-between shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-base">
            ⚽
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              Sa Bàn Chiến Thuật Sân 7
            </h4>
            <p className="text-xs text-slate-400">Sơ đồ 2-3-1 • Đã xếp 7/7 vị trí</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </section>

      {/* MODAL QUÉT QR ĐÓNG QUỸ (Kính mờ thanh thoát) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl backdrop-blur-2xl bg-slate-900/90 p-5 border border-white/20 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">VietQR Đóng Quỹ Đội</h3>
                  <p className="text-[11px] text-slate-400">Quét qua bất kỳ app ngân hàng / MoMo nào</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="mt-4 p-3 bg-white rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <img 
                src={bankInfo.qrUrl} 
                alt="VietQR Code" 
                className="w-44 h-44 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="w-44 h-44 bg-slate-900 rounded-xl items-center justify-center flex-col text-center p-3">
                <QrCode className="w-14 h-14 text-primary mb-2" />
                <span className="text-xs font-mono text-primary">MB BANK: {bankInfo.accountNumber}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-bold mt-1 text-center">
                Quét tự động điền STK & Nội dung
              </p>
            </div>

            {/* Bank details with copy buttons */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Ngân hàng</span>
                  <span className="font-bold text-white">{bankInfo.bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Số tài khoản</span>
                  <span className="font-bold font-mono text-primary text-sm">{bankInfo.accountNumber}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.accountNumber, 'acc')}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Số tiền & Nội dung chuyển</span>
                  <span className="font-bold text-rose-400">{bankInfo.amount}</span>
                  <p className="text-[10px] font-mono text-slate-300">{bankInfo.content}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.content, 'content')}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium"
                >
                  {copiedField === 'content' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            {/* Action Submit */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  onMarkPaid();
                  setShowQrModal(false);
                }}
                className="w-full py-3 rounded-2xl border border-primary text-primary hover:bg-primary/10 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.2)] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tôi Đã Chuyển Khoản Xong</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
