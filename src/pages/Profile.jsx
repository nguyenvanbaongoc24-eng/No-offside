import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Shield, 
  Phone, 
  Settings, 
  Bell, 
  CreditCard, 
  Crown, 
  LogOut, 
  ChevronRight, 
  Edit3, 
  Check, 
  Trophy, 
  Activity, 
  Lock,
  Camera,
  AlertTriangle,
  X,
  CheckCircle2,
  Sliders,
  QrCode,
  PlusCircle,
  Share2,
  Users,
  Trash2,
  Sparkles,
  Tag
} from 'lucide-react';
import InviteShare from '../components/InviteShare';

export default function Profile({ 
  user, 
  currentUserRole = 'admin', 
  onToggleRole, 
  onLogout,
  onNavigate,
  teamSettings,
  onUpdateTeamName,
  onUpdateSubAdminTitle,
  onAddSubAdmin,
  onRemoveSubAdmin
}) {
  // Personal Info Form State
  const [avatar, setAvatar] = useState(user.avatar);
  const [name, setName] = useState(user.name);
  const [number, setNumber] = useState(user.number || 9);
  const [role, setRole] = useState(user.role || 'Tiền Đạo (ST)');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(68);
  const [phone, setPhone] = useState('0987 654 321');
  const [isSaved, setIsSaved] = useState(false);

  // Captain Team Name State
  const isCaptain = user.isCaptain ?? true;
  const [editingTeamName, setEditingTeamName] = useState(teamSettings?.teamName || user.teamName || 'FC No Offside');
  const [teamNameSaved, setTeamNameSaved] = useState(false);

  // Admin System Settings
  const [matchReminderMinutes, setMatchReminderMinutes] = useState(120);
  const [fundReminderDay, setFundReminderDay] = useState(25);
  const [systemSaved, setSystemSaved] = useState(false);

  // Sub-Admins list
  const subAdmins = teamSettings?.subAdmins || [
    { id: 101, name: 'Nguyễn Hoàng Hải', number: 10, customTitle: 'Thủ Quỹ', phone: '0988776655' },
    { id: 102, name: 'Đặng Văn Lâm', number: 1, customTitle: 'Đội Phó', phone: '0977889900' },
  ];

  // Title assignment modal / popover
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [customTitleInput, setCustomTitleInput] = useState('');

  // Admin Delegation Double Confirmation Modal
  const [selectedPromotee, setSelectedPromotee] = useState(null);
  const [promoteTitle, setPromoteTitle] = useState('Đội Phó');
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Removing Admin Double Confirmation Modal
  const [adminToRemove, setAdminToRemove] = useState(null);
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);

  // Invite QR & Link Modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  const titlePresets = ['Thủ Quỹ', 'Đội Phó', 'Bầu Đội', 'HLV', 'Kế Toán'];

  const availableMembers = [
    { id: 1, name: 'Nguyễn Quang Hải', number: 19, role: 'Tiền Vệ' },
    { id: 2, name: 'Nguyễn Hoàng Đức', number: 14, role: 'Tiền Vệ' },
    { id: 3, name: 'Đoàn Văn Hậu', number: 5, role: 'Hậu Vệ' },
    { id: 4, name: 'Đỗ Duy Mạnh', number: 28, role: 'Hậu Vệ' },
  ];

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSaveTeamName = (e) => {
    e.preventDefault();
    if (!editingTeamName.trim()) return;
    if (onUpdateTeamName) {
      onUpdateTeamName(editingTeamName.trim());
    }
    setTeamNameSaved(true);
    setTimeout(() => setTeamNameSaved(false), 2500);
  };

  const handleSaveSystemSettings = (e) => {
    e.preventDefault();
    setSystemSaved(true);
    setTimeout(() => setSystemSaved(false), 2500);
  };

  const handleConfirmPromote = () => {
    if (onAddSubAdmin && selectedPromotee) {
      onAddSubAdmin({
        id: selectedPromotee.id,
        name: selectedPromotee.name,
        number: selectedPromotee.number,
        customTitle: promoteTitle || 'Admin Phụ',
      });
    }
    alert(`Đã cấp quyền Admin với chức danh "${promoteTitle}" cho ${selectedPromotee.name} thành công!`);
    setShowPromoteModal(false);
    setSelectedPromotee(null);
  };

  const handleConfirmRemoveAdmin = () => {
    if (onRemoveSubAdmin && adminToRemove) {
      onRemoveSubAdmin(adminToRemove.id);
    }
    alert(`Đã gỡ quyền Admin của ${adminToRemove.name}!`);
    setShowRemoveAdminModal(false);
    setAdminToRemove(null);
  };

  const handleUpdateTitleSubmit = () => {
    if (onUpdateSubAdminTitle && editingSubAdmin && customTitleInput.trim()) {
      onUpdateSubAdminTitle(editingSubAdmin.id, customTitleInput.trim());
    }
    setEditingSubAdmin(null);
    setCustomTitleInput('');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. Header Dark Geometric Style */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-12 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] text-center">
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Avatar with Camera upload trigger */}
          <div className="relative mb-3 group">
            <img 
              src={avatar} 
              alt={name} 
              className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-500/80 shadow-xl"
            />
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform active:scale-90">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>{name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 font-mono">
              #{number}
            </span>
          </h1>

          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            {teamSettings?.teamName || user.teamName} • {user.teamCategory}
          </p>

          <div className="mt-2 flex items-center justify-center gap-1.5">
            {isCaptain ? (
              <span className="text-[11px] bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-300 font-black px-3 py-0.5 rounded-full border border-amber-400/50 flex items-center gap-1 shadow-xs">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>👑 Đội Trưởng (Owner)</span>
              </span>
            ) : currentUserRole === 'admin' ? (
              <span className="text-[11px] bg-amber-400/20 text-amber-300 font-black px-3 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>👑 {user.customTitle || 'Admin Phụ'}</span>
              </span>
            ) : (
              <span className="text-[11px] bg-white/10 text-gray-300 font-bold px-3 py-0.5 rounded-full border border-white/15">
                ⚽ Thành Viên
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 2. FORM CẬP NHẬT THÔNG TIN CÁ NHÂN */}
      <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 -mt-6 relative z-10 border border-gray-100">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
              HỒ SƠ CÁ NHÂN
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">Chỉnh sửa & Cập nhật</span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
          <div>
            <label className="text-gray-600 block mb-1 font-bold">Họ và tên</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full h-12 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-gray-600 block mb-1 font-bold">Số áo</label>
              <input 
                type="number" 
                value={number} 
                onChange={(e) => setNumber(e.target.value)} 
                className="w-full h-12 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 font-mono font-black text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1 font-bold">Vị trí sở trường</label>
              <input 
                type="text" 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="w-full h-12 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-gray-600 block mb-1 font-bold">Chiều cao (cm)</label>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                className="w-full h-12 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1 font-bold">Cân nặng (kg)</label>
              <input 
                type="number" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                className="w-full h-12 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer mt-1"
          >
            {isSaved ? '✓ Đã Lưu Thông Tin' : 'Lưu Hồ Sơ Cầu Thủ'}
          </motion.button>
        </form>
      </section>

      {/* 3. QUẢN LÝ ĐỘI BÓNG & PHÂN QUYỀN (CAPTAIN VS ADMIN PHỤ) */}
      {currentUserRole === 'admin' && (
        <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 mt-3 border border-gray-100">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                {isCaptain ? 'QUẢN TRỊ ĐỘI (DÀNH CHO ĐỘI TRƯỞNG)' : 'QUẢN TRỊ ĐỘI (ADMIN PHỤ)'}
              </h3>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {isCaptain ? 'Quyền Cao Nhất' : 'Phân Quyền'}
            </span>
          </div>

          {/* Form Đổi Tên FC - CHỈ ĐỘI TRƯỞNG MỚI CÓ QUYỀN */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tên Đội Bóng (FC):</span>
              </span>
              {!isCaptain && (
                <span className="text-[10px] text-gray-400 font-medium">Chỉ Đội Trưởng mới đổi được</span>
              )}
            </div>

            {isCaptain ? (
              <form onSubmit={handleSaveTeamName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="flex-1 h-11 bg-white border border-gray-200 rounded-xl px-3 text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="h-11 px-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  {teamNameSaved ? '✓ Đã Lưu' : 'Đổi Tên'}
                </motion.button>
              </form>
            ) : (
              <p className="text-sm font-black text-gray-900 font-mono">
                {teamSettings?.teamName || user.teamName}
              </p>
            )}
          </div>

          {/* Danh Sách Admin Phụ & Cấp Biệt Danh/Chức Danh (Badge Vàng Gold) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Danh Sách Admin Phụ ({subAdmins.length}):</span>
              </span>
              {isCaptain && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Có thể sửa chức danh
                </span>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {subAdmins.map((admin) => (
                <div key={admin.id} className="p-3 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono text-xs font-black flex items-center justify-center">
                      #{admin.number}
                    </span>
                    <div>
                      <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <span>{admin.name}</span>
                        {/* BADGE CHỨC DANH MÀU VÀNG GOLD */}
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-900 border border-amber-300 font-black text-[10px] inline-flex items-center gap-1 shadow-xs">
                          👑 {admin.customTitle || 'Admin Phụ'}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400">{admin.phone || 'Admin'}</p>
                    </div>
                  </div>

                  {/* Nút sửa chức danh & Xóa (Chỉ Đội Trưởng) */}
                  {isCaptain && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingSubAdmin(admin);
                          setCustomTitleInput(admin.customTitle || '');
                        }}
                        className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 font-bold text-[10px] border border-amber-200/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        title="Đổi chức danh"
                      >
                        <Tag className="w-3 h-3 text-amber-600" />
                        <span>Chức danh</span>
                      </button>

                      <button
                        onClick={() => {
                          setAdminToRemove(admin);
                          setShowRemoveAdminModal(true);
                        }}
                        className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-90 transition-all cursor-pointer"
                        title="Gỡ quyền Admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nút Cấp quyền Admin cho thành viên mới (Chỉ Đội Trưởng) */}
            {isCaptain && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[11px] font-bold text-gray-500 block mb-2">
                  Cấp Quyền Admin Cho Thành Viên Khác:
                </span>

                <div className="space-y-1.5">
                  {availableMembers.map((member) => (
                    <div key={member.id} className="p-2 rounded-xl bg-gray-50/70 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center">
                          #{member.number}
                        </span>
                        <span className="text-xs font-bold text-gray-800">{member.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPromotee(member);
                          setPromoteTitle('Đội Phó');
                          setShowPromoteModal(true);
                        }}
                        className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 active:scale-95 transition-all cursor-pointer"
                      >
                        + Cấp Quyền Admin
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Cài đặt nhắc nhở hệ thống */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs font-black text-gray-900 block mb-2">
              Cài Đặt Lịch Nhắc Nhở Tự Động:
            </span>

            <form onSubmit={handleSaveSystemSettings} className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-700 font-semibold">Nhắc trận trước:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={matchReminderMinutes}
                    onChange={(e) => setMatchReminderMinutes(e.target.value)}
                    className="w-16 h-8 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-gray-900"
                  />
                  <span className="text-[11px] text-gray-500">phút</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-700 font-semibold">Nhắc nợ quỹ ngày:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={fundReminderDay}
                    onChange={(e) => setFundReminderDay(e.target.value)}
                    className="w-16 h-8 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-gray-900"
                  />
                  <span className="text-[11px] text-gray-500">hàng tháng</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer mt-1"
              >
                {systemSaved ? '✓ Đã Lưu Cài Đặt' : 'Lưu Cài Đặt Nhắc Nhở'}
              </motion.button>
            </form>
          </div>
        </section>
      )}

      {/* 4. GIA NHẬP & MỜI THÀNH VIÊN (INVITE QR & LINK) */}
      <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 mt-3 border border-gray-100">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
              Gia Nhập & Mời Thành Viên
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            QR / Link
          </span>
        </div>

        <div className="space-y-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="w-full h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Mời Thành Viên Mới Qua QR & Link</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onNavigate && onNavigate('create-team')}
            className="w-full h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border border-gray-200/80"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Tạo Thêm Đội Bóng Mới (Làm Đội Trưởng)</span>
          </motion.button>
        </div>
      </section>

      {/* 5. CHUYỂN ĐỔI ROLE & ĐĂNG XUẤT */}
      <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 mt-3 border border-gray-100">
        <div className="divide-y divide-gray-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-bold text-gray-800">Quyền xem hiện tại</p>
                <p className="text-[11px] text-gray-400">
                  {currentUserRole === 'admin' ? 'Đội Trưởng / Admin' : 'Cầu thủ (Member)'}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onToggleRole}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all ${
                currentUserRole === 'admin'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
              }`}
            >
              {currentUserRole === 'admin' ? 'Đổi sang Member' : 'Đổi sang Admin'}
            </motion.button>
          </div>

          <div className="pt-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="w-full py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200/80"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng Xuất Tài Khoản</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* MODAL SỬA CHỨC DANH / BIỆT DANH CHO ADMIN PHỤ */}
      {editingSubAdmin && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-sm text-gray-900">
                  Cấp Chức Danh Cho {editingSubAdmin.name}
                </h3>
              </div>
              <button onClick={() => setEditingSubAdmin(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Chọn chức danh nhanh:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {titlePresets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomTitleInput(t)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        customTitleInput === t 
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Hoặc tự nhập biệt danh:
                </label>
                <input
                  type="text"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  placeholder="Ví dụ: Bầu Đội, Kế Toán, Trưởng Đoàn..."
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleUpdateTitleSubmit}
                className="w-full h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer mt-2"
              >
                Lưu Chức Danh (Hiện Badge Vàng)
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL KHI CẤP QUYỀN ADMIN CHO THÀNH VIÊN */}
      {showPromoteModal && selectedPromotee && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
            
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="font-black text-base text-gray-900">
              Xác Nhận Cấp Quyền Admin
            </h3>
            
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Bạn có chắc chắn muốn cấp quyền Admin cho <strong>{selectedPromotee.name} (#{selectedPromotee.number})</strong>?
            </p>

            {/* Chọn chức danh khi cấp */}
            <div className="my-3 text-left">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Gán chức danh:
              </label>
              <div className="flex flex-wrap gap-1">
                {titlePresets.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setPromoteTitle(tp)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      promoteTitle === tp ? 'bg-amber-400 text-slate-950' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmPromote}
                className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 cursor-pointer"
              >
                Xác Nhận Cấp Quyền Admin
              </motion.button>
              
              <button
                onClick={() => { setShowPromoteModal(false); setSelectedPromotee(null); }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL KHI GỠ QUYỀN ADMIN */}
      {showRemoveAdminModal && adminToRemove && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
            
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="font-black text-base text-gray-900">
              Gỡ Quyền Admin
            </h3>
            
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Bạn có chắc chắn muốn gỡ quyền Admin của <strong>{adminToRemove.name}</strong>? Người này sẽ trở thành thành viên thường.
            </p>

            <div className="mt-5 space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmRemoveAdmin}
                className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Xác Nhận Gỡ Quyền
              </motion.button>
              
              <button
                onClick={() => { setShowRemoveAdminModal(false); setAdminToRemove(null); }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL MỜI THÀNH VIÊN QUA QR & LINK */}
      <InviteShare 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamName={teamSettings?.teamName || user.teamName || 'FC No Offside'}
        teamCode="fc-no-offside-888"
        onPreviewLanding={() => {
          setShowInviteModal(false);
          if (onNavigate) onNavigate('invite-landing');
        }}
      />

    </div>
  );
}
