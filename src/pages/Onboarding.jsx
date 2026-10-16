import {Soccer,Target,Shield,Hand} from '../components/icons';
import Pressable from '../components/Pressable';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Hash, ArrowRight, Calendar, Cake, Sparkles } from "../components/icons";

export default function Onboarding({ defaultData = {}, onComplete }) {
  const [fullName, setFullName] = useState(defaultData.name || 'Tuấn Hưng');
  const [birthday, setBirthday] = useState(defaultData.birthday || '1997-10-13');
  const [position, setPosition] = useState(defaultData.role || 'Tiền đạo (ST)');
  const [jerseyNumber, setJerseyNumber] = useState(defaultData.number || 9);

  const positions = [
    { id: 'st', label: 'Tiền đạo (ST)', icon: Soccer, desc: 'Săn bàn' },
    { id: 'mf', label: 'Tiền vệ (MF)', icon: Target, desc: 'Kiến thiết' },
    { id: 'df', label: 'Hậu vệ (DF)', icon: Shield, desc: 'Phòng ngự' },
    { id: 'gk', label: 'Thủ môn (GK)', icon: Hand, desc: 'Người gác đền' },
  ];

  const popularNumbers = [7, 9, 10, 11, 14, 19, 22];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ và tên của bạn!');
      return;
    }
    if (!birthday) {
      alert('Vui lòng chọn ngày tháng năm sinh của bạn!');
      return;
    }

    const userData = {
      name: fullName.trim(),
      birthday: birthday,
      role: position,
      number: parseInt(jerseyNumber) || 9,
    };

    if (onComplete) {
      onComplete(userData);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-between px-4 py-8 text-gray-900 font-['Be_Vietnam_Pro'] antialiased select-none animate-in fade-in duration-300">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-between">
        
        {/* Header Onboarding */}
        <div className="mb-4 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-black mb-2">
            <span>Bước 3 / 3</span>
            <span>• Khởi tạo hồ sơ</span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Hoàn thiện hồ sơ
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Hãy cho đồng đội biết bạn là ai trên sân cỏ.
          </p>
        </div>

        {/* Soft UI Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-5 sm:p-6 space-y-4 transition-all">
          
          {/* 1. INPUT: HỌ VÀ TÊN (BẮT BUỘC) */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 px-4 text-xs font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
            />
          </div>

          {/* 2. INPUT: NGÀY THÁNG NĂM SINH (YÊU CẦU 1: BẮT BUỘC) */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Cake className="w-3.5 h-3.5 text-pink-500" />
                <span>Ngày tháng năm sinh</span>
              </span>
              <span className="text-[10px] text-rose-500 font-bold">* Bắt buộc</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 px-4 text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-1 pl-1">
              Giúp đội bóng không bỏ lỡ sinh nhật của bạn <Cake size={20} />
            </p>
          </div>

          {/* 3. SELECT/PILL CHIPS: VỊ TRÍ SỞ TRƯỜNG */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-gray-400" />
              <span>Vị trí sở trường</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {positions.map((pos) => {
                const isSelected = position === pos.label;
                return (
                  <Pressable
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.label)}
                    className={`py-2.5 px-2.5 rounded-2xl text-left border transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-600 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                        : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base"><pos.icon size={20} filled={isSelected} /></span>
                    <div className="min-w-0">
                      <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {pos.label}
                      </p>
                      <p className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {pos.desc}
                      </p>
                    </div>
                  </Pressable>
                );
              })}
            </div>
          </div>

          {/* 4. INPUT: SỐ ÁO YÊU THÍCH */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>Số áo yêu thích</span>
            </label>

            <div className="flex items-center gap-2.5">
              <input
                type="number"
                min={1}
                max={99}
                required
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="9"
                className="w-20 bg-gray-50 border border-gray-200 rounded-full py-2.5 px-3 text-center text-base font-black font-mono text-emerald-600 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />

              <div className="flex-1 flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
                {popularNumbers.map((num) => (
                  <Pressable
                    key={num}
                    type="button"
                    onClick={() => setJerseyNumber(num)}
                    className={`w-7 h-7 rounded-full text-[11px] font-black font-mono border transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center ${
                      parseInt(jerseyNumber) === num
                        ? 'bg-slate-900 text-emerald-400 border-slate-900 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </Pressable>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Player Preview Badge */}
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shadow-sm">
                #{jerseyNumber || 9}
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">{fullName || 'Cầu thủ mới'}</p>
                <p className="text-[10px] text-gray-500 font-medium">{position} • <Cake size={20} /> {birthday ? new Date(birthday).toLocaleDateString('vi-VN') : 'Chưa nhập'}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Sẵn sàng
            </span>
          </div>

          {/* BUTTON GÓC DƯỚI: "VÀO SÂN THÔI!" */}
          <div className="pt-1">
            <Pressable
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Vào sân thôi!</span>
              <ArrowRight className="w-4 h-4" />
            </Pressable>
          </div>

        </form>

        <p className="text-[11px] text-center text-gray-400 mt-3">
          Thông tin có thể thay đổi trong phần Cài đặt cá nhân
        </p>

      </div>
    </div>
  );
}

export { Onboarding as OnboardingScreen };
