import { personalText } from "../lib/personalCopy";
import React from "react";
import { Sun, Moon, Smartphone, Type } from "lucide-react";

export default function AppearanceSettings({ preferences }) {
  const t = text => personalText(text, preferences.value.language);
  const currentFontSize = preferences.value.fontSize || "medium";

  return (
    <section className="settings-card">
      <h2>{t("Giao diện cá nhân")}</h2>
      <p className="text-sm text-slate-500 mt-2">
        {t("Áp dụng và tự lưu ngay cho tài khoản này.")}
      </p>

      {/* 1. Theme sáng/tối */}
      <h3 className="text-sm font-medium mt-4 mb-2">{t("Chủ đề màu sắc")}</h3>
      <div className="grid grid-cols-3 gap-2">
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
            {t(label)}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-medium mt-5 mb-2">{t("Ngôn ngữ")}</h3>
      <div className="personal-language-control" role="group" aria-label={t("Ngôn ngữ")}>
        <button type="button" aria-label="Tiếng Việt" lang="vi" aria-pressed={(preferences.value.language || "vi") === "vi"} onClick={() => preferences.update({language:"vi"})}>VI</button>
        <button type="button" aria-label="English" lang="en" aria-pressed={preferences.value.language === "en"} onClick={() => preferences.update({language:"en"})}>EN</button>
      </div>
      <p className="field-hint mt-2">{preferences.value.language === "en" ? "English currently applies to the Personal menu, profile form and Messages. Detailed management and other screens remain in Vietnamese." : "VI/EN áp dụng cho menu Cá nhân, hồ sơ và Tin nhắn. Quản trị chuyên sâu và các màn khác hiện dùng tiếng Việt."}</p>
      {/* 2. Cỡ chữ */}
      <h3 className="text-sm font-medium mt-5 mb-2 flex items-center gap-1.5">
        <Type size={16} />
        <span>{t("Cỡ chữ")}</span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["small", "Nhỏ"],
          ["medium", "Vừa"],
          ["large", "Lớn"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className="choice-button"
            aria-pressed={currentFontSize === value}
            onClick={() => preferences.update({ fontSize: value })}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {/* 3. Font chữ */}
      <h3 className="text-sm font-medium mt-5 mb-2">{t("Font chữ")}</h3>
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
            {t(label)}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        {t("Font hệ thống theo thiết bị; trên iPhone dùng font của iOS.")}
      </p>

      {preferences.error && (
        <p role="alert" className="text-sm text-rose-700 mt-3">
          {preferences.error}
        </p>
      )}
    </section>
  );
}
