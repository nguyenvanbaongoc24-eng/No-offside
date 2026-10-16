import BirthdayBanner from '../components/BirthdayBanner';
import Pressable from '../components/Pressable';
import MyAttendanceControl from "../components/MyAttendanceControl";
import Avatar from "../components/Avatar";
import { localTransactionTime } from "../lib/transactionTime";
import TeamIdentityHeader from "../components/TeamIdentityHeader";
import MatchCardSummary from "../components/matches/MatchCardSummary";
import { useTeamInvite } from "../hooks/useTeamInvite";
import LateArrivalPanel from "../components/LateArrivalPanel";
import { matchTimeLabel } from '../lib/matchTime';
import SwipeMatchCard from "../components/SwipeMatchCard";
import QrPreview from "../components/QrPreview";
import React, { useState, useEffect, useMemo } from "react";
import { readStored, writeStored } from "../lib/storage";
import { supabase } from "../lib/supabase";
import MatchList from "../components/MatchList";
import MatchFormSheet from "../components/MatchFormSheet";
import { motion } from "framer-motion";
import {
  Network,
  UserCheck,
  Calendar,
  MapPin,
  Clock,
  Check,
  HelpCircle,
  X,
  QrCode,
  Bell,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  Sliders,
  Beer,
  Swords,
  Clapperboard,
  Copy,
  CreditCard,
  Wallet,
  Trophy,
  Shield,
  Sparkles,
  Users2,
  Settings,
  PlusCircle,
  Edit3,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
  Plus,
  MessageSquare,
  MoreHorizontal,
  Trash2,
} from "../components/icons";
import { formatCurrency, formatCompactCurrency } from "../lib/formatCurrency";
import TeamManager from "./TeamManager";
import MemberQuickProfileModal from "../components/MemberQuickProfileModal";
import InviteShare from "../components/InviteShare";
import { rosterFor, qrUrl, monthKey } from "../lib/teamModel";
import WelcomeAnnouncementModal from "../components/WelcomeAnnouncementModal";
import AddMemberModal from "../components/AddMemberModal";

export default function PlayerDashboard({
  user,
  onOpenPoster,
  onOpenPro,
  governance,
  currentUserRole = "player",
  onToggleRole,
  onAttendanceChange,
  onMarkPaid,
  onResetPaid,
  onNavigate,
  onOpenNotifications,
  memberships,
  birthdays = [],
  accountId,
  onSwitchTeam,
  switchingTeam,
  unreadCount,
  treasurerQr,
  onUpdateMatchStats,
  members = [],
  onRemoveMember,
  onLinkMember,
  onAddMember,
  funds,
  onApprove,
  balance,
  activeMatch,
  matches,
  attendance,
  reports,
  onSaveMatch,
  onSetMatchStatus,
  onSelectMatch,
  onDeleteMatch,
  onAddNotice,
  teamSettings,
  demoSession,
  onCreateInvite,
  onReadInvite,
  onRevokeInvite,
}) {
  // Modal states
  const [matchFormError, setMatchFormError] = useState("");
  const [showMatchActionMenu, setShowMatchActionMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAdminApproveModal, setShowAdminApproveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTeamManagerModal, setShowTeamManagerModal] = useState(false);
  const [quickProfileMember, setQuickProfileMember] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const invite = useTeamInvite(
    teamSettings,
    currentUserRole,
    onCreateInvite,
    onRevokeInvite,
    onReadInvite,
  );
  const inviteCode = invite.code;
  const openInvite = () => {
    setShowInviteModal(true);
    invite.load().catch(() => {});
  };
  const [attendanceActiveTab, setAttendanceActiveTab] = useState("attending"); // 'attending' | 'maybe' | 'absent' | 'unvoted'
  const [copiedField, setCopiedField] = useState("");

  // Weekly matches count (Requirement: Max 4 matches per week)
  const weeklyMatchesCount = matches.filter((m) => {
    const a = new Date(m.datetime),
      b = new Date(activeMatch.datetime);
    const start = new Date(b);
    start.setDate(b.getDate() - ((b.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return a >= start && a < end;
  }).length;
  const [editingMatchId, setEditingMatchId] = useState(null);
  const MAX_WEEKLY_MATCHES = 4;

  // Match details state
  const matchInfo = {
    ...activeMatch,
    dateText: matchTimeLabel(activeMatch.datetime, teamSettings.timezone || 'Asia/Ho_Chi_Minh'),
  };

  // Match Status: 'upcoming' | 'completed' (Cho phép tự báo cáo thành tích sau trận)
  const matchStatus = activeMatch.status;
  const setMatchStatus = onSetMatchStatus;
  const [goalsReported, setGoalsReported] = useState(
    reports[activeMatch.id]?.goals || 0,
  );
  const [assistsReported, setAssistsReported] = useState(
    reports[activeMatch.id]?.assists || 0,
  );
  useEffect(() => {
    setGoalsReported(reports[activeMatch.id]?.goals || 0);
    setAssistsReported(reports[activeMatch.id]?.assists || 0);
    setStatsSaved(false);
  }, [activeMatch.id]);
  const [statsSaved, setStatsSaved] = useState(false);

  const handleSaveMatchReport = async () => {
    try {
      if (onUpdateMatchStats) {
        await onUpdateMatchStats(goalsReported, assistsReported);
      }
      setStatsSaved(true);
    } catch (error) {
      setMatchFormError(error.message || "Không lưu được thành tích.");
    }
  };

  // Mock Attendance Roster with 4 tabs: [Có mặt] - [Chưa chắc] - [Báo vắng] - [Chưa điểm danh (Mới)]
  const attendanceMembers = Array.isArray(activeMatch.eligibleMembers)
    ? activeMatch.eligibleMembers
    : members.filter(
        (member) =>
          !member.membershipStatus || member.membershipStatus === "active",
      );
  const roster = rosterFor(attendanceMembers, attendance, user);
  const rosterCount = attendanceMembers.length;

  // Create match form fields
  const [newMatchData, setNewMatchData] = useState({
    opponent: "",
    datetime: "",
    venue: teamSettings.venue || "",
    timeoutDatetime: "",
    penaltyEnabled: true,
    penaltyFine: 50000,
  });

  // Mock pending payments for Admin approval
  const pendingApprovals = funds.pendingApprovals;

  const teammatesPreview = members
    .filter((member) => member.id !== user.id)
    .slice(0, 3);

  const bankInfo = {
    bankName: treasurerQr?.bankName || "Chưa cấu hình ngân hàng",
    accountNumber: treasurerQr?.accountNumber || "",
    accountHolder: treasurerQr?.accountHolder || "",
    amount: formatCurrency(Math.max(0, Number(user.fundDebt) || 0)),
    content: "NO OFFSIDE SO " + user.number + " DONG QUY " + monthKey(),
    qrUrl:
      treasurerQr?.qrMode === "uploaded"
        ? treasurerQr.uploadedQrImage
        : qrUrl(
            { ...treasurerQr, bankCode: treasurerQr?.bankCode || "970422" },
            Math.max(0, Number(user.fundDebt) || 0),
            "NO OFFSIDE SO " + user.number + " DONG QUY " + monthKey(),
          ),
  };

  useEffect(() => {
    if (!statsSaved) return;
    const timer = setTimeout(() => setStatsSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [statsSaved]);
  useEffect(() => {
    if (!copiedField) return;
    const timer = setTimeout(() => setCopiedField(""), 2000);
    return () => clearTimeout(timer);
  }, [copiedField]);
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
    } catch {
      alert(
        "Không sao chép được. Vui lòng chọn nội dung để sao chép thủ công.",
      );
    }
  };

  const approvePayment = onApprove;

  const handleCreateMatchSubmit = async (e) => {
    e.preventDefault();
    setMatchFormError("");
    try {
      await onSaveMatch(newMatchData, editingMatchId);
      setShowCreateMatchModal(false);
    } catch (err) {
      setMatchFormError(err.message);
    }
  };
  const openMatchEditor = (edit) => {
    setMatchFormError("");
    setEditingMatchId(edit ? activeMatch.id : null);
    setNewMatchData(
      edit
        ? {
            opponent: activeMatch.title.split(" — ").at(-1),
            datetime: localTransactionTime(
              activeMatch.datetime,
              teamSettings.timezone || "Asia/Ho_Chi_Minh",
            ),
            venue: activeMatch.venue,
            timeoutDatetime: localTransactionTime(
              activeMatch.deadline,
              teamSettings.timezone || "Asia/Ho_Chi_Minh",
            ),
            penaltyEnabled: activeMatch.penaltyEnabled,
            penaltyFine: Number(activeMatch.penaltyAmount.replace(/\D/g, "")),
            lateConfig: activeMatch.lateConfig,
          }
        : {
            opponent: "",
            datetime: "",
            timeoutDatetime: "",
            venue: teamSettings.venue || "",
            penaltyEnabled: true,
            penaltyFine: 50000,
          },
    );
    setShowCreateMatchModal(true);
  };

  const handleRemindUnvoted = async (playerName) => {
    try {
      await onAddNotice("Nhắc điểm danh", "Vui lòng điểm danh: " + playerName);
      alert(
        demoSession
          ? "Đã ghi thông báo trong bản trải nghiệm."
          : "Đã lưu thông báo trong đội.",
      );
    } catch (error) {
      setMatchFormError(error.message);
    }
  };

  const handleFineUnvoted = (playerName) =>
    alert(
      "Chưa tự ghi khoản phạt. Vào Quỹ đội để thêm giao dịch sau khi kiểm tra: " +
        playerName,
    );

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const isLeader = isOwner || isAdmin;

  const DEFAULT_ACTION_IDS = ["attendance", "lineup", "fund", "chat"];
  const [showCustomizeShortcuts, setShowCustomizeShortcuts] = useState(false);
  const [expandAllShortcuts, setExpandAllShortcuts] = useState(false);

  const quickActionsStorageKey = `no_offside_quick_actions_${user?.id || "anon"}_${teamSettings?.id || "default"}`;

  const [selectedActionIds, setSelectedActionIds] = useState(() => {
    const local = readStored(quickActionsStorageKey, null);
    if (Array.isArray(local) && local.length > 0) return local;
    const remote = user?.user_metadata?.quick_actions?.[teamSettings?.id];
    if (Array.isArray(remote) && remote.length > 0) return remote;
    return DEFAULT_ACTION_IDS;
  });

  const handleUpdateActionIds = (newIds) => {
    setSelectedActionIds(newIds);
    writeStored(quickActionsStorageKey, newIds);
    if (supabase && user && !demoSession) {
      try {
        const meta = user.user_metadata || {};
        const currentActionsMap = meta.quick_actions || {};
        supabase.auth
          .updateUser({
            data: {
              quick_actions: {
                ...currentActionsMap,
                [teamSettings?.id]: newIds,
              },
            },
          })
          .catch((err) => console.warn("Sync quick actions error:", err));
      } catch (err) {
        console.warn("Supabase user update error:", err);
      }
    }
  };

  const handleResetDefaultShortcuts = () => {
    handleUpdateActionIds(DEFAULT_ACTION_IDS);
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const next = [...selectedActionIds];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    handleUpdateActionIds(next);
  };

  const handleMoveDown = (index) => {
    if (index >= selectedActionIds.length - 1) return;
    const next = [...selectedActionIds];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    handleUpdateActionIds(next);
  };

  const handleRemoveShortcut = (id) => {
    handleUpdateActionIds(selectedActionIds.filter((item) => item !== id));
  };

  const handleAddShortcut = (id) => {
    if (!selectedActionIds.includes(id)) {
      handleUpdateActionIds([...selectedActionIds, id]);
    }
  };

  // Danh mục tất cả tiện ích thực sự hoạt động trong hệ thống
  const allCatalogActions = useMemo(() => {
    return [
      {
        id: "attendance",
        label: "Điểm danh",
        description: "Điểm danh và xem danh sách có mặt",
        Icon: UserCheck,
        iconBg:
          "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        onClick: () => {
          if (isLeader) {
            setShowAttendanceModal(true);
          } else {
            const el = document.getElementById("match-attendance");
            if (el) {
              el.scrollIntoView({ block: "center", behavior: "smooth" });
            } else {
              setShowAttendanceModal(true);
            }
          }
        },
      },
      {
        id: "lineup",
        label: "Sa bàn Pro",
        description: "Sơ đồ chiến thuật và đội hình",
        Icon: Network,
        iconBg:
          "bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80",
        iconColor: "text-teal-600 dark:text-teal-400",
        onClick: () => onNavigate && onNavigate("lineup"),
      },
      {
        id: "fund",
        label: isLeader ? "Sổ quỹ" : "Đóng quỹ",
        description: "Quản lý thu chi và đóng quỹ đội",
        Icon: Wallet,
        iconBg:
          "bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80",
        iconColor: "text-amber-600 dark:text-amber-400",
        onClick: () => {
          if (
            !isLeader &&
            user.fundDebt > 0 &&
            bankInfo.accountNumber &&
            !user.isFundPaid
          ) {
            setShowQrModal(true);
          } else {
            onNavigate && onNavigate("fund");
          }
        },
      },
      {
        id: "chat",
        label: "Phòng chat",
        description: "Trao đổi tin nhắn nội bộ đội",
        Icon: MessageSquare,
        iconBg:
          "bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80",
        iconColor: "text-blue-600 dark:text-blue-400",
        onClick: () => onNavigate && onNavigate("chat"),
      },
      ...(onOpenPro
        ? [
            {
              id: "friendly",
              label: "Cáp kèo",
              description: "Sàn giao lưu cáp kèo đối thủ",
              Icon: Swords,
              iconBg:
                "bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/80",
              iconColor: "text-rose-600 dark:text-rose-400",
              onClick: () => onOpenPro("board"),
            },
            {
              id: "hiep3",
              label: "Hiệp 3",
              description: "Chia bill và chi tiêu sau trận",
              Icon: Beer,
              iconBg:
                "bg-violet-50 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800/80",
              iconColor: "text-violet-600 dark:text-violet-400",
              onClick: () => onOpenPro("finance"),
            },
            {
              id: "stars",
              label: "Ngôi sao MOTM",
              description: "Bình chọn cầu thủ xuất sắc nhất",
              Icon: Trophy,
              iconBg:
                "bg-yellow-50 dark:bg-yellow-950/60 border border-yellow-200/80 dark:border-yellow-800/80",
              iconColor: "text-yellow-600 dark:text-yellow-400",
              onClick: () => onOpenPro("stars"),
            },
          ]
        : []),
      {
        id: "members",
        label: "Thành viên",
        description: "Danh sách cầu thủ trong đội",
        Icon: Users2,
        iconBg:
          "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        onClick: () => setShowTeamManagerModal(true),
      },
      {
        id: "governance",
        label: "Nội quy & phạt",
        description: "Quy chế & xử lý kỷ luật đội",
        Icon: Shield,
        iconBg:
          "bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80",
        iconColor: "text-purple-600 dark:text-purple-400",
        onClick: () => onNavigate && onNavigate("governance"),
      },
      {
        id: "invite",
        label: "Mời vào đội",
        description: "Tạo link & mã QR mời thành viên",
        Icon: QrCode,
        iconBg:
          "bg-pink-50 dark:bg-pink-950/60 border border-pink-200/80 dark:border-pink-800/80",
        iconColor: "text-pink-600 dark:text-pink-400",
        onClick: openInvite,
      },
      ...(onOpenPoster || onOpenPro
        ? [
            {
              id: "poster",
              label: "Poster trận",
              description: "Tạo poster trận đấu và chia sẻ",
              Icon: Clapperboard,
              iconBg:
                "bg-orange-50 dark:bg-orange-950/60 border border-orange-200/80 dark:border-orange-800/80",
              iconColor: "text-orange-600 dark:text-orange-400",
              onClick: () => {
                if (onOpenPoster) onOpenPoster();
                else if (onOpenPro) onOpenPro("media");
              },
            },
          ]
        : []),
      ...(isLeader
        ? [
            {
              id: "create-match",
              label: "Tạo trận",
              description: "Lên lịch trận đấu mới cho đội",
              Icon: PlusCircle,
              iconBg:
                "bg-emerald-600 text-white shadow-emerald-600/25 border border-emerald-500",
              iconColor: "text-white",
              onClick: () => openMatchEditor(false),
            },
          ]
        : []),
    ];
  }, [
    isLeader,
    onNavigate,
    onOpenPro,
    onOpenPoster,
    user.fundDebt,
    bankInfo.accountNumber,
    user.isFundPaid,
  ]);

  // Lọc chỉ giữ lại những shortcut mà user có quyền thực tế
  const validActiveActions = useMemo(() => {
    const catalogMap = new Map(allCatalogActions.map((a) => [a.id, a]));
    const actions = selectedActionIds
      .map((id) => catalogMap.get(id))
      .filter(Boolean);
    return actions.length > 0 ? actions : allCatalogActions.slice(0, 4);
  }, [selectedActionIds, allCatalogActions]);

  const displayedActions = expandAllShortcuts
    ? validActiveActions
    : validActiveActions.slice(0, 4);

  return (
    <div className="dashboard-page relative bg-slate-50 text-gray-900 font-sans antialiased">
      {/* =========================================================
          YÊU CẦU 1: BẢNG TIN CHÀO MỪNG (WELCOME POPUP / ANNOUNCEMENT)
          - Hiển thị ngay sau khi vào Dashboard
          - Tự động đóng sau 5 giây hoặc user bấm Đóng
          - Checkbox lưu sessionStorage 'Không nhắc lại trong phiên đăng nhập này'
          ========================================================= */}

      {/* =========================================================
          1. HEADER DARK STYLE VỚI PATTERN MỜ (SLATE-900)
          ========================================================= */}
      <TeamIdentityHeader
        team={teamSettings}
        memberships={memberships}
        onSwitchTeam={onSwitchTeam}
        switchingTeam={switchingTeam}
        onOpenProfile={() => onNavigate("profile")}
        onOpenNotifications={onOpenNotifications}
        unreadCount={unreadCount}
      />
      <BirthdayBanner members={birthdays} accountId={accountId} celebrate/>
      {demoSession && (
        <Pressable className="demo-role-toggle" onClick={onToggleRole}>
          Đổi vai trò trải nghiệm
        </Pressable>
      )}

      <MatchList
        matches={matches}
        timeZone={teamSettings.timezone || "Asia/Ho_Chi_Minh"}
        activeMatchId={activeMatch.id}
        canDelete={isLeader}
        onSelect={onSelectMatch}
        onDelete={onDeleteMatch}
      />

      {/* =========================================================
          2. CARDS CONTAINER VỚI TIGHT SPACING & MOTION
          ========================================================= */}
      <div className="dashboard-card-flow px-4 space-y-4 mt-4">
        {/* CARD 1: TRẬN ĐẤU TIẾP THEO & BỘ ĐẾM NGƯỢC REAL-TIME */}
        <SwipeMatchCard
          key={activeMatch.id}
          match={activeMatch}
          canDelete={isLeader}
          onDelete={onDeleteMatch}
        >
          <section className="match-card-container rounded-[20px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all bg-white dark:bg-[#141E1A]">
            <MatchCardSummary match={activeMatch} timeZone={teamSettings.timezone || "Asia/Ho_Chi_Minh"} onOpenRules={() => onNavigate("governance")} menu={
                <div className="relative shrink-0">
                  <Pressable
                    type="button"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-black/25 hover:bg-black/35 active:scale-95 text-white flex items-center justify-center border border-white/20 transition-all outline-none cursor-pointer"
                    aria-label="Tùy chọn trận đấu" aria-expanded={showMatchActionMenu}
                    onClick={() => setShowMatchActionMenu((prev) => !prev)}
                  >
                    <MoreHorizontal size={20} className="text-white" />
                  </Pressable>

                  {/* Dropdown quản lý trận */}
                  {showMatchActionMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMatchActionMenu(false)}
                      />
                      <div className="absolute right-0 top-12 z-50 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                        {isLeader && (
                          <button
                            type="button"
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                            onClick={() => {
                              setShowMatchActionMenu(false);
                              openMatchEditor(true);
                            }}
                          >
                            <Edit3 size={15} className="text-slate-500" />
                            <span>Sửa thông tin trận</span>
                          </button>
                        )}

                        {isLeader && matchStatus !== "completed" && (
                          <button
                            type="button"
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium cursor-pointer"
                            onClick={async () => {
                              setShowMatchActionMenu(false);
                              try {
                                if (
                                  window.confirm(
                                    "Kết thúc trận này và mở báo cáo thành tích?",
                                  )
                                ) {
                                  await setMatchStatus("completed");
                                }
                              } catch (error) {
                                setMatchFormError(error.message);
                              }
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>Kết thúc trận đấu</span>
                          </button>
                        )}

                        {isLeader && (
                          <button
                            type="button"
                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium cursor-pointer"
                            onClick={() => {
                              setShowMatchActionMenu(false);
                              if (
                                window.confirm(
                                  `Xóa trận "${matchInfo.title}" khỏi lịch? Trận sẽ được lưu trữ và có thể hoàn tác trong 10 giây.`,
                                )
                              ) {
                                onDeleteMatch(activeMatch.id);
                              }
                            }}
                          >
                            <Trash2 size={15} />
                            <span>Xóa trận khỏi lịch</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="w-full px-3.5 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                          onClick={async () => {
                            setShowMatchActionMenu(false);
                            await copyToClipboard(
                              `${matchInfo.title} · ${matchInfo.dateText} tại ${matchInfo.venue}`,
                              "matchShare",
                            );
                            alert("Đã sao chép thông tin trận đấu!");
                          }}
                        >
                          <Copy size={15} className="text-slate-500" />
                          <span>Sao chép thông tin trận</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
            }/>

            {/* THÂN THẺ: NỀN SURFACE ỔN ĐỊNH CHO TƯƠNG PHẢN TỐT NHẤT */}
            <div className="p-4 space-y-4 bg-white dark:bg-[#141E1A]">
              {/* KHU VỰC B: ĐIỂM DANH */}
              <MyAttendanceControl
                status={attendance[user.id]}
                deadline={activeMatch.deadline}
                completed={matchStatus === "completed"}
                onChange={onAttendanceChange}
              />

              {/* TIẾN ĐỘ CẢ ĐỘI (ROSTER TRACKER) */}
              {isLeader ? (
                <div className="pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Điểm danh cả đội:
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full tabular-nums border border-emerald-200 dark:border-emerald-800">
                        {roster.attending.length}/{rosterCount} người có mặt
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2 overflow-hidden flex"
                      aria-label="Tiến độ điểm danh cả đội"
                    >
                      <div
                        className="bg-emerald-600 h-full transition-all"
                        style={{
                          width: (roster.attending.length / Math.max(1, rosterCount)) * 100 + "%",
                        }}
                        title={`Có mặt (${roster.attending.length})`}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{
                          width: (roster.absent.length / Math.max(1, rosterCount)) * 100 + "%",
                        }}
                        title={`Vắng (${roster.absent.length})`}
                      />
                      <div
                        className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                        style={{
                          width:
                            ((roster.unvoted.length + (roster.maybe ? roster.maybe.length : 0)) /
                              Math.max(1, rosterCount)) *
                              100 +
                            "%",
                        }}
                        title={`Chưa điểm danh (${roster.unvoted.length + (roster.maybe ? roster.maybe.length : 0)})`}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Có mặt: {roster.attending.length}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        Vắng: {roster.absent.length}
                      </span>
                      <span>
                        Chưa điểm danh: {roster.unvoted.length + (roster.maybe ? roster.maybe.length : 0)}
                      </span>
                    </div>
                  </div>

                  <Pressable
                    onClick={() => setShowAttendanceModal(true)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer outline-none"
                  >
                    <Users2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Xem điểm danh</span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal">({rosterCount} người)</span>
                  </Pressable>
                </div>
              ) : (
                <div id="match-attendance" className="pt-1">
                  <Pressable
                    type="button"
                    onClick={() => setShowAttendanceModal(true)}
                    className="w-full flex items-center justify-between text-xs cursor-pointer bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-2.5 rounded-xl transition-colors outline-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1.5 shrink-0">
                        {teammatesPreview.map((tm) => (
                          <Avatar
                            key={tm.id}
                            className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            src={tm.avatar}
                            name={tm.name}
                          />
                        ))}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                        {roster.attending.length}/{rosterCount} người có mặt
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                      Xem điểm danh <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </Pressable>
                </div>
              )}

              {/* KHU VỰC C: ĐẾN MUỘN VÀ GIỜ ĐẾN (Chỉ một đường phân cách duy nhất trong LateArrivalPanel) */}
              {governance && (
                <LateArrivalPanel
                  governance={governance}
                  matchId={activeMatch.id}
                  userId={user.id}
                />
              )}
            </div>
          </section>
        </SwipeMatchCard>
        {/* =========================================================
            THAO TÁC NHANH TRỰC QUAN TRÊN DASHBOARD
            ========================================================= */}
        <section
          aria-label="Thao tác nhanh"
          className="quick-actions-panel dashboard-quick-actions-card bg-white dark:bg-slate-900/90 rounded-[26px] p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-soft transition-all"
        >
          <div className="flex items-center justify-between mb-3.5 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thao tác nhanh
              </h2>
            </div>
            <button
              id="btn-customize-quick-actions"
              type="button"
              onClick={() => setShowCustomizeShortcuts(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 px-2.5 py-1 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50 transition-colors cursor-pointer outline-none"
              aria-label="Tùy chỉnh thao tác nhanh"
            >
              <Sliders size={14} className="w-3.5 h-3.5" />
              <span>Tùy chỉnh</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-y-3.5 gap-x-2 sm:gap-x-3">
            {displayedActions.map((item) => (
              <Pressable
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-start text-center group cursor-pointer p-1 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-95 transition-all outline-none"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs shrink-0 ${item.iconBg}`}
                >
                  <item.Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <span className="mt-1.5 w-full text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight text-center break-words px-0.5">
                  {item.label}
                </span>
              </Pressable>
            ))}
          </div>

          {validActiveActions.length > 4 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
              <Pressable
                type="button"
                onClick={() => setExpandAllShortcuts((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 py-1 px-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>
                  {expandAllShortcuts
                    ? "Thu gọn"
                    : `Xem tất cả (${validActiveActions.length})`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    expandAllShortcuts ? "rotate-180" : ""
                  }`}
                />
              </Pressable>
            </div>
          )}
        </section>
        {/* CARD 2: TÀI CHÍNH & QUỸ ĐỘI PREVIEW */}
        <section className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-gray-100 transition-all">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-semibold  tracking-wider text-gray-400">
              {isLeader ? "Tổng quan quỹ" : "TÀI CHÍNH & QUỸ ĐỘI"}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {new Date().toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {isLeader ? (
            /* Admin / Owner Summary */
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 block">
                    Số dư quỹ
                  </span>
                  <span className="text-lg font-bold text-emerald-700 tabular-nums mt-0.5 block truncate">
                    {formatCurrency(balance)}
                  </span>
                </div>

                <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-100">
                  <span className="text-xs font-bold text-rose-700 block">
                    Chưa nộp quỹ
                  </span>
                  <span className="text-lg font-bold text-rose-600 tabular-nums mt-0.5 block">
                    {funds.debtors.length}/{members.length} Người
                  </span>
                  <span
                    className="text-xs text-rose-500 font-medium block truncate"
                    title={formatCurrency(
                      funds.debtors.reduce((n, d) => n + d.amount, 0),
                    )}
                  >
                    Tổng nợ:{" "}
                    {formatCurrency(
                      funds.debtors.reduce((n, d) => n + d.amount, 0),
                    )}
                  </span>
                </div>
              </div>

              {/* 2 Nút hành động Admin */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Pressable
                  onClick={() => onNavigate && onNavigate("fund")}
                  className="py-2.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sổ quỹ chi tiết</span>
                </Pressable>

                <Pressable
                  onClick={() => setShowAdminApproveModal(true)}
                  className="py-2.5 px-3 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Duyệt tiền ({pendingApprovals.length})</span>
                </Pressable>
              </div>
            </div>
          ) : (
            /* Member Personal Debt & VietQR Pay */
            <div className="divide-y divide-gray-100">
              <div className="py-2.5 px-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      Trạng thái đóng quỹ
                    </p>
                    <p className="text-xs text-gray-400">
                      Quỹ tháng {new Date().getMonth() + 1}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {user.isFundPaid ? (
                    <span className="text-xs font-bold text-emerald-600 tabular-nums bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Đã đóng đủ
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-rose-500 tabular-nums">
                      -{formatCurrency(user.fundDebt || 0)}
                    </span>
                  )}
                </div>
              </div>

              <Pressable
                onClick={() => {
                  if (user.isFundPaid) {
                    if (demoSession) onResetPaid();
                  } else {
                    setShowQrModal(true);
                  }
                }}
                className="w-full py-2.5 px-1 flex items-center justify-between hover:bg-gray-50/80 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {user.isFundPaid
                        ? "Đã đóng đủ"
                        : user.fundPaymentPending
                          ? "Đang chờ duyệt"
                          : "Thanh toán QR (VietQR)"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user.isFundPaid
                        ? "Thủ quỹ đã xác nhận"
                        : "Quét QR và gửi yêu cầu xác nhận"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-700 transition-colors">
                  <span className="text-xs font-bold text-emerald-600">
                    Quét ngay
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Pressable>
            </div>
          )}
        </section>

        {/* CARD NẰM NGANG [Thành viên đội] - HIỂN THỊ CHO TẤT CẢ THÀNH VIÊN */}
        <div className="dashboard-roster w-full bg-white dark:bg-slate-900/90 rounded-[26px] p-4 shadow-soft border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all group text-left relative overflow-hidden">
          <Pressable
            type="button"
            onClick={() => setShowTeamManagerModal(true)}
            className="flex items-center gap-3.5 relative z-10 min-w-0 flex-1 cursor-pointer text-left outline-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Users2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Thành viên đội
                </h3>
                <span className="text-xs font-semibold whitespace-nowrap shrink-0 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 tabular-nums">
                  {
                    members.filter((m) => m.membershipStatus !== "removed")
                      .length
                  }{" "}
                  người
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                {isLeader
                  ? "Danh sách, phân quyền và sinh nhật"
                  : "Xem danh sách và thông tin đồng đội"}
              </p>
            </div>
          </Pressable>

          <div className="flex items-center gap-1.5 shrink-0 relative z-10 pl-2">
            {isLeader ? (
              <>
                {/* Nút Thêm thành viên thủ công */}
                <Pressable
                  type="button"
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer outline-none"
                  title="Thêm thành viên thủ công"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span className="whitespace-nowrap">Thêm thành viên</span>
                </Pressable>

                {/* Nút Mời QR */}
                <Pressable
                  type="button"
                  onClick={openInvite}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer outline-none"
                  title="Mời qua QR & Mã Club"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Mã / QR</span>
                </Pressable>
              </>
            ) : (
              <Pressable
                type="button"
                onClick={() => setShowTeamManagerModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/80 transition-all cursor-pointer outline-none"
              >
                <span>Xem danh sách</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Pressable>
            )}

            {isLeader && (
              <Pressable
                type="button"
                aria-label="Xem chi tiết danh sách"
                onClick={() => setShowTeamManagerModal(true)}
                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer outline-none"
              >
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Pressable>
            )}
          </div>
        </div>

        {/* CARD MỜI VÀO ĐỘI (MÃ CLUB & QR CODE) */}
        <div className="dashboard-invite-panel w-full bg-white dark:bg-slate-900/90 rounded-[26px] p-4 shadow-soft border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  MÃ CLUB:
                </span>
                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider truncate block max-w-[160px] sm:max-w-[200px]">
                  {inviteCode || "Chưa có mã mời"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                Quét QR hoặc nhập mã để vào đội
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Pressable
              type="button"
              onClick={async () => {
                if (!inviteCode) {
                  openInvite();
                  return;
                }
                try {
                  const valid = await invite.load();
                  await copyToClipboard(valid.code, "clubCode");
                } catch {
                  setShowInviteModal(true);
                }
              }}
              className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 outline-none"
            >
              {copiedField === "clubCode" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Chép</span>
                </>
              )}
            </Pressable>

            <Pressable
              type="button"
              onClick={openInvite}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR</span>
            </Pressable>
          </div>
        </div>

        {/* =========================================================
            THẺ THỐNG KÊ CÁ NHÂN (SELF-REPORTING SAU TRẬN)
            Yêu cầu 5: Sau khi trận đấu kết thúc (status = completed), ở Tab Trang chủ
            hiện thêm một thẻ nhỏ: "Cập nhật thành tích trận [Tên Đối Thủ]"
            với nút +/- bàn thắng, kiến tạo và "Lưu thành tích".
            ========================================================= */}
        {matchStatus === "completed" && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 border border-emerald-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none -z-0" />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-700  tracking-wider block">
                    Trận đấu đã kết thúc
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                    Cập nhật thành tích trận{" "}
                    {matchInfo.title.replace("Kèo Sân 7 — ", "")}
                  </h3>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-100">
                Tự nguyện
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3 relative z-10">
              Tự điền số bàn thắng và kiến tạo của bạn để hệ thống cập nhật vào
              BXH mùa giải:
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-3.5 relative z-10">
              {/* Goals Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                  Bàn thắng
                </span>
                <div className="flex items-center gap-3">
                  <Pressable
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() =>
                      setGoalsReported((prev) => Math.max(0, prev - 1))
                    }
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-bold text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </Pressable>
                  <span className="text-2xl font-bold text-emerald-600 tabular-nums w-6 text-center">
                    {goalsReported}
                  </span>
                  <Pressable
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setGoalsReported((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full bg-emerald-600 shadow-xs text-white flex items-center justify-center font-bold text-base hover:bg-emerald-700 active:scale-95 cursor-pointer"
                  >
                    +
                  </Pressable>
                </div>
              </div>

              {/* Assists Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                  Kiến tạo
                </span>
                <div className="flex items-center gap-3">
                  <Pressable
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() =>
                      setAssistsReported((prev) => Math.max(0, prev - 1))
                    }
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-bold text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </Pressable>
                  <span className="text-2xl font-bold text-amber-600 tabular-nums w-6 text-center">
                    {assistsReported}
                  </span>
                  <Pressable
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setAssistsReported((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full bg-amber-500 shadow-xs text-white flex items-center justify-center font-bold text-base hover:bg-amber-600 active:scale-95 cursor-pointer"
                  >
                    +
                  </Pressable>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Pressable
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveMatchReport}
              className={`w-full py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                statsSaved
                  ? "bg-emerald-700 text-white shadow-emerald-700/20"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
              }`}
            >
              {statsSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>
                    Đã lưu thành công (+{goalsReported} bàn, +{assistsReported}{" "}
                    kiến tạo)!
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Lưu thành tích</span>
                </>
              )}
            </Pressable>
          </motion.section>
        )}

        {Boolean(
          user?.stats &&
            (Number(user.stats.matches) > 0 ||
              Number(user.stats.goals) > 0 ||
              Number(user.stats.assists) > 0),
        ) ? (
          <section className="secondary-summary p-4 rounded-[24px]">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thống kê cá nhân
              </h2>
              <Pressable
                onClick={() => onNavigate && onNavigate("profile")}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Xem chi tiết
              </Pressable>
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Số trận</dt>
                <dd className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {user.stats.matches}
                </dd>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Bàn thắng</dt>
                <dd className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {user.stats.goals}
                </dd>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Kiến tạo</dt>
                <dd className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                  {user.stats.assists}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="secondary-summary p-4 rounded-[24px]">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Thống kê cá nhân
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Chưa có chỉ số thi đấu mùa này. Thành tích sẽ được ghi nhận sau các trận đấu.
            </p>
          </section>
        )}
      </div>

      {/* =========================================================
          3. MODAL 4 TAB ĐIỂM DANH (YÊU CẦU 3: CÓ MẶT - Chưa chắc - VẮNG - CHƯA ĐIỂM DANH)
          ========================================================= */}
      {showAttendanceModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh sách điểm danh"
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Danh sách điểm danh
                  </h3>
                  <p className="text-xs text-gray-400">
                    {activeMatch.title} · {rosterCount} cầu thủ đủ điều kiện
                  </p>
                </div>
              </div>
              <Pressable
                aria-label="Đóng danh sách điểm danh"
                onClick={() => setShowAttendanceModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            {/* 4 Tabs Selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl mt-3 text-xs font-bold text-center">
              <Pressable
                onClick={() => setAttendanceActiveTab("attending")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "attending"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Có mặt ({roster.attending.length})
              </Pressable>

              <Pressable
                onClick={() => setAttendanceActiveTab("absent")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "absent"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Vắng ({roster.absent.length})
              </Pressable>

              <Pressable
                onClick={() => setAttendanceActiveTab("unvoted")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "unvoted"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Chưa điểm danh ({roster.unvoted.length + (roster.maybe ? roster.maybe.length : 0)})
              </Pressable>
            </div>

            {/* List Content */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 max-h-72 pr-1">
              {attendanceActiveTab === "attending" &&
                roster.attending.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setQuickProfileMember(p)}
                    className="p-2.5 rounded-2xl bg-gray-50 hover:bg-emerald-50/40 border border-gray-100 hover:border-emerald-200 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                    title="Chạm để xem hồ sơ"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Vị trí: {p.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Sẵn sàng
                    </span>
                  </div>
                ))}

              {attendanceActiveTab === "absent" &&
                roster.absent.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setQuickProfileMember(p)}
                    className="p-2.5 rounded-2xl bg-rose-50/50 hover:bg-rose-100/60 border border-rose-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                    title="Chạm để xem hồ sơ"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-rose-600 italic">{p.note}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Báo vắng
                    </span>
                  </div>
                ))}

              {/* TAB CHƯA ĐIỂM DANH */}
              {attendanceActiveTab === "unvoted" &&
                (([...roster.unvoted, ...(roster.maybe || [])].length === 0) ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    Tất cả thành viên đã hoàn thành điểm danh.
                  </div>
                ) : (
                  [...roster.unvoted, ...(roster.maybe || [])].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setQuickProfileMember(p)}
                      className="p-2.5 rounded-2xl bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                      title="Chạm để xem hồ sơ"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
                          #{p.number}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Vị trí: {p.role} • {p.phone}
                          </p>
                        </div>
                      </div>

                      {isLeader ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Pressable
                            onClick={() => handleRemindUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Nhắc
                          </Pressable>
                          <Pressable
                            onClick={() => handleFineUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Phạt quỹ
                          </Pressable>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          Chưa điểm danh
                        </span>
                      )}
                    </div>
                  ))
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <Pressable
                onClick={() => setShowAttendanceModal(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </Pressable>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. BOTTOM SHEET TẠO/SỬA TRẬN ĐẤU (ADMIN ONLY)
          (YÊU CẦU 3: TỐI ĐA 4 TRẬN/TUẦN, NATIVE DATETIME PICKER, COUNTDOWN TIMEOUT, PHẠT TIỀN QUỸ)
          ========================================================= */}
      {showCreateMatchModal && isLeader && (
        <MatchFormSheet
          draft={newMatchData}
          onChange={setNewMatchData}
          onSubmit={handleCreateMatchSubmit}
          onClose={() => setShowCreateMatchModal(false)}
          editing={Boolean(editingMatchId)}
          error={matchFormError}
        />
      )}

      {/* =========================================================
          5. MODAL VIETQR THANH TOÁN (CHO THÀNH VIÊN)
          ========================================================= */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">
                    Vietqr quỹ đội
                  </h3>
                  <p className="text-xs text-gray-400">
                    Quét qua MoMo hoặc App Ngân Hàng
                  </p>
                </div>
              </div>
              <Pressable
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-3.5 p-3.5 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
              <QrPreview
                src={bankInfo.qrUrl}
                uploaded={treasurerQr?.qrMode === "uploaded"}
              />
              <p className="text-xs text-gray-500 font-semibold mt-2 text-center">
                QR: {bankInfo.amount} • số áo #{user.number}
              </p>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">
                    Số tài khoản
                  </span>
                  <span className="font-bold tabular-nums text-emerald-600 text-sm">
                    {bankInfo.accountNumber}
                  </span>
                </div>
                <Pressable
                  onClick={() => copyToClipboard(bankInfo.accountNumber, "acc")}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-xs font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === "acc" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedField === "acc" ? "Đã chép" : "Sao chép"}
                </Pressable>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">
                    Nội dung chuyển khoản
                  </span>
                  <p className="text-xs tabular-nums font-bold text-gray-800">
                    {bankInfo.content}
                  </p>
                </div>
                <Pressable
                  onClick={() => copyToClipboard(bankInfo.content, "content")}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-xs font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === "content" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedField === "content" ? "Đã chép" : "Sao chép"}
                </Pressable>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <Pressable
                onClick={async () => {
                  try {
                    await onMarkPaid();
                    setShowQrModal(false);
                  } catch (error) {
                    setMatchFormError(error.message);
                  }
                }}
                className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {user.fundPaymentPending
                    ? "Đang chờ thủ quỹ duyệt"
                    : "Tôi đã chuyển — gửi chờ duyệt"}
                </span>
              </Pressable>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          6. MODAL DUYỆT TIỀN (CHO ADMIN)
          ========================================================= */}
      {showAdminApproveModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900">
                    Duyệt tiền đóng quỹ
                  </h3>
                  <p className="text-xs text-gray-400">
                    Xác nhận nộp quỹ của thành viên
                  </p>
                </div>
              </div>
              <Pressable
                aria-label="Đóng"
                onClick={() => setShowAdminApproveModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  Đã duyệt hết tất cả các khoản đóng quỹ!
                </div>
              ) : (
                pendingApprovals.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-xs text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-emerald-600 font-bold">
                        {formatCurrency(item.amount)} • {item.bank}
                      </p>
                      <span className="text-xs text-gray-400">{item.time}</span>
                    </div>
                    <Pressable
                      onClick={() => approvePayment(item.id)}
                      className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Duyệt
                    </Pressable>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <Pressable
                onClick={() => setShowAdminApproveModal(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </Pressable>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          7. MODAL CÀI ĐẶT ĐỘI BÓNG (CHO ADMIN)
          ========================================================= */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-base text-gray-900">
                  Cài đặt đội bóng
                </h3>
              </div>
              <Pressable
                aria-label="Đóng"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </Pressable>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-bold">
                  Tên Đội Bóng
                </label>
                <input
                  type="text"
                  defaultValue={user.teamName}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-bold">
                  Mức Quỹ Tháng (VNĐ)
                </label>
                <input
                  type="text"
                  defaultValue="150.000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-bold">
                  STK Nhận Quỹ
                </label>
                <input
                  type="text"
                  defaultValue="998877665544 (MB Bank)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-semibold"
                />
              </div>
            </div>

            <div className="mt-4 pt-2">
              <Pressable
                onClick={() => {
                  alert(" Đã cập nhật cài đặt đội bóng!");
                  setShowSettingsModal(false);
                }}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Lưu Thay Đổi
              </Pressable>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ THÀNH VIÊN NHANH (TEAM MANAGER) */}
      <TeamManager
        isOpen={showTeamManagerModal}
        onClose={() => setShowTeamManagerModal(false)}
        members={members}
        currentUserRole={currentUserRole}
        onRemoveMember={onRemoveMember}
        onLinkMember={onLinkMember}
        onOpenInvite={() => {
          setShowTeamManagerModal(false);
          openInvite();
        }}
        onOpenAddMember={() => setShowAddMemberModal(true)}
      />

      {/* MODAL THÊM THÀNH VIÊN THỦ CÔNG */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        members={members}
        onAddMember={onAddMember}
      />

      {/* POPUP CHIA SẺ MÃ QR / LINK THAM GIA ĐỘI */}
      <InviteShare
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamName={teamSettings?.teamName || user?.teamName || "FC No Offside"}
        teamLogo={teamSettings?.logo || ""}
        teamCode={inviteCode}
        inviteStatus={invite.status}
        loading={invite.loading}
        error={invite.error}
        onRetry={() => invite.load()}
        isLeader={["owner", "admin"].includes(currentUserRole)}
        onRegenerateCode={() => invite.load(true)}
        onRevokeCode={invite.revoke}
        onPreviewLanding={() => {
          setShowInviteModal(false);
          if (inviteCode)
            window.open(
              `/invite/${encodeURIComponent(inviteCode)}`,
              "_blank",
              "noopener,noreferrer",
            );
        }}
      />

      {/* MODAL XEM HỒ SƠ NHANH CỦA THÀNH VIÊN */}
      <MemberQuickProfileModal
        isOpen={Boolean(quickProfileMember)}
        member={quickProfileMember}
        onClose={() => setQuickProfileMember(null)}
        currentUserRole={currentUserRole}
        teamName={teamSettings?.teamName || user?.teamName || "No Offside FC"}
      />

      {/* MODAL TÙY CHỈNH THAO TÁC NHANH */}
      {showCustomizeShortcuts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tùy chỉnh thao tác nhanh"
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] p-5 max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Tùy chỉnh thao tác nhanh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thêm, ẩn và sắp xếp các lối tắt trên Dashboard
                </p>
              </div>
              <button
                id="btn-close-customize-modal"
                type="button"
                aria-label="Đóng tùy chỉnh"
                onClick={() => setShowCustomizeShortcuts(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Lối tắt đang hiển thị */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Đang hiển thị ({validActiveActions.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mặc định hiển thị tối đa 4 ô
                  </span>
                </div>

                <div className="space-y-1.5">
                  {validActiveActions.map((action, idx) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                          {idx + 1}
                        </span>
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}
                        >
                          <action.Icon className={`w-4 h-4 ${action.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {action.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {action.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Chuyển lên"
                          aria-label="Chuyển lên"
                        >
                          <ArrowDown className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === validActiveActions.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Chuyển xuống"
                          aria-label="Chuyển xuống"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveShortcut(action.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                          title="Ẩn khỏi Dashboard"
                          aria-label="Ẩn khỏi Dashboard"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiện ích khả dụng để thêm */}
              {allCatalogActions.filter(
                (a) => !selectedActionIds.includes(a.id),
              ).length > 0 && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Tiện ích khác có thể thêm
                  </span>
                  <div className="space-y-1.5">
                    {allCatalogActions
                      .filter((a) => !selectedActionIds.includes(a.id))
                      .map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}
                            >
                              <action.Icon
                                className={`w-4 h-4 ${action.iconColor}`}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {action.label}
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {action.description}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddShortcut(action.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                id="btn-reset-default-shortcuts"
                type="button"
                onClick={handleResetDefaultShortcuts}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Khôi phục mặc định
              </button>
              <button
                id="btn-done-customize-shortcuts"
                type="button"
                onClick={() => setShowCustomizeShortcuts(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
