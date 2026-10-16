import Pressable from './Pressable';
import React, { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import Avatar from "./Avatar";

export function TeamSwitcher({
  teamId,
  memberships = [],
  onSwitchTeam,
  busy = false,
}) {
  const [error, setError] = useState("");
  if (!onSwitchTeam || memberships.length < 2) return null;
  return (
    <div className="team-switch-inline relative inline-flex items-center">
      <label htmlFor="inline-team-select" className="sr-only">Chuyển đội</label>
      <div className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors pointer-events-none flex items-center">
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      <select
        id="inline-team-select"
        aria-label="Chuyển đội"
        value={teamId}
        disabled={busy}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
        onChange={async (event) => {
          setError("");
          try {
            await onSwitchTeam(event.target.value);
          } catch (error) {
            setError(error.message);
          }
        }}
      >
        {memberships.map((m) => (
          <option key={m.teamId || m.team_id} value={m.teamId || m.team_id}>
            {m.teamName || m.name}
            {m.chatUnread > 0 ? ` · ${m.chatUnread} tin chưa đọc` : ""}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}

export default function TeamIdentityHeader({
  team = {},
  memberships,
  onSwitchTeam,
  switchingTeam,
  onOpenProfile,
  onOpenNotifications,
  unreadCount = 0,
  description,
}) {
  const membersCount = (team.members || []).length;
  const categoryText = team.teamCategory || "Sân 7";
  const subtitle = switchingTeam
    ? "Đang tải đội…"
    : description || `${categoryText} · ${membersCount} thành viên`;

  return (
    <header
      className="team-identity-header px-4 py-3 flex items-center justify-between gap-3 bg-transparent border-0"
      aria-busy={switchingTeam || undefined}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar/Logo đội bóng */}
        <Pressable
          type="button"
          aria-label="Mở Cá nhân"
          onClick={onOpenProfile}
          className="team-logo-button shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Avatar
            src={team.logo}
            name={team.teamName || "No Offside"}
            className="w-10 h-10 rounded-full object-cover shadow-xs"
          />
        </Pressable>

        {/* Tên đội & Biểu tượng chuyển đội & Subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
              {team.teamName || "Đội bóng của bạn"}
            </h1>
            <TeamSwitcher
              teamId={team.id}
              memberships={memberships}
              onSwitchTeam={onSwitchTeam}
              busy={switchingTeam}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Chuông thông báo (vùng chạm tối thiểu 44x44px) */}
      {onOpenNotifications && (
        <Pressable
          type="button"
          className="team-notice-button min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-all relative shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={
            "Thông báo đội" + (unreadCount ? `, ${unreadCount} chưa đọc` : "")
          }
          onClick={onOpenNotifications}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 leading-none"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Pressable>
      )}
    </header>
  );
}
