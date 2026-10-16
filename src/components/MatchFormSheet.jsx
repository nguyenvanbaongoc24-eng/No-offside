import Pressable from './Pressable';
import React, { useId, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "./icons";
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

  const quickFines = [20000, 50000, 100000, 200000];
  const moneyValue = value => Math.min(100000000, Number(String(value).replace(/\D/g, '')) || 0);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Sửa trận" : "Tạo trận"}
      className="match-form-overlay fixed inset-0 z-[200] flex justify-center items-end sm:items-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Backdrop Click to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <section className="match-form-sheet relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-900 dark:text-white overflow-hidden animate-in slide-in-from-bottom duration-300 z-10">
        {/* Mobile handle indicator */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Sheet Header */}
        <header className="sheet-header px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              {editing ? "Sửa trận" : "Tạo trận"}
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
              Thiết lập đối thủ, thời gian và chế tài điểm danh
            </p>
          </div>
          <Pressable
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer outline-none shrink-0 border-0"
          >
            <X size={18} />
          </Pressable>
        </header>

        {/* Form Body - Soft UI with generous whitespace */}
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
          className="match-form flex-1 overflow-y-auto px-6 py-6 space-y-8"
        >
          {/* Nhóm 1: THÔNG TIN TRẬN */}
          <fieldset className="border-0 p-0 m-0 bg-transparent space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2 p-0 block">
              Thông tin trận
            </legend>

            {/* Đối thủ */}
            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-opponent`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Đối thủ
              </label>
              <input
                id={`${prefix}-opponent`}
                required
                type="text"
                value={draft.opponent}
                placeholder="Ví dụ: FC Phủi Sài Gòn"
                onChange={(e) => onChange({ ...draft, opponent: e.target.value })}
                autoComplete="off"
                className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>

            {/* Thời gian thi đấu */}
            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-datetime`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Thời gian thi đấu
              </label>
              <input
                id={`${prefix}-datetime`}
                required
                type="datetime-local"
                value={draft.datetime}
                onChange={(e) => onChange({ ...draft, datetime: e.target.value })}
                onInput={(e) => onChange({ ...draft, datetime: e.currentTarget.value })}
                aria-describedby={`${prefix}-datetime-hint`}
                autoComplete="off"
                className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
              <span
                id={`${prefix}-datetime-hint`}
                className="field-hint text-xs text-gray-400 dark:text-slate-400 mt-1 block font-normal"
              >
                {draft.datetime
                  ? "Giờ theo lịch của đội"
                  : "Chọn ngày và giờ theo lịch của đội"}
              </span>
            </div>

            {/* Địa điểm sân */}
            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-venue`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Địa điểm sân
              </label>
              <input
                id={`${prefix}-venue`}
                required
                type="text"
                value={draft.venue}
                placeholder="Tên sân và địa chỉ"
                onChange={(e) => onChange({ ...draft, venue: e.target.value })}
                autoComplete="off"
                className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
          </fieldset>

          {/* Nhóm 2: ĐIỂM DANH */}
          <fieldset className="border-0 p-0 m-0 bg-transparent space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2 p-0 block">
              Điểm danh
            </legend>

            {/* Hạn chốt điểm danh */}
            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-timeoutDatetime`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Hạn chốt điểm danh
              </label>
              <input
                id={`${prefix}-timeoutDatetime`}
                required
                type="datetime-local"
                value={draft.timeoutDatetime}
                onChange={(e) => onChange({ ...draft, timeoutDatetime: e.target.value })}
                onInput={(e) => onChange({ ...draft, timeoutDatetime: e.currentTarget.value })}
                aria-describedby={`${prefix}-timeout-hint`}
                autoComplete="off"
                className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
              <span
                id={`${prefix}-timeout-hint`}
                className="field-hint text-xs text-gray-400 dark:text-slate-400 mt-1 block font-normal"
              >
                Hạn chốt phải trước thời gian thi đấu
              </span>
            </div>

            {/* Action Card: iOS Toggle Switch cho Áp dụng mức phạt */}
            <label
              htmlFor={`${prefix}-penalty-toggle`}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700/60 shadow-sm cursor-pointer select-none transition-all hover:shadow-md"
            >
              <div className="flex-1 pr-4">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block">
                  Áp dụng mức phạt khi chưa điểm danh
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-400 block mt-0.5">
                  Tự động ghi nhận nợ quỹ nếu vắng mặt không phép
                </span>
              </div>
              <div className="relative inline-flex items-center shrink-0">
                <input
                  id={`${prefix}-penalty-toggle`}
                  type="checkbox"
                  checked={draft.penaltyEnabled}
                  onChange={(e) =>
                    onChange({ ...draft, penaltyEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm peer-checked:bg-green-600"></div>
              </div>
            </label>

            {/* Mức phạt khi vắng mặt */}
            {draft.penaltyEnabled && (
              <div className="space-y-3.5 p-4 rounded-2xl bg-green-50/40 dark:bg-green-950/20 border border-green-100/80 dark:border-green-900/30 animate-in fade-in duration-150">
                <label
                  htmlFor={`${prefix}-fine`}
                  className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
                >
                  Mức phạt (đ/người)
                </label>

                <div className="relative">
                  <input
                    id={`${prefix}-fine`}
                    type="text"
                    inputMode="numeric"
                    required
                    value={Number(draft.penaltyFine || 0).toLocaleString('vi-VN')}
                    onChange={(e) =>
                      onChange({ ...draft, penaltyFine: moneyValue(e.target.value) })
                    }
                    placeholder="50000"
                    className="w-full h-14 pl-4 pr-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 shadow-2xs"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    đ
                  </span>
                </div>

                {/* Quick Chips Pills */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs text-gray-400 dark:text-slate-400 font-medium mr-1">
                    Gợi ý:
                  </span>
                  {quickFines.map((val) => {
                    const active = Number(draft.penaltyFine) === val;
                    return (
                      <Pressable
                        key={val}
                        type="button"
                        onClick={() => onChange({ ...draft, penaltyFine: val })}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)] scale-105"
                            : "bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        {Number(val) / 1000}k
                      </Pressable>
                    );
                  })}
                </div>
              </div>
            )}
          </fieldset>

          {/* Nhóm 3: ĐẾN MUỘN */}
          <fieldset className="border-0 p-0 m-0 bg-transparent space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2 p-0 block">
              Đến muộn
            </legend>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-field space-y-1.5">
                <label
                  htmlFor={`${prefix}-late-lateBefore`}
                  className="text-sm font-semibold text-gray-700 dark:text-gray-200 block truncate"
                >
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
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>

              <div className="form-field space-y-1.5">
                <label
                  htmlFor={`${prefix}-late-grace`}
                  className="text-sm font-semibold text-gray-700 dark:text-gray-200 block truncate"
                >
                  Dung sai (phút)
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
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
            </div>

            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-late-fine`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Phạt đi muộn (đ)
              </label>
              <div className="relative">
                <input
                  id={`${prefix}-late-fine`}
                  type="text"
                  inputMode="numeric"
                  required
                  value={Number(late.fine || 0).toLocaleString('vi-VN')}
                  onChange={(e) => updateLate("fine", moneyValue(e.target.value))}
                  className="w-full h-14 pl-4 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                  đ
                </span>
              </div>

              {/* Quick Chips Pills */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-slate-400 font-medium mr-1">
                  Gợi ý:
                </span>
                {quickFines.map((val) => {
                  const active = Number(late.fine) === Number(val);
                  return (
                    <Pressable
                      key={val}
                      type="button"
                      onClick={() => updateLate("fine", Number(val))}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)] scale-105"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 border border-transparent"
                      }`}
                    >
                      {Number(val) / 1000}k
                    </Pressable>
                  );
                })}
              </div>
            </div>

            {/* Action Card: iOS Toggle Switch cho Cần người có quyền duyệt */}
            <label
              htmlFor={`${prefix}-late-approval-toggle`}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-700/60 shadow-sm cursor-pointer select-none transition-all hover:shadow-md"
            >
              <div className="flex-1 pr-4">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 block">
                  Cần người có quyền duyệt
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-400 block mt-0.5">
                  Ban quản lý cần chấp thuận đơn xin muộn
                </span>
              </div>
              <div className="relative inline-flex items-center shrink-0">
                <input
                  id={`${prefix}-late-approval-toggle`}
                  type="checkbox"
                  checked={late.approvalRequired}
                  onChange={(e) =>
                    updateLate("approvalRequired", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-sm peer-checked:bg-green-600"></div>
              </div>
            </label>

            {/* Dropdown Chính sách xin muộn */}
            <div className="form-field space-y-1.5">
              <label
                htmlFor={`${prefix}-approved-policy`}
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 block"
              >
                Khi xin muộn được duyệt
              </label>
              <select
                id={`${prefix}-approved-policy`}
                value={late.approvedPolicy}
                onChange={(e) => updateLate("approvedPolicy", e.target.value)}
                className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/60 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer"
              >
                <option value="eta">Tính muộn từ giờ đã chấp thuận</option>
                <option value="kickoff">Vẫn tính từ giờ đá</option>
                <option value="exempt">Miễn phạt đi muộn khi được duyệt</option>
              </select>
            </div>
          </fieldset>

          {/* Error Notice */}
          {error && (
            <p
              role="alert"
              className="form-error p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </form>

        {/* Sticky Action Footer */}
        <footer className="sheet-footer sticky bottom-0 z-10 px-6 pt-3.5 pb-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
          <Pressable
            type="button"
            onClick={onClose}
            className="h-14 px-6 rounded-full font-bold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all cursor-pointer whitespace-nowrap active:scale-95 outline-none flex items-center justify-center shrink-0 border-0"
          >
            Hủy
          </Pressable>

          <Pressable
            form={`${prefix}-form`}
            type="submit"
            disabled={saving}
            className="primary-button h-14 flex-1 rounded-full font-bold text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 outline-none border-0"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu…</span>
              </div>
            ) : editing ? (
              <span>Lưu thay đổi</span>
            ) : (
              <span>Tạo trận</span>
            )}
          </Pressable>
        </footer>
      </section>
    </div>
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(content, document.body)
    : content;
}
