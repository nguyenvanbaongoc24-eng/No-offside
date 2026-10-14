import { personalText } from "../lib/personalCopy";
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
  User,
  Trophy,
  UserPlus,
  Languages,
} from "lucide-react";
import InviteShare from "../components/InviteShare";
import Avatar from "../components/Avatar";
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
  const t = text => personalText(text, props.preferences?.value.language);
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
    onCreateInvite,
    onRevokeInvite,
  } = props;
  const [detail, setDetail] = useState(props.initialDetail || null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState(user.username || "");
  const [inviteCode, setInviteCode] = useState(teamSettings?.inviteCode || "");
  const [inviteStatus, setInviteStatus] = useState(teamSettings?.inviteStatus || "active");
  const owner = currentUserRole === "owner",
    leader = owner || currentUserRole === "admin";
  const titles = {
    profile: "Sửa hồ sơ",
    appearance: "Giao diện",
    accounts: "Tài khoản",
    members: "Thành viên đội",
    admin: "Phân quyền",
    requests: "Yêu cầu chờ duyệt",
    management: "Quản lý đội",
    stats: "Thành tích của tôi",
    team: "Đội đang tham gia",
    invite: "Mời thành viên",
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
  const openInvite = async () => {
    if (!leader || !onCreateInvite || busy) return;
    setBusy(true); setError("");
    try {
      const code = teamSettings?.inviteCode || (await onCreateInvite(teamSettings.id))?.code;
      if (!code) throw new Error("Chưa tạo được mã mời.");
      setInviteCode(code); setDetail("invite");
    } catch (err) { setError(err.message || "Không tạo được lời mời."); }
    finally { setBusy(false); }
  };
  if (detail)
    return (
      <div lang={props.preferences?.value.language || "vi"} className="profile-detail">
        <header className="compact-header">
          <button
            type="button"
            aria-label="Quay lại Cá nhân"
            onClick={() => {
              setDetail(["admin", "requests"].includes(detail) ? "management" : null);
              setError("");
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1>{t(titles[detail])}</h1>
        </header>
        {detail === "invite" && leader ? (<InviteShare teamName={teamSettings?.teamName} teamLogo={teamSettings?.logo} teamCode={inviteCode} inviteStatus={inviteStatus} currentUserRole={currentUserRole} onClose={() => setDetail(null)} onCreateInvite={async () => { const invite = await onCreateInvite(teamSettings.id); if (!invite?.code) throw new Error("Không tạo được mã mời."); setInviteCode(invite.code); setInviteStatus("active"); return invite; }} onRevokeInvite={onRevokeInvite ? async () => { const result = await onRevokeInvite(teamSettings.id); setInviteStatus("revoked"); return result; } : undefined} />) : detail === "management" && leader ? (
          <section className="profile-group profile-management">
            {owner && onNavigate && <Row icon={Settings} onClick={() => onNavigate("team-settings")}>{t("Cấu hình đội")}</Row>}
            <Row icon={Shield} onClick={() => setDetail("admin")}>{t("Phân quyền và quản trị")}</Row>
            {owner && <Row icon={ClipboardList} onClick={() => setDetail("requests")}>Yêu cầu chờ duyệt{teamSettings?.pendingAdminRequests?.length ? " (" + teamSettings.pendingAdminRequests.length + ")" : ""}</Row>}
          </section>
        ) : detail === "stats" ? (
          <section className="settings-card m-4"><h2>{t("Thành tích của tôi")}</h2><dl className="profile-stats">{[["Trận",user.stats?.matches],["Bàn thắng",user.stats?.goals],["Kiến tạo",user.stats?.assists]].map(([label,value])=><div key={t(label)}><dt>{t(label)}</dt><dd>{value ?? "—"}</dd></div>)}</dl></section>
        ) : detail === "team" ? (
          <section className="settings-card m-4"><h2>{teamSettings?.teamName || user.teamName}</h2><p className="field-hint">{owner ? t("Chủ đội") : leader ? t("Quản trị viên") : t("Thành viên")}</p><dl className="profile-team-info">{[["Loại sân",teamSettings?.teamCategory],["Sân",teamSettings?.venue],["Lịch",teamSettings?.schedule]].filter(([,value])=>value).map(([label,value])=><div key={t(label)}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl></section>
        ) : detail === "appearance" ? (
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
                        ? t("Chủ đội")
                        : member.roleType === "admin"
                          ? t("Quản trị viên")
                          : t("Thành viên")}
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
                <label htmlFor="profile-username">{t("Tên đăng nhập")}</label>
                <input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  required
                />
                <button className="choice-button" disabled={busy}>
                  {t("Cập nhật tên đăng nhập")}
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
    <div lang={props.preferences?.value.language || "vi"} className="profile-home">
      <header className="personal-header">
        <p className="personal-eyebrow">{t("Cá nhân")}</p>
        <section className="profile-hero" aria-label="Hồ sơ">
          <Avatar src={user.avatar} name={user.name} />
          <div><h1>{user.name || t("Hồ sơ của bạn")}</h1><p>{user.number ? "#" + user.number : t("Chưa có số áo")}{user.role ? " · " + user.role : ""}</p><p>{hasTeam ? teamSettings?.teamName || user.teamName : t("Chưa tham gia đội")}{hasTeam ? " · " + (owner ? t("Chủ đội") : leader ? t("Quản trị viên") : t("Thành viên")) : ""}</p></div>
        </section>
        <button type="button" className="profile-edit-button" onClick={() => setDetail("profile")}>{t("Sửa hồ sơ")}<ChevronRight size={16} aria-hidden="true" /></button>
      </header>
      {hasTeam && onNavigate && (
        <section className="profile-group" aria-label="Thao tác nhanh"><h2>{t("Thao tác nhanh")}</h2><div className="profile-quick-grid">
          <button type="button" onClick={() => onNavigate("governance")}><BookOpen size={20} /><span>{t("Nội quy")}</span></button>
          {leader && onCreateInvite && <button type="button" disabled={busy} onClick={openInvite}><UserPlus size={20} /><span>{t("Mời thành viên")}</span></button>}
          {leader && <button type="button" onClick={() => setDetail("management")}><Settings size={20} /><span>{t("Quản lý đội")}</span></button>}
        </div></section>
      )}
      <section className="profile-group"><h2>{t("Hồ sơ")}</h2>
        <Row icon={User} onClick={() => setDetail("profile")}>{t("Thông tin cá nhân")}</Row>
        {user.stats && <Row icon={Trophy} onClick={() => setDetail("stats")}>{t("Thành tích của tôi")}</Row>}
      </section>
      {hasTeam ? (
        <section className="profile-group">
          <h2>{t("Đội bóng")}</h2>
          <Row icon={Users} onClick={() => setDetail("team")}>{t("Đội đang tham gia")}</Row>
          <Row icon={Users} onClick={() => setDetail("members")}>
            {t("Thành viên")}
          </Row>
          {onNavigate && (
            <Row icon={BookOpen} onClick={() => onNavigate("governance")}>
              {t("Nội quy & vi phạm")}
            </Row>
          )}
          {onOpenJoinCode && (
            <Row icon={Users} onClick={onOpenJoinCode}>
              {t("Gia nhập đội khác")}
            </Row>
          )}
          {onNavigate && (
            <Row icon={Users} onClick={() => onNavigate("create-team")}>
              {t("Tạo đội mới")}
            </Row>
          )}
        </section>
      ) : (
        <section className="profile-group">
          <h2>{t("Đội bóng")}</h2>
          {onOpenJoinCode && (
            <Row icon={Users} onClick={onOpenJoinCode}>
              {t("Gia nhập đội")}
            </Row>
          )}
          {onNavigate && (
            <Row icon={Users} onClick={() => onNavigate("create-team")}>
              {t("Tạo đội mới")}
            </Row>
          )}
        </section>
      )}
      {hasTeam && leader && <section className="profile-group"><h2>{t("Quản lý đội")}</h2><Row icon={Shield} onClick={() => setDetail("management")}>Quản lý đội{owner && teamSettings?.pendingAdminRequests?.length ? " (" + teamSettings.pendingAdminRequests.length + ")" : ""}</Row></section>}
      <section className="profile-group"><h2>{t("Tùy chọn")}</h2>
        {appearancePanel && <Row icon={Palette} onClick={() => setDetail("appearance")}>{t("Giao diện và font")}</Row>}
        {appearancePanel && <Row icon={Languages} onClick={() => setDetail("appearance")}>{t("Ngôn ngữ")}</Row>}
        {onOpenNotifications && <Row icon={Bell} onClick={onOpenNotifications}>{t("Lịch sử thông báo")}</Row>}
      </section>
      <section className="profile-group">
        <h2>{t("Tài khoản")}</h2>
        {accountPanel && (
          <Row icon={ArrowRightLeft} onClick={() => setDetail("accounts")}>
            {t("Chuyển tài khoản")}
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
            <strong>{busy ? t("Đang đăng xuất…") : t("Đăng xuất")}</strong>
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
