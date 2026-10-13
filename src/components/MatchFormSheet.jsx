import React, { useId, useState } from "react";
import { X, CalendarDays, UserCheck, Clock, ShieldAlert } from "lucide-react";
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

  const field = (key, label, type = "text", placeholder = "") => (
    <div className="form-field">
      <label htmlFor={`${prefix}-${key}`}>{label}</label>
      <input
        id={`${prefix}-${key}`}
        required
        type={type}
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
        onInput={
          type === "datetime-local"
            ? (e) => onChange({ ...draft, [key]: e.currentTarget.value })
            : undefined
        }
        aria-describedby={
          type === "datetime-local" ? `${prefix}-${key}-hint` : undefined
        }
        autoComplete="off"
      />
      {type === "datetime-local" && (
        <span id={`${prefix}-${key}-hint`} className="field-hint">
          {draft[key]
            ? "Giờ địa phương trên thiết bị"
            : "Chọn ngày và giờ trên thiết bị"}
        </span>
      )}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Sửa trận" : "Tạo trận"}
      className="match-form-overlay"
    >
      <section className="match-form-sheet animate-in slide-in-from-bottom duration-300">
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <header className="sheet-header">
          <h2>{editing ? "Sửa trận" : "Tạo trận"}</h2>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form
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
          className="match-form"
        >
          <fieldset>
            <legend>
              <CalendarDays size={18} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>Thông tin trận</span>
            </legend>
            {field("opponent", "Đối thủ", "text", "Ví dụ: FC Phủi Sài Gòn")}
            {field("datetime", "Thời gian thi đấu", "datetime-local")}
            {field("venue", "Địa điểm", "text", "Tên sân và địa chỉ")}
          </fieldset>

          <fieldset>
            <legend>
              <UserCheck size={18} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>Điểm danh</span>
            </legend>
            {field("timeoutDatetime", "Hạn chốt điểm danh", "datetime-local")}
            <p className="field-hint">
              Hạn chốt phải trước thời gian thi đấu. Giờ được lưu theo giờ địa
              phương của thiết bị.
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={draft.penaltyEnabled}
                onChange={(e) =>
                  onChange({ ...draft, penaltyEnabled: e.target.checked })
                }
              />
              <span>Áp dụng mức phạt khi chưa điểm danh</span>
            </label>
            {draft.penaltyEnabled && (
              <label htmlFor={`${prefix}-fine`} className="form-field">
                Mức phạt (đ/người)
                <input
                  id={`${prefix}-fine`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  required
                  value={draft.penaltyFine}
                  onChange={(e) =>
                    onChange({ ...draft, penaltyFine: e.target.value })
                  }
                />
                <span className="field-hint">
                  Khoản phạt cần được kiểm tra và ghi vào quỹ.
                </span>
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>
              <UserCheck size={18} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              <span>Đến muộn</span>
            </legend>
            <p className="field-hint">
              Cấu hình chỉ được thực thi khi trận đã kết nối nghiệp vụ trên
              server.
            </p>
            {[
              ["lateBefore", "Hạn xin trước giờ đá (phút)", 10080],
              ["grace", "Dung sai (phút)", 240],
              ["fine", "Phạt đi muộn (đ)", 100000000],
            ].map(([key, label, max]) => (
              <div className="form-field" key={key}>
                <label htmlFor={prefix + "-late-" + key}>{label}</label>
                <input
                  id={prefix + "-late-" + key}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={max}
                  step="1"
                  required
                  value={late[key]}
                  onChange={(e) => updateLate(key, Number(e.target.value))}
                />
              </div>
            ))}
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={late.approvalRequired}
                onChange={(e) =>
                  updateLate("approvalRequired", e.target.checked)
                }
              />
              <span>Cần người có quyền duyệt</span>
            </label>
            <div className="form-field">
              <label htmlFor={prefix + "-approved-policy"}>
                Khi xin muộn được duyệt
              </label>
              <select
                id={prefix + "-approved-policy"}
                value={late.approvedPolicy}
                onChange={(e) => updateLate("approvedPolicy", e.target.value)}
              >
                <option value="eta">Tính muộn từ giờ đã chấp thuận</option>
                <option value="kickoff">Vẫn tính từ giờ đá</option>
                <option value="exempt">Miễn phạt đi muộn khi được duyệt</option>
              </select>
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <footer className="sheet-footer">
            <button
              className="primary-button w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
              type="submit"
              disabled={saving}
            >
              {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo trận"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
