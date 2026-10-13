import React from "react";
import { CalendarDays, Check } from "lucide-react";
export default function MatchList({ matches, activeMatchId, onSelect }) {
  return (
    <section aria-label="Danh sách trận đấu" className="mx-4 my-4">
      <h2 className="text-sm font-semibold">Trận đấu ({matches.length})</h2>
      <ul className="space-y-2 mt-3">
        {matches.map((match) => (
          <li key={match.id}>
            <button
              type="button"
              className="match-select-button w-full border border-slate-200 rounded-2xl bg-white"
              aria-pressed={match.id === activeMatchId}
              onClick={() => onSelect(match.id)}
            >
              <CalendarDays size={20} className="shrink-0 text-emerald-700" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold break-words">
                  {match.title}
                </span>
                <time
                  dateTime={match.datetime}
                  className="block mt-1 text-xs text-slate-600"
                >
                  {new Date(match.datetime).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {match.status === "completed" ? "Đã xong" : "Sắp đá"}
                </time>
              </span>
              {match.id === activeMatchId && <Check size={18} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
