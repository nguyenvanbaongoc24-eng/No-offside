import React, { useRef, useState } from "react";
import {
  Home,
  Network,
  Wallet,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
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
import AccountControls from "./components/AccountControls";
import Governance from "./pages/Governance";
import { useGovernance } from "./hooks/useGovernance";
import GovernanceNotice from "./components/GovernanceNotice";

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState(
    window.location.pathname.startsWith("/invite/")
      ? "invite-landing"
      : "dashboard",
  );
  const [showNotices, setShowNotices] = useState(false);
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
    if (governance.snapshot)
      await governance.mutate(
        "match",
        {
          id: match.id,
          title: match.title,
          kickoff: new Date(match.datetime).toISOString(),
          deadline: new Date(match.deadline).toISOString(),
          ...match.lateConfig,
        },
        saveRequest.current.key,
      );
    auth.saveMatch(form, editId, { id: match.id });
    saveRequest.current = null;
  };
  const deleteMatch = async (id) => {
    if (governance.snapshot)
      await governance.mutate("archive_match", { matchId: id });
    auth.deleteMatch(id);
  };
  useDialogAccessibility();
  useVisualViewport();
  const leader = ["owner", "admin"].includes(auth.currentUserRole);
  const activeTab =
    auth.currentUserRole !== "owner" && tab === "team-settings"
      ? "dashboard"
      : !auth.hasTeam && tab === "dashboard"
        ? "onboarding"
        : tab;
  const navigate = (target) => {
    setTab(target);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
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
  if (auth.authLoading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2
          className="animate-spin text-emerald-600"
          aria-label="Đang kiểm tra phiên đăng nhập"
        />
      </div>
    );
  if (!auth.isLoggedIn && tab !== "invite-landing")
    return (
      <Login
        theme={preferences.value.theme}
        onThemeChange={(theme) => preferences.update({ theme })}
        initialMode={loginInitialMode}
        onLoginSuccess={(profile) => {
          auth.login(profile);
          navigate("dashboard");
        }}
      />
    );
  const fundProps = {
    funds: auth.funds,
    onChangeFunds: auth.setFunds,
    onApprove: auth.approveFundPayment,
  };
  const currentMonth = monthKey();
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
    user: {
      ...auth.user,
      nextMatchAttendance: auth.attendance[auth.user.id] || null,
      isFundPaid: paid,
      fundDebt: paid ? 0 : debt || auth.user.fundDebt,
      fundPaymentPending: auth.funds.pendingApprovals.some(
        (p) => p.playerId === auth.user.id && p.month === currentMonth,
      ),
    },
    currentUserRole: auth.currentUserRole,
    onNavigate: navigate,
    demoSession: auth.demoSession,
  };
  const tabs = [
    { id: "dashboard", label: "Trang chủ", Icon: Home },
    { id: "lineup", label: "Chiến thuật", Icon: Network },
    { id: "fund", label: "Quỹ đội", Icon: Wallet },
    { id: "chat", label: "Tin nhắn", Icon: MessageSquare },
    { id: "profile", label: "Cá nhân", Icon: User },
  ];
  return (
    <div className="app-shell bg-slate-100 min-h-screen text-gray-900 flex justify-center antialiased">
      <div className="app-frame w-full max-w-md min-h-screen bg-slate-50 relative pb-safe-nav">
        {auth.storageError && (
          <div role="alert" className="p-3 bg-rose-50 text-rose-700">
            {auth.storageError}
          </div>
        )}
        <div className="session-banner">
          {auth.demoSession
            ? "Bản trải nghiệm • dữ liệu lưu trên thiết bị"
            : "Dữ liệu đội đang lưu trên thiết bị này"}
        </div>
        <main>
          {activeTab === "dashboard" && (
            <GovernanceNotice
              governance={governance}
              onOpen={() => navigate("governance")}
            />
          )}
          {activeTab === "onboarding" ? (
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
              onBack={() => navigate("dashboard")}
            />
          ) : activeTab === "team-settings" ? (
            <TeamSettings
              teamSettings={auth.teamSettings}
              onUpdateTeamSettings={auth.updateTeamSettings}
              onBack={() => navigate("profile")}
              currentUserRole={auth.currentUserRole}
              preferences={preferences}
            />
          ) : activeTab === "lineup" ? (
            <LineupBuilder
              key={auth.accountId + auth.teamSettings.id}
              teamId={auth.teamSettings.id}
              accountId={auth.accountId}
              currentUserRole={auth.currentUserRole}
              members={auth.teamSettings.members}
              onBack={() => navigate("dashboard")}
            />
          ) : activeTab === "fund" ? (
            !leader ? (
              <PersonalFund
                user={shared.user}
                treasurerQr={auth.teamSettings.treasurerQr}
                onMarkPaid={auth.markFundPaid}
              />
            ) : (
              <FundManagement
                {...fundProps}
                actor={auth.user.name}
                timeZone={auth.teamSettings.timezone || "Asia/Ho_Chi_Minh"}
                treasurerQr={auth.teamSettings.treasurerQr}
                onUpdateTreasurerQr={auth.updateTreasurerQr}
                currentUserRole={auth.currentUserRole}
                onBack={() => navigate("dashboard")}
              />
            )
          ) : activeTab === "chat" ? (
            <Chat
              key={auth.accountId + auth.teamSettings.id}
              teamId={auth.teamSettings.id}
              accountId={auth.accountId}
              user={auth.user}
              members={auth.teamSettings.members}
              birthdayEnabled={
                auth.teamSettings.appearance.birthdayReportEnabled !== false
              }
            />
          ) : activeTab === "profile" ? (
            <React.Fragment key={auth.accountId + auth.teamSettings.id}>
              <Profile
                {...shared}
                onOpenNotifications={() => setShowNotices(true)}
                teamSettings={auth.teamSettings}
                hasTeam={auth.hasTeam}
                preferences={preferences}
                onUpdateUsername={auth.updateUsername}
                onToggleRole={auth.demoSession ? auth.toggleRole : undefined}
                onLogout={auth.logout}
                accountPanel={
                  <AccountControls
                    user={auth.user}
                    accountId={auth.accountId}
                    session={auth.demoSession ? null : auth.authSession}
                    onLogout={auth.logout}
                    onNavigate={navigate}
                  />
                }
                appearancePanel={
                  <AppearanceSettings preferences={preferences} />
                }
                onUpdateProfile={auth.updateProfile}
                onUpdateTeamName={auth.updateTeamName}
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
              teamSettings={auth.teamSettings}
              leader={leader}
              members={auth.teamSettings.members}
              onAddMember={auth.addMember}
              onRemoveMember={auth.removeMember}
              currentUserRole={auth.currentUserRole}
              user={shared.user}
              onCreateInvite={auth.createInvite}
              onRevokeInvite={auth.revokeInvite}
              onSaveMatch={saveMatch}
              onNavigate={navigate}
            />
          ) : (
            <PlayerDashboard
              {...shared}
              {...fundProps}
              members={auth.teamSettings.members}
              teamId={auth.teamSettings.id}
              teamSettings={auth.teamSettings}
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
                try {
                  if (governance.snapshot)
                    await governance.mutate("attendance", {
                      matchId: auth.activeMatch.id,
                      status,
                    });
                  auth.setAttendance(status);
                } catch {
                  alert(
                    "Server từ chối điểm danh. Kiểm tra hạn, quyền và bản ghi đã chốt.",
                  );
                }
              }}
              onMarkPaid={auth.markFundPaid}
              onResetPaid={auth.resetFund}
              onOpenNotifications={() => setShowNotices(true)}
              treasurerQr={auth.teamSettings.treasurerQr}
              onUpdateMatchStats={auth.updateMatchStats}
              onRemoveMember={() => navigate("governance")}
              onAddMember={auth.addMember}
              onCreateInvite={auth.createInvite}
              onRevokeInvite={auth.revokeInvite}
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
                  {new Date(match.datetime).toLocaleString("vi-VN")} · Điểm danh
                  và báo cáo được bảo toàn
                </p>
                {leader && (
                  <button
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
                  </button>
                )}
              </article>
            ))}
          </details>
        )}
        {!["create-team", "invite-landing", "team-settings"].includes(
          activeTab,
        ) && (
          <nav
            className={"bottom-navigation" + (navVisible ? "" : " nav-hidden")}
            aria-label="Điều hướng chính"
            onFocusCapture={revealNav}
          >
            <div className="nav-items">
              {tabs.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    aria-label={label}
                    title={label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => navigate(id)}
                    className="nav-item"
                  >
                    {id === "profile" && auth.user?.avatar ? (
                      <div
                        className={`w-7 h-7 rounded-full overflow-hidden transition-all duration-150 flex items-center justify-center ${
                          isActive
                            ? "ring-2 ring-emerald-600 dark:ring-emerald-400 scale-105"
                            : "opacity-75"
                        }`}
                      >
                        <img
                          src={auth.user.avatar}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Icon
                        size={24}
                        className={`transition-all duration-150 ${
                          isActive
                            ? "fill-current stroke-[2.2] scale-105 text-emerald-600 dark:text-emerald-400"
                            : "stroke-[1.8] opacity-75"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
        {auth.deletedMatch && leader && (
          <div className="match-undo" role="status">
            <span className="flex-1 text-sm">Đã lưu trữ trận đấu</span>
            <button
              onClick={async () => {
                const snapshot = auth.deletedMatch;
                try {
                  if (governance.snapshot)
                    await governance.mutate("restore_match", {
                      matchId: snapshot.match.id,
                    });
                  auth.undoDeleteMatch(snapshot);
                } catch {
                  alert("Không hoàn tác được. Kiểm tra quyền và kết nối.");
                }
              }}
            >
              Hoàn tác
            </button>
          </div>
        )}
        {showNotices && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm p-4 grid place-items-center"
          >
            <section className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[80dvh] overflow-auto">
              <h2 className="text-xl font-semibold mb-4">Thông báo đội</h2>
              {auth.notices.length ? (
                auth.notices.map((n) => (
                  <article
                    key={n.id}
                    className="border-b border-slate-100 py-3"
                  >
                    <h3 className="font-semibold">{n.title}</h3>
                    <p className="text-sm mt-1 text-slate-600">{n.content}</p>
                    <time className="text-xs text-slate-500">{n.time}</time>
                  </article>
                ))
              ) : (
                <p className="text-slate-500 py-5">Chưa có thông báo mới.</p>
              )}
              <button
                aria-label="Đóng"
                className="primary-button w-full mt-4"
                onClick={() => setShowNotices(false)}
              >
                Đóng
              </button>
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
              const match = String(detectedCode).match(/\/invite\/([^/?#]+)/i);
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
  );
}
