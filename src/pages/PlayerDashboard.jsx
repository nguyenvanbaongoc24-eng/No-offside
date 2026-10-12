import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  AlertCircle,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function PlayerDashboard({ 
  user, 
  currentUserRole = 'player', 
  onToggleRole, 
  onAttendanceChange, 
  onMarkPaid, 
  onResetPaid, 
  onNavigate,
  onOpenNotifications,
  treasurerQr,
  onUpdateMatchStats
}) {
  // Modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAdminApproveModal, setShowAdminApproveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceActiveTab, setAttendanceActiveTab] = useState('attending'); // 'attending' | 'maybe' | 'absent' | 'unvoted'
  const [copiedField, setCopiedField] = useState('');

  // Weekly matches count (Requirement: Max 4 matches per week)
  const [weeklyMatchesCount, setWeeklyMatchesCount] = useState(2);
  const MAX_WEEKLY_MATCHES = 4;

  // Match details state
  const [matchInfo, setMatchInfo] = useState({
    title: 'Kèo Sân 7 — FC Hàng Xóm',
    category: 'Kèo Sân 7',
    dateText: '18:30 • Thứ 6, 24/10',
    venue: 'Sân Chuyên Việt (Sân 3) - 18D Cộng Hòa',
    deadlineHoursLeft: 2,
    penaltyEnabled: true,
    penaltyAmount: '50.000 đ'
  });

  // Match Status: 'upcoming' | 'completed' (Cho phép tự báo cáo thành tích sau trận)
  const [matchStatus, setMatchStatus] = useState('upcoming');
  const [goalsReported, setGoalsReported] = useState(2);
  const [assistsReported, setAssistsReported] = useState(1);
  const [statsSaved, setStatsSaved] = useState(false);

  const handleSaveMatchReport = () => {
    if (onUpdateMatchStats) {
      onUpdateMatchStats(goalsReported, assistsReported);
    }
    setStatsSaved(true);
    setTimeout(() => setStatsSaved(false), 3000);
  };

  // Real-time countdown state (Requirement: Real-time countdown like "Còn 02:15:30 để chốt danh sách")
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 15, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = () => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  };

  // Mock Attendance Roster with 4 tabs: [Có mặt] - [50/50] - [Báo vắng] - [Chưa điểm danh (Mới)]
  const [roster, setRoster] = useState({
    attending: [
      { id: 1, name: 'Tuấn Hưng (Bạn)', number: 9, role: 'ST', avatar: user.avatar },
      { id: 2, name: 'Quế Ngọc Hải', number: 3, role: 'CB', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=60' },
      { id: 3, name: 'Nguyễn Quang Hải', number: 19, role: 'RM', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' },
      { id: 4, name: 'Nguyễn Hoàng Đức', number: 14, role: 'CM', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60' },
      { id: 5, name: 'Đoàn Văn Hậu', number: 5, role: 'LB', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&auto=format&fit=crop&q=60' },
      { id: 6, name: 'Đỗ Duy Mạnh', number: 28, role: 'CB', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=60' },
      { id: 7, name: 'Vũ Văn Thanh', number: 17, role: 'LM', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=60' },
      { id: 8, name: 'Đặng Văn Lâm', number: 1, role: 'GK', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60' },
      { id: 9, name: 'Trọng Hoàng', number: 8, role: 'RB', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60' },
      { id: 10, name: 'Tiến Linh', number: 22, role: 'ST', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=60' },
      { id: 11, name: 'Bùi Tiến Dũng', number: 4, role: 'CB', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=60' },
      { id: 12, name: 'Phan Văn Đức', number: 20, role: 'LW', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=60' },
      { id: 13, name: 'Lương Xuân Trường', number: 6, role: 'CM', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&auto=format&fit=crop&q=60' },
      { id: 14, name: 'Bùi Tấn Trường', number: 23, role: 'GK', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&auto=format&fit=crop&q=60' },
    ],
    maybe: [
      { id: 15, name: 'Hà Đức Chinh', number: 18, role: 'ST', note: 'Bận họp công ty, cố gắng ra hiệp 2' },
      { id: 16, name: 'Nguyễn Phong Hồng Duy', number: 7, role: 'LWB', note: 'Chờ kết quả hồi phục mắt cá' },
    ],
    absent: [
      { id: 17, name: 'Đỗ Hùng Dũng', number: 88, role: 'CM', note: 'Về quê đám cưới' },
      { id: 18, name: 'Trần Đình Trọng', number: 21, role: 'CB', note: 'Trị liệu chấn thương dây chằng' },
    ],
    unvoted: [
      { id: 19, name: 'Nguyễn Tuấn Anh', number: 11, role: 'CM', phone: '0901234567' },
      { id: 20, name: 'Hồ Tấn Tài', number: 13, role: 'RB', phone: '0907654321' },
    ]
  });

  // Create match form fields
  const [newMatchData, setNewMatchData] = useState({
    opponent: '',
    datetime: '2026-10-24T18:30',
    venue: 'Sân bóng Chuyên Việt (Sân 3)',
    timeoutDatetime: '2026-10-24T12:00',
    penaltyEnabled: true,
    penaltyFine: '50000',
  });

  // Mock pending payments for Admin approval
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, name: 'Nguyễn Quang Hải (#19)', amount: '150.000 đ', time: '10 phút trước', bank: 'Vietcombank' },
    { id: 2, name: 'Đoàn Văn Hậu (#5)', amount: '150.000 đ', time: '35 phút trước', bank: 'MB Bank' },
    { id: 3, name: 'Bùi Tiến Dũng (#4)', amount: '150.000 đ', time: '1 giờ trước', bank: 'Techcombank' }
  ]);

  const teammatesPreview = [
    { name: 'Quang Hải', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' },
    { name: 'Hoàng Đức', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60' },
    { name: 'Văn Lâm', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60' },
  ];

  const bankInfo = {
    bankName: treasurerQr?.bankName || 'MB Bank (Quân Đội)',
    accountNumber: treasurerQr?.accountNumber || '998877665544',
    accountHolder: treasurerQr?.accountHolder || 'NGUYEN HOANG HAI (THỦ QUỸ)',
    amount: '150.000 đ',
    content: `NO OFFSIDE SO ${user.number} DONG QUY T10`,
    qrUrl: treasurerQr?.qrImageUrl || `https://api.vietqr.io/image/970422-998877665544-compact2.png?amount=150000&addInfo=NO%20OFFSIDE%20SO%20${user.number}%20DONG%20QUY%20T10&accountName=NGUYEN%20HOANG%20HAI`
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const approvePayment = (id) => {
    setPendingApprovals(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateMatchSubmit = (e) => {
    e.preventDefault();
    if (weeklyMatchesCount >= MAX_WEEKLY_MATCHES) {
      alert('Đã đạt giới hạn tối đa 4 trận trong tuần này! Không thể tạo thêm.');
      return;
    }
    setWeeklyMatchesCount(prev => prev + 1);
    setMatchInfo({
      title: `Kèo Sân 7 — ${newMatchData.opponent || 'FC Đối Thủ Mới'}`,
      category: 'Kèo Sân 7',
      dateText: newMatchData.datetime.replace('T', ' • '),
      venue: newMatchData.venue,
      deadlineHoursLeft: 4,
      penaltyEnabled: newMatchData.penaltyEnabled,
      penaltyAmount: `${parseInt(newMatchData.penaltyFine || 50000).toLocaleString('vi-VN')} đ`
    });
    setShowCreateMatchModal(false);
    alert('✅ Trận đấu mới đã được tạo và gửi thông báo chốt điểm danh tới cả đội!');
  };

  const handleRemindUnvoted = (playerName) => {
    alert(`📢 Đã gửi thông báo nhắc điểm danh trận đấu tới ${playerName}!`);
  };

  const handleFineUnvoted = (playerName) => {
    alert(`⚠️ Đã ghi nhận phạt quỹ 50.000đ cho ${playerName} vì không điểm danh đúng hạn!`);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-24 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* =========================================================
          1. HEADER DARK STYLE VỚI PATTERN MỜ (SLATE-900)
          ========================================================= */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-12 px-5 rounded-b-[36px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        
        {/* Top bar: Avatar + Team info bên trái, Role Switcher & Bell bên phải */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-400/80 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-slate-900 shadow">
                #{user.number}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-300 font-bold block tracking-tight">
                {user.teamName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] bg-white/10 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                  {currentUserRole === 'admin' ? (
                    <>
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>👑 Đội Trưởng</span>
                    </>
                  ) : (
                    <span>⚽ {user.role}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Dev Role Switcher */}
            <button
              onClick={onToggleRole}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all duration-200 active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer ${
                currentUserRole === 'admin'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20'
                  : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/20'
              }`}
              title="Chuyển đổi vai trò Admin / Cầu thủ"
            >
              {currentUserRole === 'admin' ? (
                <>
                  <Crown className="w-3 h-3" />
                  <span>Admin</span>
                </>
              ) : (
                <span>Số 9</span>
              )}
            </button>

            {/* Admin Settings Button */}
            {currentUserRole === 'admin' && (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-all duration-200 active:scale-95 border border-white/10 cursor-pointer"
                title="Cài đặt đội bóng"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Bell Notifications Button */}
            <button 
              onClick={onOpenNotifications}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-all duration-200 active:scale-95 relative border border-white/10 cursor-pointer"
              title="Thông báo đội"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          </div>
        </div>

        {/* Greeting Banner */}
        <div className="relative z-10 mt-1">
          <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
            {currentUserRole === 'admin' ? 'Bảng Điều Khiển Quản Trị' : 'Chào Mừng Trở Lại'}
          </p>
          <h1 className="text-xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
            <span>{currentUserRole === 'admin' ? 'Đội Trưởng Tuấn Hưng' : `Cầu thủ Số ${user.number}`}</span>
            {currentUserRole === 'admin' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tuần này: {weeklyMatchesCount}/4 trận
              </span>
            )}
          </h1>
        </div>
      </section>

      {/* =========================================================
          2. CARDS CONTAINER VỚI TIGHT SPACING & MOTION
          ========================================================= */}
      <div className="px-3.5 space-y-3 -mt-6 relative z-10">

        {/* CARD 1: TRẬN ĐẤU TIẾP THEO & BỘ ĐẾM NGƯỢC REAL-TIME */}
        <section className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100 transition-all">
          
          {/* Top Bar Card 1 */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                {matchInfo.category}
              </span>
              {matchInfo.penaltyEnabled && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200/70 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Phạt {matchInfo.penaltyAmount}</span>
                </span>
              )}
            </div>

            {/* Match Status Switcher & Controls */}
            <div className="flex items-center gap-1.5">
              {/* Quick Status Pill */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-full border border-gray-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setMatchStatus('upcoming')}
                  className={`px-2 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                    matchStatus === 'upcoming'
                      ? 'bg-white text-emerald-700 shadow-xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Chuyển trạng thái: Trận sắp đá"
                >
                  ⏳ Sắp đá
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatus('completed')}
                  className={`px-2 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                    matchStatus === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Chuyển trạng thái: Trận đã xong (Mở tự báo cáo bàn thắng/kiến tạo)"
                >
                  🏆 Đã xong
                </button>
              </div>

              {currentUserRole === 'admin' ? (
                <div className="flex items-center gap-1">
                  <button
                    disabled={weeklyMatchesCount >= MAX_WEEKLY_MATCHES}
                    onClick={() => setShowCreateMatchModal(true)}
                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] flex items-center gap-1 transition-all duration-200 shadow-sm ${
                      weeklyMatchesCount >= MAX_WEEKLY_MATCHES
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer shadow-emerald-600/20'
                    }`}
                    title={weeklyMatchesCount >= MAX_WEEKLY_MATCHES ? 'Đã đạt giới hạn 4 trận/tuần' : 'Tạo kèo trận mới'}
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>+ Kèo</span>
                  </button>
                  <button
                    onClick={() => setShowCreateMatchModal(true)}
                    className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all duration-200 cursor-pointer"
                    title="Sửa trận"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                matchStatus === 'upcoming' && (
                  <div className="hidden sm:flex items-center gap-1 bg-rose-50 border border-rose-200/80 text-rose-700 px-2 py-0.5 rounded-full font-mono font-black text-[10px]">
                    <Clock className="w-3 h-3 text-rose-600 animate-pulse" />
                    <span>{formatCountdown()}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Tiêu đề trận đấu */}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            {matchInfo.title}
          </h2>

          {/* Chi tiết thời gian & địa điểm */}
          <div className="mt-2 space-y-1.5 text-xs text-gray-600 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-gray-800">{matchInfo.dateText}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-gray-600">{matchInfo.venue}</span>
            </div>
          </div>

          {/* Dòng Real-time Countdown Banner to rõ cho cả Admin & Thành viên */}
          <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                ⏳
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-900 uppercase">Hạn Chốt Điểm Danh</p>
                <p className="text-xs font-black text-amber-700 font-mono tracking-tight">
                  Còn {formatCountdown()} để chốt danh sách
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
              {matchInfo.penaltyEnabled ? 'Có phạt quỹ' : 'Tự do'}
            </span>
          </div>

          {/* Body Card 1 theo vai trò */}
          {currentUserRole === 'admin' ? (
            /* ADMIN VIEW: Tiến độ & nút mở danh sách 4 Tab */
            <div className="mt-3.5 pt-3 border-t border-gray-100">
              <div className="bg-gray-50/90 p-3 rounded-2xl border border-gray-100 mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Users2 className="w-4 h-4 text-emerald-600" />
                    Điểm danh cả đội:
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full font-mono">
                    {roster.attending.length}/20 người
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden flex shadow-inner">
                  <div className="bg-emerald-600 h-full transition-all" style={{ width: '70%' }} title="Có mặt (14)"></div>
                  <div className="bg-amber-400 h-full transition-all" style={{ width: '10%' }} title="50/50 (2)"></div>
                  <div className="bg-rose-400 h-full transition-all" style={{ width: '10%' }} title="Vắng (2)"></div>
                  <div className="bg-gray-400 h-full transition-all" style={{ width: '10%' }} title="Chưa vote (2)"></div>
                </div>

                <div className="flex justify-between text-[10px] font-bold text-gray-600">
                  <span className="text-emerald-700">⚽ Có mặt: {roster.attending.length}</span>
                  <span className="text-amber-600">🤔 50/50: {roster.maybe.length}</span>
                  <span className="text-rose-600">❌ Vắng: {roster.absent.length}</span>
                  <span className="text-gray-500">❓ Chưa: {roster.unvoted.length}</span>
                </div>
              </div>

              {/* Nút mở Modal 4 Tab Điểm Danh */}
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="w-full py-2.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xem danh sách 4 nhóm điểm danh (20 người)</span>
              </button>
            </div>
          ) : (
            /* PLAYER VIEW: 3 Nút Vote & Thông tin chốt */
            <div className="mt-3.5 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onAttendanceChange('attending')}
                  className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    user.nextMatchAttendance === 'attending'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <span>⚽ Có mặt</span>
                  {user.nextMatchAttendance === 'attending' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <button
                  onClick={() => onAttendanceChange('maybe')}
                  className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    user.nextMatchAttendance === 'maybe'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500/20'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80 border border-gray-200'
                  }`}
                >
                  <span>🤔 50/50</span>
                </button>

                <button
                  onClick={() => onAttendanceChange('absent')}
                  className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                    user.nextMatchAttendance === 'absent'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500/20'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80 border border-gray-200'
                  }`}
                >
                  <span>❌ Báo vắng</span>
                </button>
              </div>

              {/* Roster trigger button */}
              <div 
                onClick={() => setShowAttendanceModal(true)}
                className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50/80 p-1.5 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {teammatesPreview.map((tm, idx) => (
                      <img
                        key={idx}
                        className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                        src={tm.avatar}
                        alt={tm.name}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 font-medium">
                    {roster.attending.length} người đã chốt có mặt
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                  Xem 4 tab <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            THẺ THỐNG KÊ CÁ NHÂN (SELF-REPORTING SAU TRẬN)
            Yêu cầu 5: Sau khi trận đấu kết thúc (status = completed), ở Tab Trang chủ
            hiện thêm một thẻ nhỏ: "Cập nhật thành tích trận [Tên Đối Thủ]"
            với nút +/- bàn thắng, kiến tạo và "Lưu thành tích".
            ========================================================= */}
        {matchStatus === 'completed' && (
          <motion.section 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-emerald-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none -z-0" />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    Trận đấu đã kết thúc
                  </span>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">
                    Cập nhật thành tích trận {matchInfo.title.replace('Kèo Sân 7 — ', '')}
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-100">
                Tự nguyện
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3 relative z-10">
              Tự điền số bàn thắng và kiến tạo của bạn để hệ thống cập nhật vào BXH mùa giải:
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-3.5 relative z-10">
              {/* Goals Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1">
                  ⚽ Bàn thắng (Goals)
                </span>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setGoalsReported(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-black text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </motion.button>
                  <span className="text-2xl font-black text-emerald-600 font-mono w-6 text-center">
                    {goalsReported}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setGoalsReported(prev => prev + 1)}
                    className="w-8 h-8 rounded-full bg-emerald-600 shadow-xs text-white flex items-center justify-center font-black text-base hover:bg-emerald-700 active:scale-95 cursor-pointer"
                  >
                    +
                  </motion.button>
                </div>
              </div>

              {/* Assists Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1">
                  👟 Kiến tạo (Assists)
                </span>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setAssistsReported(prev => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-black text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </motion.button>
                  <span className="text-2xl font-black text-amber-600 font-mono w-6 text-center">
                    {assistsReported}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setAssistsReported(prev => prev + 1)}
                    className="w-8 h-8 rounded-full bg-amber-500 shadow-xs text-white flex items-center justify-center font-black text-base hover:bg-amber-600 active:scale-95 cursor-pointer"
                  >
                    +
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveMatchReport}
              className={`w-full py-3 rounded-full text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                statsSaved 
                  ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {statsSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Đã lưu thành công (+{goalsReported} bàn, +{assistsReported} kiến tạo)!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Lưu thành tích</span>
                </>
              )}
            </motion.button>
          </motion.section>
        )}

        {/* CARD 2: TÀI CHÍNH & QUỸ ĐỘI PREVIEW */}
        <section className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100 transition-all">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              {currentUserRole === 'admin' ? 'TỔNG QUAN QUỸ TOÀN ĐỘI' : 'TÀI CHÍNH & QUỸ ĐỘI'}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">
              Tháng 10/2026
            </span>
          </div>

          {currentUserRole === 'admin' ? (
            /* Admin Summary */
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 block">Tổng Quỹ Hiện Tại</span>
                  <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">+5.850.000 đ</span>
                  <span className="text-[10px] text-emerald-600">Đã chốt sổ T9</span>
                </div>

                <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-700 block">Chưa Nộp Quỹ</span>
                  <span className="text-lg font-black text-rose-600 font-mono mt-0.5 block">6/20 Người</span>
                  <span className="text-[10px] text-rose-500 font-medium">Tổng nợ: 900.000 đ</span>
                </div>
              </div>

              {/* 2 Nút hành động Admin */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onNavigate && onNavigate('fund')}
                  className="py-2.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sổ Quỹ Chi Tiết</span>
                </button>

                <button
                  onClick={() => setShowAdminApproveModal(true)}
                  className="py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Duyệt tiền ({pendingApprovals.length})</span>
                </button>
              </div>
            </div>
          ) : (
            /* Member Personal Debt & VietQR Pay */
            <div className="divide-y divide-gray-100">
              <div className="py-2.5 px-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Trạng thái đóng quỹ</p>
                    <p className="text-[10px] text-gray-400">Tiền sân + Nước tháng 10</p>
                  </div>
                </div>

                <div className="text-right">
                  {user.isFundPaid ? (
                    <span className="text-xs font-black text-emerald-600 font-mono bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Đã đóng đủ ✓
                    </span>
                  ) : (
                    <span className="text-sm font-black text-rose-500 font-mono">
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
                className="w-full py-2.5 px-1 flex items-center justify-between hover:bg-gray-50/80 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {user.isFundPaid ? 'Reset lại nợ để kiểm thử' : 'Thanh toán QR (VietQR)'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {user.isFundPaid ? 'Click để đưa về trạng thái nợ' : 'Quét mã tự động điền STK & nội dung'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-700 transition-colors">
                  <span className="text-[11px] font-bold text-emerald-600">Quét ngay</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </section>

        {/* CARD 3: THỐNG KÊ & TEASER SA BÀN CHIẾN THUẬT */}
        <section className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100 transition-all">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-gray-800">
                {currentUserRole === 'admin' ? 'Thống Kê Thành Tích Cả Đội' : 'Thống Kê Cá Nhân Mùa Này'}
              </h3>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Mùa 2026</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50/90 p-2.5 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">Số trận</p>
              <p className="text-xl font-black text-gray-900 mt-0.5 font-mono">{user.stats.matches}</p>
              <span className="text-[9px] text-gray-400">Đá chính 100%</span>
            </div>
            <div className="bg-emerald-50/90 p-2.5 rounded-2xl border border-emerald-100">
              <p className="text-[10px] text-emerald-700 font-medium">Bàn thắng</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5 font-mono">{user.stats.goals}</p>
              <span className="text-[9px] text-emerald-600 font-bold">2.4 bàn/trận</span>
            </div>
            <div className="bg-gray-50/90 p-2.5 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">Kiến tạo</p>
              <p className="text-xl font-black text-amber-600 mt-0.5 font-mono">{user.stats.assists}</p>
              <span className="text-[9px] text-gray-400">Top 2 của đội</span>
            </div>
          </div>

          {/* Quick link to Lineup builder */}
          <div 
            onClick={() => onNavigate && onNavigate('lineup')}
            className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 p-2 rounded-2xl transition-all duration-200 active:scale-95 group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                ⚽
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  Sa Bàn Chiến Thuật Sân 7
                </p>
                <p className="text-[10px] text-gray-400">Sơ đồ 2-3-1 • Bấm vào để xếp đội hình</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-emerald-100 group-hover:text-emerald-700 flex items-center justify-center text-gray-400 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </section>

      </div>

      {/* =========================================================
          3. MODAL 4 TAB ĐIỂM DANH (YÊU CẦU 3: CÓ MẶT - 50/50 - VẮNG - CHƯA ĐIỂM DANH)
          ========================================================= */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-base text-gray-900">Danh Sách Điểm Danh</h3>
                  <p className="text-[10px] text-gray-400">Trận thứ 6 • 20 thành viên toàn đội</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAttendanceModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Tabs Selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl mt-3 text-xs font-bold text-center">
              <button
                onClick={() => setAttendanceActiveTab('attending')}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === 'attending' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Có mặt ({roster.attending.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab('maybe')}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === 'maybe' 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                50/50 ({roster.maybe.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab('absent')}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === 'absent' 
                    ? 'bg-rose-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vắng ({roster.absent.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab('unvoted')}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === 'unvoted' 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Chưa vote ({roster.unvoted.length})
              </button>
            </div>

            {/* List Content */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 max-h-72 pr-1">
              {attendanceActiveTab === 'attending' && (
                roster.attending.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-gray-400">Vị trí: {p.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Sẵn sàng
                    </span>
                  </div>
                ))
              )}

              {attendanceActiveTab === 'maybe' && (
                roster.maybe.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-amber-700 italic">{p.note}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      50 / 50
                    </span>
                  </div>
                ))
              )}

              {attendanceActiveTab === 'absent' && (
                roster.absent.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-rose-600 italic">{p.note}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Báo vắng
                    </span>
                  </div>
                ))
              )}

              {/* TAB CHƯA ĐIỂM DANH (MỚI) */}
              {attendanceActiveTab === 'unvoted' && (
                roster.unvoted.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    🎉 Tất cả 20 thành viên đã hoàn thành điểm danh!
                  </div>
                ) : (
                  roster.unvoted.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-black text-xs flex items-center justify-center">
                          #{p.number}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-400">Vị trí: {p.role} • {p.phone}</p>
                        </div>
                      </div>

                      {currentUserRole === 'admin' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRemindUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                          >
                            🔔 Nhắc
                          </button>
                          <button
                            onClick={() => handleFineUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] active:scale-95 transition-all cursor-pointer"
                          >
                            ⚠️ Phạt quỹ
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          Chưa vote
                        </span>
                      )}
                    </div>
                  ))
                )
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. BOTTOM SHEET TẠO/SỬA TRẬN ĐẤU (ADMIN ONLY)
          (YÊU CẦU 3: TỐI ĐA 4 TRẬN/TUẦN, NATIVE DATETIME PICKER, COUNTDOWN TIMEOUT, PHẠT TIỀN QUỸ)
          ========================================================= */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white p-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 text-gray-900 animate-in slide-in-from-bottom duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Tạo Kèo Trận Đấu Mới</h3>
                  <p className="text-[10px] text-gray-400">
                    Giới hạn: Đã tạo {weeklyMatchesCount}/4 trận trong tuần
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateMatchModal(false)} 
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning if reached 4 matches limit */}
            {weeklyMatchesCount >= MAX_WEEKLY_MATCHES && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Đã đạt giới hạn tối đa 4 trận/tuần của đội! Hãy xóa hoặc chờ sang tuần mới.</span>
              </div>
            )}

            <form onSubmit={handleCreateMatchSubmit} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="text-gray-700 block mb-1 font-bold">Tên Đối Thủ / Tên Trận</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: FC Phủi Sài Gòn" 
                  value={newMatchData.opponent}
                  onChange={(e) => setNewMatchData({ ...newMatchData, opponent: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>

              {/* NATIVE DATETIME PICKER (ĐƯỢC STYLE LẠI CHO MOBILE) */}
              <div>
                <label className="text-gray-700 block mb-1 font-bold">Ngày Giờ Thi Đấu</label>
                <input 
                  type="datetime-local" 
                  required
                  value={newMatchData.datetime}
                  onChange={(e) => setNewMatchData({ ...newMatchData, datetime: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Chọn ngày & giờ bóng lăn trực tiếp trên điện thoại</span>
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Địa Điểm Sân Bóng</label>
                <input 
                  type="text" 
                  required
                  placeholder="Sân bóng Chuyên Việt (Sân 3) - 18D Cộng Hòa" 
                  value={newMatchData.venue}
                  onChange={(e) => setNewMatchData({ ...newMatchData, venue: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>

              {/* CÀI ĐẶT THỜI GIAN ĐẾM NGƯỢC (TIME-OUT) CHO VIỆC VOTE ĐIỂM DANH */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="text-amber-900 block font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Hạn Chót Điểm Danh (Time-out Countdown)</span>
                </label>
                <input 
                  type="datetime-local" 
                  required
                  value={newMatchData.timeoutDatetime}
                  onChange={(e) => setNewMatchData({ ...newMatchData, timeoutDatetime: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-gray-900 font-bold focus:outline-none" 
                />
                <span className="text-[10px] text-amber-800 block">Sau thời điểm này, hệ thống sẽ tự động khóa vote và đếm danh sách.</span>

                {/* CHECKBOX: PHẠT TIỀN QUỸ NẾU KHÔNG VOTE KHI HẾT HẠN */}
                <div className="pt-2 border-t border-amber-200/60">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={newMatchData.penaltyEnabled}
                      onChange={(e) => setNewMatchData({ ...newMatchData, penaltyEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <span className="font-extrabold text-amber-950">Phạt tiền quỹ nếu không vote khi hết hạn</span>
                  </label>

                  {newMatchData.penaltyEnabled && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-amber-900 font-medium">Mức phạt:</span>
                      <input 
                        type="text" 
                        value={newMatchData.penaltyFine}
                        onChange={(e) => setNewMatchData({ ...newMatchData, penaltyFine: e.target.value })}
                        className="w-28 bg-white border border-amber-300 rounded-lg px-2 py-1 font-mono font-bold text-rose-600 text-xs" 
                      />
                      <span className="text-xs font-bold text-gray-700">VNĐ / người</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2">
                <button
                  type="submit"
                  disabled={weeklyMatchesCount >= MAX_WEEKLY_MATCHES}
                  className={`w-full py-3.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    weeklyMatchesCount >= MAX_WEEKLY_MATCHES
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Xác Nhận Tạo Trận & Mở Vote</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          5. MODAL VIETQR THANH TOÁN (CHO THÀNH VIÊN)
          ========================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">VietQR Quỹ Đội</h3>
                  <p className="text-[10px] text-gray-400">Quét qua MoMo hoặc App Ngân Hàng</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3.5 p-3.5 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
              <img 
                src={bankInfo.qrUrl} 
                alt="VietQR Code" 
                className="w-40 h-40 object-contain rounded-xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="w-40 h-40 bg-white rounded-xl items-center justify-center flex-col text-center p-3">
                <QrCode className="w-12 h-12 text-emerald-600 mb-1" />
                <span className="text-xs font-mono font-bold text-gray-800">MB: {bankInfo.accountNumber}</span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold mt-2 text-center">
                Mã QR tự động nhập 150.000 đ & Nội dung số áo #{user.number}
              </p>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Số tài khoản</span>
                  <span className="font-bold font-mono text-emerald-600 text-sm">{bankInfo.accountNumber}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.accountNumber, 'acc')}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-[11px] font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Nội dung chuyển khoản</span>
                  <p className="text-[10px] font-mono font-bold text-gray-800">{bankInfo.content}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(bankInfo.content, 'content')}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-[11px] font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === 'content' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => {
                  onMarkPaid();
                  setShowQrModal(false);
                }}
                className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tôi Đã Chuyển Khoản Xong</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          6. MODAL DUYỆT TIỀN (CHO ADMIN)
          ========================================================= */}
      {showAdminApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Duyệt Tiền Đóng Quỹ</h3>
                  <p className="text-[10px] text-gray-400">Xác nhận nộp quỹ của thành viên</p>
                </div>
              </div>
              <button onClick={() => setShowAdminApproveModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  🎉 Đã duyệt hết tất cả các khoản đóng quỹ!
                </div>
              ) : (
                pendingApprovals.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-emerald-600 font-bold">{item.amount} • {item.bank}</p>
                      <span className="text-[9px] text-gray-400">{item.time}</span>
                    </div>
                    <button
                      onClick={() => approvePayment(item.id)}
                      className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
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
                className="w-full py-2.5 rounded-full bg-gray-100 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          7. MODAL CÀI ĐẶT ĐỘI BÓNG (CHO ADMIN)
          ========================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-gray-900">Cài Đặt Đội Bóng</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-bold">Tên Đội Bóng</label>
                <input type="text" defaultValue={user.teamName} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold" />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-bold">Mức Quỹ Tháng (VNĐ)</label>
                <input type="text" defaultValue="150.000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold" />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-bold">STK Nhận Quỹ</label>
                <input type="text" defaultValue="998877665544 (MB Bank)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold" />
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => {
                  alert('✅ Đã cập nhật cài đặt đội bóng!');
                  setShowSettingsModal(false);
                }}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
