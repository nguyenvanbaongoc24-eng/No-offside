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
    <div className="team-switcher">
      <div className="team-switch-control">
        <select
          aria-label="Chuyển đội"
          value={teamId}
          disabled={busy}
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
              {m.teamName || m.name}{m.chatUnread > 0 ? ` · ${m.chatUnread} tin chưa đọc` : ""}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
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
  return (
    <header
      className="team-identity-header"
      aria-busy={switchingTeam || undefined}
    >
      <div className="team-heading-row">
        <button
          type="button"
          aria-label="Mở Cá nhân"
          onClick={onOpenProfile}
          className="team-logo-button"
        >
          <Avatar src={team.logo} name={team.teamName || "No Offside"} />
        </button>
        <div className="min-w-0 flex-1">
          <h1>{team.teamName || "Đội bóng của bạn"}</h1>
          <p>
            {switchingTeam
              ? "Đang tải đội…"
              : description ||
                [team.teamCategory, (team.members || []).length + " thành viên"]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>
        {onOpenNotifications && (
          <button
            type="button"
            className="team-notice-button"
            aria-label={
              "Thông báo đội" + (unreadCount ? `, ${unreadCount} chưa đọc` : "")
            }
            onClick={onOpenNotifications}
          >
            <Bell size={21} />
            {unreadCount > 0 && (
              <span aria-hidden="true">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
      <TeamSwitcher
        teamId={team.id}
        memberships={memberships}
        onSwitchTeam={onSwitchTeam}
        busy={switchingTeam}
      />
    </header>
  );
}
