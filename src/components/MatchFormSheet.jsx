import React, { useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CalendarDays,
  UserCheck,
  Clock,
  MapPin,
  Users,
  CalendarPlus,
  Check,
  AlertCircle,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { defaultLate } from "../lib/governance";

export default function MatchFormSheet({
  draft,
  onChange,
  onSubmit,
  onClose,
  editing = false,
  error = "",
}) {
  const prefix = useId();
  const [saving, setSaving] = useState(false);
  const late = { ...defaultLate, ...draft.lateConfig };
  const updateLate = (key, value) =>
    onChange({ ...draft, lateConfig: { ...late, [key]: value } });

  const quickFines = ["20000", "50000", "100000", "200000"];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Sửa lịch thi đấu" : "Tạo lịch thi đấu"}
      className="match-form-overlay fixed inset-0 z-[200] flex justify-center items-end sm:items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop Click to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <section className="match-form-sheet relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-900 dark:text-white overflow-hidden animate-in slide-in-from-bottom duration-300 z-10">
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Sheet Header */}
        <header className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
              <CalendarPlus size={20} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {editing ? "Chỉnh sửa lịch thi đấu" : "Tạo lịch thi đấu mới"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Thiết lập đối thủ, thời gian & chế tài điểm danh
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer outline-none shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        {/* Form Body - Scrollable */}
        <form
          id={`${prefix}-form`}
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            setSaving(true);
            try {
              await onSubmit(e);
            } finally {
              setSaving(false);
            }
          }}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
        >
          {/* Card 1: Thông tin trận đấu */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <CalendarDays size={16} className="stroke-[2.5]" />
              <span>Thông tin trận đấu</span>
            </div>

            {/* Đối thủ */}
            <div className="form-field">
              <label htmlFor={`${prefix}-opponent`} className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Users size={14} className="text-emerald-600" />
                <span>Đội đối thủ</span>
              </label>
              <input
                id={`${prefix}-opponent`}
                required
                type="text"
                value={draft.opponent}
                placeholder="Ví dụ: FC Phủi Sài Gòn"
                onChange={(e) => onChange({ ...draft, opponent: e.target.value })}
                autoComplete="off"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Thời gian thi đấu */}
            <div className="form-field">
              <label htmlFor={`${prefix}-datetime`} className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Clock size={14} className="text-emerald-600" />
                <span>Thời gian thi đấu</span>
              </label>
              <input
                id={`${prefix}-datetime`}
                required
                type="datetime-local"
                value={draft.datetime}
                onChange={(e) => onChange({ ...draft, datetime: e.target.value })}
                onInput={(e) => onChange({ ...draft, datetime: e.currentTarget.value })}
                autoComplete="off"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {draft.datetime ? "Giờ theo thiết bị địa phương" : "Chọn ngày và giờ ra sân"}
              </span>
            </div>

            {/* Địa điểm sân */}
            <div className="form-field">
              <label htmlFor={`${prefix}-venue`} className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <MapPin size={14} className="text-emerald-600" />
                <span>Địa điểm sân bóng</span>
              </label>
              <input
                id={`${prefix}-venue`}
                required
                type="text"
                value={draft.venue}
                placeholder="Ví dụ: Sân Chuyên Việt - 123 Lê Lợi, Q.1"
                onChange={(e) => onChange({ ...draft, venue: e.target.value })}
                autoComplete="off"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Card 2: Quy chế điểm danh & Tiền phạt */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <UserCheck size={16} className="stroke-[2.5]" />
              <span>Điểm danh & Chế tài quỹ</span>
            </div>

            {/* Hạn chốt điểm danh */}
            <div className="form-field">
              <label htmlFor={`${prefix}-timeoutDatetime`} className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Clock size={14} className="text-emerald-600" />
                <span>Hạn chốt điểm danh</span>
              </label>
              <input
                id={`${prefix}-timeoutDatetime`}
                required
                type="datetime-local"
                value={draft.timeoutDatetime}
                onChange={(e) => onChange({ ...draft, timeoutDatetime: e.target.value })}
                onInput={(e) => onChange({ ...draft, timeoutDatetime: e.currentTarget.value })}
                autoComplete="off"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Khuyến nghị: Nên đặt hạn chốt trước giờ thi đấu ít nhất 2 - 4 tiếng.
              </span>
            </div>

            {/* Checkbox Áp dụng phạt khi vắng mặt */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.penaltyEnabled}
                onChange={(e) =>
                  onChange({ ...draft, penaltyEnabled: e.target.checked })
                }
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Áp dụng phạt tiền quỹ khi không điểm danh
              </span>
            </label>

            {/* Mức phạt khi vắng mặt */}
            {draft.penaltyEnabled && (
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label htmlFor={`${prefix}-fine`} className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Coins size={14} className="text-emerald-600" />
                    <span>Mức phạt vắng mặt (VNĐ / người)</span>
                  </label>
                </div>

                <div className="relative">
                  <input
                    id={`${prefix}-fine`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    required
                    value={draft.penaltyFine}
                    onChange={(e) =>
                      onChange({ ...draft, penaltyFine: e.target.value })
                    }
                    placeholder="50000"
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums shadow-2xs pr-12"
                  />
                  <span className="absolute right-3.5 top-2 text-xs font-bold text-slate-400">
                    đ
                  </span>
                </div>

                {/* Nút chọn nhanh mức phạt */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">Nhanh:</span>
                  {quickFines.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange({ ...draft, penaltyFine: val })}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        String(draft.penaltyFine) === val
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {Number(val) / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Quy định đến muộn */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <ShieldCheck size={16} className="stroke-[2.5]" />
              <span>Quy chế đến muộn (Tùy chọn)</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cấu hình xử lý khi thành viên xin đến muộn hoặc đến trễ giờ thi đấu.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="form-field">
                <label htmlFor={`${prefix}-late-lateBefore`} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hạn xin trước (phút)
                </label>
                <input
                  id={`${prefix}-late-lateBefore`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={10080}
                  step="1"
                  required
                  value={late.lateBefore}
                  onChange={(e) => updateLate("lateBefore", Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              <div className="form-field">
                <label htmlFor={`${prefix}-late-grace`} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dung sai trễ (phút)
                </label>
                <input
                  id={`${prefix}-late-grace`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={240}
                  step="1"
                  required
                  value={late.grace}
                  onChange={(e) => updateLate("grace", Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor={`${prefix}-late-fine`} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mức phạt đi muộn (VNĐ)
              </label>
              <input
                id={`${prefix}-late-fine`}
                type="number"
                inputMode="numeric"
                min="0"
                max={100000000}
                step="5000"
                required
                value={late.fine}
                onChange={(e) => updateLate("fine", Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={late.approvalRequired}
                onChange={(e) =>
                  updateLate("approvalRequired", e.target.checked)
                }
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Yêu cầu Ban Quản Lý phê duyệt khi xin muộn
              </span>
            </label>

            <div className="form-field">
              <label htmlFor={`${prefix}-approved-policy`} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chính sách khi đơn xin muộn được duyệt
              </label>
              <select
                id={`${prefix}-approved-policy`}
                value={late.approvedPolicy}
                onChange={(e) => updateLate("approvedPolicy", e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                <option value="eta">Tính muộn từ giờ đã chấp thuận</option>
                <option value="kickoff">Vẫn tính từ giờ bắt đầu trận</option>
                <option value="exempt">Miễn phạt đi muộn khi đã được duyệt</option>
              </select>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* =========================================================================
            STICKY ACTION FOOTER: NỔI TRÊN CÙNG, CỐ ĐỊNH Ở ĐÁY SHEET, RÕ RÀNG VÀ TRỰC QUAN
            Không bao giờ bị che khuất bởi navigation bar hay cấn mép điện thoại
            ========================================================================= */}
        <footer className="p-4 pb-6 sm:pb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer whitespace-nowrap active:scale-95 outline-none"
          >
            Hủy
          </button>

          <button
            form={`${prefix}-form`}
            type="submit"
            disabled={saving}
            className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 outline-none"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu lịch đấu…</span>
              </>
            ) : editing ? (
              <>
                <Check size={18} className="stroke-[2.5]" />
                <span>Lưu thay đổi trận đấu</span>
              </>
            ) : (
              <>
                <CalendarPlus size={18} className="stroke-[2.5]" />
                <span>Xác nhận tạo lịch đá</span>
              </>
            )}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
