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
  CreditCard, 
  Wallet, 
  Trophy, 
  Shield, 
  Sparkles,
  Users2,
  Settings,
  PlusCircle,
  Edit3,
  Crown,
  FileCheck,
  AlertCircle
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
  const [showAdminApproveModal, setShowAdminApproveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Mock pending payments for Admin approval
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, name: 'Nguyễn Quang Hải (#19)', amount: '150.000 đ', time: '10 phút trước', bank: 'Vietcombank' },
    { id: 2, name: 'Đoàn Văn Hậu (#5)', amount: '150.000 đ', time: '35 phút trước', bank: 'MB Bank' },
    { id: 3, name: 'Bùi Tiến Dũng (#4)', amount: '150.000 đ', time: '1 giờ trước', bank: 'Techcombank' }
  ]);

  // 3 Teammate avatars
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

  const approvePayment = (id) => {
    setPendingApprovals(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. CÔNG TẮC GIẢ LẬP QUYỀN (Role Switcher - Chỉ dùng cho Dev) */}
      <div className="pt-2 px-6 flex items-center justify-between text-xs bg-green-700/10 py-1.5 border-b border-green-600/10">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Dev RBAC Switcher
        </span>
        <button
          onClick={onToggleRole}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm ${
            currentUserRole === 'admin'
              ? 'bg-amber-500 text-white shadow-amber-500/20'
              : 'bg-green-600 text-white shadow-green-600/20'
          }`}
          title="Bấm để chuyển đổi giữa Cầu thủ và Đội trưởng (Admin)"
        >
          {currentUserRole === 'admin' ? (
            <>
              <Crown className="w-3.5 h-3.5" />
              <span>Chế độ: Đội Trưởng (Admin)</span>
            </>
          ) : (
            <>
              <span>⚽</span>
              <span>Chế độ: Cầu Thủ (Số 9)</span>
            </>
          )}
        </button>
      </div>

      {/* 2. KHU VỰC HEADER (Hero Section) */}
      <section className="bg-gradient-to-b from-green-600 to-emerald-600 text-white pt-6 pb-20 px-6 rounded-b-[44px] shadow-lg relative overflow-hidden">
        {/* Họa tiết trang trí */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 rounded-full bg-emerald-400/20 blur-xl pointer-events-none"></div>

        {/* Top bar Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/60 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-gray-900 text-emerald-400 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white/50 shadow">
                #{user.number}
              </span>
            </div>
            <div>
              <span className="text-xs text-green-100 font-medium block">
                {user.teamName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full inline-block">
                  {currentUserRole === 'admin' ? '👑 Đội Trưởng (Admin)' : user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Nếu là Admin: Thêm nút Cài đặt đội bóng (Icon bánh răng) theo Phân Quyền Admin.md */}
            {currentUserRole === 'admin' && (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-colors shadow-sm"
                title="Cài đặt đội bóng"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-colors relative shadow-sm"
              title="Thông báo"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-300"></span>
            </button>

            {/* Notification Dropdown */}
            {notificationOpen && (
              <div className="absolute right-0 top-12 w-64 p-3.5 rounded-2xl bg-white text-gray-800 shadow-xl border border-gray-100 z-30 animate-in fade-in duration-200 text-xs">
                <div className="flex items-center justify-between font-bold text-gray-900 mb-1">
                  <span>🔔 Thông báo đội</span>
                  <button onClick={() => setNotificationOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Thứ 6 mang áo xanh lá và có mặt trước 15p khởi động nhé cả đội!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lời chào */}
        <div className="relative z-10 mt-1">
          <p className="text-sm font-medium text-green-100 tracking-wide">
            {currentUserRole === 'admin' ? 'Bảng điều khiển quản trị,' : 'Chào mừng trở lại,'}
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {currentUserRole === 'admin' ? 'Đội Trưởng Hải' : `Cầu thủ Số ${user.number}`}
          </h1>
        </div>
      </section>

      {/* 3. CARD 1: TRẬN ĐẤU TIẾP THEO (CONDITIONAL RENDERING) */}
      <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 -mt-12 relative z-10 mx-4 border border-gray-100/80 transition-all">
        {/* Top Header Card */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200/60">
            Kèo Sân 7
          </span>

          {currentUserRole === 'admin' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCreateMatchModal(true)}
                className="px-3 py-1 rounded-full bg-green-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm hover:bg-green-700 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Tạo trận mới</span>
              </button>
              <button
                onClick={() => alert('Mở bảng chỉnh sửa thông tin trận đấu!')}
                className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-bold text-[11px] hover:bg-gray-200 transition-colors"
              >
                Sửa
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold text-gray-500 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-green-600" />
              2 ngày 14:30
            </span>
          )}
        </div>

        {/* Tiêu đề */}
        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
          Kèo Sân 7 — FC Hàng Xóm
        </h2>

        {/* Chi tiết */}
        <div className="mt-3.5 space-y-2 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span>18:30 • Thứ 6, 24/10</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>Sân Chuyên Việt (Sân 3) - 18D Cộng Hòa</span>
          </div>
        </div>

        {/* Body Card 1 theo vai trò */}
        {currentUserRole === 'admin' ? (
          /* Admin View: Dòng thống kê tổng quan "Đã chốt: 14/20 người" */
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-green-600" />
                  Tiến độ điểm danh cả đội:
                </span>
                <span className="text-xs font-black text-green-700 bg-green-100/80 px-2.5 py-0.5 rounded-full">
                  Đã chốt: 14/20 người
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden flex">
                <div className="bg-green-600 h-full" style={{ width: '70%' }} title="Có mặt (14)"></div>
                <div className="bg-amber-400 h-full" style={{ width: '10%' }} title="50/50 (2)"></div>
                <div className="bg-rose-400 h-full" style={{ width: '20%' }} title="Vắng (4)"></div>
              </div>

              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-green-700">⚽ Có mặt: 14</span>
                <span className="text-amber-600">🤔 50/50: 2</span>
                <span className="text-rose-600">❌ Vắng: 4</span>
              </div>
            </div>

            <button
              onClick={() => alert('Mở danh sách điểm danh chi tiết 20 thành viên!')}
              className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
            >
              Quản lý danh sách điểm danh (20 người)
            </button>
          </div>
        ) : (
          /* Player View: 3 Nút Vote viên thuốc */
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAttendanceChange('attending')}
                className={`rounded-full py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 ${
                  user.nextMatchAttendance === 'attending'
                    ? 'bg-green-600 text-white shadow-md shadow-green-600/30 ring-2 ring-green-600/20'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200/60'
                }`}
              >
                <span>⚽</span>
                <span>Có mặt</span>
                {user.nextMatchAttendance === 'attending' && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </button>

              <button
                onClick={() => onAttendanceChange('maybe')}
                className={`rounded-full py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 ${
                  user.nextMatchAttendance === 'maybe'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                <span>🤔</span>
                <span>50 / 50</span>
              </button>

              <button
                onClick={() => onAttendanceChange('absent')}
                className={`rounded-full py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 ${
                  user.nextMatchAttendance === 'absent'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                <span>❌</span>
                <span>Báo vắng</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {teammates.map((tm, idx) => (
                    <img
                      key={idx}
                      className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                      src={tm.avatar}
                      alt={tm.name}
                    />
                  ))}
                </div>
                <span className="text-gray-500 font-medium">
                  14 người đã chốt có mặt
                </span>
              </div>
              <span className="text-[11px] font-bold text-green-600">
                Đủ quân số ⚽
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 4. CARD 2: TÀI CHÍNH & QUỸ ĐỘI (CONDITIONAL RENDERING) */}
      <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 mx-4 mt-4 border border-gray-100/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {currentUserRole === 'admin' ? 'QUẢN LÝ QUỸ TOÀN ĐỘI' : 'TÀI CHÍNH & QUỸ ĐỘI'}
          </span>
          <span className="text-[11px] font-semibold text-gray-400">
            Tháng 10/2026
          </span>
        </div>

        {currentUserRole === 'admin' ? (
          /* Admin View: Tổng quỹ hiện tại, số người nợ, [+ Tạo khoản thu mới], [Duyệt tiền] */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-green-50/70 p-3.5 rounded-2xl border border-green-100">
                <span className="text-[11px] font-semibold text-green-700 block">Tổng Quỹ Hiện Tại</span>
                <span className="text-xl font-black text-green-700 font-mono mt-0.5 block">+5.850.000 đ</span>
                <span className="text-[10px] text-green-600/80">Đã trừ tiền sân t9</span>
              </div>

              <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-100">
                <span className="text-[11px] font-semibold text-red-600 block">Chưa Nộp Quỹ</span>
                <span className="text-xl font-black text-red-600 font-mono mt-0.5 block">6/20 Người</span>
                <span className="text-[10px] text-red-500/80">Tổng nợ: 900.000 đ</span>
              </div>
            </div>

            {/* 2 Nút hành động của Admin */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => alert('Mở form tạo khoản thu mới cho đội!')}
                className="py-3 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-green-600" />
                <span>+ Tạo khoản thu</span>
              </button>

              <button
                onClick={() => setShowAdminApproveModal(true)}
                className="py-3 px-3 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-600/20 transition-all"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Duyệt tiền ({pendingApprovals.length})</span>
              </button>
            </div>
          </div>
        ) : (
          /* Player View: List Group với nợ cá nhân và nút Quét QR */
          <div className="divide-y divide-gray-100">
            <div className="py-3.5 px-1 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Trạng thái đóng quỹ</p>
                  <p className="text-xs text-gray-400">(Tiền sân + Nước tháng này)</p>
                </div>
              </div>

              <div className="text-right">
                {user.isFundPaid ? (
                  <span className="text-sm font-black text-green-600 font-mono">
                    Đã đóng đủ
                  </span>
                ) : (
                  <span className="text-base font-black text-red-500 font-mono">
                    -150.000 đ
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (user.isFundPaid) {
                  onResetPaid();
                } else {
                  setShowQrModal(true);
                }
              }}
              className="w-full py-3.5 px-1 flex items-center justify-between hover:bg-gray-50/80 rounded-2xl transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {user.isFundPaid ? 'Reset lại nợ để thử nghiệm' : 'Thanh toán QR (VietQR)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.isFundPaid ? 'Click để đưa về trạng thái nợ' : 'Quét mã tự động điền STK & nội dung'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-gray-700 transition-colors">
                <span className="text-xs font-semibold text-green-600 hidden sm:inline">Quét ngay</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        )}
      </section>

      {/* 5. THỐNG KÊ (CÁ NHÂN HOẶC TOÀN ĐỘI) */}
      <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 mx-4 mt-4 border border-gray-100/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">
              {currentUserRole === 'admin' ? 'Thống Kê Thành Tích Cả Đội' : 'Thống Kê Cá Nhân Mùa Này'}
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">Mùa Giải 2026</span>
        </div>

        {currentUserRole === 'admin' ? (
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Trận đã đá</p>
              <p className="text-2xl font-black text-gray-900 mt-1 font-mono">18</p>
              <span className="text-[10px] text-gray-400">14 Thắng • 2 Hòa</span>
            </div>
            <div className="bg-green-50 p-3.5 rounded-2xl border border-green-100">
              <p className="text-xs text-green-700 font-medium">Bàn thắng đội</p>
              <p className="text-2xl font-black text-green-600 mt-1 font-mono">54</p>
              <span className="text-[10px] text-green-600/80 font-bold">3.0 bàn/trận</span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Tỷ lệ thắng</p>
              <p className="text-2xl font-black text-amber-600 mt-1 font-mono">78%</p>
              <span className="text-[10px] text-gray-400">Top 1 cụm sân</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Số trận</p>
              <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{user.stats.matches}</p>
              <span className="text-[10px] text-gray-400">Đá chính 100%</span>
            </div>
            <div className="bg-green-50 p-3.5 rounded-2xl border border-green-100">
              <p className="text-xs text-green-700 font-medium">Bàn thắng</p>
              <p className="text-2xl font-black text-green-600 mt-1 font-mono">{user.stats.goals}</p>
              <span className="text-[10px] text-green-600/80 font-bold">2.4 bàn/trận</span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Kiến tạo</p>
              <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{user.stats.assists}</p>
              <span className="text-[10px] text-gray-400">Top 2 của đội</span>
            </div>
          </div>
        )}
      </section>

      {/* 6. TEASER SA BÀN CHIẾN THUẬT */}
      <section 
        onClick={() => onNavigate && onNavigate('lineup')}
        className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 mx-4 mt-4 border border-gray-100/80 cursor-pointer hover:shadow-md transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg">
            ⚽
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 group-hover:text-green-600 transition-colors">
              Sa Bàn Chiến Thuật Sân 7
            </h4>
            <p className="text-xs text-gray-400">Sơ đồ 2-3-1 • 7/7 vị trí đã sẵn sàng</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </section>

      {/* MODAL DUYỆT TIỀN (CHO ADMIN) */}
      {showAdminApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-green-50 text-green-600">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Duyệt Tiền Đóng Quỹ</h3>
                  <p className="text-[11px] text-gray-400">Xác nhận chuyển khoản của thành viên</p>
                </div>
              </div>
              <button onClick={() => setShowAdminApproveModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  🎉 Đã duyệt hết tất cả các khoản đóng quỹ!
                </div>
              ) : (
                pendingApprovals.map((item) => (
                  <div key={item.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-green-600 font-bold">{item.amount} • {item.bank}</p>
                      <span className="text-[10px] text-gray-400">{item.time}</span>
                    </div>
                    <button
                      onClick={() => approvePayment(item.id)}
                      className="px-3.5 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Duyệt
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowAdminApproveModal(false)}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT ĐỘI BÓNG (CHO ADMIN) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-600" />
                <h3 className="font-extrabold text-base text-gray-900">Cài Đặt Đội Bóng</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-gray-500 block mb-1 font-medium">Tên Đội Bóng</label>
                <input type="text" defaultValue={user.teamName} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="text-gray-500 block mb-1 font-medium">Mức Quỹ Tháng (VNĐ)</label>
                <input type="text" defaultValue="150.000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="text-gray-500 block mb-1 font-medium">STK Nhận Quỹ</label>
                <input type="text" defaultValue="998877665544 (MB Bank)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
            </div>

            <div className="mt-5 pt-2">
              <button
                onClick={() => {
                  alert('Đã cập nhật cài đặt đội bóng!');
                  setShowSettingsModal(false);
                }}
                className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO TRẬN MỚI (CHO ADMIN) */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-extrabold text-base text-gray-900">Tạo Kèo Trận Mới</h3>
              </div>
              <button onClick={() => setShowCreateMatchModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-gray-500 block mb-1 font-medium">Tên Đối Thủ</label>
                <input type="text" placeholder="Ví dụ: FC Phủi Sài Gòn" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="text-gray-500 block mb-1 font-medium">Thời Gian</label>
                <input type="datetime-local" defaultValue="2026-10-24T18:30" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
              <div>
                <label className="text-gray-500 block mb-1 font-medium">Địa Điểm Sân</label>
                <input type="text" placeholder="Sân bóng Chuyên Việt (Sân 3)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900" />
              </div>
            </div>

            <div className="mt-5 pt-2">
              <button
                onClick={() => {
                  alert('Trận mới đã được tạo và mở điểm danh cho toàn đội!');
                  setShowCreateMatchModal(false);
                }}
                className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
              >
                Tạo Trận & Mở Điểm Danh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUÉT QR THANH TOÁN (CHO PLAYER) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-green-50 text-green-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">VietQR Quỹ Đội</h3>
                  <p className="text-[11px] text-gray-400">Quét qua MoMo hoặc Ngân hàng</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
              <img 
                src={bankInfo.qrUrl} 
                alt="VietQR Code" 
                className="w-44 h-44 object-contain rounded-xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="w-44 h-44 bg-white rounded-xl items-center justify-center flex-col text-center p-3">
                <QrCode className="w-14 h-14 text-green-600 mb-2" />
                <span className="text-xs font-mono font-bold text-gray-800">MB: {bankInfo.accountNumber}</span>
              </div>
              <p className="text-[11px] text-gray-500 font-semibold mt-2 text-center">
                Mã QR tự động nhập 150.000 đ & Nội dung
              </p>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Ngân hàng</span>
                  <span className="font-bold text-gray-800">{bankInfo.bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Số tài khoản</span>
                  <span className="font-bold font-mono text-green-600 text-sm">{bankInfo.accountNumber}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.accountNumber, 'acc')}
                  className="px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center gap-1 text-[11px] font-bold text-gray-700"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'acc' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Số tiền & Nội dung</span>
                  <span className="font-bold text-red-500">{bankInfo.amount}</span>
                  <p className="text-[10px] font-mono text-gray-600">{bankInfo.content}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.content, 'content')}
                  className="px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center gap-1 text-[11px] font-bold text-gray-700"
                >
                  {copiedField === 'content' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'content' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="mt-5 pt-2">
              <button
                onClick={() => {
                  onMarkPaid();
                  setShowQrModal(false);
                }}
                className="w-full py-3.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 transition-all active:scale-[0.98]"
              >
                <span>Tôi Đã Chuyển Khoản Xong</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
