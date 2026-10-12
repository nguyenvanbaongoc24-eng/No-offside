import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowUpRight, 
  Phone, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  ChevronRight, 
  Compass, 
  RefreshCw,
  Trophy,
  User,
  Hash
} from 'lucide-react';

/* =====================================================================
   BƯỚC 1: SPLASH SCREEN COMPONENT
   - Nền trắng tinh khiết
   - Chính giữa màn hình là Logo (Quả bóng + Mũi tên từ Lucide) màu Xanh/Navy
   - Animation: Icon đập nhịp (pulse) nhẹ nhàng
   - Tự động chuyển sang Bước 2 sau 2 giây
   ===================================================================== */
export function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      onClick={onFinish}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-8 select-none cursor-pointer animate-in fade-in duration-300"
    >
      {/* Top spacer */}
      <div className="w-full flex justify-end">
        <button 
          onClick={(e) => { e.stopPropagation(); onFinish(); }}
          className="text-xs font-bold text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 transition-all active:scale-95"
        >
          Bỏ qua
        </button>
      </div>

      {/* Center Brand Logo with subtle pulsing motion */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          {/* Subtle outer glow / aura */}
          <div className="absolute inset-0 rounded-[36px] bg-emerald-400/20 blur-xl animate-pulse"></div>

          {/* Logo Badge (Navy background with Green Accent) */}
          <div className="relative w-24 h-24 rounded-[32px] bg-slate-900 border-2 border-emerald-500/40 shadow-2xl flex items-center justify-center p-3 animate-pulse">
            {/* Custom Soccer Ball + Arrow Dynamic Composition */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Soccer Ball Core */}
              <div className="w-12 h-12 rounded-full border-2 border-white/90 flex items-center justify-center bg-white/5 relative">
                <span className="text-2xl filter drop-shadow">⚽</span>
              </div>
              {/* Arrow Up-Right overlaying corner for forward motion */}
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md font-black border-2 border-white">
                <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-900 font-['Be_Vietnam_Pro']">
          NO OFFSIDE
        </h1>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mt-1">
          Bóng Đá Phong Trào
        </p>
      </div>

      {/* Footer loading indicator */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">
          Chạm vào màn hình để bắt đầu ngay
        </p>
      </div>
    </div>
  );
}

/* =====================================================================
   BƯỚC 2: AUTH SCREEN COMPONENT (MÀN HÌNH ĐĂNG NHẬP)
   - Tiêu đề: "Chào mừng đến với", dòng dưới "No Offside" (Chữ to, đậm, màu Xanh lá)
   - Phụ đề: "Đăng nhập bằng số điện thoại để tiếp tục"
   - Card trắng bo góc sâu, drop shadow mềm
   - Input: Nhập Số điện thoại (Hiển thị icon VN +84 ở đầu), bo tròn rounded-full
   - Button: "Tiếp tục" (Màu xanh lá, rounded-full, active:scale-95)
   - Xử lý UI: Hiện form OTP 6 số, Xác nhận -> Bước 3
   ===================================================================== */
export function AuthScreen({ onVerifySuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('0987654321');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (isOtpSent && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, countdown]);

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber.trim().length >= 9) {
      setIsOtpSent(true);
      setCountdown(45);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    onVerifySuccess({ phoneNumber });
  };

  const handleResendOtp = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      setCountdown(45);
    }, 1000);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 text-gray-900 font-['Be_Vietnam_Pro'] antialiased select-none animate-in fade-in duration-300">
      <div className="max-w-sm mx-auto w-full">

        {/* Tiêu đề Chào mừng */}
        <div className="mb-6 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-black mb-3">
            <span>⚽</span>
            <span>FC NO OFFSIDE</span>
          </div>

          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
            Chào mừng đến với
          </h2>
          <h1 className="text-3xl font-black text-[#22C55E] tracking-tight mt-0.5">
            No Offside
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Đăng nhập bằng số điện thoại để tiếp tục
          </p>
        </div>

        {/* Form Card (Trắng, Bo góc sâu rounded-[32px], Shadow mềm) */}
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-7 transition-all duration-300">
          
          {!isOtpSent ? (
            /* SUB-STEP 1: NHẬP SỐ ĐIỆN THOẠI */
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Số điện thoại
                </label>

                {/* Input SĐT bo tròn rounded-full, nền xám nhạt bg-gray-100, icon VN +84 */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-xs font-extrabold text-gray-700 bg-white/80 py-1 px-2 rounded-full border border-gray-200 shadow-xs">
                    <span>🇻🇳</span>
                    <span>+84</span>
                  </div>

                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full bg-gray-100 border border-gray-200/80 rounded-full py-3.5 pl-24 pr-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1.5 block px-2 font-medium">
                  Hệ thống sẽ gửi mã xác thực 6 số qua tin nhắn SMS
                </span>
              </div>

              {/* Nút "Tiếp tục" bo tròn rounded-full, màu xanh lá, active:scale-95 */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95 cursor-pointer mt-2"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* SUB-STEP 2: NHẬP MÃ XÁC THỰC OTP 6 SỐ */
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Nhập mã OTP</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Đã gửi đến <strong>+84 {phoneNumber}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="text-[11px] font-bold text-[#22C55E] hover:underline cursor-pointer"
                >
                  Đổi SĐT
                </button>
              </div>

              {/* 6 ô Input OTP */}
              <div className="grid grid-cols-6 gap-2 my-2">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-full aspect-square text-center text-lg font-black font-mono bg-gray-100 border border-gray-200 rounded-2xl text-gray-900 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
                  />
                ))}
              </div>

              {/* Countdown / Gửi lại mã */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                {countdown > 0 ? (
                  <span>Gửi lại mã sau <strong className="text-gray-900">{countdown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-[#22C55E] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>Gửi lại mã OTP</span>
                  </button>
                )}
                <span className="text-[10px] text-gray-400">Gợi ý: 123456</span>
              </div>

              {/* Nút Xác nhận OTP */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Xác nhận & Tiếp tục</span>
              </button>
            </form>
          )}

          {/* Quick Demo Access */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => onVerifySuccess({ name: 'Tuấn Hưng', number: 9, role: 'Tiền đạo (ST)' })}
              className="text-xs text-emerald-800 hover:text-emerald-900 font-extrabold flex items-center justify-center gap-1.5 mx-auto bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2 rounded-full border border-emerald-200/80 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Vào nhanh với tài khoản mẫu Số 9</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

/* =====================================================================
   BƯỚC 3: ONBOARDING SCREEN COMPONENT (KHỞI TẠO THÔNG TIN CẦU THỦ)
   - Tiêu đề: "Hoàn thiện hồ sơ"
   - Phụ đề: "Hãy cho đồng đội biết bạn là ai trên sân cỏ."
   - Form Soft UI rộng rãi:
     1. Input: "Họ và tên của bạn" (Bắt buộc)
     2. Select/Pill Chips: "Vị trí sở trường" (Tiền đạo, Tiền vệ, Hậu vệ, Thủ môn)
     3. Input: "Số áo yêu thích" (Ví dụ: 9)
   - Button góc dưới: "Vào sân thôi!" (Icon mũi tên tiến lên)
   ===================================================================== */
export function OnboardingScreen({ defaultData = {}, onComplete }) {
  const [fullName, setFullName] = useState(defaultData.name || 'Tuấn Hưng');
  const [position, setPosition] = useState('Tiền đạo (ST)');
  const [jerseyNumber, setJerseyNumber] = useState(defaultData.number || 9);

  const positions = [
    { id: 'st', label: 'Tiền đạo (ST)', icon: '⚽', desc: 'Săn bàn' },
    { id: 'mf', label: 'Tiền vệ (MF)', icon: '🎯', desc: 'Kiến thiết' },
    { id: 'df', label: 'Hậu vệ (DF)', icon: '🛡️', desc: 'Phòng ngự' },
    { id: 'gk', label: 'Thủ môn (GK)', icon: '🧤', desc: 'Người gác đền' },
  ];

  const popularNumbers = [7, 9, 10, 11, 14, 19, 22];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên của bạn!');
      return;
    }

    const userData = {
      name: fullName.trim(),
      role: position,
      number: parseInt(jerseyNumber) || 9,
    };

    console.log('Onboarding complete data:', userData);
    onComplete(userData);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8 text-gray-900 font-['Be_Vietnam_Pro'] antialiased select-none animate-in fade-in duration-300">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-between">
        
        {/* Header Onboarding */}
        <div className="mb-5 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-black mb-2">
            <span>Bước 3 / 3</span>
            <span>• Khởi tạo hồ sơ</span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Hoàn thiện hồ sơ
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Hãy cho đồng đội biết bạn là ai trên sân cỏ.
          </p>
        </div>

        {/* Soft UI Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 space-y-5 transition-all">
          
          {/* 1. INPUT: HỌ VÀ TÊN (BẮT BUỘC) */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Họ và tên của bạn</span>
              </span>
              <span className="text-[10px] text-rose-500 font-bold">* Bắt buộc</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Tuấn Hưng"
              className="w-full bg-gray-100 border border-gray-200/80 rounded-full py-3.5 px-5 text-sm font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
            />
          </div>

          {/* 2. SELECT/PILL CHIPS: VỊ TRÍ SỞ TRƯỜNG */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-gray-400" />
              <span>Vị trí sở trường</span>
            </label>

            {/* Chips xếp ngang dạng lưới 2x2 hoặc flex mượt mà */}
            <div className="grid grid-cols-2 gap-2">
              {positions.map((pos) => {
                const isSelected = position === pos.label;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.label)}
                    className={`py-3 px-3 rounded-2xl text-left border transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-[#22C55E] text-white border-emerald-600 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                        : 'bg-gray-100 text-gray-700 border-gray-200/60 hover:bg-gray-200/70'
                    }`}
                  >
                    <span className="text-lg">{pos.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {pos.label}
                      </p>
                      <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {pos.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. INPUT: SỐ ÁO YÊU THÍCH */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>Số áo yêu thích</span>
            </label>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={99}
                required
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="9"
                className="w-24 bg-gray-100 border border-gray-200/80 rounded-full py-3 px-4 text-center text-lg font-black font-mono text-[#22C55E] focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
              />

              {/* Gợi ý số áo nhanh */}
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1">
                {popularNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setJerseyNumber(num)}
                    className={`w-8 h-8 rounded-full text-xs font-black font-mono border transition-all duration-200 active:scale-95 cursor-pointer shrink-0 flex items-center justify-center ${
                      parseInt(jerseyNumber) === num
                        ? 'bg-slate-900 text-emerald-400 border-slate-900 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-200/70 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Player Preview Badge */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-emerald-400 font-mono font-black text-sm flex items-center justify-center shadow-sm">
                #{jerseyNumber || 9}
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">{fullName || 'Cầu thủ mới'}</p>
                <p className="text-[10px] text-gray-500 font-medium">Vị trí: {position}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Sẵn sàng ra sân
            </span>
          </div>

          {/* BUTTON GÓC DƯỚI: "VÀO SÂN THÔI!" */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#22C55E] hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <span>Vào sân thôi!</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

        </form>

        {/* Footer text */}
        <p className="text-[11px] text-center text-gray-400 mt-4">
          © No Offside — Ứng dụng quản lý đội bóng phong trào số 1
        </p>

      </div>
    </div>
  );
}

/* =====================================================================
   MAIN COMPONENT: AUTH / ONBOARDING FLOW CONTROLLER
   - Quản lý state chuyển đổi mượt mà giữa:
     1. Splash Screen
     2. Auth Screen
     3. Onboarding Screen
   - Hoàn tất -> onLoginSuccess(userData)
   ===================================================================== */
export default function SignIn({ onLoginSuccess }) {
  const [currentStep, setCurrentStep] = useState('splash'); // 'splash' | 'auth' | 'onboarding'
  const [authData, setAuthData] = useState({});

  return (
    <div className="w-full min-h-screen bg-slate-50 relative overflow-hidden font-['Be_Vietnam_Pro']">
      {currentStep === 'splash' && (
        <SplashScreen onFinish={() => setCurrentStep('auth')} />
      )}

      {currentStep === 'auth' && (
        <AuthScreen 
          onVerifySuccess={(data) => {
            setAuthData(data);
            setCurrentStep('onboarding');
          }} 
        />
      )}

      {currentStep === 'onboarding' && (
        <OnboardingScreen 
          defaultData={authData}
          onComplete={(finalData) => {
            if (onLoginSuccess) {
              onLoginSuccess({ ...authData, ...finalData });
            }
          }} 
        />
      )}
    </div>
  );
}
