import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  ChevronLeft, 
  Shield, 
  Crown, 
  Palette, 
  Sun, 
  Moon, 
  Smartphone, 
  Globe, 
  Type, 
  Clock, 
  Bell, 
  Check, 
  Camera, 
  Save, 
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle2,
  Info
} from 'lucide-react';

export default function TeamSettings({ 
  teamSettings, 
  onUpdateTeamSettings, 
  onBack,
  currentUserRole = 'owner'
}) {
  // Section 1: Thông tin chung
  const [teamName, setTeamName] = useState(teamSettings?.teamName || 'FC No Offside');
  const [teamCategory, setTeamCategory] = useState(teamSettings?.teamCategory || 'Kèo Sân 7 Sài Gòn');
  const [venue, setVenue] = useState(teamSettings?.venue || 'Sân bóng Chuyên Việt (18D Cộng Hòa, Tân Bình)');
  const [schedule, setSchedule] = useState(teamSettings?.schedule || 'Thứ 6 hàng tuần • 18:30');
  const [logoUrl, setLogoUrl] = useState(teamSettings?.logo || 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=160&q=80');

  // Section 2: Giao diện & Cá nhân hóa
  const [theme, setTheme] = useState(teamSettings?.appearance?.theme || 'light'); // 'light' | 'dark' | 'system'
  const [language, setLanguage] = useState(teamSettings?.appearance?.language || 'vi'); // 'vi' | 'en'
  const [fontFamily, setFontFamily] = useState(teamSettings?.appearance?.fontFamily || 'Be Vietnam Pro'); // 'Be Vietnam Pro' | 'Outfit' | 'Playfair'

  // Section 3: Thời gian & Định dạng
  const [timeFormat, setTimeFormat] = useState(teamSettings?.appearance?.timeFormat || '24h'); // '24h' | '12h'

  // Section 4: Thông báo
  const [matchReminderNotif, setMatchReminderNotif] = useState(teamSettings?.appearance?.matchReminderNotif ?? true);
  const [fundReminderNotif, setFundReminderNotif] = useState(teamSettings?.appearance?.fundReminderNotif ?? true);

  // Section 5: Quản lý sinh nhật (Birthday Module)
  const [birthdayReportEnabled, setBirthdayReportEnabled] = useState(teamSettings?.appearance?.birthdayReportEnabled ?? true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (onUpdateTeamSettings) {
      onUpdateTeamSettings({
        teamName,
        teamCategory,
        venue,
        schedule,
        logo: logoUrl,
        appearance: {
          theme,
          language,
          fontFamily,
          timeFormat,
          matchReminderNotif,
          fundReminderNotif,
          birthdayReportEnabled
        }
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-36 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. Header Bar */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-5 px-4 rounded-b-[32px] shadow-lg relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="flex items-center justify-between relative z-10 mb-2">
          <button 
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="whitespace-nowrap">Quay lại</span>
          </button>

          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full whitespace-nowrap">
            <Crown className="w-3.5 h-3.5" />
            <span>Chỉ Đội Trưởng</span>
          </span>
        </div>

        <div className="relative z-10 mt-1">
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Cài Đặt Đội Bóng</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Tùy biến nhận diện, giao diện hiển thị và thông báo hệ thống
          </p>
        </div>
      </section>

      {/* 2. Settings Form Container */}
      <form onSubmit={handleSave} className="px-3.5 space-y-4 -mt-3 relative z-10">

        {/* SECTION 1: THÔNG TIN CHUNG */}
        <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Thông Tin Chung Đội Bóng</h2>
              <p className="text-[10px] text-gray-400">Tên FC, Logo nhận diện và địa điểm sân nhà</p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Logo Preview & Change */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1.5">Logo Đội Bóng</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 text-white rounded-full">
                    <Camera className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <input 
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Dán link ảnh logo..."
                    className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-gray-400">Hỗ trợ dán đường dẫn ảnh PNG, JPG hoặc WebP</p>
                </div>
              </div>
            </div>

            {/* Tên Đội */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Tên Đội Bóng (FC Name)</label>
              <input 
                type="text" 
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ví dụ: FC No Offside"
                className="w-full text-xs font-bold px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Thể loại thi đấu */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Thể Loại Thi Đấu</label>
              <input 
                type="text" 
                value={teamCategory}
                onChange={(e) => setTeamCategory(e.target.value)}
                placeholder="Ví dụ: Sân 7 Sài Gòn, Futsal Sân 5..."
                className="w-full text-xs font-semibold px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Sân nhà & Lịch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>Sân Nhà Cố Định</span>
                </label>
                <input 
                  type="text" 
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Sân Chuyên Việt - 18D Cộng Hòa"
                  className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>Lịch Sinh Hoạt</span>
                </label>
                <input 
                  type="text" 
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="Thứ 6 hàng tuần • 18:30"
                  className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CÁ NHÂN HÓA GIAO DIỆN (THEME & APPEARANCE) */}
        <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Giao Diện & Cá Nhân Hóa</h2>
              <p className="text-[10px] text-gray-400">Chọn Theme sáng/tối, ngôn ngữ và kiểu font</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Chọn Theme: 3 Nút Soft UI Radio */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-2">Chế Độ Hiển Thị (Theme)</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-500' : 'text-gray-400'}`} />
                  <span className="text-[11px]">Sáng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-slate-700 text-white shadow-sm ring-2 ring-slate-800 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'}`} />
                  <span className="text-[11px]">Tối (Dark)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                    theme === 'system'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Smartphone className={`w-4 h-4 ${theme === 'system' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-[11px]">Hệ Thống</span>
                </button>
              </div>
            </div>

            {/* Chọn Ngôn Ngữ */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Ngôn Ngữ Ứng Dụng</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-between border text-xs transition-all active:scale-95 cursor-pointer ${
                    language === 'vi'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">🇻🇳 Tiếng Việt</span>
                  {language === 'vi' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl flex items-center justify-between border text-xs transition-all active:scale-95 cursor-pointer ${
                    language === 'en'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">🇬🇧 English</span>
                  {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            </div>

            {/* Chọn Font Chữ */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-500" />
                <span>Kiểu Font Chữ (Typography)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFontFamily('Be Vietnam Pro')}
                  className={`p-2 rounded-xl text-center border transition-all active:scale-95 cursor-pointer ${
                    fontFamily === 'Be Vietnam Pro'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <p className="text-xs font-['Be_Vietnam_Pro'] font-bold">Mặc định</p>
                  <span className="text-[9px] text-gray-400 block">Be Vietnam</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFontFamily('Outfit')}
                  className={`p-2 rounded-xl text-center border transition-all active:scale-95 cursor-pointer ${
                    fontFamily === 'Outfit'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <p className="text-xs font-sans font-bold">Hiện đại</p>
                  <span className="text-[9px] text-gray-400 block">Inter / Outfit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFontFamily('Playfair')}
                  className={`p-2 rounded-xl text-center border transition-all active:scale-95 cursor-pointer ${
                    fontFamily === 'Playfair'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-extrabold shadow-xs'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <p className="text-xs font-serif font-bold">Cổ điển</p>
                  <span className="text-[9px] text-gray-400 block">Classic Serif</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: THỜI GIAN & ĐỊNH DẠNG */}
        <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Thời Gian & Định Dạng</h2>
              <p className="text-[10px] text-gray-400">Quy chuẩn hiển thị giờ bóng lăn và hạn chốt vote</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-2">Định Dạng Đồng Hồ</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTimeFormat('24h')}
                className={`py-2 px-3 rounded-xl flex items-center justify-between border text-xs transition-all active:scale-95 cursor-pointer ${
                  timeFormat === '24h'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span>24 Giờ (18:30)</span>
                {timeFormat === '24h' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setTimeFormat('12h')}
                className={`py-2 px-3 rounded-xl flex items-center justify-between border text-xs transition-all active:scale-95 cursor-pointer ${
                  timeFormat === '12h'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span>12 Giờ (06:30 PM)</span>
                {timeFormat === '12h' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: THÔNG BÁO (NOTIFICATIONS SWITCHES) */}
        <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Thông Báo Tự Động (Push & Toast)</h2>
              <p className="text-[10px] text-gray-400">Cấu hình thông báo tự động cho thành viên</p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-gray-100">
            {/* Switch 1: Nhắc trận đấu */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-bold text-gray-800">Thông báo nhắc trận đấu</p>
                <p className="text-[10px] text-gray-400">Gửi lời nhắc điểm danh trước giờ bóng lăn 4 tiếng</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={matchReminderNotif}
                  onChange={(e) => setMatchReminderNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Switch 2: Nhắc quỹ đội */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-xs font-bold text-gray-800">Thông báo đóng quỹ đội</p>
                <p className="text-[10px] text-gray-400">Tự động nhắc nộp tiền sân & quỹ hàng tháng</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={fundReminderNotif}
                  onChange={(e) => setFundReminderNotif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 5: QUẢN LÝ SINH NHẬT (BIRTHDAY MODULE) */}
        <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
              <span className="text-base">🎂</span>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Quản Lý Sinh Nhật Đội Bóng</h2>
              <p className="text-[10px] text-gray-400">Tự động nhắc nhở và tạo không khí vui vẻ cho anh em</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-800">Báo cáo sinh nhật theo tháng</p>
                <p className="text-[10px] text-gray-400">Đầu mỗi tháng hệ thống hiện thông báo tóm tắt sinh nhật</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={birthdayReportEnabled}
                  onChange={(e) => setBirthdayReportEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-pink-500"></div>
              </label>
            </div>

            {/* Alert preview khi bật tính năng */}
            {birthdayReportEnabled && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-gradient-to-r from-pink-50/80 to-rose-50/80 border border-pink-200/90 rounded-2xl flex items-start gap-2.5 shadow-xs"
              >
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  🎁
                </div>
                <div>
                  <p className="text-xs font-black text-pink-950 flex items-center gap-1.5">
                    <span>Thông Báo Đầu Tháng 10</span>
                    <span className="text-[9px] bg-pink-200 text-pink-900 px-1.5 py-0.2 rounded-full font-bold">Tự động</span>
                  </p>
                  <p className="text-[11px] text-pink-900 font-medium mt-1 leading-relaxed">
                    Tháng 10 này có sinh nhật của: <strong>Nguyễn Quang Hải</strong> (13/10 🎂), <strong>Nguyễn Hoàng Đức</strong> (18/10), <strong>Nguyễn Tiến Linh</strong> (20/10), <strong>Bầu Thắng</strong> (25/10). Anh em chuẩn bị bắn pháo hoa chúc mừng nhé! 🎉
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* NÚT LƯU CÀI ĐẶT SOFT UI GRADIENT */}
        <div className="pt-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all cursor-pointer whitespace-nowrap"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>Đã lưu thành công tất cả cài đặt!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Cài Đặt Đội Bóng</span>
              </>
            )}
          </motion.button>
        </div>

      </form>
    </div>
  );
}
