import Pressable from './Pressable';
import React, { useState } from "react";
import { matchTimeLabel } from '../lib/matchTime';
import { CalendarDays, Check, ChevronDown } from "./icons";

export default function MatchList({
  matches = [],
  activeMatchId,
  onSelect,
  timeZone = "Asia/Ho_Chi_Minh",
}) {
  const [filter, setFilter] = useState("upcoming");
  const unarchivedMatches = matches.filter((m) => !m.archivedAt);
  const totalCount = unarchivedMatches.length;

  const visible = unarchivedMatches.filter((match) =>
    filter === "completed"
      ? match.status === "completed"
      : match.status !== "completed",
  );

  return (
    <details
      aria-label="Danh sách trận đấu"
      className="match-picker group px-4 my-1.5"
    >
      <summary className="flex items-center justify-between list-none cursor-pointer py-1.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Lịch đấu
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <span>{totalCount} trận</span>
          <ChevronDown
            size={14}
            className="text-slate-400 group-open:rotate-180 transition-transform duration-200"
            aria-hidden="true"
          />
        </span>
      </summary>

      {/* Nội dung danh sách trận khi mở ra */}
      <div className="mt-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-150">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Danh sách trận ({visible.length})
          </h2>
          <div
            className="match-filter flex gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800"
            role="group"
            aria-label="Lọc trận đấu"
          >
            {[
              ["upcoming", "Sắp đá"],
              ["completed", "Đã xong"],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                type="button"
                aria-pressed={filter === value}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === value
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
                onClick={() => setFilter(value)}
              >
                {label}
              </Pressable>
            ))}
          </div>
        </div>

        {visible.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center" role="status">
            Chưa có trận {filter === "completed" ? "đã xong" : "sắp đá"}.
          </p>
        )}

        <ul className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
          {visible.map((match) => (
            <li key={match.id}>
              <Pressable
                type="button"
                className={`match-select-button w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  match.id === activeMatchId
                    ? "border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100"
                    : "border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                }`}
                aria-pressed={match.id === activeMatchId}
                onClick={() => onSelect(match.id)}
              >
                <CalendarDays
                  size={18}
                  className={`shrink-0 ${
                    match.id === activeMatchId
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold truncate">
                    {match.title}
                  </span>
                  <time
                    dateTime={match.datetime}
                    className="block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400"
                  >
                    {matchTimeLabel(match.datetime, timeZone)}{" "}
                    · {match.status === "completed" ? "Đã xong" : "Sắp đá"}
                  </time>
                </span>
                {match.id === activeMatchId && (
                  <Check
                    size={16}
                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                )}
              </Pressable>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
