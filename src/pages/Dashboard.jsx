import {MapPin,Soccer,HelpCircle,XCircle,PartyPopper} from '../components/icons';
import Pressable from '../components/Pressable';
import React, { useState } from 'react';
import { 
  Shield, 
  CreditCard, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  Bell, 
  ChevronRight, 
  Zap, 
  Sparkles,
  Trophy,
  Activity,
  Share2,
  Settings,
  PlusCircle,
  Edit3,
  Users2,
  DollarSign,
  UserCheck,
  Crown,
  UserCog,
  FileCheck
} from "../components/icons";
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import MatchCard from '../components/matches/MatchCard';

export default function Dashboard({ 
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
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Mock pending payments for Admin approval
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, name: 'Nguyễn Quang Hải (#19)', amount: '150.000 đ', time: '10 phút trước', bank: 'Vietcombank' },
    { id: 2, name: 'Đoàn Văn Hậu (#5)', amount: '150.000 đ', time: '35 phút trước', bank: 'MB Bank' },
    { id: 3, name: 'Bùi Tiến Dũng (#4)', amount: '150.000 đ', time: '1 giờ trước', bank: 'Techcombank' }
  ]);

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
    <div className="relative min-h-screen text-white pb-28 pt-2">
      {/* Liquid Gradient Blobs background effects */}
      <div className="fixed top-[-10%] left-[-15%] w-[320px] h-[320px] rounded-full bg-emerald-500/20 blur-[90px] pointer-events-none animate-pulse-slow"></div>
      <div className="fixed top-[30%] right-[-20%] w-[360px] h-[360px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none animate-float"></div>
      <div className="fixed bottom-[-10%] left-[10%] w-[300px] h-[300px] rounded-full bg-indigo-500/15 blur-[90px] pointer-events-none"></div>

      {/* 1. CÔNG TẮC GIẢ LẬP QUYỀN (Role Switcher - Chỉ dùng cho Dev) */}
      <div className="mb-2 px-1 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Dev Role Switcher:
        </div>
        <Pressable
          onClick={onToggleRole}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-lg ${
            currentUserRole === 'admin'
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 ring-2 ring-amber-400/30'
              : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 ring-2 ring-emerald-400/30'
          }`}
          title="Bấm để đổi giữa quyền Cầu thủ và Đội trưởng (Admin)"
        >
          {currentUserRole === 'admin' ? (
            <>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế độ: Đội Trưởng (Admin)</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chế độ: Cầu Thủ (Player)</span>
            </>
          )}
        </Pressable>
      </div>

      {/* 2. HEADER (Kính mờ) */}
      <header className="sticky top-2 z-30 mb-4 px-1">
        <div className="glass-panel rounded-2xl p-3.5 flex items-center justify-between border-white/15 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400/80 shadow-md ring-2 ring-emerald-500/30"
              />
              <span className={`absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-slate-900 shadow ${
                currentUserRole === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}>
                #{user.number}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                {currentUserRole === 'admin' ? (
                  <span className="text-[11px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Đội Trưởng (Admin)
                  </span>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      {user.role}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                    <span className="text-[11px] text-slate-400">Đội hình A</span>
                  </>
                )}
              </div>
              <h1 className="text-base font-extrabold text-white leading-tight mt-0.5">
                {currentUserRole === 'admin' ? 'Chào Đội Trưởng!' : `Chào Cầu thủ, Số ${user.number}`}
              </h1>
              <p className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400 inline" />
                {user.teamName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Admin Settings Gear Button */}
            {currentUserRole === 'admin' && (
              <Pressable
                onClick={() => setShowSettingsModal(true)}
                className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                title="Cài đặt đội bóng"
              >
                <Settings className="w-4 h-4 animate-spin-slow" />
              </Pressable>
            )}

            <Pressable
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>
            </Pressable>
          </div>
        </div>

        {/* Dropdown notification preview */}
        {notificationOpen && (
          <div className="mt-2 p-3 glass-panel-elevated rounded-xl border border-white/15 animate-in fade-in slide-in-from-top-2 duration-200 text-xs text-slate-200">
            <div className="flex items-center justify-between font-bold text-white mb-1.5">
              <span><Bell size={20} /> Thông báo nội bộ</span>
              <Pressable aria-label="Đóng thông báo" onClick={() => setNotificationOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></Pressable>
            </div>
            <p className="text-slate-300">
              <Zap size={20} /> <strong>Thủ quỹ Hải:</strong> "Đã cập nhật quỹ trận gặp FC Hàng Xóm, anh em nhớ nộp trước thứ 6 nhé!"
            </p>
          </div>
        )}
      </header>

      {/* Main Content Sections */}
      <div className="space-y-4 px-1">

        {/* 3. CARD 1 - TRẬN ĐẤU TIẾP THEO (CONDITIONAL RENDERING) */}
        {currentUserRole === 'admin' ? (
          <GlassCard className="relative overflow-hidden border-amber-500/20" glow={true} glowColor="primary">
            {/* Admin Action Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Quản Lý Trận Đấu
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => setShowCreateMatchModal(true)}
                  className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30 px-2.5 py-1"
                  icon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  + Tạo trận mới
                </Button>
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => alert('Mở bảng chỉnh sửa thời gian và địa điểm trận đấu!')}
                  className="text-xs px-2.5 py-1"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Sửa
                </Button>
              </div>
            </div>

            {/* Match info overview */}
            <div className="bg-gradient-to-r from-white/[0.07] to-transparent p-3.5 rounded-xl border border-white/10 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Đối thủ sắp tới</p>
                  <h3 className="text-lg font-extrabold text-white tracking-tight mt-0.5">
                    FC Hàng Xóm
                  </h3>
                </div>
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg border border-emerald-500/30">
                  18:30 • Thứ 6, 24/10
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                <MapPin size={20} /> Sân bóng Chuyên Việt (Sân 3) - 18D Cộng Hòa, Tân Bình
              </p>
            </div>

            {/* Admin Attendance Overview Stats */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Users2 className="w-4 h-4" /> Tình hình điểm danh toàn đội:
                </span>
                <span className="text-xs font-black text-white bg-amber-500/30 px-2 py-0.5 rounded">
                  Đã chốt: 14/20 người
                </span>
              </div>

              <div className="w-full bg-white/10 rounded-full h-2 mb-2 overflow-hidden flex">
                <div className="bg-emerald-400 h-full" style={{ width: '70%' }} title="Có mặt (14)"></div>
                <div className="bg-amber-400 h-full" style={{ width: '10%' }} title="Lưỡng lự (2)"></div>
                <div className="bg-rose-400 h-full" style={{ width: '20%' }} title="Vắng / Chưa vote (4)"></div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                <span className="text-emerald-400"><Soccer size={20} /> Có mặt: 14</span>
                <span className="text-amber-400"><HelpCircle size={20} /> 50/50: 2</span>
                <span className="text-rose-400"><XCircle size={20} /> Vắng: 4</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={() => alert('Mở danh sách đầy đủ 20 cầu thủ để gọi điện hoặc nhắc nhở!')}
              className="w-full text-xs font-bold border border-white/15"
              icon={<Users2 className="w-4 h-4" />}
            >
              Xem Chi Tiết Danh Sách Điểm Danh (20 Người)
            </Button>
          </GlassCard>
        ) : (
          /* Player view: MatchCard with 3 Attendance Vote Buttons */
          <MatchCard 
            attendance={user.nextMatchAttendance} 
            onAttendanceChange={onAttendanceChange}
          />
        )}

        {/* 4. CARD 2 - TÀI CHÍNH & QUỸ ĐỘI (CONDITIONAL RENDERING) */}
        {currentUserRole === 'admin' ? (
          <GlassCard className="border-amber-500/30 bg-amber-950/20" glow={true} glowColor="primary">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ban Quản Trị • Quản Lý Quỹ Đội
                  </span>
                  <h4 className="text-sm font-bold text-white">Tổng Quan Quỹ Toàn Đội</h4>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                Ổn định
              </span>
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[11px] text-slate-400 font-medium">Tổng Quỹ Hiện Tại</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">+5.850.000 đ</p>
                <span className="text-[10px] text-emerald-300/80">Đã trừ tiền sân t9</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <p className="text-[11px] text-slate-400 font-medium">Chưa Nộp Quỹ</p>
                <p className="text-xl font-black text-rose-400 mt-0.5 font-mono">6/20 Người</p>
                <span className="text-[10px] text-rose-300/80">Tổng nợ: 900.000 đ</span>
              </div>
            </div>

            {/* 2 Nút hành động của Admin như yêu cầu trong Phân Quyền Admin.md */}
            <div className="mt-4 pt-2 grid grid-cols-2 gap-2">
              <Button
                size="md"
                variant="secondary"
                onClick={() => alert('Mở form tạo khoản thu mới (Ví dụ: Tiền nước, Tiền áo đấu, Tiền tiệc)!')}
                icon={<PlusCircle className="w-3.5 h-3.5 text-emerald-400" />}
                className="text-xs font-bold"
              >
                + Tạo khoản thu mới
              </Button>

              <Button
                size="md"
                variant="primary"
                onClick={() => setShowAdminApproveModal(true)}
                icon={<FileCheck className="w-3.5 h-3.5" />}
                className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                Duyệt tiền ({pendingApprovals.length})
              </Button>
            </div>
          </GlassCard>
        ) : (
          /* Player view: Personal debt and QR payment */
          <GlassCard 
            glow={!user.isFundPaid} 
            glowColor={user.isFundPaid ? 'primary' : 'danger'}
            className={`border transition-all duration-300 ${
              user.isFundPaid 
                ? 'border-emerald-500/30 bg-emerald-950/20' 
                : 'border-rose-500/30 bg-rose-950/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${
                  user.isFundPaid 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tài chính • Quỹ Đội Tháng 10
                  </span>
                  <h4 className="text-sm font-bold text-white">Trạng thái đóng quỹ cá nhân</h4>
                </div>
              </div>

              {user.isFundPaid ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã đóng đủ
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-full animate-pulse">
                  Chưa đóng
                </span>
              )}
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Số dư nợ quỹ</p>
                {user.isFundPaid ? (
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-emerald-400">0 đ</span>
                    <span className="text-xs text-emerald-400/80 font-medium">(Đã thanh toán)</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-rose-400">-150.000 đ</span>
                    <span className="text-xs text-rose-400/80 font-medium">(Tiền sân + Nước)</span>
                  </div>
                )}
              </div>

              {user.isFundPaid ? (
                <Button
                  size="sm"
                  variant="glass"
                  onClick={onResetPaid}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Reset lại nợ
                </Button>
              ) : (
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => setShowQrModal(true)}
                  icon={<QrCode className="w-4 h-4" />}
                  className="font-bold text-xs px-3.5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(0,255,102,0.4)]"
                >
                  Quét QR đóng quỹ
                </Button>
              )}
            </div>

            <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Hạn nộp: 25/10/2026</span>
              <span className="text-slate-300">Quỹ tồn: <strong>5.850.000 đ</strong></span>
            </div>
          </GlassCard>
        )}

        {/* 5. CARD 3 - THỐNG KÊ (CÁ NHÂN HOẶC ĐỘI BÓNG) */}
        <GlassCard className="border-white/15">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                {currentUserRole === 'admin' ? 'Thống Kê Thành Tích Đội Bóng' : 'Thống Kê Cá Nhân Mùa Này'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              Mùa Giải 2026
            </span>
          </div>

          {currentUserRole === 'admin' ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/[0.05] p-3 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Trận Đã Đá</p>
                <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">18</p>
                <span className="text-[10px] text-slate-400">14 Thắng • 2 Hòa</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-inner">
                <p className="text-xs text-emerald-400 font-medium">Bàn Thắng Đội</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">54</p>
                <span className="text-[10px] text-emerald-300/80 font-bold">3.0 bàn/trận</span>
              </div>
              <div className="bg-white/[0.05] p-3 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Tỷ Lệ Thắng</p>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">78%</p>
                <span className="text-[10px] text-slate-400">Top 1 Cụm Sân</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/[0.05] p-3 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Số trận</p>
                <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">{user.stats.matches}</p>
                <span className="text-[10px] text-slate-400">Đá chính 100%</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-inner">
                <p className="text-xs text-emerald-400 font-medium">Bàn thắng</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{user.stats.goals}</p>
                <span className="text-[10px] text-emerald-300/80 font-bold">2.4 bàn/trận</span>
              </div>
              <div className="bg-white/[0.05] p-3 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 font-medium">Kiến tạo</p>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{user.stats.assists}</p>
                <span className="text-[10px] text-slate-400">Top 2 của đội</span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Quick Tactical Lineup Teaser */}
        <GlassCard 
          onClick={() => onNavigate && onNavigate('lineup')}
          className="border-white/15 cursor-pointer hover:border-emerald-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center border border-white/20">
                <Soccer size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Chiến Thuật Sân 7
                </h4>
                <p className="text-xs text-slate-400">Sơ đồ 2-3-1 • Đã xếp 7/7 vị trí</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
        </GlassCard>

      </div>

      {/* MODAL DUYỆT TIỀN ĐÓNG QUỸ (CHO ADMIN) */}
      {showAdminApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel-elevated rounded-3xl p-5 border border-white/20 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Duyệt Tiền Đóng Quỹ</h3>
                  <p className="text-[11px] text-slate-400">Xác nhận các khoản chuyển khoản từ thành viên</p>
                </div>
              </div>
              <Pressable
                onClick={() => setShowAdminApproveModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <PartyPopper size={20} /> Đã duyệt hết tất cả các khoản đóng quỹ!
                </div>
              ) : (
                pendingApprovals.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-white">{item.name}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold">{item.amount} • {item.bank}</p>
                      <span className="text-[10px] text-slate-400">{item.time}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => approvePayment(item.id)}
                      className="text-xs bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-3 py-1.5"
                    >
                      Duyệt
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowAdminApproveModal(false)}
                className="text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT ĐỘI BÓNG (CHO ADMIN) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel-elevated rounded-3xl p-5 border border-white/20 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Cài Đặt Đội Bóng</h3>
              </div>
              <Pressable onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tên Đội Bóng</label>
                <input 
                  type="text" 
                  defaultValue={user.teamName} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Mức Quỹ Hàng Tháng (VNĐ)</label>
                <input 
                  type="text" 
                  defaultValue="150.000" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Số Tài Khoản Nhận Quỹ</label>
                <input 
                  type="text" 
                  defaultValue="998877665544 (MB Bank)" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  alert('Đã lưu cấu hình đội bóng thành công!');
                  setShowSettingsModal(false);
                }}
                className="w-full text-slate-950 font-bold"
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO TRẬN MỚI (CHO ADMIN) */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel-elevated rounded-3xl p-5 border border-white/20 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Tạo Kèo Trận Mới</h3>
              </div>
              <Pressable onClick={() => setShowCreateMatchModal(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tên Đối Thủ</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: FC Phủi Thủ Đức" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Thời Gian Thi Đấu</label>
                <input 
                  type="datetime-local" 
                  defaultValue="2026-10-24T18:30" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Địa Điểm / Sân Thi Đấu</label>
                <input 
                  type="text" 
                  placeholder="Sân bóng Chuyên Việt (Sân 3)" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  alert('Trận đấu mới đã được tạo và thông báo tới 20 thành viên!');
                  setShowCreateMatchModal(false);
                }}
                className="w-full text-slate-950 font-bold"
              >
                Tạo Trận & Mở Điểm Danh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUÉT QR ĐÓNG QUỸ (CHO PLAYER) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm glass-panel-elevated rounded-3xl p-5 border border-white/20 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">VietQR Đóng Quỹ Đội</h3>
                  <p className="text-[11px] text-slate-400">Quét qua bất kỳ app ngân hàng / MoMo nào</p>
                </div>
              </div>
              <Pressable
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-4 p-3 bg-white rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <img 
                src={bankInfo.qrUrl} 
                alt="VietQR Code" 
                className="w-48 h-48 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none' }} className="w-48 h-48 bg-slate-900 rounded-xl items-center justify-center flex-col text-center p-3">
                <QrCode className="w-16 h-16 text-emerald-400 mb-2" />
                <span className="text-xs font-mono text-emerald-400">MB BANK: {bankInfo.accountNumber}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-bold mt-1 text-center">
                Quét tự động điền STK & Nội dung
              </p>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Ngân hàng</span>
                  <span className="font-bold text-white">{bankInfo.bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Số tài khoản</span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">{bankInfo.accountNumber}</span>
                </div>
                <Pressable
                  onClick={() => copyToClipboard(bankInfo.accountNumber, 'acc')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                </Pressable>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">Số tiền & Nội dung chuyển</span>
                  <span className="font-bold text-rose-400">{bankInfo.amount}</span>
                  <p className="text-[10px] font-mono text-slate-300">{bankInfo.content}</p>
                </div>
                <Pressable
                  onClick={() => copyToClipboard(bankInfo.content, 'content')}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium"
                >
                  {copiedField === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                </Pressable>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  onMarkPaid();
                  setShowQrModal(false);
                }}
                className="w-full text-slate-950 font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,102,0.5)]"
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Tôi Đã Chuyển Khoản Xong
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
