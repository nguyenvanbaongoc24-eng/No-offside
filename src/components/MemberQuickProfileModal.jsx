import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "./Avatar";
import {
  X,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Crown,
  Shield,
  User,
  Cake,
  Activity,
  Calendar,
  Share2,
} from "lucide-react";

export default function MemberQuickProfileModal({
  isOpen = false,
  member = null,
  onClose,
  teamName = "No Offside FC",
}) {
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen || !member) return null;

  const isOwner = member.roleType === "owner";
  const isAdmin = member.roleType === "admin";

  // Kiểm tra ngày sinh hôm nay & tháng này
  const getBirthdayInfo = (birthdayStr) => {
    if (!birthdayStr) return null;
    const bday = new Date(birthdayStr);
    const today = new Date();
    const isToday =
      bday.getDate() === today.getDate() &&
      bday.getMonth() === today.getMonth();
    const isThisMonth = bday.getMonth() === today.getMonth();

    return {
      formatted: bday.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      isToday,
      isThisMonth,
    };
  };

  const birthdayInfo = getBirthdayInfo(member.birthday);

  // Vị trí thi đấu & màu sắc badge
  const getPositionBadge = (posStr = "") => {
    const p = (posStr || "Cầu thủ").toLowerCase();
    if (p.includes("tiền đạo") || p.includes("forward") || p.includes("st") || p.includes("cf")) {
      return { label: posStr || "Tiền đạo", color: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" };
    }
    if (p.includes("tiền vệ") || p.includes("midfielder") || p.includes("mf") || p.includes("cm")) {
      return { label: posStr || "Tiền vệ", color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
    }
    if (p.includes("hậu vệ") || p.includes("defender") || p.includes("df") || p.includes("cb")) {
      return { label: posStr || "Hậu vệ", color: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
    }
    if (p.includes("thủ môn") || p.includes("goalkeeper") || p.includes("gk")) {
      return { label: posStr || "Thủ môn", color: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
    }
    return { label: posStr || "Cầu thủ", color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  };

  const posBadge = getPositionBadge(member.role);

  // Số điện thoại làm sạch cho Zalo
  const cleanPhone = member.phone ? member.phone.replace(/[^0-9]/g, "") : "";

  // Sao chép thông tin thẻ cầu thủ
  const handleCopyProfile = () => {
    const text = [
      `⚽ HỒ SƠ CẦU THỦ - ${teamName}`,
      `👤 Họ tên: ${member.name}`,
      `🎽 Số áo: #${member.number}`,
      `🏃‍♂️ Vị trí: ${member.role || "Cầu thủ"}`,
      `👑 Vai trò: ${isOwner ? "Chủ đội" : isAdmin ? (member.customTitle || "Quản trị viên") : "Cầu thủ"}`,
      birthdayInfo ? `🎂 Sinh nhật: ${birthdayInfo.formatted}` : null,
      member.phone ? `📱 Liên hệ: ${member.phone}` : null,
    ].filter(Boolean).join("\n");

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPhoneOnly = () => {
    if (!member.phone) return;
    navigator.clipboard?.writeText(member.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-profile-title"
        className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      >
        {/* Backdrop click to close */}
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Card Banner */}
          <div className="relative h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-4 flex items-start justify-between overflow-hidden">
            {/* Pattern hiệu ứng sân bóng */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

            {/* Team badge / Tag */}
            <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wide">
              <span>⚽</span>
              <span className="truncate max-w-[170px]">{teamName}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="relative z-10 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer outline-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Profile Identity (Avatar + Shirt badge + Name) */}
          <div className="relative px-5 pt-0 pb-3 -mt-12 flex flex-col items-center text-center">
            {/* Avatar container */}
            <div className="relative">
              <div className="p-1 rounded-full bg-white dark:bg-slate-900 shadow-xl ring-4 ring-emerald-500/20">
                <Avatar
                  src={member.avatar}
                  name={member.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>

              {/* Huy hiệu số áo lớn */}
              <div
                className="absolute -bottom-1 -right-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-sm px-2.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md tabular-nums flex items-center justify-center min-w-[32px]"
                title={`Số áo thi đấu #${member.number}`}
              >
                #{member.number}
              </div>
            </div>

            {/* Tên & Vai trò */}
            <h3
              id="quick-profile-title"
              className="text-lg font-extrabold text-slate-900 dark:text-white mt-3 flex items-center gap-1.5 flex-wrap justify-center"
            >
              <span>{member.name}</span>
            </h3>

            {/* Role & Position Badges */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
              {isOwner ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                  <Crown size={12} className="text-amber-500 fill-amber-500" />
                  <span>Chủ đội</span>
                </span>
              ) : isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                  <Shield size={12} className="text-emerald-600" />
                  <span>{member.customTitle || "Ban quản lý"}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-xs inline-flex items-center gap-1">
                  <User size={12} />
                  <span>Cầu thủ</span>
                </span>
              )}

              <span
                className={`px-2.5 py-0.5 rounded-full border font-bold text-xs inline-flex items-center gap-1 shadow-2xs ${posBadge.color}`}
              >
                <span>{posBadge.label}</span>
              </span>
            </div>

            {/* Banner chúc mừng sinh nhật nếu có */}
            {birthdayInfo?.isToday && (
              <div className="mt-3 w-full p-2.5 rounded-2xl bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                <Cake size={16} />
                <span>🎉 Hôm nay là sinh nhật của {member.name}!</span>
              </div>
            )}
          </div>

          {/* Details Grid Container */}
          <div className="px-5 py-2 space-y-2.5 overflow-y-auto flex-1">
            {/* Thẻ thông tin thể thao */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                  <Activity size={13} className="text-emerald-600" />
                  <span>Vị trí</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {member.role || "Cầu thủ"}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                  <span className="text-emerald-600 font-black text-xs">#</span>
                  <span>Số áo thi đấu</span>
                </div>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Áo số #{member.number}
                </p>
              </div>
            </div>

            {/* Ngày sinh */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <Cake size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Ngày sinh nhật
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {birthdayInfo ? birthdayInfo.formatted : "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              {birthdayInfo?.isThisMonth && !birthdayInfo?.isToday && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                  Tháng này 🎂
                </span>
              )}
            </div>

            {/* Số điện thoại & Thao tác liên hệ */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-400">
                      Số điện thoại
                    </p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {member.phone || "Chưa cập nhật SĐT"}
                    </p>
                  </div>
                </div>

                {member.phone && (
                  <button
                    type="button"
                    onClick={handleCopyPhoneOnly}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    title="Sao chép số điện thoại"
                  >
                    {copiedPhone ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>

              {/* Action buttons khi có SĐT */}
              {member.phone && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${member.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <Phone size={13} />
                    <span>Gọi điện</span>
                  </a>

                  {cleanPhone && (
                    <a
                      href={`https://zalo.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                    >
                      <MessageCircle size={13} />
                      <span>Nhắn Zalo</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Trạng thái tài khoản & Gia nhập */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Trạng thái sinh hoạt</span>
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đang sinh hoạt</span>
              </span>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyProfile}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-600">Đã sao chép hồ sơ!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>Chia sẻ / Sao chép</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
