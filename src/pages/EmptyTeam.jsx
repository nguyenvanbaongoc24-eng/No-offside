import React, { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import MatchFormSheet from "../components/MatchFormSheet";

export default function EmptyTeam({
  teamSettings,
  leader,
  onSaveMatch,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    opponent: "",
    venue: teamSettings.venue || "",
    datetime: "",
    timeoutDatetime: "",
    penaltyEnabled: false,
    penaltyFine: 0,
  });
  return (
    <section className="empty-team p-5">
      <p className="text-sm text-slate-600">{teamSettings.teamName}</p>
      <h1 className="text-2xl font-semibold mt-2">Trang chủ</h1>
      <div className="empty-state">
        <CalendarDays size={28} className="text-slate-500" />
        <h2>Chưa có trận sắp tới</h2>
        <p>
          {leader
            ? "Tạo lịch thi đấu để đội bắt đầu điểm danh."
            : "Chờ chủ đội hoặc quản trị viên tạo lịch thi đấu."}
        </p>
        {leader && (
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            <Plus size={20} />
            Tạo trận
          </button>
        )}
      </div>
      <button
        className="text-sm text-slate-600 w-full mt-5"
        onClick={() => onNavigate("profile")}
      >
        Xem thông tin cá nhân và đội bóng
      </button>
      {open && leader && (
        <MatchFormSheet
          draft={form}
          onChange={setForm}
          error={error}
          onClose={() => setOpen(false)}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onSaveMatch(form);
              setOpen(false);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}
    </section>
  );
}
