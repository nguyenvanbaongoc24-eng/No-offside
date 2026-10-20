import {Beer,Swords} from '../components/icons';
import ChangePassword from '../components/ChangePassword';
import TeamExit from '../components/TeamExit';
import Pressable from '../components/Pressable';
import { TeamSwitcher } from "../components/TeamIdentityHeader";
import { personalText } from "../lib/personalCopy";
import { useTeamInvite } from "../hooks/useTeamInvite";
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Palette,
  Wallet,
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
  KeyRound,
  Camera,
} from "../components/icons";
import InviteShare from "../components/InviteShare";
import Avatar from "../components/Avatar";
import ProfileDetails from "./ProfileDetails";
const useProfileLayoutEffect =
  typeof document !== "undefined" &&
  typeof document.createElement === "function"
    ? useLayoutEffect
    : useEffect;
function Row({ icon: Icon, children, onClick }) {
  return (
    <Pressable type="button" className="menu-row" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{children}</strong>
      </span>
      <ChevronRight size={18} />
    </Pressable>
  );
}
export default function ProfileMenu(props) {
  const t = (text) => personalText(text, props.preferences?.value.language);
  const {
    user,
    teamSettings,
    currentUserRole,
    hasTeam = true,
    accountPanel,
    appearancePanel,
    notificationPanel,
    onNavigate,
    onLogout,
    onOpenNotifications,
    onUpdateUsername,
    onOpenJoinCode,
    onCreateInvite,
    onReadInvite,
    onRevokeInvite,
  } = props;
  const [detail, setDetailState] = useState(()=>props.initialDetail || (typeof window!=="undefined" && window.history?.state?.noOffsideTab==="profile" ? window.history.state.noOffsideDetail : null) || null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [username, setUsername] = useState(user.username || "");
  const [avatarLaunch,setAvatarLaunch] = useState(false);
  const [detailDirection, setDetailDirection] = useState(1);
  const homeScroll = useRef(0),
    previousDetail = useRef(detail);
  const setDetail = (next) => {
    if(next===detail)return;
    if (!detail) homeScroll.current = window.scrollY || 0;
    setDetailDirection(1);
    window.history?.pushState(
      { ...window.history.state, noOffsideTab: "profile", noOffsideDetail: next, noOffsideProfileParent: detail },
      "",
    );
    setDetailState(next);
  };
  useEffect(() => {
    if (!window.history?.replaceState) return;
    // Pin the parent entry before pushing local detail screens (also after refresh).
    window.history.replaceState({...window.history.state,noOffsideTab:'profile',noOffsideDetail:detail}, '');
  }, []);
  useEffect(() => {
    const back = (event) => {
      if (event.state?.noOffsideTab === "profile") {
        setAvatarLaunch(false);
        setDetailDirection(-1);
        setDetailState(event.state.noOffsideDetail || null);
        setError("");
      }
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  useProfileLayoutEffect(() => {
    if (previousDetail.current === detail) return;
    window.scrollTo?.({
      top: detail ? 0 : homeScroll.current,
      behavior: "instant",
    });
    previousDetail.current = detail;
  }, [detail]);
  const [inviteOpen, setInviteOpen] = useState(
    props.initialDetail === "invite" || props.detail === "invite",
  );
  const invite = useTeamInvite(
    teamSettings,
    currentUserRole,
    onCreateInvite,
    onRevokeInvite,
    onReadInvite,
  );
  const owner = currentUserRole === "owner",
    leader = owner || currentUserRole === "admin";
  const titles = {
    profile: "Sửa hồ sơ",
    appearance: "Giao diện",
    notifications: "Thông báo",
    accounts: "Tài khoản",
    password: "Đổi mật khẩu",
    members: "Thành viên đội",
    admin: "Phân quyền",
    requests: "Yêu cầu chờ duyệt",
    management: "Quản lý đội",
    stats: "Thành tích của tôi",
    team: "Đội đang tham gia",
    invite: "Mời thành viên",
  };
  const navigateDetail = (dest) => {
    if (dest !== "invite") {
      setInviteOpen(false);
    } else {
      setInviteOpen(true);
    }
    setError("");
    setDetail(dest);
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
  const handleCloseInvite = () => {
    setInviteOpen(false);
    if (detail === "invite") {
      setDetail(null);
    }
  };
  const openInvite = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setInviteOpen(true);
    return await invite.load().catch(() => {});
  };
  const inviteSheet = (
    <InviteShare
      isOpen={inviteOpen || detail === "invite"}
      onClose={handleCloseInvite}
      teamName={teamSettings?.teamName || user?.teamName || "FC No Offside"}
      teamLogo={teamSettings?.logo || ""}
      teamCode={invite.code || teamSettings?.inviteCode || ""}
      inviteStatus={invite.status || teamSettings?.inviteStatus || "active"}
      currentUserRole={currentUserRole}
      isLeader={leader}
      loading={invite.loading}
      error={invite.error}
      onRetry={() => invite.load()}
      onCreateInvite={() => invite.load(true)}
      onRevokeInvite={invite.revoke}
    />
  );
  if (detail)
    return (
      <div
        lang={props.preferences?.value.language || "vi"}
        key={detail}
        className={
          "profile-detail" + (detailDirection < 0 ? " profile-back" : "")
        }
      >
        <header className="compact-header">
          <Pressable
            type="button"
            aria-label="Quay lại Cá nhân"
            onClick={() => {
              if (window.history?.state?.noOffsideDetail === detail && Object.prototype.hasOwnProperty.call(window.history.state,"noOffsideProfileParent")) {
                window.history.back();
                return;
              }
              setAvatarLaunch(false);
              setDetailDirection(-1);
              const parent=["admin", "requests"].includes(detail) ? "management" : null;
              window.history?.replaceState({...window.history.state,noOffsideDetail:parent},'');
              setDetailState(parent);
              setError("");
            }}
          >
            <ArrowLeft size={20} />
          </Pressable>
          <h1>{t(titles[detail])}</h1>
        </header>
        {inviteSheet}
        {detail === "password" ? <ChangePassword token={props.passwordToken} demo={props.demoSession}/> : detail === "management" && leader ? (
          <section className="profile-group profile-management">
            <Row icon={UserPlus} onClick={openInvite}>
              {t("Mời thành viên")}
            </Row>
            {owner && onNavigate && (
              <Row icon={Settings} onClick={() => onNavigate("team-settings")}>
                {t("Cấu hình đội")}
              </Row>
            )}
            <Row icon={Shield} onClick={() => navigateDetail("admin")}>
              {t("Phân quyền và quản trị")}
            </Row>
            {owner && (
              <Row
                icon={ClipboardList}
                onClick={() => navigateDetail("requests")}
              >
                Yêu cầu chờ duyệt
                {teamSettings?.pendingAdminRequests?.length
                  ? " (" + teamSettings.pendingAdminRequests.length + ")"
                  : ""}
              </Row>
            )}
          </section>
        ) : detail === "stats" ? (
          <section className="settings-card m-4">
            <h2>{t("Thành tích của tôi")}</h2>
            <dl className="profile-stats">
              {[
                ["Trận", user.stats?.matches],
                ["Bàn thắng", user.stats?.goals],
                ["Kiến tạo", user.stats?.assists],
              ].map(([label, value]) => (
                <div key={t(label)}>
                  <dt>{t(label)}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : detail === "team" ? (
          <section className="settings-card m-4">
            <h2>{teamSettings?.teamName || user.teamName}</h2>
            {hasTeam && <TeamExit team={teamSettings} role={currentUserRole} onExit={props.onTeamExit} disabled={props.demoSession}/>}
            <TeamSwitcher
              teamId={teamSettings?.id}
              memberships={props.memberships}
              onSwitchTeam={props.onSwitchTeam}
              busy={props.switchingTeam}
            />
            <p className="field-hint">
              {owner
                ? t("Chủ đội")
                : leader
                  ? t("Quản trị viên")
                  : t("Thành viên")}
            </p>
            <dl className="profile-team-info">
              {[
                ["Loại sân", teamSettings?.teamCategory],
                ["Sân", teamSettings?.venue],
                ["Lịch", teamSettings?.schedule],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={t(label)}>
                    <dt>{t(label)}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ) : detail === "notifications" ? (
          notificationPanel
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
            <ProfileDetails {...props} detail={detail} initialAvatarMenu={avatarLaunch} />
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
                <Pressable className="choice-button" disabled={busy}>
                  {t("Cập nhật tên đăng nhập")}
                </Pressable>
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
    <div
      lang={props.preferences?.value.language || "vi"}
      className={
        "profile-home" + (detailDirection < 0 ? " profile-return" : "")
      }
    >
      <header className="personal-header">
        <p className="personal-eyebrow">{t("Cá nhân")}</p>
        <section className="profile-hero" aria-label="Hồ sơ">
          <Pressable type="button" className="profile-avatar-edit" aria-label="Thay ảnh đại diện" onClick={()=>{setAvatarLaunch(true);navigateDetail('profile');}}><Avatar src={user.avatar} name={user.name}/><Camera size={16} aria-hidden="true"/></Pressable>
          <div>
            <h1>{user.name || t("Hồ sơ của bạn")}{props.motm&&<Trophy size={18} aria-label="MOTM trong tuần"/>}</h1>
            <p>
              {user.number ? "#" + user.number : t("Chưa có số áo")}
              {user.role ? " · " + user.role : ""}
            </p>
            <p>
              {hasTeam
                ? teamSettings?.teamName || user.teamName
                : t("Chưa tham gia đội")}
              {hasTeam
                ? " · " +
                  (owner
                    ? t("Chủ đội")
                    : leader
                      ? t("Quản trị viên")
                      : t("Thành viên"))
                : ""}
            </p>
          </div>
        </section>
        <Pressable
          type="button"
          className="profile-edit-button"
          onClick={() => navigateDetail("profile")}
        >
          {t("Sửa hồ sơ")}
          <ChevronRight size={16} aria-hidden="true" />
        </Pressable>
      </header>
      {hasTeam && onNavigate && (
        <section className="profile-group" aria-label="Thao tác nhanh">
          <h2>{t("Thao tác nhanh")}</h2>
          <div className="profile-quick-grid">
            <Pressable type="button" onClick={() => onNavigate("governance")}>
              <BookOpen size={20} />
              <span>{t("Nội quy")}</span>
            </Pressable>
            {leader && (
              <Pressable type="button" onClick={openInvite}>
                <UserPlus size={20} />
                <span>{t("Mời thành viên")}</span>
              </Pressable>
            )}
            {leader && (
              <Pressable
                type="button"
                onClick={() => navigateDetail("management")}
              >
                <Settings size={20} />
                <span>{t("Quản lý đội")}</span>
              </Pressable>
            )}
          </div>
        </section>
      )}
      {hasTeam&&props.onOpenPro&&<section className="profile-group"><h2>No Offside Pro</h2><Row icon={Trophy} onClick={()=>props.onOpenPro('stars')}>Tạo thẻ cầu thủ & MOTM</Row><Row icon={Swords} onClick={()=>props.onOpenPro('board')}>{t("Tìm đối")}</Row><Row icon={Beer} onClick={()=>props.onOpenPro('finance')}>{t("Sinh tố lúa mạch")}</Row><Row icon={Settings} onClick={()=>props.onOpenPro('media')}>Poster & khoảnh khắc</Row></section>}
      <section className="profile-group">
        <h2>{t("Hồ sơ")}</h2>
        <Row icon={User} onClick={() => navigateDetail("profile")}>
          {t("Thông tin cá nhân")}
        </Row>
        {user.stats && (
          <Row icon={Trophy} onClick={() => navigateDetail("stats")}>
            {t("Thành tích của tôi")}
          </Row>
        )}
      </section>
      {hasTeam ? (
        <section className="profile-group">
          <h2>{t("Đội bóng")}</h2>
          {hasTeam && <Row icon={Wallet} onClick={() => onNavigate("fund")}>{t("Quỹ đội")}</Row>}
          {hasTeam&&props.onFundReminder&&<Row icon={Bell} onClick={props.onFundReminder}>Nhắc thu quỹ</Row>}
          <Row icon={Users} onClick={() => navigateDetail("team")}>
            {t("Đội đang tham gia")}
          </Row>
          <Row icon={Users} onClick={() => navigateDetail("members")}>
            {t("Thành viên")}
          </Row>
          {leader && (
            <Row icon={UserPlus} onClick={openInvite}>
              {t("Mời thành viên")}
            </Row>
          )}
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
          {hasTeam && <Row icon={Wallet} onClick={() => onNavigate("fund")}>{t("Quỹ đội")}</Row>}
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
      {hasTeam && leader && (
        <section className="profile-group">
          <h2>{t("Quản lý đội")}</h2>
          <Row icon={Shield} onClick={() => navigateDetail("management")}>
            Quản lý đội
            {owner && teamSettings?.pendingAdminRequests?.length
              ? " (" + teamSettings.pendingAdminRequests.length + ")"
              : ""}
          </Row>
        </section>
      )}
      <section className="profile-group">
        <h2>{t("Tùy chọn")}</h2>
        {appearancePanel && (
          <Row icon={Palette} onClick={() => navigateDetail("appearance")}>
            {t("Giao diện và font")}
          </Row>
        )}
        {appearancePanel && (
          <Row icon={Languages} onClick={() => navigateDetail("appearance")}>
            {t("Ngôn ngữ")}
          </Row>
        )}
        {notificationPanel && <Row icon={Bell} onClick={() => navigateDetail("notifications")}>Thông báo</Row>}
        {onOpenNotifications && (
          <Row icon={Bell} onClick={onOpenNotifications}>
            {t("Lịch sử thông báo")}
          </Row>
        )}
      </section>
      <section className="profile-group">
        <h2>{t("Tài khoản")}</h2>
        <Row icon={KeyRound} onClick={()=>navigateDetail("password")}>Đổi mật khẩu</Row>
        {accountPanel && (
          <Row icon={ArrowRightLeft} onClick={() => navigateDetail("accounts")}>
            {t("Chuyển tài khoản")}
          </Row>
        )}
        <Pressable
          type="button"
          className="menu-row"
          onClick={logout}
          disabled={busy}
        >
          <LogOut size={20} />
          <span className="text-rose-700">
            <strong>{busy ? t("Đang đăng xuất…") : t("Đăng xuất")}</strong>
          </span>
        </Pressable>
      </section>
      {inviteSheet}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
