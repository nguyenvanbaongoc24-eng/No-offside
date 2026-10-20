import { matchPendingTasks } from '../lib/matchWorkflow';
import {localTransactionTime} from '../lib/transactionTime';
import Pressable from './Pressable';
import React, { useState, useEffect, useMemo } from "react";
import { lifecycle, isMatchArchived } from '../lib/matchLifecycle';
import { matchTimeLabel } from '../lib/matchTime';
import { CalendarDays, Check, ChevronDown, Search, Sliders } from "./icons";

export default function MatchList({
  matches = [],
  archivedMatches = [],
  activeMatchId,
  onSelect,
  timeZone = "Asia/Ho_Chi_Minh",
  canDelete = false,
  canManageFunds = false,
  initialTab = "upcoming",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Merge & deduplicate
  const allMap = useMemo(() => {
    const map = new Map();
    for (const m of matches) if (m && m.id) map.set(m.id, m);
    for (const m of archivedMatches) if (m && m.id) map.set(m.id, m);
    return map;
  }, [matches, archivedMatches]);

  const allList = useMemo(() => Array.from(allMap.values()), [allMap]);

  // "Sắp tới": các trận sắp diễn ra, đang diễn ra hoặc chờ cập nhật kết quả
  const upcomingList = useMemo(() => {
    return allList
      .filter((m) => !isMatchArchived(m))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [allList]);

  // "Lịch sử": các trận đã kết thúc và được lưu trữ
  const historyList = useMemo(() => {
    return allList
      .filter((m) => isMatchArchived(m))
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  }, [allList]);

  // Months available in history
  const availableMonths = useMemo(() => {
    const months = new Set();
    for (const m of historyList) {
      if (m.datetime) {
        try { months.add(localTransactionTime(m.datetime,timeZone).slice(0,7)); } catch {}
      }
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [historyList,timeZone]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return historyList.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const opp = (m.opponent || "").toLowerCase();
        const title = (m.title || "").toLowerCase();
        if (!opp.includes(q) && !title.includes(q)) return false;
      }
      if (selectedMonth !== "all") {
        try { if(localTransactionTime(m.datetime,timeZone).slice(0,7)!==selectedMonth)return false; } catch { return false; }
      }
      return true;
    });
  }, [historyList, searchQuery, selectedMonth,timeZone]);

  const totalCount = upcomingList.length + historyList.length;

  return (
    <details
      aria-label="Danh sách trận đấu"
      className="match-picker group px-4 my-1.5"
    >
      <summary className="flex items-center justify-between list-none cursor-pointer py-1.5 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
        {/* Header Tabs: Sắp tới vs Lịch sử */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div
            className="match-filter flex gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800"
            role="tablist"
            aria-label="Lọc trận đấu"
          >
            {[
              ["upcoming", `Sắp tới (${upcomingList.length})`],
              ["history", `Lịch sử (${historyList.length})`],
            ].map(([tabKey, label]) => (
              <Pressable
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={activeTab === tabKey}
                aria-pressed={activeTab === tabKey}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === tabKey
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                onClick={() => setActiveTab(tabKey)}
              >
                {label}
              </Pressable>
            ))}
          </div>
        </div>

        {/* Tab Sắp tới */}
        {activeTab === "upcoming" && (
          <div className="space-y-2">
            {upcomingList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center" role="status">
                Chưa có trận sắp diễn ra.
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {upcomingList.map((match) => {
                  const st = lifecycle(match, now);
                  const isAwaiting = st.key === "awaiting";
                  const isLive = st.key === "live";

                  return (
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
                          <span className="block text-xs font-bold break-words">
                            {match.matchType === "internal"
                              ? (match.title?.includes(" — ") ? match.title.split(" — ").at(-1) : (match.title || "Trận nội bộ"))
                              : (match.opponent || match.title)}
                          </span>
                          <time
                            dateTime={match.datetime}
                            className="block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400"
                          >
                            {matchTimeLabel(match.datetime, timeZone)} · {match.venue || "Chưa chốt sân"}
                          </time>
                          <span className="inline-flex items-center gap-1 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                isLive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse"
                                  : isAwaiting
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {st.label}
                            </span>
                          </span>
                        </span>
                        {match.id === activeMatchId && (
                          <Check
                            size={16}
                            className="text-emerald-600 dark:text-emerald-400 shrink-0"
                          />
                        )}
                      </Pressable>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Tab Lịch sử */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {/* Filters: Search by opponent + Month dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Tìm theo đối thủ hoặc tên trận..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <Sliders
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Lọc theo tháng"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Tất cả các tháng ({historyList.length})</option>
                  {availableMonths.map((ym) => {
                    const [y, m] = ym.split("-");
                    return (
                      <option key={ym} value={ym}>
                        Tháng {parseInt(m, 10)}/{y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center" role="status">
                {historyList.length === 0
                  ? "Chưa có trận nào trong lịch sử."
                  : "Không tìm thấy trận phù hợp."}
              </p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {filteredHistory.map((match) => {
                  const isCancelled = lifecycle(match).key === 'cancelled';
                  const hasScore = match.scoreHome != null && match.scoreAway != null;
                  const scoreDisplay = hasScore
                    ? `${match.scoreHome} - ${match.scoreAway}`
                    : "Chưa cập nhật kết quả";

                  // Nhãn còn việc cần xử lý
                  const tasks = matchPendingTasks(match, { canManage: canDelete, canManageFunds });
                  const unfinalized = tasks.some(task => task.key === 'attendance');
                  const uncosted = tasks.some(task => task.key === 'cost');
                  const hasReceivables = tasks.some(task => task.key === 'receivable');
                  const hasOwnDebt = tasks.some(task => task.key === 'debt');

                  const displayName = match.matchType === "internal"
                    ? (match.title?.includes(" — ") ? match.title.split(" — ").at(-1) : (match.title || "Trận nội bộ"))
                    : (match.opponent || match.title || "Đối thủ");

                  return (
                    <li key={match.id}>
                      <Pressable
                        type="button"
                        className="match-history-card w-full p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all cursor-pointer block space-y-1.5"
                        onClick={() => onSelect(match.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {displayName}
                          </span>
                          <span
                            className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md shrink-0 ${
                              hasScore
                                ? "bg-slate-200/70 dark:bg-slate-700 text-slate-900 dark:text-white"
                                : "text-slate-400 italic font-normal"
                            }`}
                          >
                            {scoreDisplay}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>
                            {matchTimeLabel(match.datetime, timeZone)} · {match.venue || "Chưa chốt sân"}
                          </span>
                          {isCancelled && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              Đã hủy
                            </span>
                          )}
                        </div>

                        {/* Nhãn còn việc cần xử lý */}
                        {(unfinalized || uncosted || hasReceivables || hasOwnDebt) && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {unfinalized && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                                Chưa chốt điểm danh
                              </span>
                            )}
                            {uncosted && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                                Chưa cập nhật chi phí
                              </span>
                            )}
                            {hasReceivables && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                                Còn khoản phải thu
                              </span>
                            )}
                            {hasOwnDebt && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                                Còn khoản phải đóng
                              </span>
                            )}
                          </div>
                        )}
                      </Pressable>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
