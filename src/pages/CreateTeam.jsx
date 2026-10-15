import Pressable from '../components/Pressable';
import { imageDataUrl } from '../lib/images';
import React, { useState } from 'react';
import {
  Camera,
  Shield,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  Users,
  Check,
  Trophy
} from 'lucide-react';

import { Loader2, AlertCircle } from 'lucide-react';

export default function CreateTeam({ onTeamCreated, onBack }) {
  const [teamName, setTeamName] = useState('');
  const [stadium, setStadium] = useState('');
  const [teamType, setTeamType] = useState('Sân 7');
  const [logoPreview, setLogoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const teamTypeOptions = ['Sân 5', 'Sân 7', 'Sân 11'];

  // Preset logo options if user doesn't upload
  const presetLogos = [
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=160&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=160&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=160&auto=format&fit=crop&q=80',
  ];

  const handleLogoUpload = async e => { try { setLogoPreview(await imageDataUrl(e.target.files?.[0])); } catch (err) { alert(err.message); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!teamName.trim() || teamName.trim().length < 2) {
      setSubmitError('Vui lòng nhập tên đội bóng của bạn (tối thiểu 2 ký tự)!');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);

    const newTeamData = {
      teamName: teamName.trim(),
      teamCategory: teamType,
      stadium: stadium.trim() || 'Sân bóng Sài Gòn',
      teamLogo: logoPreview || presetLogos[0],
      role: 'Đội Trưởng (Owner)',
      roleType: 'owner',
      isCaptain: true,
    };

    try {
      if (onTeamCreated) {
        await onTeamCreated(newTeamData);
      }
    } catch (err) {
      setSubmitError(err.message || 'Không thể tạo đội bóng. Vui lòng kiểm tra kết nối và thử lại.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-team-page relative bg-slate-50 text-gray-900 pb-4 font-sans antialiased">

      {/* Top Header */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-8 px-5 rounded-b-[36px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="flex items-center justify-between mb-3 relative z-10">
          {onBack && (
            <Pressable
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </Pressable>
          )}

          <span className="text-xs font-bold  tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Dành Cho Chủ Đội (Owner)
          </span>
        </div>

        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Tạo đội bóng của bạn</h1>
          <p className="text-xs text-gray-400 mt-1">
            Khởi tạo FC và trở thành Đội trưởng để quản lý quỹ, điểm danh và xếp sa bàn chiến thuật.
          </p>
        </div>
      </section>

      {/* Main Card Form */}
      <div className="max-w-md mx-auto px-4 -mt-4 relative z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 space-y-6"
        >
          {submitError && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="font-semibold leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* 1. KHU VỰC UPLOAD LOGO: HÌNH TRÒN TO W-32 H-32 */}
          <div className="flex flex-col items-center">
            <label className="text-xs font-bold text-gray-600 mb-2">
              Logo đội bóng
            </label>

            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-emerald-500 group-hover:bg-slate-50 cursor-pointer shadow-inner">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Team Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center mb-1 text-gray-500 group-hover:text-emerald-600">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold">Tải ảnh logo</span>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Chọn ảnh logo đội"
                />
              </div>

              {/* Edit pill on corner */}
              <div className="absolute bottom-0 right-1 bg-emerald-500 text-white p-2 rounded-full shadow-md border-2 border-white pointer-events-none">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Logo Presets Quick Select */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Hoặc chọn mẫu:</span>
              <div className="flex items-center gap-1.5">
                {presetLogos.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt="Preset Logo"
                    onClick={() => setLogoPreview(url)}
                    className={`w-7 h-7 rounded-full object-cover cursor-pointer border-2 transition-all active:scale-90 ${
                      logoPreview === url ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 2. INPUT: TÊN ĐỘI BÓNG */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center justify-between">
              <span>Tên đội bóng</span>
              <span className="text-xs text-rose-500 font-bold">* Bắt buộc</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ví dụ: FC Phủi Sài Gòn"
                className="w-full h-14 bg-gray-100 border border-gray-200/80 rounded-full px-5 text-sm font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
              />
            </div>
          </div>

          {/* 3. INPUT: SÂN NHÀ & KHU VỰC */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>Sân nhà chính</span>
            </label>
            <input
              type="text"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              placeholder="Ví dụ: Sân Chuyên Việt (18D Cộng Hòa, Tân Bình)"
              className="w-full h-14 bg-gray-100 border border-gray-200/80 rounded-full px-5 text-sm font-bold text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#22C55E] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
            />
          </div>

          {/* 4. CHIP SELECTOR: LOẠI HÌNH SÂN THI ĐẤU */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-2 block flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-gray-400" />
              <span>Loại hình sân sở trường</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {teamTypeOptions.map((type) => {
                const isActive = teamType === type;
                return (
                  <Pressable
                    key={type}
                    type="button"
                    onClick={() => setTeamType(type)}
                    className={`h-12 rounded-2xl font-bold text-xs border transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                      isActive
                        ? 'bg-[#22C55E] text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200/70'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{type}</span>
                  </Pressable>
                );
              })}
            </div>
          </div>

          {/* 5. NÚT BẤM: TẠO ĐỘI BÓNG */}
          <div className="pt-2">
            <Pressable
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-14 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all duration-200 cursor-pointer ${
                isSubmitting
                  ? 'bg-emerald-400 opacity-80 cursor-not-allowed'
                  : 'bg-[#22C55E] hover:bg-emerald-600 shadow-emerald-500/25 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang lưu đội bóng vào hệ thống...</span>
                </>
              ) : (
                <>
                  <span>Tạo Đội Bóng & Vào Dashboard</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </Pressable>
            <p className="text-xs text-center text-gray-400 mt-3 font-medium">
              Bạn sẽ tự động trở thành Chủ đội (Owner) để quản lý đội bóng.
            </p>
          </div>
        </form>
      </div>

    </div>
  );
}
