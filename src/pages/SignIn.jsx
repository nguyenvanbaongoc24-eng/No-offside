import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function SignIn({ onLoginSuccess }) {
  const [phone, setPhone] = useState('0987654321');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center px-5 py-12 text-gray-900 font-['Be_Vietnam_Pro'] antialiased select-none">
      <div className="max-w-sm mx-auto w-full">
        
        {/* App Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-white shadow-soft border border-gray-100 p-2 mb-3">
            <img 
              src="/apple-touch-icon.png" 
              alt="No Offside Logo" 
              className="w-full h-full object-contain rounded-2xl"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span style={{ display: 'none' }} className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            NO OFFSIDE
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Nền tảng quản lý đội bóng đá nội bộ Việt Nam
          </p>
        </div>

        {/* White Card Login Form */}
        <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-6 sm:p-7">
          <h2 className="text-lg font-black text-gray-900 mb-1">
            Đăng Nhập
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-medium">
            Nhập số điện thoại để điểm danh và quản lý quỹ đội
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                Mật khẩu hoặc Mã PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-600/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/25 transition-all duration-200 mt-2 active:scale-[0.98]"
            >
              <span>Đăng Nhập</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={onLoginSuccess}
              className="text-xs text-green-700 hover:text-green-800 font-extrabold flex items-center justify-center gap-1.5 mx-auto bg-green-50 px-4 py-2 rounded-full border border-green-200/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-green-600" />
              <span>Vào nhanh với tài khoản Cầu thủ Số 9</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
