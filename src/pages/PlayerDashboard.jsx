import LateArrivalPanel from "../components/LateArrivalPanel";
import SwipeMatchCard from "../components/SwipeMatchCard";
import QrPreview from "../components/QrPreview";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "../lib/formatCurrency";
import TeamManager from "./TeamManager";
import InviteShare from "../components/InviteShare";
import { rosterFor, qrUrl, monthKey } from "../lib/teamModel";
import WelcomeAnnouncementModal from "../components/WelcomeAnnouncementModal";
import AddMemberModal from "../components/AddMemberModal";

export default function PlayerDashboard({
  user,
  governance,
  currentUserRole = "player",
  onToggleRole,
  onAttendanceChange,
  onMarkPaid,
  onResetPaid,
  onNavigate,
  onOpenNotifications,
  treasurerQr,
  onUpdateMatchStats,
  members = [],
  onRemoveMember,
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
  onRevokeInvite,
}) {
  // Modal states
  const [matchFormError, setMatchFormError] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAdminApproveModal, setShowAdminApproveModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTeamManagerModal, setShowTeamManagerModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState(
    teamSettings?.inviteCode || teamSettings?.id || "NO-FC99",
  );
  const [inviteStatus, setInviteStatus] = useState("active");
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
    dateText: new Date(activeMatch.datetime).toLocaleString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: teamSettings.appearance.timeFormat === "12h",
    }),
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

  const handleSaveMatchReport = () => {
    if (onUpdateMatchStats) {
      onUpdateMatchStats(goalsReported, assistsReported);
    }
    setStatsSaved(true);
    setTimeout(() => setStatsSaved(false), 3000);
  };

  // Real-time countdown state (Requirement: Real-time countdown like "Còn 02:15:30 để chốt danh sách")
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatCountdown = () => {
    const seconds = Math.max(
      0,
      Math.floor((new Date(activeMatch.deadline).getTime() - now) / 1000),
    );
    const pad = (n) => String(n).padStart(2, "0");
    return (
      (seconds >= 86400 ? Math.floor(seconds / 86400) + " ngày " : "") +
      pad(Math.floor(seconds / 3600) % 24) +
      ":" +
      pad(Math.floor(seconds / 60) % 60) +
      ":" +
      pad(seconds % 60)
    );
  };
  // Mock Attendance Roster with 4 tabs: [Có mặt] - [Chưa chắc] - [Báo vắng] - [Chưa điểm danh (Mới)]
  const roster = rosterFor(members, attendance, user);
  const rosterCount = members.length;

  // Create match form fields
  const [newMatchData, setNewMatchData] = useState({
    opponent: "",
    datetime: "2026-10-24T18:30",
    venue: "Sân bóng Chuyên Việt (Sân 3)",
    timeoutDatetime: "2026-10-24T12:00",
    penaltyEnabled: true,
    penaltyFine: "50000",
  });

  // Mock pending payments for Admin approval
  const pendingApprovals = funds.pendingApprovals;

  const teammatesPreview = [
    {
      name: "Quang Hải",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60",
    },
    {
      name: "Hoàng Đức",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60",
    },
    {
      name: "Văn Lâm",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60",
    },
  ];

  const bankInfo = {
    bankName: treasurerQr?.bankName || "MB Bank (Quân Đội)",
    accountNumber: treasurerQr?.accountNumber || "998877665544",
    accountHolder: treasurerQr?.accountHolder || "NGUYEN HOANG HAI (THỦ QUỸ)",
    amount: formatCurrency(user.fundDebt || 150000),
    content: "NO OFFSIDE SO " + user.number + " DONG QUY " + monthKey(),
    qrUrl: treasurerQr?.qrMode === "uploaded" ? treasurerQr.uploadedQrImage : qrUrl(
      { ...treasurerQr, bankCode: treasurerQr?.bankCode || "970422" },
      user.fundDebt || 150000,
      "NO OFFSIDE SO " + user.number + " DONG QUY " + monthKey(),
    ),
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
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
      onAddNotice(
        editingMatchId ? "Trận đấu đã cập nhật" : "Lịch thi đấu mới",
        newMatchData.opponent + " • " + newMatchData.datetime,
      );
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
            datetime: activeMatch.datetime,
            venue: activeMatch.venue,
            timeoutDatetime: activeMatch.deadline,
            penaltyEnabled: activeMatch.penaltyEnabled,
            penaltyFine: activeMatch.penaltyAmount.replace(/\D/g, ""),
            lateConfig: activeMatch.lateConfig,
          }
        : {
            opponent: "",
            datetime: "",
            timeoutDatetime: "",
            venue: teamSettings.venue || "",
            penaltyEnabled: true,
            penaltyFine: "50000",
          },
    );
    setShowCreateMatchModal(true);
  };

  const handleRemindUnvoted = (playerName) => {
    onAddNotice("Nhắc điểm danh", "Vui lòng điểm danh: " + playerName);
    alert("Đã ghi thông báo trong đội trên thiết bị này.");
  };

  const handleFineUnvoted = (playerName) =>
    alert(
      "Chưa tự ghi khoản phạt. Vào Quỹ đội để thêm giao dịch sau khi kiểm tra: " +
        playerName,
    );

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const isLeader = isOwner || isAdmin;

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-safe pb-32 font-sans antialiased">
      {/* =========================================================
          YÊU CẦU 1: BẢNG TIN CHÀO MỪNG (WELCOME POPUP / ANNOUNCEMENT)
          - Hiển thị ngay sau khi vào Dashboard
          - Tự động đóng sau 5 giây hoặc user bấm Đóng
          - Checkbox lưu sessionStorage 'Không nhắc lại trong phiên đăng nhập này'
          ========================================================= */}
      <WelcomeAnnouncementModal />

      {/* =========================================================
          1. HEADER DARK STYLE VỚI PATTERN MỜ (SLATE-900)
          ========================================================= */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3 min-w-0">
          <button
            aria-label="Xem thông tin cá nhân"
            onClick={() => onNavigate("profile")}
            className="shrink-0"
          >
            <img
              src={user.avatar}
              alt=""
              className="w-12 h-12 rounded-2xl object-cover"
            />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-600 break-words">
              {user.teamName}
            </p>
            <h1 className="text-xl font-semibold mt-1">{user.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {isOwner ? "Chủ đội" : isAdmin ? "Quản trị viên" : "Thành viên"} ·
              Số áo {user.number}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            aria-label="Tạo đội bóng mới"
            title="Tạo đội bóng mới"
            onClick={() => onNavigate("create-team")}
          >
            <PlusCircle size={20} />
          </button>
          {isOwner && (
            <button
              aria-label="Cài đặt đội bóng"
              onClick={() => onNavigate("team-settings")}
            >
              <Settings size={20} />
            </button>
          )}
          <button aria-label="Thông báo đội" onClick={onOpenNotifications}>
            <Bell size={20} />
          </button>
        </div>
        {demoSession && (
          <button className="demo-role-toggle" onClick={onToggleRole}>
            Đổi vai trò trải nghiệm
          </button>
        )}
      </header>
      <div className="px-4 pt-3">
        <button
          className="choice-button text-sm"
          onClick={() => onNavigate("governance")}
        >
          Nội quy & vi phạm
        </button>
      </div>
      <MatchList
        matches={matches}
        activeMatchId={activeMatch.id}
        canDelete={isLeader}
        onSelect={onSelectMatch}
        onDelete={onDeleteMatch}
      />

      {/* =========================================================
          2. CARDS CONTAINER VỚI TIGHT SPACING & MOTION
          ========================================================= */}
      <div className="dashboard-card-flow px-3.5 space-y-3 mt-3">
        {/* YÊU CẦU 2: CARD NẰM NGANG [Thành viên đội] VỚI NÚT [THÊM THÀNH VIÊN] (DÀNH CHO OWNER & ADMIN) */}
        {isLeader && (
          <div className="w-full bg-white rounded-[26px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center justify-between transition-all group text-left relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTeamManagerModal(true)}
              className="flex items-center gap-3.5 relative z-10 min-w-0 flex-1 cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Users2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                    Thành viên đội
                  </h3>
                  <span className="text-xs font-semibold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {members.filter((m) => m.membershipStatus !== "removed").length} người
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                  Danh sách, phân quyền và sinh nhật
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0 relative z-10 pl-2">
              {/* Nút Thêm thành viên thủ công */}
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Thêm thành viên thủ công"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="whitespace-nowrap">Thêm thành viên</span>
              </button>

              {/* Nút Mời QR */}
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Mời qua QR & Mã Club"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Mã / QR</span>
              </button>

              <button
                type="button"
                aria-label="Xem chi tiết danh sách"
                onClick={() => setShowTeamManagerModal(true)}
                className="p-1 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* CARD MỜI VÀO ĐỘI (MÃ CLUB & QR CODE) */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-[26px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÃ CLUB:</span>
                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {inviteCode}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                Quét QR hoặc nhập mã để vào đội
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => copyToClipboard(inviteCode, "clubCode")}
              className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
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
            </button>

            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR</span>
            </button>
          </div>
        </div>

        <section aria-label="Thao tác nhanh" className="quick-actions-panel">
          <p className="text-xs text-slate-600 mb-3">
            Trận đang chọn: {activeMatch.title}
          </p>
          <div className="quick-actions">
            <button
              onClick={() =>
                isLeader
                  ? setShowAttendanceModal(true)
                  : document
                      .getElementById("match-attendance")
                      ?.scrollIntoView({ block: "center", behavior: "smooth" })
              }
            >
              <UserCheck size={20} />
              <span>Điểm danh</span>
            </button>
            <button onClick={() => onNavigate("lineup")}>
              <Network size={20} />
              <span>Chiến thuật</span>
            </button>
            {user.fundDebt > 0 && bankInfo.qrUrl && !user.isFundPaid && (
              <button onClick={() => setShowQrModal(true)}>
                <Wallet size={20} />
                <span>Đóng quỹ</span>
              </button>
            )}
            {isLeader && (
              <button onClick={() => openMatchEditor(false)}>
                <PlusCircle size={20} />
                <span>Tạo trận</span>
              </button>
            )}
          </div>
        </section>
        {/* CARD 1: TRẬN ĐẤU TIẾP THEO & BỘ ĐẾM NGƯỢC REAL-TIME */}
        <SwipeMatchCard
          key={activeMatch.id}
          match={activeMatch}
          canDelete={isLeader}
          onDelete={onDeleteMatch}
        >
          <section className="bg-white rounded-[28px] p-4 sm:p-5 border border-gray-100">
            {/* Top Bar Card 1 */}
            <div className="match-toolbar flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold  tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                  {matchInfo.category}
                </span>
                {matchInfo.penaltyEnabled && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200/70 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Phạt {matchInfo.penaltyAmount}</span>
                  </span>
                )}
              </div>

              {/* Match Status Switcher & Controls */}
              <div className="match-controls flex flex-wrap items-center justify-between gap-3">
                {/* Quick Status Pill */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-full border border-gray-200 text-xs font-bold">
                  <button
                    type="button"
                    disabled={!isLeader}
                    aria-pressed={matchStatus === "upcoming"}
                    onClick={() => setMatchStatus("upcoming")}
                    className={`px-2 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                      matchStatus === "upcoming"
                        ? "bg-white text-emerald-700 shadow-xs font-bold"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    title="Chuyển trạng thái: Trận sắp đá"
                  >
                    Sắp đá
                  </button>
                  <button
                    type="button"
                    disabled={!isLeader}
                    aria-pressed={matchStatus === "completed"}
                    onClick={() => setMatchStatus("completed")}
                    className={`px-2 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                      matchStatus === "completed"
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    title="Chuyển trạng thái: Trận đã xong (Mở tự báo cáo bàn thắng/kiến tạo)"
                  >
                    Đã xong
                  </button>
                </div>

                {isLeader ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openMatchEditor(true)}
                      className="p-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition-all duration-200 cursor-pointer"
                      aria-label="Sửa trận"
                      title="Sửa trận"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  matchStatus === "upcoming" && (
                    <div className="hidden sm:flex items-center gap-1 bg-rose-50 border border-rose-200/80 text-rose-700 px-2 py-0.5 rounded-full tabular-nums font-bold text-xs">
                      <Clock className="w-3 h-3 text-rose-600 animate-pulse" />
                      <span>{formatCountdown()}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Tiêu đề trận đấu */}
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {matchInfo.title}
            </h2>

            {/* Chi tiết thời gian & địa điểm */}
            <div className="mt-2 space-y-1.5 text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-gray-800">
                  {matchInfo.dateText}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-gray-600">{matchInfo.venue}</span>
              </div>
            </div>

            {/* Dòng Real-time Countdown Banner to rõ cho cả Admin & Thành viên */}
            <div className="match-deadline mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs font-bold text-amber-900 ">
                    Hạn chốt điểm danh
                  </p>
                  <p className="text-xs font-bold text-amber-700 tabular-nums tracking-tight">
                    Còn {formatCountdown()} để chốt danh sách
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                {matchInfo.penaltyEnabled ? "Có phạt quỹ" : "Tự do"}
              </span>
            </div>

            {/* Body Card 1 theo vai trò */}
            {isLeader ? (
              /* ADMIN VIEW: Tiến độ & nút mở danh sách 4 Tab */
              <div className="mt-3.5 pt-3 border-t border-gray-100">
                <div className="bg-gray-50/90 p-3 rounded-2xl border border-gray-100 mb-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Users2 className="w-4 h-4 text-emerald-600" />
                      Điểm danh cả đội:
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full tabular-nums">
                      {roster.attending.length}/{rosterCount} người
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden flex shadow-inner">
                    <div
                      className="bg-emerald-600 h-full transition-all"
                      style={{
                        width:
                          (roster.attending.length / Math.max(1, rosterCount)) *
                            100 +
                          "%",
                      }}
                      title="Có mặt (14)"
                    ></div>
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width:
                          (roster.maybe.length / Math.max(1, rosterCount)) *
                            100 +
                          "%",
                      }}
                      title="Chưa chắc (2)"
                    ></div>
                    <div
                      className="bg-rose-400 h-full transition-all"
                      style={{
                        width:
                          (roster.absent.length / Math.max(1, rosterCount)) *
                            100 +
                          "%",
                      }}
                      title="Vắng (2)"
                    ></div>
                    <div
                      className="bg-gray-400 h-full transition-all"
                      style={{
                        width:
                          (roster.unvoted.length / Math.max(1, rosterCount)) *
                            100 +
                          "%",
                      }}
                      title="Chưa điểm danh"
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span className="text-emerald-700">
                      {" "}
                      Có mặt: {roster.attending.length}
                    </span>
                    <span className="text-amber-600">
                      {" "}
                      Chưa chắc: {roster.maybe.length}
                    </span>
                    <span className="text-rose-600">
                      {" "}
                      Vắng: {roster.absent.length}
                    </span>
                    <span className="text-gray-500">
                      {" "}
                      Chưa: {roster.unvoted.length}
                    </span>
                  </div>
                </div>

                {/* Nút mở Modal 4 Tab Điểm Danh */}
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="w-full py-2.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <Users2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Xem danh sách 4 nhóm điểm danh ({rosterCount} người)
                  </span>
                </button>
              </div>
            ) : (
              /* PLAYER VIEW: 3 Nút Vote & Thông tin chốt */
              <div
                id="match-attendance"
                className="mt-3.5 pt-3 border-t border-gray-100"
              >
                <div className="grid grid-cols-3 gap-2">
                  <button
                    aria-pressed={attendance[user.id] === "attending"}
                    onClick={() => onAttendanceChange("attending")}
                    className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                      attendance[user.id] === "attending"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                    }`}
                  >
                    <span> Có mặt</span>
                    {attendance[user.id] === "attending" && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </button>

                  <button
                    aria-pressed={attendance[user.id] === "maybe"}
                    onClick={() => onAttendanceChange("maybe")}
                    className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                      attendance[user.id] === "maybe"
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-500/20"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200/80 border border-gray-200"
                    }`}
                  >
                    <span> Chưa chắc</span>
                  </button>

                  <button
                    aria-pressed={attendance[user.id] === "absent"}
                    onClick={() => onAttendanceChange("absent")}
                    className={`rounded-full py-2.5 px-2 flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                      attendance[user.id] === "absent"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-500/20"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200/80 border border-gray-200"
                    }`}
                  >
                    <span> Báo vắng</span>
                  </button>
                </div>

                {/* Roster trigger button */}
                <div
                  onClick={() => setShowAttendanceModal(true)}
                  className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50/80 p-1.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {teammatesPreview.map((tm, idx) => (
                        <img
                          key={idx}
                          className="w-6 h-6 rounded-full ring-2 ring-white object-cover"
                          src={tm.avatar}
                          alt={tm.name}
                        />
                      ))}
                    </div>
                    <span className="text-gray-600 font-medium">
                      {roster.attending.length} người đã chốt có mặt
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                    Xem 4 tab <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            )}
            {governance && (
              <LateArrivalPanel
                governance={governance}
                matchId={activeMatch.id}
                userId={user.id}
              />
            )}
          </section>
        </SwipeMatchCard>

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
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() =>
                      setGoalsReported((prev) => Math.max(0, prev - 1))
                    }
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-bold text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </motion.button>
                  <span className="text-2xl font-bold text-emerald-600 tabular-nums w-6 text-center">
                    {goalsReported}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setGoalsReported((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full bg-emerald-600 shadow-xs text-white flex items-center justify-center font-bold text-base hover:bg-emerald-700 active:scale-95 cursor-pointer"
                  >
                    +
                  </motion.button>
                </div>
              </div>

              {/* Assists Counter */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                  Kiến tạo
                </span>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() =>
                      setAssistsReported((prev) => Math.max(0, prev - 1))
                    }
                    className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center font-bold text-base text-gray-700 hover:bg-gray-100 active:scale-95 cursor-pointer"
                  >
                    -
                  </motion.button>
                  <span className="text-2xl font-bold text-amber-600 tabular-nums w-6 text-center">
                    {assistsReported}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setAssistsReported((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full bg-amber-500 shadow-xs text-white flex items-center justify-center font-bold text-base hover:bg-amber-600 active:scale-95 cursor-pointer"
                  >
                    +
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
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
            </motion.button>
          </motion.section>
        )}

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
                <button
                  onClick={() => onNavigate && onNavigate("fund")}
                  className="py-2.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sổ Quỹ Chi Tiết</span>
                </button>

                <button
                  onClick={() => setShowAdminApproveModal(true)}
                  className="py-2.5 px-3 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Duyệt tiền ({pendingApprovals.length})</span>
                </button>
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

              <button
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
              </button>
            </div>
          )}
        </section>

        <details className="secondary-summary">
          <summary>
            <span>Thống kê cá nhân</span>
            <span className="text-xs text-slate-500">Xem thêm</span>
          </summary>
          <dl className="grid grid-cols-3 gap-3 pt-4">
            <div>
              <dt>Số trận</dt>
              <dd>{user.stats.matches}</dd>
            </div>
            <div>
              <dt>Bàn thắng</dt>
              <dd>{user.stats.goals}</dd>
            </div>
            <div>
              <dt>Kiến tạo</dt>
              <dd>{user.stats.assists}</dd>
            </div>
          </dl>
        </details>
      </div>

      {/* =========================================================
          3. MODAL 4 TAB ĐIỂM DANH (YÊU CẦU 3: CÓ MẶT - Chưa chắc - VẮNG - CHƯA ĐIỂM DANH)
          ========================================================= */}
      {showAttendanceModal && (
        <div
          role="dialog"
          aria-modal="true"
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
                    Trận thứ 6 • 20 thành viên toàn đội
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Tabs Selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl mt-3 text-xs font-bold text-center">
              <button
                onClick={() => setAttendanceActiveTab("attending")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "attending"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Có mặt ({roster.attending.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab("maybe")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "maybe"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Chưa chắc ({roster.maybe.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab("absent")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "absent"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Vắng ({roster.absent.length})
              </button>

              <button
                onClick={() => setAttendanceActiveTab("unvoted")}
                className={`py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                  attendanceActiveTab === "unvoted"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Chưa điểm danh ({roster.unvoted.length})
              </button>
            </div>

            {/* List Content */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 max-h-72 pr-1">
              {attendanceActiveTab === "attending" &&
                roster.attending.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between"
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

              {attendanceActiveTab === "maybe" &&
                roster.maybe.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                        #{p.number}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-amber-700 italic">
                          {p.note}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      50 / 50
                    </span>
                  </div>
                ))}

              {attendanceActiveTab === "absent" &&
                roster.absent.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between"
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

              {/* TAB CHƯA ĐIỂM DANH (MỚI) */}
              {attendanceActiveTab === "unvoted" &&
                (roster.unvoted.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    Tất cả thành viên đã hoàn thành điểm danh.
                  </div>
                ) : (
                  roster.unvoted.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between"
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
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRemindUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Nhắc
                          </button>
                          <button
                            onClick={() => handleFineUnvoted(p.name)}
                            className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Phạt quỹ
                          </button>
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
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
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
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3.5 p-3.5 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
              <QrPreview src={bankInfo.qrUrl} uploaded={treasurerQr?.qrMode === "uploaded"}/>
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
                <button
                  onClick={() => copyToClipboard(bankInfo.accountNumber, "acc")}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-xs font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === "acc" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedField === "acc" ? "Đã chép" : "Sao chép"}
                </button>
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
                <button
                  onClick={() => copyToClipboard(bankInfo.content, "content")}
                  className="px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-xs hover:bg-gray-50 flex items-center gap-1 text-xs font-bold text-gray-700 active:scale-95 transition-all"
                >
                  {copiedField === "content" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedField === "content" ? "Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => {
                  onMarkPaid();
                  onAddNotice(
                    "Đóng quỹ chờ duyệt",
                    "Bạn đã báo chuyển khoản. Thủ quỹ cần kiểm tra trước khi xác nhận.",
                  );
                  setShowQrModal(false);
                }}
                className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {user.fundPaymentPending
                    ? "Đang chờ thủ quỹ duyệt"
                    : "Tôi đã chuyển — gửi chờ duyệt"}
                </span>
              </button>
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
              <button
                aria-label="Đóng"
                onClick={() => setShowAdminApproveModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
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
                    <button
                      onClick={() => approvePayment(item.id)}
                      className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Duyệt
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowAdminApproveModal(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 text-gray-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Đóng
              </button>
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
              <button
                aria-label="Đóng"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
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
              <button
                onClick={() => {
                  alert(" Đã cập nhật cài đặt đội bóng!");
                  setShowSettingsModal(false);
                }}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Lưu Thay Đổi
              </button>
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
        onOpenInvite={() => {
          setShowTeamManagerModal(false);
          setShowInviteModal(true);
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
        inviteStatus={inviteStatus}
        isLeader={["owner", "admin"].includes(currentUserRole)}
        onRegenerateCode={async () => {
          if (onCreateInvite) {
            const res = await onCreateInvite(teamSettings?.id);
            if (res?.code) setInviteCode(res.code);
            setInviteStatus("active");
          }
        }}
        onRevokeCode={async () => {
          if (onRevokeInvite) {
            await onRevokeInvite(teamSettings?.id);
            setInviteStatus("revoked");
          }
        }}
        onPreviewLanding={() => {
          setShowInviteModal(false);
          if (onNavigate) onNavigate("invite-landing");
        }}
      />
    </div>
  );
}
