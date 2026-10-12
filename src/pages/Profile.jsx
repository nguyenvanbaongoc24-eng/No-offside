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
  Lock 
} from 'lucide-react';

export default function Profile({ 
  user, 
  currentUserRole = 'player', 
  onToggleRole, 
  onLogout 
}) {
  const [matchNotification, setMatchNotification] = useState(true);
  const [fundNotification, setFundNotification] = useState(true);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState('0987 654 321');

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. HEADER PROFILE (Xanh lá mướt, safe-area chuẩn iOS) */}
      <section className="bg-gradient-to-b from-green-600 to-emerald-600 text-white pt-safe-hero pb-14 px-6 rounded-b-[44px] shadow-lg relative overflow-hidden text-center">
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Avatar cầu thủ lớn */}
          <div className="relative mb-3">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white/90 shadow-xl"
            />
            <span className="absolute bottom-0 right-0 bg-gray-900 text-emerald-400 text-xs font-black px-2 py-0.5 rounded-full border border-white/60 shadow">
              #{user.number}
            </span>
          </div>

          {/* Tên & Thông tin đội bóng */}
          <h1 className="text-2xl font-black text-white tracking-tight">
            {user.name}
          </h1>
          <p className="text-xs text-white/90 font-semibold mt-0.5">
            {user.teamName} • {user.role}
          </p>

          {/* Badge trạng thái */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{currentUserRole === 'admin' ? '👑 Ban Quản Trị / Đội Trưởng' : 'Đang hoạt động • Hạng A'}</span>
          </div>
        </div>
      </section>

      {/* 2. CARD THÔNG TIN CẦU THỦ & THỂ CHẤT */}
      <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 mx-4 -mt-8 relative z-10 border border-gray-100/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            HỒ SƠ CẦU THỦ
          </span>
          <span className="text-[11px] font-bold text-green-600">
            Số áo #{user.number}
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Vị trí & Đội hình */}
          <div className="p-3 rounded-2xl bg-gray-50 flex items-center justify-between">
            <span className="text-gray-500 font-medium">Vị trí thi đấu</span>
            <span className="font-bold text-gray-900">{user.role}</span>
          </div>

          {/* Thể chất */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-gray-50">
              <span className="text-[10px] text-gray-400 block font-medium">Chiều cao</span>
              <span className="font-bold text-gray-900 text-sm">1m75</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50">
              <span className="text-[10px] text-gray-400 block font-medium">Cân nặng</span>
              <span className="font-bold text-gray-900 text-sm">68 kg</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50">
              <span className="text-[10px] text-gray-400 block font-medium">Chân thuận</span>
              <span className="font-bold text-gray-900 text-sm">Phải</span>
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="p-3 rounded-2xl bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <Phone className="w-4 h-4 text-green-600" />
              <span>Số điện thoại</span>
            </div>
            {isEditingPhone ? (
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-2 py-0.5 text-xs text-gray-900 w-28 font-mono"
                />
                <button 
                  onClick={() => setIsEditingPhone(false)}
                  className="p-1 rounded-full bg-green-600 text-white"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 font-mono">{phone}</span>
                <button 
                  onClick={() => setIsEditingPhone(true)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. CARD CÀI ĐẶT & QUYỀN HẠN (LIST GROUP) */}
      <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 mx-4 mt-4 border border-gray-100/80">
        <div className="mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            CÀI ĐẶT TÀI KHOẢN
          </span>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          
          {/* Chuyển đổi vai trò Cầu thủ ↔ Đội trưởng Admin */}
          <div className="py-3.5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Quyền hạn trong app</p>
                <p className="text-[11px] text-gray-400">
                  {currentUserRole === 'admin' ? 'Đội Trưởng (Toàn quyền quản trị)' : 'Cầu thủ (Bình chọn & đóng quỹ)'}
                </p>
              </div>
            </div>

            <button
              onClick={onToggleRole}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all ${
                currentUserRole === 'admin'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {currentUserRole === 'admin' ? 'Admin' : 'Đổi sang Admin'}
            </button>
          </div>

          {/* Thông báo trận đấu */}
          <div className="py-3.5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Thông báo trận đấu</p>
                <p className="text-[11px] text-gray-400">Nhắc nhở trước giờ bóng lăn</p>
              </div>
            </div>

            <button
              onClick={() => setMatchNotification(!matchNotification)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                matchNotification ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                matchNotification ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Nhắc nhở quỹ đội */}
          <div className="py-3.5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Nhắc nhở quỹ đội</p>
                <p className="text-[11px] text-gray-400">Thông báo định kỳ ngày 25 hàng tháng</p>
              </div>
            </div>

            <button
              onClick={() => setFundNotification(!fundNotification)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                fundNotification ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                fundNotification ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

        </div>
      </section>

      {/* 4. NÚT ĐĂNG XUẤT */}
      <section className="mx-4 mt-6">
        <button
          onClick={onLogout}
          className="w-full py-3.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-2 border border-red-200/80 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng Xuất Tài Khoản</span>
        </button>
      </section>

    </div>
  );
}
