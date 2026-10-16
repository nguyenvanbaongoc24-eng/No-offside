import Pressable from './Pressable';
import React, { useState } from "react";
import { matchTimeLabel } from '../lib/matchTime';
import { CalendarDays, Check } from "lucide-react";
export default function MatchList({
  matches,
  activeMatchId,
  onSelect,
  timeZone = "Asia/Ho_Chi_Minh",
}) {
  const [filter, setFilter] = useState("upcoming");
  const visible = matches.filter(
    (match) =>
      !match.archivedAt &&
      (filter === "completed"
        ? match.status === "completed"
        : match.status !== "completed"),
  );
  return (
    <details aria-label="Danh sách trận đấu" className="match-picker mx-4 my-4">
      <summary className="text-sm font-semibold">
        Chọn trận · {matches.filter((match) => !match.archivedAt).length} trận
      </summary>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold">Trận đấu ({visible.length})</h2>
        <div className="match-filter" role="group" aria-label="Lọc trận đấu">
          {[
            ["upcoming", "Sắp đá"],
            ["completed", "Đã xong"],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </Pressable>
          ))}
        </div>
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-slate-600 mt-3" role="status">
          Chưa có trận {filter === "completed" ? "đã xong" : "sắp đá"}.
        </p>
      )}
      <ul className="space-y-2 mt-3">
        {visible.map((match) => (
          <li key={match.id}>
            <Pressable
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
                  {matchTimeLabel(match.datetime, timeZone)}{" "}
                  · {match.status === "completed" ? "Đã xong" : "Sắp đá"}
                </time>
              </span>
              {match.id === activeMatchId && <Check size={18} />}
            </Pressable>
          </li>
        ))}
      </ul>
    </details>
  );
}
