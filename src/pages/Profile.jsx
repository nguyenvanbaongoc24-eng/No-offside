import React, { useState } from 'react';
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
  Sliders
} from 'lucide-react';

export default function Profile({ 
  user, 
  currentUserRole = 'player', 
  onToggleRole, 
  onLogout 
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

  // Admin System Settings
  const [matchReminderMinutes, setMatchReminderMinutes] = useState(120);
  const [fundReminderDay, setFundReminderDay] = useState(25);
  const [systemSaved, setSystemSaved] = useState(false);

  // Admin Delegation Double Confirmation Modal
  const [selectedPromotee, setSelectedPromotee] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const teamMembers = [
    { id: 1, name: 'Nguyễn Quang Hải', number: 19, role: 'Tiền Vệ' },
    { id: 2, name: 'Nguyễn Hoàng Đức', number: 14, role: 'Tiền Vệ' },
    { id: 3, name: 'Đặng Văn Lâm', number: 1, role: 'Thủ Môn' },
    { id: 4, name: 'Đoàn Văn Hậu', number: 5, role: 'Hậu Vệ' },
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

  const handleSaveSystemSettings = (e) => {
    e.preventDefault();
    setSystemSaved(true);
    setTimeout(() => setSystemSaved(false), 2500);
  };

  const handleConfirmPromote = () => {
    alert(`Đã cấp quyền Admin cho ${selectedPromotee.name} thành công!`);
    setShowPromoteModal(false);
    setSelectedPromotee(null);
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

          <h1 className="text-xl font-black text-white tracking-tight">{name}</h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            {user.teamName} • #{number} {role}
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{currentUserRole === 'admin' ? '👑 Đội Trưởng (Admin)' : 'Cầu Thủ Chính Thức'}</span>
          </div>
        </div>
      </section>

      {/* 2. FORM CẬP NHẬT THÔNG TIN CÁ NHÂN (MỌI NGƯỜI) */}
      <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 -mt-8 relative z-10 border border-gray-100">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            HỒ SƠ CẦU THỦ CỦA BẠN
          </span>
          <span className="text-[11px] font-bold text-emerald-600">Chỉnh sửa</span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-gray-500 block mb-1 font-bold">Họ & Tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold"
              />
            </div>
            <div>
              <label className="text-gray-500 block mb-1 font-bold">Số áo thi đấu</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-500 block mb-1 font-bold">Vị trí sở trường</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold"
            >
              <option value="Tiền Đạo (ST)">Tiền Đạo Cắm (ST)</option>
              <option value="Tiền Đạo Cánh (LW/RW)">Tiền Đạo Cánh (LW/RW)</option>
              <option value="Tiền Vệ Trung Tâm (CM)">Tiền Vệ Trung Tâm (CM)</option>
              <option value="Hậu Vệ (CB/LB/RB)">Hậu Vệ (CB/LB/RB)</option>
              <option value="Thủ Môn (GK)">Thủ Môn (GK)</option>
            </select>
          </div>

          {/* Chiều cao & Cân nặng */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-gray-500 block mb-1 font-bold">Chiều cao (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
              />
            </div>
            <div>
              <label className="text-gray-500 block mb-1 font-bold">Cân nặng (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="68"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-500 block mb-1 font-bold">Số điện thoại liên hệ</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all mt-2"
          >
            {isSaved ? '✓ Đã Lưu Thông Tin' : 'Lưu Hồ Sơ Cầu Thủ'}
          </button>
        </form>
      </section>

      {/* 3. CÀI ĐẶT DÀNH RIÊNG CHO ADMIN */}
      {currentUserRole === 'admin' && (
        <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 mt-3 border border-gray-100">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
              CÀI ĐẶT HỆ THỐNG (ADMIN)
            </h3>
          </div>

          {/* Form cài đặt thời gian nhắc nhở */}
          <form onSubmit={handleSaveSystemSettings} className="space-y-3 text-xs mb-4">
            <div>
              <label className="text-gray-600 block mb-1 font-bold">
                Nhắc thông báo trận đấu trước:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={matchReminderMinutes}
                  onChange={(e) => setMatchReminderMinutes(e.target.value)}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
                />
                <span className="text-gray-500 font-medium">phút trước giờ bóng lăn</span>
              </div>
            </div>

            <div>
              <label className="text-gray-600 block mb-1 font-bold">
                Nhắc nợ quỹ tự động ngày:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={fundReminderDay}
                  onChange={(e) => setFundReminderDay(e.target.value)}
                  className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold font-mono"
                />
                <span className="text-gray-500 font-medium">hàng tháng qua Zalo / App</span>
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-95 transition-all"
            >
              {systemSaved ? '✓ Đã Lưu Cài Đặt' : 'Lưu Cài Đặt Hệ Thống'}
            </button>
          </form>

          {/* Phân Quyền / Cấp Quyền Admin Cho Thành Viên Khác */}
          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs font-black text-gray-800 block mb-2">
              Cấp Quyền Admin Cho Thành Viên:
            </span>

            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                      #{member.number}
                    </span>
                    <span className="text-xs font-bold text-gray-800">{member.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPromotee(member);
                      setShowPromoteModal(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-[11px] border border-amber-200 active:scale-95 transition-all"
                  >
                    Cấp Quyền Admin
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. CHUYỂN ĐỔI ROLE & ĐĂNG XUẤT */}
      <section className="bg-white rounded-[32px] shadow-soft p-5 mx-4 mt-3 border border-gray-100">
        <div className="divide-y divide-gray-100 text-xs">
          {/* Quick role toggle */}
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <div>
                <p className="font-bold text-gray-800">Quyền hiện tại</p>
                <p className="text-[11px] text-gray-400">
                  {currentUserRole === 'admin' ? 'Đội Trưởng (Admin)' : 'Cầu thủ (Member)'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleRole}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all active:scale-95 ${
                currentUserRole === 'admin'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
              }`}
            >
              {currentUserRole === 'admin' ? 'Đổi sang Member' : 'Đổi sang Admin'}
            </button>
          </div>

          {/* Logout button */}
          <div className="pt-3">
            <button
              onClick={onLogout}
              className="w-full py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200/80 active:scale-95 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng Xuất Tài Khoản</span>
            </button>
          </div>
        </div>
      </section>

      {/* DOUBLE CONFIRMATION MODAL KHI CẤP QUYỀN ADMIN (BẮT BUỘC THEO YÊU CẦU) */}
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
              <br />
              <span className="text-rose-600 font-bold mt-1 block">
                ⚠️ Việc này không thể hoàn tác và người này sẽ có toàn quyền quản lý quỹ và trận đấu của đội.
              </span>
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleConfirmPromote}
                className="w-full py-3.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all"
              >
                Xác Nhận Cấp Quyền Admin
              </button>
              
              <button
                onClick={() => { setShowPromoteModal(false); setSelectedPromotee(null); }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
              >
                Hủy Bỏ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
