import React, { useState } from 'react';
import { Shield, Phone, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

export default function SignIn({ onLoginSuccess }) {
  const [phone, setPhone] = useState('0987654321');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center px-4 py-12 text-white">
      {/* Liquid blur accents */}
      <div className="fixed top-1/4 left-[-10%] w-[280px] h-[280px] rounded-full bg-emerald-500/25 blur-[90px] pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-[-10%] w-[280px] h-[280px] rounded-full bg-blue-600/25 blur-[90px] pointer-events-none"></div>

      <div className="max-w-sm mx-auto w-full">
        {/* App Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-[0_0_30px_rgba(0,255,102,0.5)] mb-3">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">NO OFFSIDE</h1>
          <p className="text-xs text-slate-400 mt-1">Nền tảng quản lý đội bóng đá nội bộ Việt Nam</p>
        </div>

        {/* Glass Card Login Form */}
        <GlassCard className="p-6 border-white/15 shadow-2xl">
          <h2 className="text-lg font-bold mb-1">Đăng Nhập</h2>
          <p className="text-xs text-slate-400 mb-5">Nhập số điện thoại để điểm danh và xem quỹ đội</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Số điện thoại</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Mật khẩu hoặc Mã PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-slate-950 font-bold mt-2 shadow-[0_0_20px_rgba(0,255,102,0.4)]"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Đăng Nhập
            </Button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <button
              onClick={onLoginSuccess}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Vào nhanh với tài khoản Demo (Số 9)
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
