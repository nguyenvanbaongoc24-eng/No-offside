import React, { useState } from "react";
import {
  Palette,
  Bell,
  Users,
  BookOpen,
  Shield,
  ClipboardList,
  ChevronRight,
  ArrowLeft,
  Settings,
  LogOut,
  ArrowRightLeft,
} from "lucide-react";
import ProfileDetails from "./ProfileDetails";
function Row({ icon: Icon, children, onClick }) {
  return (
    <button type="button" className="menu-row" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{children}</strong>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
export default function ProfileMenu(props) {
  const {
    user,
    teamSettings,
    currentUserRole,
    hasTeam = true,
    accountPanel,
    appearancePanel,
    onNavigate,
    onLogout,
    onOpenNotifications,
    onUpdateUsername,
    onOpenJoinCode,
  } = props;
  const [detail, setDetail] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState(user.username || "");
  const owner = currentUserRole === "owner",
    leader = owner || currentUserRole === "admin";
  const titles = {
    profile: "Sửa hồ sơ",
    appearance: "Giao diện",
    accounts: "Tài khoản",
    members: "Thành viên đội",
    admin: "Phân quyền",
    requests: "Yêu cầu chờ duyệt",
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onLogout("local");
    } catch (e) {
      setError(
        e.message || "Không đăng xuất được. Kiểm tra kết nối rồi thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (detail)
    return (
      <div className="profile-detail">
        <header className="compact-header">
          <button
            type="button"
            aria-label="Quay lại Cá nhân"
            onClick={() => {
              setDetail(null);
              setError("");
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1>{titles[detail]}</h1>
        </header>
        {detail === "appearance" ? (
          <div className="p-4">{appearancePanel}</div>
        ) : detail === "accounts" ? (
          <div className="p-4">{accountPanel}</div>
        ) : detail === "members" ? (
          <div className="p-4">
            <p className="field-hint">{teamSettings?.teamName}</p>
            {(teamSettings?.members || [])
              .filter((m) => m.membershipStatus !== "removed")
              .map((member) => (
                <div className="menu-row" key={member.id}>
                  <span>
                    <strong>
                      {member.name} · #{member.number}
                    </strong>
                    <small>
                      {member.roleType === "owner"
                        ? "Chủ đội"
                        : member.roleType === "admin"
                          ? "Quản trị viên"
                          : "Thành viên"}
                    </small>
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <>
            <ProfileDetails {...props} detail={detail} />
            {detail === "requests" &&
              !(teamSettings?.pendingAdminRequests || []).length && (
                <p className="p-4 field-hint">Không có yêu cầu chờ duyệt.</p>
              )}
            {detail === "profile" && onUpdateUsername && user.username && (
              <form
                className="p-4 form-field"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    await onUpdateUsername(username);
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor="profile-username">Tên đăng nhập</label>
                <input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  required
                />
                <button className="choice-button" disabled={busy}>
                  Cập nhật tên đăng nhập
                </button>
              </form>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="form-error mx-4">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <div className="profile-home">
      <h1 className="text-2xl">Cá nhân</h1>
      <section className="profile-hero" aria-label="Hồ sơ">
        <img src={user.avatar} alt="" />
        <div>
          <h1>
            {user.name} <span className="text-sm">#{user.number}</span>
          </h1>
          <p>
            {hasTeam
              ? teamSettings?.teamName || user.teamName
              : "Chưa tham gia đội"}
          </p>
          <button
            type="button"
            className="text-action"
            onClick={() => setDetail("profile")}
          >
            Sửa hồ sơ
          </button>
        </div>
      </section>
      {hasTeam && owner && onNavigate && (
        <section className="profile-group" aria-label="Thao tác nhanh">
          <h2>Thao tác nhanh</h2>
          <div className="profile-quick">
            <button
              type="button"
              className="choice-button"
              onClick={() => onNavigate("team-settings")}
            >
              <Settings size={18} />
              Cài đặt đội
            </button>
          </div>
        </section>
      )}
      <section className="profile-group">
        <h2>Cá nhân</h2>
        {appearancePanel && (
          <Row icon={Palette} onClick={() => setDetail("appearance")}>
            Giao diện
          </Row>
        )}
        {onOpenNotifications && (
          <Row icon={Bell} onClick={onOpenNotifications}>
            Thông báo
          </Row>
        )}
      </section>
      {hasTeam ? (
        <section className="profile-group">
          <h2>Đội bóng</h2>
          <Row icon={Users} onClick={() => setDetail("members")}>
            Thành viên
          </Row>
          {onNavigate && (
            <Row icon={BookOpen} onClick={() => onNavigate("governance")}>
              Nội quy & vi phạm
            </Row>
          )}
          {onOpenJoinCode && (
            <Row icon={Users} onClick={onOpenJoinCode}>
              Gia nhập đội khác
            </Row>
          )}
          {onNavigate && (
            <Row icon={Users} onClick={() => onNavigate("create-team")}>
              Tạo đội mới
            </Row>
          )}
        </section>
      ) : (
        <section className="profile-group">
          <h2>Đội bóng</h2>
          {onOpenJoinCode && (
            <Row icon={Users} onClick={onOpenJoinCode}>
              Gia nhập đội
            </Row>
          )}
          {onNavigate && (
            <Row icon={Users} onClick={() => onNavigate("create-team")}>
              Tạo đội mới
            </Row>
          )}
        </section>
      )}
      {hasTeam && leader && (
        <section className="profile-group">
          <h2>Quản trị</h2>
          <Row icon={Shield} onClick={() => setDetail("admin")}>
            Phân quyền
          </Row>
          {owner && (
            <Row icon={ClipboardList} onClick={() => setDetail("requests")}>
              Yêu cầu chờ duyệt
              {teamSettings?.pendingAdminRequests?.length
                ? ` (${teamSettings.pendingAdminRequests.length})`
                : ""}
            </Row>
          )}
        </section>
      )}
      <section className="profile-group">
        <h2>Tài khoản</h2>
        {accountPanel && (
          <Row icon={ArrowRightLeft} onClick={() => setDetail("accounts")}>
            Chuyển tài khoản
          </Row>
        )}
        <button
          type="button"
          className="menu-row"
          onClick={logout}
          disabled={busy}
        >
          <LogOut size={20} />
          <span className="text-rose-700">
            <strong>{busy ? "Đang đăng xuất…" : "Đăng xuất"}</strong>
          </span>
        </button>
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
