import { notify } from '../lib/feedback';
import React, { useState, useMemo } from "react";
import Pressable from "./Pressable";
import ProModal from "./pro/ProModal";
import QrPreview from "./QrPreview";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Search,
  X,
  Plus,
  Bell,
  Wallet,
  ArrowRight,
  Users,
} from "./icons";
import { formatCurrency } from "../lib/formatCurrency";
import {
  getMonthFundSummary,
  getMembersMonthStatus,
  getMemberMonthHistory,
  remainingCharge,
} from "../lib/fundCollections";
import { qrUrl } from "../lib/teamModel";
import { localTransactionTime } from "../lib/transactionTime";

export default function MonthlyFundCollection({
  fund,
  funds,
  teamMembers = [],
  timeZone = "Asia/Ho_Chi_Minh",
  canManage = false,
  accountId,
  treasurerQr = {},
  onCreateMonthCollection,
  onApprovePayment,
  onRejectPayment,
  onRecordPayment,
  onRemindMember,
}) {
  const now = localTransactionTime(Date.now(), timeZone);
  const currentMonth = now.slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [memberFilter, setMemberFilter] = useState("all"); // 'all' | 'unpaid' | 'pending' | 'paid'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [recordingCharge, setRecordingCharge] = useState(null);
  const [recordAmount, setRecordAmount] = useState(0);
  const [recordNote, setRecordNote] = useState("");
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createAmount, setCreateAmount] = useState(100000);
  const [createDueDate, setCreateDueDate] = useState("");
  const [createRepeat, setCreateRepeat] = useState("once");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleOpenCreateCollection = (monthStr) => {
    const targetMonth = monthStr || selectedMonth;
    const [y, m] = targetMonth.split("-");
    const monthNum = parseInt(m, 10);
    const lastDay = new Date(Date.UTC(Number(y), monthNum, 0)).getUTCDate();
    const defaultDueDate = `${targetMonth}-${String(Math.min(15, lastDay)).padStart(2, "0")}`;
    setCreateTitle(`Quỹ tháng ${monthNum}/${y}`);
    setCreateAmount(100000);
    setCreateDueDate(defaultDueDate < now.slice(0,10) ? now.slice(0,10) : defaultDueDate);
    setCreateRepeat("once");
    setCreateError("");
    setIsCreatingCollection(true);
  };

  const handleConfirmCreateCollection = async (e) => {
    e.preventDefault();
    if (createBusy) return;
    const amountNum = Number(createAmount);
    if (!Number.isSafeInteger(amountNum) || amountNum <= 0 || amountNum > 1000000000) {
      setCreateError("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      if (fund?.mutate) {
        const sendAt = new Date().toISOString();
        const [y, m] = selectedMonth.split("-");
        const day = Number(createDueDate?.slice(8, 10)) || 15;
        await fund.mutate("schedule_save", {
          title: createTitle.trim() || `Quỹ tháng ${parseInt(m, 10)}/${y}`,
          amount: amountNum,
          recipients: "all",
          repeat: createRepeat,
          day,
          sendAt,
          dueDate: createDueDate,
          note: `Đợt thu tạo cho ${selectedMonth}`,
        });
        notify(`Đã tạo đợt thu ${createTitle.trim() || `Quỹ tháng ${parseInt(m, 10)}/${y}`}!`);
        setIsCreatingCollection(false);
      } else if (onCreateMonthCollection) {
        onCreateMonthCollection(selectedMonth);
        setIsCreatingCollection(false);
      }
    } catch (err) {
      setCreateError(err.message || "Không thể tạo đợt thu.");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleOpenPayment = (charge, defaultAmount = 0, member = null) => {
    setRecordingCharge({ ...charge, memberName: member?.name });
    setRecordAmount(defaultAmount || remainingCharge(charge));
    setRecordNote("");
    setRecordError("");
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!recordingCharge || recordBusy) return;
    const amountNum = Number(recordAmount);
    if (!Number.isSafeInteger(amountNum) || amountNum <= 0 || amountNum > remainingCharge(recordingCharge)) {
      setRecordError("Nhập số nguyên VND lớn hơn 0 và không vượt phần còn thiếu của khoản này.");
      return;
    }
    setRecordBusy(true);
    setRecordError("");
    try {
      if (canManage) {
        if (fund?.mutate) {
          await fund.mutate("payment", {
            chargeId: recordingCharge.id,
            amount: amountNum,
          });
        } else {
          if (!onRecordPayment) throw Error('Chưa có kết nối để ghi nhận khoản thu.');
          await onRecordPayment(recordingCharge, amountNum);
        }
      } else {
        if (fund?.mutate) {
          await fund.mutate("payment_request", {
            chargeId: recordingCharge.id,
            amount: amountNum,
            note: recordNote,
          });
        } else throw Error('Chưa có kết nối để gửi yêu cầu chuyển khoản.');
      }
      notify(canManage ? "Đã ghi nhận tiền thực nhận." : "Đã gửi yêu cầu, đang chờ Thủ quỹ duyệt.");
      setRecordingCharge(null);
    } catch (err) {
      setRecordError(err.message || "Không thể thực hiện thao tác.");
    } finally {
      setRecordBusy(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const nextY = prev.getUTCFullYear();
    const nextM = String(prev.getUTCMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(Date.UTC(y, m, 1));
    const nextY = next.getUTCFullYear();
    const nextM = String(next.getUTCMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonth);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    return `Tháng ${parseInt(m, 10)}/${y}`;
  }, [selectedMonth]);

  // Compute month summary
  const summary = useMemo(() => {
    return getMonthFundSummary(
      selectedMonth,
      fund?.data?.collections || [],
      fund?.data?.charges || [],
      fund?.data?.pendingRequests || funds?.pendingApprovals || [],
      funds?.transactions || []
    );
  }, [selectedMonth, fund?.data?.collections, fund?.data?.charges, fund?.data?.pendingRequests, funds?.pendingApprovals, funds?.transactions]);

  const allMemberRows=useMemo(()=>getMembersMonthStatus(selectedMonth,teamMembers,summary,fund?.data?.charges || [],fund?.data?.pendingRequests || funds?.pendingApprovals || []).filter(m=>canManage || m.id===accountId),[selectedMonth,teamMembers,summary,fund?.data?.charges,fund?.data?.pendingRequests,funds?.pendingApprovals,canManage,accountId]);
  const membersList = useMemo(() => {
    return allMemberRows.filter((m) => {
      // Filter by status
      if (memberFilter === "unpaid") {
        if (!summary.hasCollection) return false; // Khi chưa có đợt thu, tất cả coi như chưa đóng/chưa nghĩa vụ
        if (m.status !== "unpaid" && m.status !== "partial") return false;
      } else if (memberFilter === "pending") {
        if (m.status !== "pending") return false;
      } else if (memberFilter === "paid") {
        if (m.status !== "paid") return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchNumber = String(m.number || "").includes(q);
        const matchPhone = String(m.phone || "").includes(q);
        return matchName || matchNumber || matchPhone;
      }

      return true;
    });
  }, [allMemberRows,summary,memberFilter,searchQuery]);

  // Member history for detail modal
  const selectedMember = allMemberRows.find(m=>m.id===selectedMemberId) || null;

  const memberHistory = useMemo(() => {
    if (!selectedMember) return [];
    return getMemberMonthHistory(
      selectedMember.id,
      fund?.data?.collections || [],
      fund?.data?.charges || [],
      funds?.transactions || [],
      fund?.data?.pendingRequests || funds?.pendingApprovals || []
    );
  }, [selectedMember, fund?.data?.collections, fund?.data?.charges, funds?.transactions, fund?.data?.pendingRequests, funds?.pendingApprovals]);

  // Calculate member's total outstanding debt
  const memberTotalDebt = useMemo(() => {
    if (!selectedMember) return 0;
    return (fund?.data?.charges || [])
      .filter((ch) => ch.subject === selectedMember.id && ch.kind === "fund" && ch.status !== "void")
      .reduce((sum, ch) => sum + remainingCharge(ch), 0);
  }, [selectedMember, fund?.data?.charges]);

  return (
    <div className="monthly-fund-view">
      {/* 1. Header chọn Tháng trực quan */}
      <div className="monthly-picker-toolbar">
        <div className="monthly-selector-box">
          <Pressable
            type="button"
            className="monthly-nav-btn"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
          >
            <ChevronLeft size={20} />
          </Pressable>

          <div className="monthly-title-wrap">
            <span className="monthly-current-label">{monthLabel}</span>
            {selectedMonth !== currentMonth && (
              <Pressable
                type="button"
                className="monthly-jump-now"
                onClick={handleResetToCurrentMonth}
              >
                Về tháng này
              </Pressable>
            )}
          </div>

          <Pressable
            type="button"
            className="monthly-nav-btn"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
          >
            <ChevronRight size={20} />
          </Pressable>
        </div>

        {/* Nút tạo đợt thu cho tháng này nếu chưa có */}
        {canManage && (
          <Pressable
            type="button"
            className="monthly-create-btn"
            onClick={() => handleOpenCreateCollection(selectedMonth)}
          >
            <Plus size={16} />
            <span>Tạo đợt thu</span>
          </Pressable>
        )}
      </div>

      {/* 2. Cảnh báo thực tế khi chưa tạo nghĩa vụ thu (Ví dụ FC 21) */}
      {!summary.hasCollection && (
        <div className="monthly-no-collection-banner" role="alert">
          <div className="flex items-start gap-3">
            <div className="monthly-banner-icon">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Chưa tạo nghĩa vụ thu cho {monthLabel}
              </h3>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 leading-relaxed">
                Tháng này chưa phát sinh đợt thu quỹ. "Chưa tạo nghĩa vụ" khác với "mọi người đã đóng đủ".
              </p>
              {summary.unlinkedTransactions.length > 0 && (
                <div className="monthly-unlinked-notice mt-2">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Đã có {summary.unlinkedTransactions.length} giao dịch ghi nhận trong sổ cho tháng này ({formatCurrency(summary.unlinkedIncomeTotal)}).
                    Hãy tạo đợt thu để đối soát và phân bổ theo từng thành viên.
                  </p>
                </div>
              )}
              {canManage && (
                <Pressable
                  type="button"
                  className="monthly-banner-action mt-2.5"
                  onClick={() => handleOpenCreateCollection(selectedMonth)}
                >
                  <Plus size={15} />
                  Tạo đợt thu {monthLabel} ngay
                </Pressable>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Card Tổng quan tháng: Phải thu · Đã nhận · Chờ duyệt · Còn thiếu */}
      <section className="monthly-summary-card" aria-label={`Tổng quan ${monthLabel}`}>
        <div className="monthly-summary-header">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {canManage ? "Tổng quan quỹ" : "Các khoản đóng của bạn"} {monthLabel}
            </h2>
          </div>
          {summary.hasCollection && summary.totalCount > 0 && (
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
              {summary.paidCount}/{summary.totalCount} người đã đóng ({Math.round((summary.paidCount / summary.totalCount) * 100)}%)
            </span>
          )}
        </div>

        <div className="monthly-stats-grid">
          {/* 1. Phải thu */}
          <div className="monthly-stat-box">
            <span className="monthly-stat-title">Phải thu kỳ này</span>
            <strong className="monthly-stat-value tabular-nums">
              {summary.hasCollection ? formatCurrency(summary.totalRequired) : "Chưa tạo đợt"}
            </strong>
          </div>

          {/* 2. Đã nhận */}
          <div className="monthly-stat-box is-income">
            <span className="monthly-stat-title">Đã nhận</span>
            <strong className="monthly-stat-value tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalPaid)}
            </strong>
          </div>

          {/* 3. Chờ duyệt */}
          <div className="monthly-stat-box is-pending">
            <span className="monthly-stat-title">Chờ duyệt</span>
            <strong className="monthly-stat-value tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(summary.totalPending)}
            </strong>
          </div>

          {/* 4. Còn thiếu */}
          <div className="monthly-stat-box is-remaining">
            <span className="monthly-stat-title">Còn thiếu kỳ này</span>
            <strong className={`monthly-stat-value tabular-nums ${summary.totalRemaining > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
              {summary.hasCollection ? formatCurrency(summary.totalRemaining) : "0 đ"}
            </strong>
          </div>
        </div>

        {/* Progress bar */}
        {summary.hasCollection && summary.totalRequired > 0 && (
          <div className="monthly-progress-track mt-3.5">
            <div
              className="monthly-progress-fill"
              style={{
                width: `${Math.min(100, Math.round((summary.totalPaid / summary.totalRequired) * 100))}%`,
              }}
            />
          </div>
        )}
      </section>

      {/* 4. Bộ lọc & Danh sách thành viên */}
      <div className="monthly-members-section mt-4">
        <div className="monthly-members-toolbar">
          <div className="monthly-filter-chips" role="group" aria-label="Lọc thành viên">
            <button
              type="button"
              className={`monthly-chip ${memberFilter === "all" ? "is-active" : ""}`}
              onClick={() => setMemberFilter("all")}
            >
              Tất cả ({allMemberRows.length})
            </button>
            <button
              type="button"
              className={`monthly-chip ${memberFilter === "unpaid" ? "is-active" : ""}`}
              onClick={() => setMemberFilter("unpaid")}
            >
              Còn thiếu ({summary.hasCollection ? summary.unpaidCount + summary.partialCount : 0})
            </button>
            {summary.pendingRequests.length > 0 && (
              <button
                type="button"
                className={`monthly-chip is-warning ${memberFilter === "pending" ? "is-active" : ""}`}
                onClick={() => setMemberFilter("pending")}
              >
                Chờ duyệt ({summary.pendingRequests.length})
              </button>
            )}
            <button
              type="button"
              className={`monthly-chip ${memberFilter === "paid" ? "is-active" : ""}`}
              onClick={() => setMemberFilter("paid")}
            >
              Đã đủ ({summary.paidCount})
            </button>
          </div>
        </div>

        {/* Tìm kiếm thành viên nhanh */}
        <div className="monthly-search-wrap">
          <Search size={16} className="monthly-search-icon" />
          <input
            type="search"
            placeholder="Tìm thành viên theo tên hoặc số áo…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="monthly-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="monthly-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Danh sách thành viên */}
        <div className="monthly-members-list mt-2.5">
          {!membersList.length ? (
            <div className="panel-empty py-8 text-center text-slate-500">
              Không có thành viên nào phù hợp bộ lọc.
            </div>
          ) : (
            membersList.map((m) => {
              const isPaid = m.status === "paid";
              const isPartial = m.status === "partial";
              const isPending = m.status === "pending";
              const isUnpaid = m.status === "unpaid";
              const isNoObligation = m.status === "no_obligation";

              return (
                <article
                  key={m.id}
                  className="monthly-member-row"
                  onClick={() => setSelectedMemberId(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedMemberId(m.id);
                    }
                  }}
                >
                  {/* Avatar / Số áo */}
                  <div className="monthly-member-avatar" aria-hidden="true">
                    {m.number ? m.number : m.name ? m.name.charAt(0).toUpperCase() : "•"}
                  </div>

                  {/* Thông tin thành viên */}
                  <div className="monthly-member-info min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="monthly-member-name truncate">{m.name}</strong>
                      {m.role === "owner" && (
                        <span className="monthly-role-tag owner">Chủ đội</span>
                      )}
                      {m.role === "admin" && (
                        <span className="monthly-role-tag admin">Quản trị viên</span>
                      )}
                    </div>

                    <div className="monthly-dues-meta mt-1">
                      {isNoObligation ? (
                        <span className="text-xs text-slate-400">Chưa tạo nghĩa vụ tháng này</span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Phải đóng: <strong>{formatCurrency(m.amount)}</strong>
                          {m.paidAmount > 0 && ` · Đã đóng: ${formatCurrency(m.paidAmount)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Trạng thái & Còn thiếu */}
                  <div className="monthly-member-status-col text-right shrink-0">
                    {/* Badge trạng thái */}
                    <div className="mb-1 flex justify-end">
                      {isPaid && (
                        <span className="monthly-status-badge is-paid">
                          <Check size={13} />
                          Đã đủ
                        </span>
                      )}
                      {isPartial && (
                        <span className="monthly-status-badge is-partial">
                          Đóng 1 phần
                        </span>
                      )}
                      {isPending && (
                        <span className="monthly-status-badge is-pending">
                          <Clock size={13} />
                          Chờ duyệt
                        </span>
                      )}
                      {isUnpaid && (
                        <span className="monthly-status-badge is-unpaid">
                          Chưa đóng
                        </span>
                      )}
                      {isNoObligation && (
                        <span className="monthly-status-badge is-neutral">
                          Chưa tạo
                        </span>
                      )}
                    </div>

                    {/* Số tiền còn thiếu */}
                    {!isNoObligation && m.remaining > 0 && (
                      <span className="monthly-member-debt tabular-nums text-rose-600 dark:text-rose-400 font-bold text-sm block">
                        Thiếu {formatCurrency(m.remaining)}
                      </span>
                    )}

                    {/* Nút hành động nhanh */}
                    <div className="monthly-quick-actions flex items-center justify-end gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                      {isPending && canManage && (
                        <Pressable
                          className="monthly-btn-quick-approve"
                          onClick={() => onApprovePayment?.(m.pending?.id)}
                          title="Duyệt khoản đóng"
                        >
                          Duyệt
                        </Pressable>
                      )}
                      {(isUnpaid || isPartial) && canManage && m.charge && (
                        <Pressable
                          className="monthly-btn-quick-record"
                          onClick={() => handleOpenPayment(m.charge, remainingCharge(m.charge), m)}
                          title="Ghi nhận thu tiền"
                        >
                          Thu tiền
                        </Pressable>
                      )}
                      <ChevronRight size={16} className="text-slate-400 ml-1" />
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* 5. MODAL CHI TIẾT & LỊCH SỬ ĐÓNG QUÝ THÀNH VIÊN */}
      {selectedMember && (
        <ProModal
          open={!!selectedMember}
          title={`Hồ sơ quỹ · ${selectedMember.name}`}
          onClose={() => setSelectedMemberId(null)}
        >
          <div className="monthly-member-detail-sheet">
            {/* Header profile tóm tắt */}
            <div className="monthly-detail-header-card">
              <div className="flex items-center gap-3">
                <div className="monthly-detail-avatar">
                  {selectedMember.number ? selectedMember.number : selectedMember.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Số áo: {selectedMember.number || "—"} · SĐT: {selectedMember.phone || "—"}
                  </p>
                </div>
              </div>

              {/* Tóm tắt nợ */}
              <div className="monthly-detail-debt-box mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block">Kỳ {monthLabel}:</span>
                  <strong className="text-sm font-bold tabular-nums">
                    {selectedMember.remaining > 0
                      ? `Còn thiếu ${formatCurrency(selectedMember.remaining)}`
                      : selectedMember.hasObligation
                        ? "Đã đóng đủ"
                        : "Chưa có nghĩa vụ"}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Tổng nợ tất cả các kỳ:</span>
                  <strong className={`text-sm font-bold tabular-nums ${memberTotalDebt > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(memberTotalDebt)}
                  </strong>
                </div>
              </div>
            </div>

            {/* LỊCH SỬ CÁC THÁNG VÀ KHOẢN NỘP BÙ */}
            <div className="monthly-detail-history-section mt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Lịch sử đóng quỹ qua các kỳ
              </h4>

              {!memberHistory.length ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Chưa có lịch sử nghĩa vụ quỹ được ghi nhận.
                </p>
              ) : (
                <div className="monthly-history-list space-y-2">
                  {memberHistory.map((h) => {
                    const isPeriodPaid = h.status === "paid";
                    return (
                      <div key={h.chargeId} className="monthly-history-item">
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {h.collectionTitle}
                            </strong>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Định mức: {formatCurrency(h.amount)}
                              {h.paidAmount > 0 && ` · Đã đóng: ${formatCurrency(h.paidAmount)}`}
                            </p>
                            {/* Báo khoản nộp bù giải quyết rõ ràng vấn đề gây nhầm */}
                            {h.isBackpay && (
                              <div className="monthly-backpay-tag mt-1">
                                <span>Nộp bù kỳ này vào {h.paymentDate?.slice(0, 10).split("-").reverse().join("/")}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span className={`monthly-status-badge ${isPeriodPaid ? "is-paid" : h.status === "pending" ? "is-pending" : "is-unpaid"}`}>
                              {h.status==="cancelled" ? "Đã hủy nghĩa vụ" : isPeriodPaid ? "Đã nộp đủ" : h.status === "pending" ? "Chờ duyệt" : `Còn thiếu ${formatCurrency(h.remaining)}`}
                            </span>
                            {h.paymentDate && !h.isBackpay && (
                              <span className="text-[11px] text-slate-400 block mt-1">
                                Ngày đóng: {h.paymentDate.slice(0, 10).split("-").reverse().join("/")}
                              </span>
                            )}
                          </div>
                        </div>
                        {h.remaining>0 && h.status!=='pending' && (canManage || selectedMember.id===accountId) && <Pressable className="choice-button w-full mt-2" onClick={()=>{const charge=(fund?.data?.charges || []).find(c=>c.id===h.chargeId);if(charge){handleOpenPayment(charge,h.remaining,selectedMember);}}}>{canManage?'Thu khoản này':'Báo chuyển khoản này'}</Pressable>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons cho thủ quỹ hoặc chính thành viên */}
            <div className="monthly-detail-actions mt-5 flex gap-2">
              {canManage && selectedMember.charge && selectedMember.remaining > 0 && (
                <Pressable
                  className="primary-button flex-1"
                  onClick={() => {
                    const ch = selectedMember.charge;
                    const rem = remainingCharge(ch);
                    const mem = selectedMember;
                    handleOpenPayment(ch, rem, mem);
                  }}
                >
                  <Wallet size={16} />
                  Ghi nhận thu tiền
                </Pressable>
              )}

              {canManage && selectedMember.remaining > 0 && (
                <Pressable
                  className="choice-button flex-1"
                  onClick={() => {
                    onRemindMember?.(selectedMember);
                  }}
                >
                  <Bell size={16} />
                  Nhắc đóng quỹ
                </Pressable>
              )}

              {selectedMember.id === accountId && selectedMember.remaining > 0 && selectedMember.charge && (
                <Pressable
                  className="primary-button flex-1"
                  onClick={() => {
                    const ch = selectedMember.charge;
                    const rem = remainingCharge(ch);
                    const mem = selectedMember;
                    handleOpenPayment(ch, rem, mem);
                  }}
                >
                  Tôi đã chuyển khoản
                </Pressable>
              )}
            </div>
          </div>
        </ProModal>
      )}

      {/* 6. MODAL GHI NHẬN THU TIỀN / BÁO CHUYỂN KHOẢN NHANH */}
      {recordingCharge && (
        <ProModal
          open={!!recordingCharge}
          title={canManage ? "Ghi nhận thu tiền quỹ" : "Xác nhận chuyển tiền"}
          onClose={() => {
            if (!recordBusy) setRecordingCharge(null);
          }}
          busy={recordBusy}
        >
          <form className="security-form" onSubmit={handleConfirmPayment}>
            {recordingCharge.memberName && (
              <p className="font-semibold text-sm">
                Người nộp: <strong>{recordingCharge.memberName}</strong>
              </p>
            )}
            <p className="text-xs text-slate-500">
              Nội dung: {recordingCharge.label || monthLabel} · Còn thiếu:{" "}
              <strong>{formatCurrency(remainingCharge(recordingCharge))}</strong>
            </p>

            <label className="form-field mt-3">
              Số tiền (VNĐ)
              <input
                required
                type="number"
                min={1}
                max={remainingCharge(recordingCharge)}
                step={1}
                value={recordAmount}
                onChange={(e) => setRecordAmount(Number(e.target.value))}
                className="tabular-nums"
              />
            </label>

            {!canManage && (
              <>
                <label className="form-field">
                  Ghi chú (không bắt buộc)
                  <textarea
                    maxLength={500}
                    value={recordNote}
                    onChange={(e) => setRecordNote(e.target.value)}
                    placeholder="Nhập nội dung chuyển khoản nếu có…"
                  />
                </label>
                {treasurerQr?.accountNumber && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <p className="text-xs font-semibold">Tài khoản nhận quỹ:</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {treasurerQr.bankName} · {treasurerQr.accountNumber} · {treasurerQr.accountHolder}
                    </p>
                    <QrPreview
                      src={
                        treasurerQr.qrMode === "uploaded"
                          ? treasurerQr.uploadedQrImage
                          : qrUrl(treasurerQr, recordAmount, "DONG QUY DOI")
                      }
                    />
                  </div>
                )}
              </>
            )}

            <p className="field-hint text-xs text-slate-500 mt-2">
              {canManage
                ? "Chỉ xác nhận số tiền đã thực tế nhận được. Giao dịch thu sẽ tự động được ghi nhận vào Sổ quỹ."
                : "Báo nộp sẽ tạo yêu cầu chờ đối soát gửi tới Thủ quỹ."}
            </p>

            {recordError && (
              <p role="alert" className="form-error text-xs mt-2">
                {recordError}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <Pressable
                type="button"
                className="choice-button flex-1"
                disabled={recordBusy}
                onClick={() => setRecordingCharge(null)}
              >
                Hủy
              </Pressable>
              <Pressable
                type="submit"
                className="primary-button flex-1"
                disabled={recordBusy}
              >
                {recordBusy
                  ? "Đang lưu…"
                  : canManage
                    ? "Xác nhận đã nhận"
                    : "Gửi báo nộp"}
              </Pressable>
            </div>
          </form>
        </ProModal>
      )}

      {/* 3. MODAL TẠO ĐỢT THU CHO THÁNG */}
      <ProModal
        open={isCreatingCollection}
        title={`Tạo đợt thu ${monthLabel}`}
        onClose={() => {
          if (!createBusy) setIsCreatingCollection(false);
        }}
      >
        <form className="security-form" onSubmit={handleConfirmCreateCollection}>
          <label className="form-field">
            Tiêu đề đợt thu
            <input
              required
              maxLength={120}
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Ví dụ: Quỹ tháng 10/2026"
            />
          </label>

          <label className="form-field">
            Số tiền mỗi người (đ)
            <input
              required
              inputMode="numeric"
              value={createAmount ? Number(createAmount).toLocaleString("vi-VN") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setCreateAmount(raw ? Number(raw) : 0);
              }}
            />
          </label>

          <div className="flex gap-2 flex-wrap mb-2">
            {[50000, 100000, 150000, 200000].map((amt) => (
              <Pressable
                key={amt}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  createAmount === amt
                    ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                }`}
                onClick={() => setCreateAmount(amt)}
              >
                {formatCurrency(amt)}
              </Pressable>
            ))}
          </div>

          <label className="form-field">
            Hạn nộp quỹ
            <input
              required
              type="date"
              min={now.slice(0,10)}
              value={createDueDate}
              onInput={e=>setCreateDueDate(e.currentTarget.value)}
              onChange={(e) => setCreateDueDate(e.target.value)}
            />
          </label>

          <label className="form-field">
            Hình thức đợt thu
            <select
              value={createRepeat}
              onChange={(e) => setCreateRepeat(e.target.value)}
            >
              <option value="once">Chỉ thu 1 lần cho {monthLabel}</option>
              <option value="monthly">Lặp lại hằng tháng</option>
            </select>
            {createRepeat === "monthly" && (
              <small className="field-hint text-xs text-slate-500 mt-1 block">
                💡 Hệ thống sẽ tự động tạo đợt thu mới cho các tháng tiếp theo (Tháng {Number(selectedMonth.slice(5, 7)) === 12 ? 1 : Number(selectedMonth.slice(5, 7)) + 1}...).
              </small>
            )}
          </label>

          {createError && (
            <p role="alert" className="form-error text-xs text-rose-600 font-semibold mt-1">
              {createError}
            </p>
          )}

          <div className="flex gap-2 mt-4">
            <Pressable
              type="submit"
              className="primary-button flex-1"
              disabled={createBusy}
            >
              {createBusy ? "Đang tạo đợt…" : "Tạo đợt thu ngay"}
            </Pressable>
            <Pressable
              type="button"
              className="choice-button"
              disabled={createBusy}
              onClick={() => setIsCreatingCollection(false)}
            >
              Hủy
            </Pressable>
          </div>
        </form>
      </ProModal>
    </div>
  );
}
