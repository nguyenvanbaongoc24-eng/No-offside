import { useFundCollections } from "./hooks/useFundCollections";
import FundOperations from "./components/FundOperations";
import { usePro } from "./hooks/usePro";
import ProDashboard from "./components/pro/ProDashboard";
import { weeklyAwards } from "./lib/pro";
import { useAppNavigation } from "./hooks/useAppNavigation";
import FeedbackToast from "./components/FeedbackToast";
import { withFeedback } from "./lib/feedback";
import Pressable from "./components/Pressable";
import QuickActions from "./components/QuickActions";
import QuickInvite from "./components/QuickInvite";
import MatchFormSheet from "./components/MatchFormSheet";
import WelcomeAnnouncementModal from "./components/WelcomeAnnouncementModal";
import { birthdaysToday } from "./lib/announcements";
import NotificationSettings from "./components/NotificationSettings";
import { useChatUnread } from "./hooks/useChatUnread";
import { safePushTarget } from "./lib/pushDevice";
import TeamAccessState from "./pages/TeamAccessState";
import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import StartupGate from "./components/StartupGate";
import { systemNoticeTitle } from "./lib/menuLabels";
import {
  Home,
  Network,
  Wallet,
  MessageSquare,
  User,
  Loader2,
} from "./components/icons";
import PlayerDashboard from "./pages/PlayerDashboard";
import LineupBuilder from "./pages/LineupBuilder";
import FundManagement from "./pages/FundManagement";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import CreateTeam from "./pages/CreateTeam";
import InviteLanding from "./pages/InviteLanding";
import TeamOnboarding from "./pages/TeamOnboarding";
import ClubCodeModal from "./components/ClubCodeModal";
import QrScannerModal from "./components/QrScannerModal";
import Login from "./pages/Login";
import EmptyTeam from "./pages/EmptyTeam";
import PersonalFund from "./pages/PersonalFund";
import { useVisualViewport } from "./hooks/useVisualViewport";
import TeamSettings from "./pages/TeamSettings";
import { useAuth } from "./hooks/useAuth";
import { useAppearance } from "./hooks/useAppearance";
import { useDialogAccessibility } from "./hooks/useDialogAccessibility";
import { readStored } from "./lib/storage";
import { monthKey } from "./lib/teamModel";
import { usePersonalAppearance } from "./hooks/usePersonalAppearance";
import { useScrollNavigation } from "./hooks/useScrollNavigation";
import AppearanceSettings from "./components/AppearanceSettings";
import FloatingBottomNavigation from "./components/FloatingBottomNavigation";
import AccountControls from "./components/AccountControls";
import Governance from "./pages/Governance";
import { useGovernance } from "./hooks/useGovernance";
import GovernanceNotice from "./components/GovernanceNotice";
import VersionNotice from "./components/VersionNotice";

const ProHub = React.lazy(() => import("./pages/ProHub"));

export default function App() {
  const [startupAttempt, setStartupAttempt] = useState(0);
  return (
    <>
      <Application
        key={startupAttempt}
        onRetryStartup={() => setStartupAttempt((attempt) => attempt + 1)}
      />
      <FeedbackToast />
      <VersionNotice />
    </>
  );
}
function Application({ onRetryStartup }) {
  const auth = useAuth();
  const fund = useFundCollections({
    teamId: auth.teamSettings.id,
    accountId: auth.accountId,
    token: auth.authSession?.access_token,
    demo: auth.demoSession,
    enabled:
      !auth.authLoading &&
      auth.isLoggedIn &&
      auth.hasTeam &&
      !auth.teamRestriction,
    onUpdated: () => auth.refreshWorkspace(auth.teamSettings.id),
  });
  const fundAccess = fund.data.canManage,
    treasurer = fund.data.treasurer && fundAccess;
  const [attendanceFocus, setAttendanceFocus] = useState(null);
  const [proSection, setProSection] = useState("board");
  const pro = usePro({
    teamId: auth.teamSettings.id,
    accountId: auth.accountId,
    token: auth.authSession?.access_token,
    demo: auth.demoSession,
    enabled:
      !auth.authLoading &&
      auth.isLoggedIn &&
      auth.hasTeam &&
      !auth.teamRestriction,
    matchVersion: auth.matches.map((m) => m.id + ":" + m.status).join("|"),
  });
  const proWinners = weeklyAwards(pro.state.awards);
  const displayMembers = auth.teamSettings.members.map((m) => ({
    ...m,
    motm: !!proWinners[m.id],
  }));
  const displayTeam = { ...auth.teamSettings, members: displayMembers };

  const chatUnread = useChatUnread(
    auth.accountId,
    auth.demoSession ? null : auth.authSession?.access_token,
    !auth.authLoading,
  );
  const memberships = (auth.dbMemberships || []).map((m) => ({
    ...m,
    chatUnread: chatUnread.countFor(m.teamId || m.team_id),
  }));
  const [chatKeyboardOpen, setChatKeyboardOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false),
    [quickInvite, setQuickInvite] = useState(false);
  const [quickIntent, setQuickIntent] = useState(null),
    [quickMatch, setQuickMatch] = useState(null),
    [quickMatchError, setQuickMatchError] = useState("");
  const navigation = useAppNavigation();
  const { tab } = navigation;
  const fundViewStates = useRef(new Map());
  const [showNotices, setShowNotices] = useState(false);
  const [noticeReadError, setNoticeReadError] = useState("");
  useEffect(() => {
    let live = true;
    if (showNotices) {
      setNoticeReadError("");
      auth.markNoticesRead().catch(() => {
        if (live)
          setNoticeReadError(
            "Chưa lưu được trạng thái đã đọc. Hãy mở lại để thử lại.",
          );
      });
    }
    return () => {
      live = false;
    };
  }, [showNotices, auth.accountId, auth.teamSettings.id]);

  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [joinCodeInitial, setJoinCodeInitial] = useState("");
  const [loginInitialMode, setLoginInitialMode] = useState("signin");
  const preferences = usePersonalAppearance(
    auth.authLoading
      ? readStored("no_offside_appearance_account", "anonymous")
      : auth.accountId,
  );
  useAppearance(preferences.value);
  const [navVisible, revealNav] = useScrollNavigation(tab);
  const governance = useGovernance(
    auth.accountId,
    auth.teamSettings.id,
    auth.demoSession || auth.authLoading || !auth.isLoggedIn,
    auth.currentUserRole,
    auth.teamSettings.members,
  );
  const saveRequest = useRef(null);
  const saveMatch = async (form, editId) => {
    const signature = JSON.stringify([
      auth.accountId,
      auth.teamSettings.id,
      form,
      editId,
    ]);
    if (saveRequest.current?.signature !== signature)
      saveRequest.current = {
        signature,
        id: crypto.randomUUID(),
        key: crypto.randomUUID(),
      };
    const match = auth.saveMatch(form, editId, {
      persist: false,
      id: saveRequest.current.id,
    });
    await auth.saveMatch(form, editId, { id: match.id });
    saveRequest.current = null;
    await governance.refresh();
  };
  const deleteMatch = async (id) => {
    await auth.deleteMatch(id);
    await governance.refresh();
  };
  useDialogAccessibility();
  useVisualViewport();
  const leader = ["owner", "admin"].includes(auth.currentUserRole);
  const activeTab =
    auth.teamRestriction &&
    ![
      "profile",
      "governance",
      "create-team",
      "invite-landing",
      "onboarding",
    ].includes(tab)
      ? "team-access"
      : auth.currentUserRole !== "owner" && tab === "team-settings"
        ? "dashboard"
        : !auth.hasTeam && tab === "dashboard"
          ? "onboarding"
          : tab;
  const navigationAvailable =
    !auth.teamRestriction &&
    !["create-team", "invite-landing", "team-settings"].includes(activeTab);
  const scrollPositions = useRef(new Map());
  const scrollRoute = useRef(null);
  const scrollKey =
    auth.accountId + "::" + auth.teamSettings.id + "::" + activeTab;
  useLayoutEffect(() => {
    if (!auth.isLoggedIn || auth.authLoading) return;
    window.scrollTo({
      top: scrollPositions.current.get(scrollKey) || 0,
      behavior: "instant",
    });
    scrollRoute.current = scrollKey;
  }, [scrollKey, auth.isLoggedIn, auth.authLoading]);
  useEffect(() => {
    const remember = () => {
      if (scrollRoute.current)
        scrollPositions.current.set(scrollRoute.current, window.scrollY);
    };
    window.addEventListener("popstate", remember, true);
    return () => window.removeEventListener("popstate", remember, true);
  }, []);
  const navigate = (target, options) => {
    setQuickOpen(false);
    setQuickIntent(null);
    if (activeTab !== "chat" && scrollRoute.current)
      scrollPositions.current.set(scrollRoute.current, window.scrollY);
    navigation.navigate(target, options);
  };
  const openFund = (action) => {
    navigate("fund");
    if (action) setQuickIntent({ id: crypto.randomUUID(), action });
  };
  const openPro = (section) => {
    if (section === "finance") {
      openFund("bill");
      return;
    }
    setProSection(section);
    navigate("pro");
  };
  const runQuickAction = (action) => {
    setQuickOpen(false);
    if (!auth.hasTeam || auth.teamRestriction) return;
    if (action === "fund") {
      if (fundAccess || leader) openFund();
      return;
    }
    if (action === "reminder") {
      if (fundAccess) openFund("reminder");
      return;
    }
    if (action === "finance" && fundAccess) {
      openFund("bill");
      return;
    }
    if (!leader) return;
    if (["board", "stars", "finance", "media"].includes(action)) {
      openPro(action);
      return;
    }
    if (action === "match") {
      setQuickMatchError("");
      setQuickMatch({
        opponent: "",
        datetime: "",
        timeoutDatetime: "",
        venue: auth.teamSettings.venue || "",
        penaltyEnabled: true,
        penaltyFine: "50000",
      });
    } else if (action === "transaction" || action === "formation") {
      navigate(action === "transaction" ? "fund" : "lineup");
      setQuickIntent({ id: crypto.randomUUID(), action });
    } else if (action === "invite") setQuickInvite(true);
    else if (action === "settings" && auth.currentUserRole === "owner")
      navigate("team-settings");
  };
  const openNotice = async (notice) => {
    try {
      if (notice.matchId) {
        if (!auth.matches.some((m) => m.id === notice.matchId))
          throw Error(
            "Trận trong thông báo không còn khả dụng với tài khoản này.",
          );
        await auth.selectMatch(notice.matchId);
        if (notice.memberId)
          setAttendanceFocus({
            matchId: notice.matchId,
            memberId: String(notice.memberId),
            key: crypto.randomUUID(),
          });
      }
      navigate(
        [
          "dashboard",
          "fund",
          "profile",
          "lineup",
          "chat",
          "governance",
        ].includes(notice.route)
          ? notice.route
          : "dashboard",
      );
    } catch (e) {
      setPushError(e.message || "Không mở được thông báo.");
    }
  };
  const birthdayMembers =
    auth.teamSettings.appearance.birthdayReportEnabled === false
      ? []
      : birthdaysToday(auth.teamSettings.members, auth.teamSettings.timezone);
  useEffect(() => {
    setQuickOpen(false);
    setQuickInvite(false);
    setQuickMatch(null);
    setQuickIntent(null);
    setAttendanceFocus(null);
  }, [auth.accountId, auth.teamSettings.id]);
  const [pushTarget, setPushTarget] = useState(() => {
    const target = safePushTarget(window.location.href);
    try {
      return (
        target ||
        JSON.parse(sessionStorage.getItem("no_offside_push_target") || "null")
      );
    } catch {
      return target;
    }
  });
  const [pushError, setPushError] = useState("");
  const openingPush = useRef(false);
  const pushAccount = useRef(auth.accountId);
  pushAccount.current = auth.accountId;
  useEffect(() => {
    const receive = (event) => {
      if (event.data?.type !== "NO_OFFSIDE_PUSH_OPEN") return;
      const target = safePushTarget(event.data.url);
      if (target) {
        sessionStorage.setItem(
          "no_offside_push_target",
          JSON.stringify(target),
        );
        setPushTarget(target);
      }
    };
    navigator.serviceWorker?.addEventListener("message", receive);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!pushTarget) return;
    sessionStorage.setItem(
      "no_offside_push_target",
      JSON.stringify(pushTarget),
    );
    if (
      auth.authLoading ||
      auth.startupPending ||
      !auth.isLoggedIn ||
      auth.switchingTeam ||
      openingPush.current
    )
      return;
    if (
      (pushTarget.accountId && pushTarget.accountId !== auth.accountId) ||
      !memberships.some((m) => (m.teamId || m.team_id) === pushTarget.teamId)
    ) {
      setPushError(
        "Thông báo thuộc tài khoản hoặc đội bạn không có quyền truy cập.",
      );
      setPushTarget(null);
      sessionStorage.removeItem("no_offside_push_target");
      return;
    }
    openingPush.current = true;
    (async () => {
      try {
        if (auth.teamSettings.id !== pushTarget.teamId) {
          await auth.switchTeam(pushTarget.teamId);
          openingPush.current = false;
          setPushTarget((p) => (p ? { ...p } : null));
          return;
        }
        if (pushAccount.current !== auth.accountId) return;
        if (pushTarget.matchId) {
          if (!auth.matches.some((m) => m.id === pushTarget.matchId))
            throw Error("Trận không còn khả dụng.");
          await auth.selectMatch(pushTarget.matchId);
          setAttendanceFocus({
            matchId: pushTarget.matchId,
            memberId: pushTarget.memberId,
            key: crypto.randomUUID(),
          });
        }
        navigate(pushTarget.view);
        setPushTarget(null);
        sessionStorage.removeItem("no_offside_push_target");
      } catch {
        setPushError(
          "Không mở được đội từ thông báo. Hãy kiểm tra kết nối rồi mở lại thông báo.",
        );
      } finally {
        openingPush.current = false;
      }
    })();
  }, [
    pushTarget,
    auth.authLoading,
    auth.startupPending,
    auth.isLoggedIn,
    auth.switchingTeam,
    auth.accountId,
    auth.teamSettings.id,
  ]);
  let inviteCode =
    window.location.pathname.split("/invite/")[1]?.split("/")[0] ||
    auth.teamSettings.id;
  try {
    inviteCode = decodeURIComponent(inviteCode);
  } catch {
    inviteCode = "";
  }
  const inviteTeam =
    readStored("no_offside_team_" + inviteCode, null) ||
    (inviteCode === auth.teamSettings.id ? auth.teamSettings : null);
  if (auth.authLoading || auth.startupPending || auth.startupError)
    return (
      <StartupGate
        pending={auth.authLoading || auth.startupPending}
        error={auth.startupError}
        onRetry={onRetryStartup}
        onExit={
          auth.authSession
            ? async () => {
                await auth.logout();
                onRetryStartup();
              }
            : undefined
        }
      >
        <div className="min-h-screen grid place-items-center bg-slate-50">
          <Loader2
            className="animate-spin text-emerald-600"
            aria-label="Đang kiểm tra phiên đăng nhập"
          />
        </div>
      </StartupGate>
    );
  if (!auth.isLoggedIn && tab !== "invite-landing")
    return (
      <StartupGate onRetry={onRetryStartup}>
        <Login
          theme={preferences.value.theme}
          onThemeChange={(theme) => preferences.update({ theme })}
          initialMode={loginInitialMode}
          onLoginSuccess={(profile) => {
            auth.login(profile);
            navigate("dashboard");
          }}
        />
      </StartupGate>
    );
  const fundProps = {
    funds: auth.funds,
    onChangeFunds: auth.setFunds,
    onApprove: auth.approveFundPayment,
    onReject: auth.rejectFundPayment,
  };
  const currentMonth = monthKey(
    new Date(),
    auth.teamSettings.timezone || "Asia/Ho_Chi_Minh",
  );
  const paid = auth.funds.transactions.some(
    (tx) =>
      tx.type === "income" &&
      tx.playerId === auth.user.id &&
      tx.month === currentMonth,
  );
  const debt = auth.funds.debtors
    .filter((d) => d.playerId === auth.user.id && d.month === currentMonth)
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const shared = {
    memberships,
    onSwitchTeam: auth.switchTeam,
    switchingTeam: auth.switchingTeam,
    unreadCount: auth.notices.filter((notice) => notice.unread).length,
    user: {
      ...auth.user,
      nextMatchAttendance: auth.attendance[auth.user.id] || null,
      isFundPaid: paid && debt === 0,
      fundDebt: debt,
      fundRejection: (auth.funds.rejectedPayments || [])
        .filter((p) => p.playerId === auth.user.id && p.month === currentMonth)
        .at(-1),
      fundPaymentPending: auth.funds.pendingApprovals.some(
        (p) => p.playerId === auth.user.id && p.month === currentMonth,
      ),
    },
    currentUserRole: auth.teamRestriction ? "member" : auth.currentUserRole,
    onNavigate: navigate,
    demoSession: auth.demoSession,
    birthdays: birthdayMembers,
    accountId: auth.accountId,
  };
  const tabs = [
    { id: "dashboard", label: "Trang chủ", Icon: Home },
    { id: "lineup", label: "Chiến thuật", Icon: Network },
    { id: "fund", label: "Quỹ đội", Icon: Wallet },
    {
      id: "chat",
      label: "Tin nhắn",
      Icon: MessageSquare,
      unreadCount: chatUnread.countFor(auth.teamSettings.id),
    },
    { id: "profile", label: "Cá nhân", Icon: User },
  ];
  return (
    <StartupGate onRetry={onRetryStartup}>
      <div className="app-shell bg-slate-50 min-h-screen overflow-x-hidden text-gray-900 flex justify-center antialiased">
        <div
          className={
            "app-frame app-scroll-frame w-full max-w-md bg-slate-50 relative" +
            (navigationAvailable ? " app-has-navigation" : "") +
            (activeTab === "chat" ? " app-chat-frame" : "")
          }
        >
          {pushError && (
            <p role="alert" className="form-error p-3">
              {pushError}
            </p>
          )}
          {auth.storageError && (
            <div role="alert" className="p-3 bg-rose-50 text-rose-700">
              {auth.storageError}
            </div>
          )}
          {auth.demoSession && (
            <div className="session-banner">
              Bản trải nghiệm • dữ liệu lưu trên thiết bị
            </div>
          )}
          <main
            key={scrollKey}
            className={
              activeTab === "chat"
                ? ""
                : "app-page-transition route-" + navigation.direction
            }
          >
            {activeTab === "dashboard" && (
              <GovernanceNotice
                governance={governance}
                onOpen={() => navigate("governance")}
              />
            )}
            {activeTab === "team-access" ? (
              <TeamAccessState
                team={auth.teamSettings}
                restriction={auth.teamRestriction}
                memberships={memberships}
                onSwitchTeam={auth.switchTeam}
                switchingTeam={auth.switchingTeam}
                onNavigate={navigate}
                onJoin={() => setShowJoinCodeModal(true)}
              />
            ) : activeTab === "onboarding" ? (
              <TeamOnboarding
                user={auth.user}
                onOpenCreateTeam={() => navigate("create-team")}
                onOpenJoinCode={() => {
                  setJoinCodeInitial("");
                  setShowJoinCodeModal(true);
                }}
                onOpenScanQr={() => setShowQrScanModal(true)}
              />
            ) : activeTab === "create-team" ? (
              <CreateTeam
                onTeamCreated={async (data) => {
                  await auth.createTeam(data);
                  navigate("dashboard");
                }}
                onBack={() => navigate("profile")}
              />
            ) : activeTab === "invite-landing" ? (
              <InviteLanding
                inviteCode={inviteCode}
                teamData={
                  inviteTeam
                    ? {
                        id: inviteTeam.id,
                        name: inviteTeam.teamName,
                        captain:
                          inviteTeam.members.find((m) => m.roleType === "owner")
                            ?.name || "Đội trưởng",
                        membersCount: inviteTeam.members.length,
                        category: inviteTeam.teamCategory,
                        venue: inviteTeam.venue,
                        matchSchedule: inviteTeam.schedule,
                        logo: inviteTeam.logo,
                        code: inviteCode,
                      }
                    : null
                }
                authenticated={auth.isLoggedIn}
                currentUser={auth.user}
                onJoinSuccess={async (profile) => {
                  await auth.joinTeamViaInvite(profile.code, profile);
                  navigate("dashboard");
                  history.replaceState(null, "", "/");
                }}
                onRequireAuth={({ mode = "signup" } = {}) => {
                  setLoginInitialMode(mode);
                  navigate("login");
                }}
                onBackToApp={() => navigate("profile")}
              />
            ) : activeTab === "governance" ? (
              <Governance
                key={auth.accountId + auth.teamSettings.id}
                governance={governance}
                onBack={() => navigation.back("profile")}
              />
            ) : activeTab === "team-settings" ? (
              <TeamSettings
                teamSettings={displayTeam}
                onUpdateTeamSettings={withFeedback(auth.updateTeamSettings)}
                onBack={() => navigate("profile")}
                currentUserRole={auth.currentUserRole}
                preferences={preferences}
              />
            ) : activeTab === "lineup" ? (
              <LineupBuilder
                serverLineups={auth.lineups}
                onSaveLineups={auth.saveLineups}
                createRequest={
                  quickIntent?.action === "formation" ? quickIntent.id : null
                }
                onCreateOpened={() => setQuickIntent(null)}
                key={auth.accountId + auth.teamSettings.id}
                teamId={auth.teamSettings.id}
                accountId={auth.accountId}
                currentUserRole={auth.currentUserRole}
                members={displayMembers}
                onBack={() => navigate("dashboard")}
              />
            ) : activeTab === "pro" ? (
              <React.Suspense
                fallback={
                  <div className="pro-loading" role="status">
                    Đang mở No Offside Pro…
                  </div>
                }
              >
                <ProHub
                  key={auth.accountId + "::" + auth.teamSettings.id}
                  pro={pro}
                  team={auth.teamSettings}
                  user={auth.user}
                  role={auth.currentUserRole}
                  matches={auth.matches}
                  initialSection={proSection}
                  onBack={() => navigation.back("profile")}
                  onNavigate={navigate}
                  onWorkspaceRefresh={auth.refreshWorkspace}
                  onOpenFund={openFund}
                />
              </React.Suspense>
            ) : activeTab === "fund" ? (
              !leader && !fundAccess ? (
                <>
                  <PersonalFund
                    onBack={
                      navigation.hasParent
                        ? () => navigation.back("profile")
                        : undefined
                    }
                    user={shared.user}
                    treasurerQr={auth.teamSettings.treasurerQr}
                    onMarkPaid={auth.markFundPaid}
                    showLegacy={auth.demoSession || shared.user.fundDebt > 0 || shared.user.fundPaymentPending || shared.user.isFundPaid}
                  />
                  <div className="p-4">
                    <FundOperations
                      fund={fund}
                      mode="collections"
                      qr={auth.teamSettings.treasurerQr}
                      accountId={auth.accountId}
                      permissions={auth.teamSettings.members}
                    />
                    <FundOperations
                      fund={fund}
                      mode="charges"
                      qr={auth.teamSettings.treasurerQr}
                      accountId={auth.accountId}
                      permissions={auth.teamSettings.members}
                    />
                  </div>
                </>
              ) : (
                <FundManagement
                  fund={fund}
                  accountId={auth.accountId}
                  teamMembers={auth.teamSettings.members}
                  fundIntent={
                    ["reminder", "collection", "bill"].includes(
                      quickIntent?.action,
                    )
                      ? quickIntent
                      : null
                  }
                  onFundIntentUsed={() => setQuickIntent(null)}
                  {...fundProps}
                  viewState={fundViewStates.current.get(scrollKey)}
                  onViewStateChange={(value) =>
                    fundViewStates.current.set(scrollKey, value)
                  }
                  createRequest={
                    quickIntent?.action === "transaction"
                      ? quickIntent.id
                      : null
                  }
                  onCreateOpened={() => setQuickIntent(null)}
                  actor={auth.user.name}
                  timeZone={auth.teamSettings.timezone || "Asia/Ho_Chi_Minh"}
                  teamName={auth.teamSettings.teamName || "FC No Offside"}
                  treasurerQr={auth.teamSettings.treasurerQr}
                  onUpdateTreasurerQr={auth.updateTreasurerQr}
                  currentUserRole={auth.currentUserRole}
                  onBack={
                    navigation.hasParent
                      ? () => navigation.back()
                      : undefined
                  }
                />
              )
            ) : activeTab === "chat" ? (
              <Chat
                key={auth.accountId + auth.teamSettings.id}
                teamId={auth.teamSettings.id}
                accountId={auth.accountId}
                accessToken={
                  auth.demoSession ? null : auth.authSession?.access_token
                }
                user={auth.user}
                members={displayMembers}
                language={preferences.value.language || "vi"}
                timeZone={auth.teamSettings.timezone || "Asia/Ho_Chi_Minh"}
                teamName={auth.teamSettings.teamName}
                teamLogo={auth.teamSettings.logo}
                onKeyboardChange={setChatKeyboardOpen}
                onMarkViewed={chatUnread.markViewed}
                onPresence={chatUnread.presence}
                birthdayEnabled={
                  auth.teamSettings.appearance.birthdayReportEnabled !== false
                }
              />
            ) : activeTab === "profile" ? (
              <React.Fragment key={auth.accountId + auth.teamSettings.id}>
                <Profile
                  onOpenPro={openPro}
                  onFundReminder={
                    fundAccess ? () => openFund("reminder") : undefined
                  }
                  motm={proWinners[auth.user.id]}
                  {...shared}
                  authSession={auth.demoSession ? null : auth.authSession}
                  onOpenNotifications={() => setShowNotices(true)}
                  teamSettings={displayTeam}
                  hasTeam={auth.hasTeam}
                  preferences={preferences}
                  onCreateInvite={auth.createInvite}
                  onReadInvite={auth.readInvite}
                  onRevokeInvite={auth.revokeInvite}
                  onUpdateUsername={withFeedback(auth.updateUsername)}
                  onTeamExit={withFeedback(
                    auth.exitTeam,
                    "Đã cập nhật đội đang tham gia",
                  )}
                  passwordToken={auth.authSession?.access_token}
                  demoSession={auth.demoSession}
                  onToggleRole={auth.demoSession ? auth.toggleRole : undefined}
                  onLogout={withFeedback(auth.logout, "Đã đăng xuất")}
                  accountPanel={
                    <AccountControls
                      user={auth.user}
                      accountId={auth.accountId}
                      session={auth.demoSession ? null : auth.authSession}
                      onLogout={withFeedback(auth.logout, "Đã đăng xuất")}
                      onNavigate={navigate}
                    />
                  }
                  notificationPanel={
                    <NotificationSettings
                      accountId={auth.accountId}
                      token={auth.authSession?.access_token}
                      demo={auth.demoSession}
                    />
                  }
                  appearancePanel={
                    <AppearanceSettings preferences={preferences} />
                  }
                  onUpdateProfile={withFeedback(auth.updateProfile)}
                  onUpdateTeamName={withFeedback(auth.updateTeamName)}
                  onUpdateSubAdminTitle={auth.updateSubAdminTitle}
                  onAddSubAdmin={auth.addSubAdmin}
                  onRequestAdmin={auth.requestAdmin}
                  onRemoveSubAdmin={auth.removeSubAdmin}
                  onTransferOwnership={auth.transferOwnership}
                  onApproveAdminRequest={auth.approveAdminRequest}
                  onRejectAdminRequest={auth.rejectAdminRequest}
                  onOpenJoinCode={() => {
                    setJoinCodeInitial("");
                    setShowJoinCodeModal(true);
                  }}
                  onOpenScanQr={() => setShowQrScanModal(true)}
                />
              </React.Fragment>
            ) : !auth.activeMatch ? (
              <EmptyTeam
                memberships={memberships}
                birthdays={birthdayMembers}
                accountId={auth.accountId}
                onSwitchTeam={auth.switchTeam}
                switchingTeam={auth.switchingTeam}
                unreadCount={auth.notices.filter((n) => n.unread).length}
                onOpenNotifications={() => setShowNotices(true)}
                teamSettings={displayTeam}
                leader={leader}
                members={displayMembers}
                onAddMember={auth.addMember}
                onRemoveMember={auth.removeMember}
                onLinkMember={auth.demoSession ? undefined : auth.linkMember}
                currentUserRole={auth.currentUserRole}
                user={shared.user}
                onCreateInvite={auth.createInvite}
                onReadInvite={auth.readInvite}
                onRevokeInvite={auth.revokeInvite}
                onSaveMatch={saveMatch}
                onNavigate={navigate}
              />
            ) : (
              <PlayerDashboard
                treasurer={treasurer}
                attendanceFocus={attendanceFocus}
                onOpenPro={openPro}
                onOpenPoster={() => openPro("media")}
                {...shared}
                {...fundProps}
                members={displayMembers}
                teamId={auth.teamSettings.id}
                teamSettings={displayTeam}
                balance={auth.balance}
                activeMatch={auth.activeMatch}
                matches={auth.matches}
                attendance={auth.attendance}
                reports={auth.reports}
                onSaveMatch={saveMatch}
                onSetMatchStatus={auth.setMatchStatus}
                onSelectMatch={auth.selectMatch}
                onDeleteMatch={deleteMatch}
                governance={governance}
                onAddNotice={auth.addNotice}
                onToggleRole={auth.demoSession ? auth.toggleRole : undefined}
                onAttendanceChange={async (status) => {
                  await auth.setAttendance(status);
                  await governance.refresh();
                }}
                onMarkPaid={auth.markFundPaid}
                onResetPaid={auth.resetFund}
                onOpenNotifications={() => setShowNotices(true)}
                treasurerQr={auth.teamSettings.treasurerQr}
                onUpdateMatchStats={auth.updateMatchStats}
                onRemoveMember={auth.removeMember}
                onLinkMember={auth.demoSession ? undefined : auth.linkMember}
                onAddMember={auth.addMember}
                onCreateInvite={auth.createInvite}
                onReadInvite={auth.readInvite}
                onRevokeInvite={auth.revokeInvite}
              />
            )}
            {activeTab === "dashboard" && auth.hasTeam && (
              <ProDashboard
                pro={pro}
                members={displayMembers}
                matches={auth.matches}
                user={auth.user}
                leader={leader}
                onOpen={openPro}
                onLineup={() => navigate("lineup")}
              />
            )}
          </main>
          {activeTab === "dashboard" && auth.archivedMatches.length > 0 && (
            <details className="mx-4 my-5 settings-card">
              <summary className="text-sm font-semibold">
                Trận đã lưu trữ ({auth.archivedMatches.length})
              </summary>
              {auth.archivedMatches.map((match) => (
                <article key={match.id} className="border-t py-3 mt-3">
                  <p className="text-sm font-medium">{match.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(match.datetime).toLocaleString("vi-VN")} · Điểm
                    danh và báo cáo được bảo toàn
                  </p>
                  {leader && (
                    <Pressable
                      className="choice-button mt-3"
                      onClick={async () => {
                        try {
                          if (governance.snapshot)
                            await governance.mutate("restore_match", {
                              matchId: match.id,
                            });
                          auth.restoreArchivedMatch(match.id);
                        } catch {
                          alert(
                            "Không khôi phục được. Kiểm tra quyền và kết nối.",
                          );
                        }
                      }}
                    >
                      Khôi phục trận
                    </Pressable>
                  )}
                </article>
              ))}
            </details>
          )}
          {navigationAvailable && (
            <FloatingBottomNavigation
              tabs={tabs}
              activeTab={activeTab}
              canManage={
                activeTab !== "fund" &&
                (leader || fundAccess) &&
                auth.hasTeam &&
                !auth.teamRestriction
              }
              quickActionsOpen={quickOpen}
              onQuickActions={() => setQuickOpen(true)}
              visible={activeTab === "chat" ? !chatKeyboardOpen : navVisible}
              onNavigate={(target) => navigate(target, { root: true })}
              onReveal={revealNav}
            />
          )}
          <QuickActions
            treasurer={treasurer}
            fundManager={fundAccess}
            open={quickOpen}
            onClose={() => setQuickOpen(false)}
            role={auth.currentUserRole}
            onAction={runQuickAction}
          />
          {quickMatch && leader && (
            <MatchFormSheet
              draft={quickMatch}
              onChange={setQuickMatch}
              error={quickMatchError}
              onClose={() => setQuickMatch(null)}
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await saveMatch(quickMatch);
                  setQuickMatch(null);
                } catch (error) {
                  setQuickMatchError(
                    error.message || "Không lưu được trận đấu.",
                  );
                }
              }}
            />
          )}
          {quickInvite && leader && (
            <QuickInvite
              team={auth.teamSettings}
              role={auth.currentUserRole}
              onClose={() => setQuickInvite(false)}
              onCreate={auth.createInvite}
              onRead={auth.readInvite}
              onRevoke={auth.revokeInvite}
            />
          )}
          {auth.hasTeam &&
            !auth.teamRestriction &&
            !["invite-landing", "create-team"].includes(activeTab) && (
              <WelcomeAnnouncementModal
                key={auth.accountId}
                accountId={auth.accountId}
                notices={auth.notices}
                birthdays={birthdayMembers}
                onOpenNotice={openNotice}
              />
            )}
          {auth.deletedMatch && leader && (
            <div className="match-undo" role="status">
              <span className="flex-1 text-sm">Đã lưu trữ trận đấu</span>
              <Pressable
                onClick={async () => {
                  const snapshot = auth.deletedMatch;
                  try {
                    await auth.undoDeleteMatch(snapshot);
                    await governance.refresh();
                  } catch {
                    alert("Không hoàn tác được. Kiểm tra quyền và kết nối.");
                  }
                }}
              >
                Hoàn tác
              </Pressable>
            </div>
          )}
          {showNotices && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Thông báo đội"
              className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm p-4 grid place-items-center"
            >
              <section className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[80dvh] overflow-auto">
                <h2 className="text-xl font-semibold mb-4">Thông báo đội</h2>
                {noticeReadError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {noticeReadError}
                  </p>
                )}
                {auth.notices.length ? (
                  auth.notices.map((n) => (
                    <article
                      key={n.id}
                      className="border-b border-slate-100 py-3"
                    >
                      <Pressable
                        type="button"
                        className="w-full text-left min-h-11"
                        onClick={async () => {
                          setShowNotices(false);
                          await openNotice(n);
                        }}
                      >
                        <h3 className="font-semibold">
                          {systemNoticeTitle(n.title)}
                        </h3>
                        <span className="text-xs text-emerald-700">
                          Mở nội dung
                        </span>
                      </Pressable>
                      <p className="text-sm mt-1 text-slate-600">{n.content}</p>
                      <time
                        className="text-xs text-slate-500"
                        dateTime={n.createdAt}
                      >
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString("vi-VN")
                          : n.time}
                      </time>
                    </article>
                  ))
                ) : (
                  <p className="text-slate-500 py-5">Chưa có thông báo mới.</p>
                )}
                <Pressable
                  aria-label="Đóng"
                  className="primary-button w-full mt-4"
                  onClick={() => setShowNotices(false)}
                >
                  Đóng
                </Pressable>
              </section>
            </div>
          )}
          {showJoinCodeModal && (
            <ClubCodeModal
              isOpen={showJoinCodeModal}
              onClose={() => {
                setShowJoinCodeModal(false);
                setJoinCodeInitial("");
              }}
              initialCode={joinCodeInitial}
              isLoggedIn={auth.isLoggedIn}
              currentUser={auth.user}
              onJoinSuccess={async (payload) => {
                await auth.joinTeamViaInvite(payload.code, payload);
                setShowJoinCodeModal(false);
                navigate("dashboard");
              }}
              onRequireAuth={({ mode = "signup" } = {}) => {
                setShowJoinCodeModal(false);
                setLoginInitialMode(mode);
                navigate("login");
              }}
            />
          )}
          {showQrScanModal && (
            <QrScannerModal
              isOpen={showQrScanModal}
              onClose={() => setShowQrScanModal(false)}
              onScanSuccess={(detectedCode) => {
                setShowQrScanModal(false);
                const match =
                  String(detectedCode).match(/\/invite\/([^/?#]+)/i);
                const extracted = match ? match[1] : detectedCode;
                setJoinCodeInitial(extracted);
                setShowJoinCodeModal(true);
              }}
              onSwitchToCode={() => {
                setShowQrScanModal(false);
                setJoinCodeInitial("");
                setShowJoinCodeModal(true);
              }}
            />
          )}
        </div>
      </div>
    </StartupGate>
  );
}
