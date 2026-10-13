import React, { useId } from "react";
import { X, CalendarDays, UserCheck } from "lucide-react";

export default function MatchFormSheet({
  draft,
  onChange,
  onSubmit,
  onClose,
  editing = false,
  error = "",
}) {
  const prefix = useId();
  const field = (key, label, type = "text", placeholder = "") => (
    <label htmlFor={`${prefix}-${key}`} className="form-field">
      {label}
      <input
        id={`${prefix}-${key}`}
        required
        type={type}
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
        autoComplete="off"
      />
      {type === "datetime-local" && (
        <span className="field-hint">
          {draft[key]
            ? "Giờ địa phương trên thiết bị"
            : "Chọn ngày và giờ trên thiết bị"}
        </span>
      )}
    </label>
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Sửa trận" : "Tạo trận"}
      className="match-form-overlay"
    >
      <section className="match-form-sheet">
        <header className="sheet-header">
          <h2>{editing ? "Sửa trận" : "Tạo trận"}</h2>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <form onSubmit={onSubmit} className="match-form">
          <fieldset>
            <legend>
              <CalendarDays size={20} />
              Thông tin trận
            </legend>
            {field("opponent", "Đối thủ", "text", "Ví dụ: FC Phủi Sài Gòn")}
            {field("datetime", "Thời gian thi đấu", "datetime-local")}
            {field("venue", "Địa điểm", "text", "Tên sân và địa chỉ")}
          </fieldset>
          <fieldset>
            <legend>
              <UserCheck size={20} />
              Điểm danh
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
              Áp dụng mức phạt khi chưa điểm danh
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
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <footer className="sheet-footer">
            <button className="primary-button w-full" type="submit">
              {editing ? "Lưu thay đổi" : "Tạo trận"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
