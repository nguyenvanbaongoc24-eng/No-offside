import {notify} from '../lib/feedback';
import Pressable from '../components/Pressable';
import React, { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { imageDataUrl } from "../lib/images";
export default function TeamSettings({
  teamSettings,
  onOpenPro,
  onUpdateTeamSettings,
  onBack,
  currentUserRole,
  preferences,
}) {
  const [draft, setDraft] = useState(teamSettings),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const update = (key, value) => {
    setSaved(false);
    setDraft((p) => ({ ...p, [key]: value }));
  };
  const save = async (e) => {
    e.preventDefault();
    if (currentUserRole !== "owner") return;
    const form = e.currentTarget;
    setError("");
    try {
      await onUpdateTeamSettings({
        ...Object.fromEntries(
          ["teamName", "teamCategory", "venue", "schedule", "logo"].map((k) => [
            k,
            draft[k],
          ]),
        ),
        appearance: {
          ...teamSettings.appearance,
          birthdayReportEnabled:
            draft.appearance?.birthdayReportEnabled !== false,
        },
      });
      form.dispatchEvent(new Event("no-offside-form-saved", { bubbles: true }));
      setSaved(true);
    } catch (error) {
      setError(error.message || "Không lưu được cài đặt đội.");
    }
  };
  return (
    <div className="settings-page pb-8">
      <header className="page-heading p-5">
        <Pressable onClick={onBack} className="flex gap-2 items-center text-sm">
          <ArrowLeft size={18} />
          Quay lại
        </Pressable>
        <h1 className="text-2xl font-bold mt-4">Cài đặt đội bóng</h1>
      </header>
      {onOpenPro&&<Pressable className="choice-button m-4" onClick={onOpenPro}>Luật phạt tự động & Hiệp 3</Pressable>}
      <form onSubmit={save} className="p-4 space-y-4">
        <section className="settings-card">
          <h2>Thông tin đội</h2>
          <label className="block text-sm font-medium mt-4">
            Logo đội
            <img
              src={draft.logo}
              alt="Logo đội"
              className="w-16 h-16 object-cover rounded-2xl mt-2"
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-3 w-full"
              onChange={async (e) => {
                try {
                  update("logo", await imageDataUrl(e.target.files?.[0]));
                } catch (err) {
                  setError(err.message);
                  notify(err.message, "error");
                }
              }}
            />
          </label>
          {[
            ["teamName", "Tên đội bóng"],
            ["teamCategory", "Thể loại thi đấu"],
            ["venue", "Sân nhà"],
            ["schedule", "Lịch sinh hoạt"],
          ].map(([key, label]) => (
            <label key={key} className="block mt-4 text-sm font-medium">
              {label}
              <input
                className="mt-2 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-3"
                required
                value={draft[key] || ""}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}
        </section>
        <section className="settings-card">
          <h2>Sinh nhật đồng đội</h2>
          <label className="checkbox-field mt-4">
            <input
              type="checkbox"
              checked={draft.appearance?.birthdayReportEnabled !== false}
              onChange={(e) =>
                update("appearance", {
                  ...draft.appearance,
                  birthdayReportEnabled: e.target.checked,
                })
              }
            />
            Hiển thị lời chúc sinh nhật trong tin nhắn đội
          </label>
          <p className="text-sm text-slate-500 mt-3">
            Thông báo SMS, Zalo và push tự động chưa được kết nối.
          </p>
        </section>
        <Pressable
          type="submit"
          className="primary-button w-full"
          disabled={currentUserRole !== "owner"}
        >
          {saved ? <Check size={18} /> : null}
          {saved ? "Đã lưu thông tin đội" : "Lưu thông tin đội"}
        </Pressable>
        {saved && (
          <p role="status" className="text-sm text-emerald-700 text-center">
            Thông tin đội đã được lưu.
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
