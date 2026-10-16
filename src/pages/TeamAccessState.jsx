import Pressable from '../components/Pressable';
import React from "react";
import { ShieldAlert, BookOpen, User, UserPlus, Plus } from "../components/icons";
import TeamIdentityHeader from "../components/TeamIdentityHeader";
export default function TeamAccessState({
  team,
  restriction,
  memberships,
  onSwitchTeam,
  switchingTeam,
  onNavigate,
  onJoin,
}) {
  return (
    <section className="team-access-page">
      <TeamIdentityHeader
        team={team}
        memberships={memberships}
        onSwitchTeam={onSwitchTeam}
        switchingTeam={switchingTeam}
        description="Lịch sử đội"
        onOpenProfile={() => onNavigate("profile")}
      />
      <div className="settings-card m-4">
        <ShieldAlert size={28} />
        <h2 className="mt-3">
          {restriction.status === "removed"
            ? "Bạn đã rời đội này"
            : "Tư cách tham gia đang tạm khóa"}
        </h2>
        <p className="text-sm text-slate-600 mt-3">
          Lịch sử của bạn được giữ lại. Các thao tác trong đội đang bị hạn chế.
        </p>
        {restriction.until && (
          <p className="text-sm mt-2">
            Đến{" "}
            {new Date(restriction.until).toLocaleString("vi-VN", {
              timeZone: team.timezone || "Asia/Ho_Chi_Minh",
            })}
          </p>
        )}
        <div className="grid gap-2 mt-4">
          <Pressable
            className="choice-button"
            onClick={() => onNavigate("governance")}
          >
            <BookOpen size={18} />
            Xem nội quy và lịch sử của tôi
          </Pressable>
          <Pressable
            className="choice-button"
            onClick={() => onNavigate("profile")}
          >
            <User size={18} />
            Cá nhân và tài khoản
          </Pressable>
        </div>
      </div>
      <div className="profile-group m-4">
        <h2>Đội bóng khác</h2>
        <Pressable className="menu-row" onClick={onJoin}>
          <UserPlus size={20} />
          <span>Gia nhập bằng mã Club</span>
        </Pressable>
        <Pressable className="menu-row" onClick={() => onNavigate("create-team")}>
          <Plus size={20} />
          <span>Tạo đội mới</span>
        </Pressable>
      </div>
    </section>
  );
}
