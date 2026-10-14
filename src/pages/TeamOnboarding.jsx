import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  QrCode,
  KeyRound,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function TeamOnboarding({
  user,
  onOpenCreateTeam,
  onOpenJoinCode,
  onOpenScanQr,
}) {
  return (
    <div className="team-onboarding bg-slate-50 flex flex-col justify-between p-5 pt-8 font-sans">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm mb-1">
            <img src="/pwa-512x512.png" alt="No Offside" width="48" height="48" className="app-logo" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Bắt đầu cùng đội bóng của bạn
          </h1>
          <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">
            Tạo đội mới hoặc gia nhập đội đang chơi cùng bạn.
          </p>
        </div>

        {/* 2 Big Choice Cards */}
        <div className="space-y-4 pt-2">
          {/* Card 1: Gia nhập đội */}
          <section
            aria-labelledby="card-join-title"
            className="settings-card p-5 border-2 border-slate-200/80 hover:border-emerald-500/80 transition-all shadow-sm rounded-3xl bg-white space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 id="card-join-title" className="text-base font-bold text-slate-900">
                  Gia nhập đội
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bạn đã có đội bóng? Nhập mã Club hoặc quét QR do quản lý đội gửi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenJoinCode}
                className="h-12 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                aria-label="Nhập mã Club để gia nhập đội"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Nhập mã Club</span>
              </button>

              <button
                type="button"
                onClick={onOpenScanQr}
                className="h-12 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                aria-label="Quét mã QR để gia nhập đội"
              >
                <QrCode className="w-4 h-4 shrink-0 text-slate-600" />
                <span>Quét mã QR</span>
              </button>
            </div>
          </section>

          {/* Card 2: Tạo đội mới */}
          <section
            aria-labelledby="card-create-title"
            className="settings-card p-5 border-2 border-slate-200/80 hover:border-emerald-500/80 transition-all shadow-sm rounded-3xl bg-white space-y-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 id="card-create-title" className="text-base font-bold text-slate-900">
                  Tạo đội mới
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tạo đội bóng và quản lý thành viên, lịch đá, nội quy.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCreateTeam}
              className="w-full h-12 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              aria-label="Tạo đội bóng mới"
            >
              <span>Tạo đội bóng</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>

      <footer className="text-center py-4">
        <p className="text-xs text-slate-400">
          No Offside · Ứng dụng quản lý đội bóng phong trào
        </p>
      </footer>
    </div>
  );
}
