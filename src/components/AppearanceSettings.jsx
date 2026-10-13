import React from "react";
import { Sun, Moon, Smartphone } from "lucide-react";
export default function AppearanceSettings({ preferences }) {
  return (
    <section className="settings-card">
      <h2>Giao diện cá nhân</h2>
      <p className="text-sm text-slate-500 mt-2">
        Áp dụng và tự lưu ngay cho tài khoản này.
      </p>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          ["light", "Sáng", Sun],
          ["dark", "Tối", Moon],
          ["system", "Hệ thống", Smartphone],
        ].map(([value, label, Icon]) => (
          <button
            type="button"
            className="choice-button flex-col"
            key={value}
            aria-pressed={preferences.value.theme === value}
            onClick={() => preferences.update({ theme: value })}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
      <h3 className="text-sm font-medium mt-5 mb-2">Font chữ</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["system", "Hệ thống"],
          ["Be Vietnam Pro", "Be Vietnam Pro"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className="choice-button"
            aria-pressed={preferences.value.fontFamily === value}
            onClick={() => preferences.update({ fontFamily: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Font hệ thống theo thiết bị; trên iPhone dùng font của iOS.
      </p>
      {preferences.error && (
        <p role="alert" className="text-sm text-rose-700 mt-3">
          {preferences.error}
        </p>
      )}
    </section>
  );
}
