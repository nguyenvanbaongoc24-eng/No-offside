import React, { useState, useRef, useEffect, useMemo } from "react";
import FundOperations from "../components/FundOperations";
import { remainingCharge } from "../lib/fundCollections";
import { notify } from "../lib/feedback";
import ProModal from "../components/pro/ProModal";
import {
  Bell,
  Calendar,
  Beer,
  Wallet,
  Shield,
  MoreHorizontal,
  PlusCircle,
  X,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Sliders,
  Search,
} from "../components/icons";
import { useLayerBack } from "../hooks/useLayerBack";
import Pressable from "../components/Pressable";
import { createWorkbook } from "../lib/exportWorkbook";
import { qrUrl, uid } from "../lib/teamModel";
import BankPicker from "../components/BankPicker";
import QrPreview from "../components/QrPreview";
import { readQrImage } from "../lib/qrImage";
import {
  localTransactionTime,
  transactionInstant,
  transactionLabel,
  editTransaction,
  filterTransactions,
  transactionTotals,
} from "../lib/transactionTime";
import { formatCurrency } from "../lib/formatCurrency";

// Watermark illustration: soccer ball resting on grass tufts
function SoccerWatermark() {
  return (
    <svg
      className="fund-card-watermark"
      width="120"
      height="88"
      viewBox="0 0 120 88"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="68" cy="38" r="26" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="68,24 78,32 74,44 62,44 58,32" fill="currentColor" opacity="0.8" />
      <line x1="68" y1="24" x2="68" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="78" y1="32" x2="89" y2="26" stroke="currentColor" strokeWidth="2" />
      <line x1="74" y1="44" x2="85" y2="52" stroke="currentColor" strokeWidth="2" />
      <line x1="62" y1="44" x2="51" y2="52" stroke="currentColor" strokeWidth="2" />
      <line x1="58" y1="32" x2="47" y2="26" stroke="currentColor" strokeWidth="2" />
      {/* Grass tufts */}
      <path
        d="M10 84 Q22 52 30 76 Q38 46 48 80 Q56 42 66 84 Q78 48 88 82 Q96 50 108 84 L114 86 L6 86 Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export default function FundManagement({
  onBack,
  fund,
  accountId,
  teamMembers = [],
  fundIntent,
  onFundIntentUsed,
  viewState,
  onViewStateChange,
  createRequest,
  onCreateOpened,
  timeZone = "Asia/Ho_Chi_Minh",
  actor = "Thủ quỹ",
  treasurerQr,
  onUpdateTreasurerQr,
  funds,
  onChangeFunds,
  onApprove,
  onReject,
  currentUserRole = "owner",
  teamName,
}) {
  const displayTeamName = teamName || fund?.data?.teamName || "FC No Offside";

  const canManage =
    fund && !fund.demo
      ? fund.data.canManage
      : ["owner", "admin"].includes(currentUserRole);
  const canConfigureQr = ["owner", "admin"].includes(currentUserRole);

  const [operationIntent, setOperationIntent] = useState(null);
  const [subView, setSubView] = useState(
    viewState?.subView || (viewState?.activeTab === "qr-config" ? "qr-config" : null),
  ); // null | 'debtors' | 'schedules' | 'bills' | 'qr-config' | 'permissions'

  const [activeTab, setActiveTab] = useState(
    ["transactions", "collections", "approvals"].includes(viewState?.activeTab)
      ? viewState.activeTab
      : "transactions",
  ); // strictly 3 main tabs: 'transactions' | 'collections' | 'approvals'

  useEffect(() => {
    if (!fundIntent) return;
    if (fundIntent.action === "collection") {
      setActiveTab("collections");
      setSubView(null);
    } else if (fundIntent.action === "reminder") {
      setSubView("schedules");
    } else if (fundIntent.action === "bill") {
      setSubView("bills");
    } else {
      setActiveTab("transactions");
      setSubView(null);
    }
  }, [fundIntent?.id]);

  const [txReason, setTxReason] = useState("");
  const [historyId, setHistoryId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!historyId || !fund?.loadHistory) return;
    let live = true;
    setHistoryRows([]);
    setHistoryLoading(true);
    setHistoryError("");
    fund
      .loadHistory(historyId)
      .then((result) => {
        if (live) {
          setHistoryRows(result.history || []);
          setHistoryLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setHistoryError(e.message);
          setHistoryLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [historyId]);

  const [newCategory, setNewCategory] = useState("Khác");
  const [newPlayer, setNewPlayer] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState(
    viewState?.ledgerFilter || {
      search: "",
      type: "all",
      category: "all",
      member: "all",
    },
  );
  const [periodFilter, setPeriodFilter] = useState(
    viewState?.periodFilter || {
      mode: "all",
      month: localTransactionTime(Date.now(), timeZone).slice(0, 7),
      from: "",
      to: "",
    },
  );

  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (createRequest && canManage) {
      setNewTxType("income");
      setTxTime(localTransactionTime(Date.now(), timeZone));
      setShowAddTxModal(true);
      onCreateOpened?.();
    }
  }, [createRequest, canManage]);

  useEffect(() => {
    onViewStateChange?.({
      periodFilter,
      ledgerFilter,
      activeTab,
      subView,
    });
  }, [periodFilter, activeTab, ledgerFilter, subView]);

  useLayerBack(
    showAddTxModal || !!editingTransaction || !!subView || showFilterSheet || !!historyId,
    () => {
      if (showAddTxModal) setShowAddTxModal(false);
      else if (editingTransaction) setEditingTransaction(null);
      else if (showFilterSheet) setShowFilterSheet(false);
      else if (historyId) setHistoryId(null);
      else if (subView) setSubView(null);
    },
  );

  // QR config state
  const [qrBankName, setQrBankName] = useState(
    treasurerQr?.bankName || "MB Bank (Quân Đội)",
  );
  const [qrAccountNumber, setQrAccountNumber] = useState(
    treasurerQr?.accountNumber ?? "",
  );
  const [qrAccountHolder, setQrAccountHolder] = useState(
    treasurerQr?.accountHolder ?? "",
  );
  const [qrBankCode, setQrBankCode] = useState(
    treasurerQr?.bankCode || "970422",
  );
  const [qrMode, setQrMode] = useState(treasurerQr?.qrMode || "generated");
  const [qrImage, setQrImage] = useState(treasurerQr?.uploadedQrImage || "");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrSavedNotice, setQrSavedNotice] = useState(false);

  const [txTime, setTxTime] = useState("");
  const [txError, setTxError] = useState("");
  const [txBusy, setTxBusy] = useState(false);
  const txSubmitting = useRef(false);

  const qrPreviewUrl =
    qrMode === "uploaded"
      ? qrImage
      : qrUrl({
          bankCode: qrBankCode,
          accountNumber: qrAccountNumber,
          accountHolder: qrAccountHolder,
        });

  // Transaction form states
  const [newTxTitle, setNewTxTitle] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxType, setNewTxType] = useState("income");

  // Transactions list
  const transactions = funds?.transactions || [];
  const visibleTransactions = useMemo(() => {
    return filterTransactions(transactions, periodFilter, timeZone).filter((t) => {
      const matchType = ledgerFilter.type === "all" || t.type === ledgerFilter.type;
      const matchCategory =
        ledgerFilter.category === "all" || t.category === ledgerFilter.category;
      const matchMember =
        ledgerFilter.member === "all" || t.playerId === ledgerFilter.member;
      const searchTarget = (
        (t.title || "") +
        " " +
        (teamMembers.find((m) => m.id === t.playerId)?.name || "") +
        " " +
        (t.author || "")
      ).toLocaleLowerCase("vi");
      const matchSearch =
        !ledgerFilter.search ||
        searchTarget.includes(ledgerFilter.search.toLocaleLowerCase("vi"));
      return matchType && matchCategory && matchMember && matchSearch;
    });
  }, [transactions, periodFilter, timeZone, ledgerFilter, teamMembers]);

  const periodTotals = useMemo(
    () => transactionTotals(visibleTransactions),
    [visibleTransactions],
  );

  const periodLabel =
    periodFilter.mode === "all"
      ? "Toàn bộ giao dịch"
      : periodFilter.mode === "month"
        ? "Tháng " + periodFilter.month
        : (periodFilter.from || "Từ đầu") +
          " – " +
          (periodFilter.to || "đến nay");

  const pendingApprovals = funds?.pendingApprovals || [];

  // Debtors & Outstanding calculation
  const debtors = (funds?.debtors || []).filter(
    (d) => !fund?.data?.charges?.some((c) => d.id === "pro-" + c.id),
  );
  const personalBillIds = new Set(
    (fund?.data?.bills || [])
      .filter((b) => b.details?.payerKind === "member")
      .map((b) => b.id),
  );
  const personalOutstanding = (fund?.data?.charges || [])
    .filter((c) => personalBillIds.has(c.bill_id))
    .reduce((sum, c) => sum + remainingCharge(c), 0);
  const outstanding =
    (fund?.data?.charges || [])
      .filter((c) => !personalBillIds.has(c.bill_id))
      .reduce((sum, c) => sum + remainingCharge(c), 0) +
    debtors.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // Totals & Balance
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  const activeSchedulesCount = (fund?.data?.schedules || []).filter(
    (s) => s.status === "active" || s.enabled !== false,
  ).length;

  const handleExportExcel = () => {
    const headers = [
      "STT",
      "Ngày Giao Dịch",
      "Nội Dung Thu Chi",
      "Loại",
      "Số Tiền (VNĐ)",
      "Người Phụ Trách",
    ];
    const rows = visibleTransactions.map((t, index) => [
      index + 1,
      transactionLabel(t, timeZone),
      t.title,
      t.type === "income" ? "Khoản Thu" : "Khoản Chi",
      t.amount,
      t.author,
    ]);

    rows.push([]);
    rows.push(["", "", "Tổng thu trong kỳ:", "", periodTotals.income, ""]);
    rows.push(["", "", "Tổng chi trong kỳ:", "", periodTotals.expense, ""]);
    rows.push(["", "", "Số Dư Hiện Tại:", "", currentBalance, ""]);

    const blob = new Blob(
      [createWorkbook([headers, ...rows, ["", "", periodLabel]])],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `No_Offside_So_Quy_FC_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReject = async (id) => {
    const reason = window.prompt(
      "Lý do từ chối khoản đóng quỹ (tối thiểu 3 ký tự):",
    );
    if (reason === null) return;
    try {
      if (!onReject) throw Error("Chưa kết nối thao tác từ chối.");
      const request = pendingApprovals.find((p) => p.id === id);
      if (request?.chargeId && fund)
        await fund.mutate("payment_reject", { requestId: id, reason });
      else await onReject(id, reason);
      notify("Đã từ chối yêu cầu đóng quỹ.");
    } catch (error) {
      setTxError(error.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      const request = pendingApprovals.find((p) => p.id === id);
      if (request?.chargeId && fund)
        await fund.mutate("payment_approve", { requestId: id });
      else await onApprove(id);
      notify("Đã xác nhận khoản tiền thực nhận.");
    } catch (error) {
      setTxError(error.message || "Không duyệt được khoản đóng quỹ.");
    }
  };

  const handleSaveQrConfig = async (e) => {
    e.preventDefault();
    if (!canManage || qrBusy) return;
    setQrError("");
    setQrSavedNotice(false);
    if (
      !qrPreviewUrl ||
      !/^\d{6,25}$/.test(qrAccountNumber) ||
      !qrAccountHolder.trim()
    ) {
      setQrError(
        "Nhập số tài khoản 6–25 chữ số, tên người nhận và ảnh QR nếu chọn tải ảnh.",
      );
      return;
    }
    setQrBusy(true);
    try {
      if (!onUpdateTreasurerQr)
        throw new Error("Chưa có cơ chế lưu tài khoản.");
      await onUpdateTreasurerQr({
        bankName: qrBankName,
        bankCode: qrBankCode,
        accountNumber: qrAccountNumber,
        accountHolder: qrAccountHolder.trim(),
        qrMode,
        uploadedQrImage: qrImage,
        qrImageUrl: qrMode === "generated" ? qrPreviewUrl : "",
      });
      setQrSavedNotice(true);
    } catch (e) {
      setQrError(e.message || "Không lưu được tài khoản.");
    } finally {
      setQrBusy(false);
    }
  };

  const submitTx = async (e) => {
    e.preventDefault();
    if (!canManage || txSubmitting.current) return;
    setTxError("");
    const draft = editingTransaction || {
      title: newTxTitle,
      amount: Number(newTxAmount),
      type: newTxType,
    };
    if (
      !draft.title.trim() ||
      !Number.isInteger(Number(draft.amount)) ||
      Number(draft.amount) <= 0
    ) {
      setTxError("Nhập nội dung và số tiền nguyên lớn hơn 0.");
      return;
    }
    txSubmitting.current = true;
    setTxBusy(true);
    try {
      if (!editingTransaction && !txTime)
        throw new Error("Nhập thời gian giao dịch.");
      const original =
        editingTransaction &&
        transactions.find((t) => t.id === editingTransaction.id);
      if (editingTransaction && !original)
        throw new Error("Giao dịch không còn tồn tại.");
      const now = new Date().toISOString();
      const next = original
        ? editTransaction(
            original,
            {
              title: draft.title.trim(),
              amount: Number(draft.amount),
              type: draft.type,
            },
            txTime,
            timeZone,
            actor,
            now,
          )
        : {
            id: uid(),
            title: draft.title.trim(),
            amount: Number(draft.amount),
            type: draft.type,
            date: txTime.slice(0, 10),
            occurredAt: transactionInstant(txTime, timeZone),
            timeZone,
            timePrecision: "minute",
            createdAt: now,
            author: actor,
          };
      if (fund && !fund.demo) {
        await fund.mutate("transaction_save", {
          id: original?.id,
          title: next.title,
          amount: next.amount,
          type: next.type,
          occurredAt: next.occurredAt || undefined,
          category: editingTransaction?.category || newCategory,
          playerId: editingTransaction?.playerId || newPlayer,
          reason: txReason,
        });
        notify("Đã lưu giao dịch quỹ.");
      } else {
        await onChangeFunds?.((prev) => ({
          ...prev,
          transactions: original
            ? prev.transactions.map((t) => (t.id === next.id ? next : t))
            : [next, ...(prev?.transactions || [])],
        }));
      }
      setEditingTransaction(null);
      setShowAddTxModal(false);
      setNewTxTitle("");
      setNewTxAmount("");
    } catch (error) {
      setTxError(error.message || "Không lưu được giao dịch.");
    } finally {
      txSubmitting.current = false;
      setTxBusy(false);
    }
  };

  const closeMore = () => {
    if (moreRef.current) moreRef.current.open = false;
  };

  const hasActiveFilters =
    ledgerFilter.type !== "all" ||
    ledgerFilter.category !== "all" ||
    ledgerFilter.member !== "all" ||
    periodFilter.mode !== "all";

  return (
    <div className="fund-page">
      {/* Global Alerts */}
      {txError && !showAddTxModal && !editingTransaction && (
        <p role="alert" className="form-error my-3">
          {txError}
        </p>
      )}

      {/* 1. Header gọn */}
      <header className="fund-header">
        <div className="flex items-center min-w-0 flex-1">
          {onBack && (
            <Pressable
              type="button"
              aria-label="Quay lại"
              className="fund-header-back"
              onClick={onBack}
            >
              <ChevronLeft size={22} />
            </Pressable>
          )}
          <div className="fund-header-title-group">
            <h1>Quỹ đội</h1>
            <p className="fund-header-subtitle">{displayTeamName}</p>
          </div>
        </div>

        <details className="action-menu" ref={moreRef}>
          <summary aria-label="Thêm tùy chọn quỹ">
            <MoreHorizontal size={20} />
          </summary>
          <div className="menu-popover">
            <Pressable
              onClick={() => {
                handleExportExcel();
                closeMore();
              }}
            >
              <FileSpreadsheet size={18} />
              Xuất báo cáo
            </Pressable>
            {canConfigureQr && (
              <Pressable
                onClick={() => {
                  setSubView("qr-config");
                  closeMore();
                }}
              >
                <CreditCard size={18} />
                Tài khoản nhận quỹ
              </Pressable>
            )}
            {canManage && (
              <Pressable
                onClick={() => {
                  setSubView("schedules");
                  closeMore();
                }}
              >
                <Bell size={18} />
                Cấu hình lịch nhắc
              </Pressable>
            )}
            {fund?.data?.owner && (
              <Pressable
                onClick={() => {
                  setSubView("permissions");
                  closeMore();
                }}
              >
                <Shield size={18} />
                Phân quyền quỹ
              </Pressable>
            )}
            <Pressable
              onClick={() => {
                setSubView("debtors");
                closeMore();
              }}
            >
              <Users size={18} />
              Khoản còn phải thu
            </Pressable>
          </div>
        </details>
      </header>

      {/* SUB-VIEW RENDERING */}
      {subView ? (
        <div className="fund-subview-panel">
          <div className="fund-subview-header">
            <Pressable
              type="button"
              className="fund-subview-back"
              onClick={() => setSubView(null)}
            >
              <ChevronLeft size={18} />
              Quay lại Quỹ đội
            </Pressable>
          </div>

          {subView === "qr-config" && canConfigureQr && (
            <section className="settings-card">
              <h2 className="text-lg font-bold mb-3">Tài khoản nhận quỹ</h2>
              <form className="match-form" onSubmit={handleSaveQrConfig}>
                <BankPicker
                  value={qrBankCode}
                  name={qrBankName}
                  onChange={(bank) => {
                    setQrBankCode(bank.bin);
                    setQrBankName(bank.shortName);
                    setQrSavedNotice(false);
                  }}
                  disabled={qrBusy}
                />
                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Nguồn ảnh QR"
                >
                  <Pressable
                    type="button"
                    className="choice-button"
                    aria-pressed={qrMode === "generated"}
                    onClick={() => {
                      setQrMode("generated");
                      setQrSavedNotice(false);
                    }}
                  >
                    Tạo từ tài khoản
                  </Pressable>
                  <Pressable
                    type="button"
                    className="choice-button"
                    aria-pressed={qrMode === "uploaded"}
                    onClick={() => {
                      setQrMode("uploaded");
                      setQrSavedNotice(false);
                    }}
                  >
                    Ảnh có sẵn
                  </Pressable>
                </div>
                {qrMode === "uploaded" && (
                  <div className="form-field">
                    <label htmlFor="fund-qr-upload">
                      {qrImage ? "Thay ảnh QR" : "Tải ảnh QR"}
                    </label>
                    <input
                      id="fund-qr-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={qrBusy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setQrBusy(true);
                        setQrError("");
                        setQrSavedNotice(false);
                        try {
                          setQrImage(await readQrImage(file));
                        } catch (error) {
                          setQrError(error.message);
                        } finally {
                          setQrBusy(false);
                        }
                      }}
                    />
                    <p className="field-hint">
                      PNG/JPEG/WebP, tối đa 1 MB, 128–4096 px. Giữ nguyên toàn bộ
                      ảnh.
                    </p>
                    {qrImage && (
                      <Pressable
                        type="button"
                        className="text-action mt-1"
                        disabled={qrBusy}
                        onClick={() => {
                          setQrImage("");
                          setQrMode("generated");
                          setQrSavedNotice(false);
                        }}
                      >
                        Xóa ảnh khỏi bản nháp
                      </Pressable>
                    )}
                  </div>
                )}
                <label className="form-field">
                  Số tài khoản
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    value={qrAccountNumber}
                    onChange={(e) => {
                      setQrAccountNumber(e.target.value.replace(/\D/g, ""));
                      setQrSavedNotice(false);
                    }}
                  />
                </label>
                <label className="form-field">
                  Tên chủ tài khoản
                  <input
                    required
                    value={qrAccountHolder}
                    onChange={(e) => {
                      setQrAccountHolder(e.target.value);
                      setQrSavedNotice(false);
                    }}
                  />
                </label>
                <QrPreview src={qrPreviewUrl} uploaded={qrMode === "uploaded"} />
                {qrBusy && (
                  <p role="status" className="field-hint">
                    Đang xử lý ảnh hoặc lưu tài khoản…
                  </p>
                )}
                {qrError && (
                  <p role="alert" className="form-error">
                    {qrError}
                  </p>
                )}
                <Pressable className="primary-button w-full" disabled={qrBusy}>
                  Lưu tài khoản
                </Pressable>
                {qrSavedNotice && (
                  <p role="status" className="text-sm text-emerald-700 font-semibold mt-2">
                    Đã lưu tài khoản nhận quỹ trên thiết bị.
                  </p>
                )}
              </form>
            </section>
          )}

          {subView === "debtors" && (
            <section className="settings-card">
              <h2 className="text-lg font-bold">Khoản còn phải thu</h2>
              <p className="text-sm text-slate-500 mt-1 mb-3">
                Tổng quỹ còn phải thu: <strong>{formatCurrency(outstanding)}</strong>
                {personalOutstanding > 0 && (
                  <span className="block mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Hoàn trực tiếp cho người ứng: {formatCurrency(personalOutstanding)}
                  </span>
                )}
              </p>
              {fund ? (
                <FundOperations
                  fund={fund}
                  mode="charges"
                  qr={treasurerQr}
                  accountId={accountId}
                  permissions={teamMembers}
                />
              ) : !debtors.length ? (
                <p className="panel-empty">Không có khoản quỹ chưa được xác nhận.</p>
              ) : (
                debtors.map((d) => (
                  <article key={d.id} className="fund-person-row">
                    <div className="min-w-0">
                      <h3>{d.name}</h3>
                      <p className="text-xs text-slate-500">
                        {d.phone} · {d.month}
                      </p>
                      <p className="text-xs mt-1 text-slate-500">
                        {pendingApprovals.some(
                          (p) => p.playerId === d.playerId && p.month === d.month,
                        )
                          ? "Đang chờ duyệt"
                          : "Chưa gửi xác nhận"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="tabular-nums text-sm">
                        {formatCurrency(d.amount)}
                      </strong>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}

          {subView === "schedules" && fund && (
            <FundOperations
              fund={fund}
              mode="schedules"
              intent={fundIntent || operationIntent}
              onIntentUsed={() => {
                setOperationIntent(null);
                onFundIntentUsed?.();
              }}
              qr={treasurerQr}
              accountId={accountId}
              permissions={teamMembers}
            />
          )}

          {subView === "bills" && fund && (
            <FundOperations
              fund={fund}
              mode="bills"
              intent={fundIntent || operationIntent}
              onIntentUsed={() => {
                setOperationIntent(null);
                onFundIntentUsed?.();
              }}
              qr={treasurerQr}
              accountId={accountId}
              permissions={teamMembers}
            />
          )}

          {subView === "permissions" && fund && (
            <FundOperations
              fund={fund}
              mode="permissions"
              qr={treasurerQr}
              accountId={accountId}
              permissions={teamMembers}
            />
          )}
        </div>
      ) : (
        /* MAIN FUND VIEW */
        <>
          {/* 2. Tổng quan số dư */}
          <section className="fund-balance-card">
            <SoccerWatermark />
            <div className="fund-card-content">
              <div className="fund-card-top">
                <div className="fund-card-pill">
                  <div className="fund-card-icon" aria-hidden="true">
                    <Wallet size={18} />
                  </div>
                  <span className="fund-card-label">Số dư hiện có</span>
                </div>
              </div>

              {/* Số dư nổi bật, chỉ hiển thị đúng 1 lần trên toàn trang */}
              <div className="fund-balance-amount tabular-nums">
                {formatCurrency(currentBalance)}
              </div>

              <div className="fund-card-divider" />

              <dl className="fund-card-stats">
                <div className="fund-stat-item fund-stat-income">
                  <dt>Tổng thu {periodFilter.mode !== "all" ? "kỳ" : ""}</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(periodTotals.income)}
                  </dd>
                </div>
                <div className="fund-stat-item">
                  <dt>Tổng chi {periodFilter.mode !== "all" ? "kỳ" : ""}</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(periodTotals.expense)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* 3. Còn phải thu và Lịch nhắc (Hàng 2 cột gọn) */}
          <section className="fund-duo-row" aria-label="Tóm tắt công nợ và lịch nhắc">
            <button
              type="button"
              className="fund-duo-cell"
              onClick={() => setSubView("debtors")}
              title="Xem chi tiết khoản còn phải thu"
            >
              <div className="fund-duo-icon" aria-hidden="true">
                <Users size={20} />
              </div>
              <div className="fund-duo-text">
                <span className="fund-duo-label">Còn phải thu</span>
                <span className="fund-duo-value tabular-nums">
                  {formatCurrency(outstanding)}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="fund-duo-cell"
              onClick={() => setSubView("schedules")}
              title="Xem danh sách lịch nhắc thu quỹ"
            >
              <div className="fund-duo-icon" aria-hidden="true">
                <Clock size={20} />
              </div>
              <div className="fund-duo-text">
                <span className="fund-duo-label">Lịch nhắc</span>
                <span className="fund-duo-value tabular-nums">
                  {activeSchedulesCount}
                </span>
              </div>
            </button>
          </section>

          {/* 4. Thao tác nhanh (1 hàng 4 nút cân đối) */}
          <section className="fund-quick-grid" aria-label="Thao tác quỹ nhanh">
            {canManage ? (
              <button
                type="button"
                className="fund-action-card is-priority"
                onClick={() => {
                  setNewTxType("income");
                  setTxReason("");
                  setTxTime(localTransactionTime(Date.now(), timeZone));
                  setTxError("");
                  setShowAddTxModal(true);
                }}
              >
                <div className="fund-action-icon-box" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <path d="M12 8v8" />
                    <path d="m8 12 4 4 4-4" />
                  </svg>
                </div>
                <span>Thu tiền</span>
              </button>
            ) : null}

            {canManage ? (
              <button
                type="button"
                className="fund-action-card"
                onClick={() => {
                  setNewTxType("expense");
                  setTxReason("");
                  setTxTime(localTransactionTime(Date.now(), timeZone));
                  setTxError("");
                  setShowAddTxModal(true);
                }}
              >
                <div className="fund-action-icon-box" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <path d="M12 16V8" />
                    <path d="m8 12 4-4 4 4" />
                  </svg>
                </div>
                <span>Chi tiền</span>
              </button>
            ) : null}

            <button
              type="button"
              className="fund-action-card"
              onClick={() => setActiveTab("collections")}
            >
              <div className="fund-action-icon-box" aria-hidden="true">
                <Calendar size={20} />
              </div>
              <span>Đợt thu</span>
            </button>

            {canManage ? (
              <button
                type="button"
                className="fund-action-card"
                onClick={() => {
                  setSubView("schedules");
                  setOperationIntent({
                    id: crypto.randomUUID(),
                    action: "reminder",
                  });
                }}
              >
                <div className="fund-action-icon-box" aria-hidden="true">
                  <Bell size={20} />
                </div>
                <span>Nhắc quỹ</span>
              </button>
            ) : null}
          </section>

          {/* 5. Sinh Tố Lúa Mạch */}
          <button
            type="button"
            className="fund-beer-card"
            onClick={() => setSubView("bills")}
          >
            <div className="fund-beer-left">
              <Beer size={20} />
              <span>Sinh Tố Lúa Mạch</span>
            </div>
            <div className="fund-beer-right" aria-hidden="true">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* 6. Ba tab chính — 1 hàng 3 cột cân đối, không wrap */}
          <div className="fund-tabs-container">
            <nav className="fund-tab-nav" role="tablist" aria-label="Các mục chính">
              <button
                type="button"
                role="tab"
                id="tab-transactions"
                aria-controls="panel-transactions"
                aria-selected={activeTab === "transactions"}
                className={`fund-tab-button ${activeTab === "transactions" ? "is-active" : ""}`}
                onClick={() => setActiveTab("transactions")}
              >
                <span>Giao dịch</span>
                <span className="fund-tab-badge">{visibleTransactions.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-collections"
                aria-controls="panel-collections"
                aria-selected={activeTab === "collections"}
                className={`fund-tab-button ${activeTab === "collections" ? "is-active" : ""}`}
                onClick={() => setActiveTab("collections")}
              >
                <span>Đợt thu</span>
                <span className="fund-tab-badge">
                  {fund?.data?.collections?.length || 0}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-approvals"
                aria-controls="panel-approvals"
                aria-selected={activeTab === "approvals"}
                className={`fund-tab-button ${activeTab === "approvals" ? "is-active" : ""}`}
                onClick={() => setActiveTab("approvals")}
              >
                <span>Chờ duyệt</span>
                <span className="fund-tab-badge">{pendingApprovals.length}</span>
              </button>
            </nav>
          </div>

          {/* TAB 1: SỔ GIAO DỊCH */}
          {activeTab === "transactions" && (
            <section
              id="panel-transactions"
              role="tabpanel"
              aria-labelledby="tab-transactions"
            >
              <div className="fund-ledger-header">
                <h2 className="fund-ledger-title">Sổ giao dịch</h2>

                <div className="fund-ledger-actions">
                  {canManage && (
                    <Pressable
                      className="text-action text-xs font-semibold"
                      onClick={() => {
                        setTxTime(localTransactionTime(Date.now(), timeZone));
                        setTxError("");
                        setNewTxType("income");
                        setShowAddTxModal(true);
                      }}
                    >
                      <PlusCircle size={16} />
                      Thêm giao dịch
                    </Pressable>
                  )}

                  {/* Period picker button */}
                  <div className="fund-period-select-wrap">
                    <select
                      className="fund-period-pill"
                      value={periodFilter.mode}
                      onChange={(e) => {
                        const mode = e.target.value;
                        setPeriodFilter((prev) => ({ ...prev, mode }));
                        if (mode === "range" || mode === "month") {
                          setShowFilterSheet(true);
                        }
                      }}
                      aria-label="Chọn kỳ xem"
                    >
                      <option value="all">Tất cả thời gian</option>
                      <option value="month">Theo tháng</option>
                      <option value="range">Khoảng ngày</option>
                    </select>
                  </div>

                  {/* Filter sheet trigger button */}
                  <button
                    type="button"
                    className="fund-filter-trigger"
                    aria-label="Bộ lọc nâng cao"
                    title="Mở bộ lọc nâng cao"
                    onClick={() => setShowFilterSheet(true)}
                  >
                    <Sliders size={18} />
                    {hasActiveFilters && <span className="fund-filter-dot" />}
                  </button>
                </div>
              </div>

              {/* Ô tìm kiếm gọn */}
              <div className="fund-search-bar">
                <div className="fund-search-icon">
                  <Search size={18} />
                </div>
                <input
                  type="search"
                  placeholder="Tìm giao dịch…"
                  value={ledgerFilter.search}
                  onChange={(e) =>
                    setLedgerFilter((f) => ({ ...f, search: e.target.value }))
                  }
                  aria-label="Tìm kiếm giao dịch"
                />
                {ledgerFilter.search && (
                  <button
                    type="button"
                    className="fund-search-clear"
                    onClick={() => setLedgerFilter((f) => ({ ...f, search: "" }))}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Active filter pills / indicators if applied */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 overflow-x-auto">
                  <span>Bộ lọc đang áp dụng:</span>
                  {periodFilter.mode !== "all" && (
                    <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                      {periodLabel}
                    </span>
                  )}
                  {ledgerFilter.type !== "all" && (
                    <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                      {ledgerFilter.type === "income" ? "Khoản thu" : "Khoản chi"}
                    </span>
                  )}
                  {ledgerFilter.category !== "all" && (
                    <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                      {ledgerFilter.category}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-rose-600 dark:text-rose-400 font-semibold underline ml-auto"
                    onClick={() => {
                      setLedgerFilter({
                        search: "",
                        type: "all",
                        category: "all",
                        member: "all",
                      });
                      setPeriodFilter({
                        mode: "all",
                        month: localTransactionTime(Date.now(), timeZone).slice(0, 7),
                        from: "",
                        to: "",
                      });
                    }}
                  >
                    Xóa lọc
                  </button>
                </div>
              )}

              {/* Transactions List */}
              <div className="fund-tx-card">
                {!visibleTransactions.length ? (
                  <p className="panel-empty text-center py-8">
                    Không có giao dịch trong kỳ đã chọn.
                  </p>
                ) : (
                  visibleTransactions.map((t) => {
                    const isIncome = t.type === "income";
                    return (
                      <article key={t.id} className="fund-tx-row">
                        {/* Type Icon */}
                        <div
                          className={`fund-tx-avatar ${isIncome ? "income" : "expense"}`}
                          aria-label={isIncome ? "Khoản thu" : "Khoản chi"}
                        >
                          {isIncome ? (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 18 12-12" />
                              <path d="M6 9v9h9" />
                            </svg>
                          ) : (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M7 17 17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                          )}
                        </div>

                        {/* Title and Meta */}
                        <div className="fund-tx-info">
                          <p className="fund-tx-title">{t.title}</p>
                          <p className="fund-tx-meta">
                            {transactionLabel(t, timeZone)}
                            {t.author ? ` · ${t.author}` : ""}
                            {t.status === "void" ? " · Đã hủy" : ""}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="fund-tx-amount-group">
                          <strong
                            className={`fund-tx-amount ${isIncome ? "income" : "expense"}`}
                          >
                            {isIncome ? "+" : "−"}
                            {formatCurrency(
                              t.status === "void" ? t.originalAmount : t.amount,
                            )}
                          </strong>
                        </div>

                        {/* More Menu */}
                        <div className="fund-tx-menu">
                          {canManage &&
                          t.status !== "void" &&
                          !(t.billId && t.type === "expense") ? (
                            <details className="action-menu">
                              <summary aria-label={"Thao tác giao dịch " + t.title}>
                                <MoreHorizontal size={18} />
                              </summary>
                              <div className="menu-popover">
                                <Pressable
                                  onClick={(e) => {
                                    setTxReason("");
                                    setEditingTransaction({ ...t });
                                    setTxTime(
                                      t.occurredAt
                                        ? localTransactionTime(t.occurredAt, timeZone)
                                        : "",
                                    );
                                    setTxError("");
                                    e.currentTarget.closest("details").open = false;
                                  }}
                                >
                                  <Edit3 size={16} />
                                  Sửa giao dịch
                                </Pressable>
                                {fund && !fund.demo && (
                                  <Pressable
                                    onClick={(e) => {
                                      setHistoryId(t.id);
                                      e.currentTarget.closest("details").open = false;
                                    }}
                                  >
                                    <Clock size={16} />
                                    Lịch sử thao tác
                                  </Pressable>
                                )}
                              </div>
                            </details>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
                {visibleTransactions.length > 0 && (
                  <p className="fund-tx-counter">
                    {visibleTransactions.length} giao dịch
                  </p>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: ĐỢT THU */}
          {activeTab === "collections" && (
            <section
              id="panel-collections"
              role="tabpanel"
              aria-labelledby="tab-collections"
            >
              {fund ? (
                <FundOperations
                  fund={fund}
                  mode="collections"
                  intent={fundIntent || operationIntent}
                  onIntentUsed={() => {
                    setOperationIntent(null);
                    onFundIntentUsed?.();
                  }}
                  qr={treasurerQr}
                  accountId={accountId}
                  permissions={teamMembers}
                />
              ) : (
                <p className="panel-empty text-center py-8">Chưa có đợt thu.</p>
              )}
            </section>
          )}

          {/* TAB 3: CHỜ DUYỆT */}
          {activeTab === "approvals" && (
            <section
              id="panel-approvals"
              role="tabpanel"
              aria-labelledby="tab-approvals"
            >
              <h2 className="text-base font-bold mb-3">Khoản nộp chờ duyệt</h2>
              {!pendingApprovals.length ? (
                <p className="panel-empty text-center py-8">
                  Không có khoản nộp chờ duyệt.
                </p>
              ) : (
                pendingApprovals.map((p) => (
                  <article key={p.id} className="fund-approval-item">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <p className="tabular-nums font-bold text-base text-emerald-700 dark:text-emerald-400 mt-1">
                        {formatCurrency(p.amount)}
                      </p>
                      <p className="text-xs text-slate-500 break-words mt-1">
                        {p.bank} · {p.month}
                      </p>
                      {p.memo && (
                        <p className="text-xs text-slate-500 break-words mt-0.5">
                          {p.memo}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="fund-approval-actions">
                        <Pressable
                          className="primary-button text-xs py-2 px-3.5"
                          disabled={fund?.busy}
                          onClick={() => handleApprove(p.id)}
                        >
                          Xác nhận
                        </Pressable>
                        {onReject && (
                          <Pressable
                            type="button"
                            className="choice-button danger-action text-xs py-1.5 px-3"
                            onClick={() => handleReject(p.id)}
                          >
                            Từ chối
                          </Pressable>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          )}
        </>
      )}

      {/* FILTER BOTTOM SHEET */}
      {showFilterSheet && (
        <div role="dialog" aria-modal="true" className="match-form-overlay">
          <section className="match-form-sheet">
            <header className="sheet-header">
              <h2>Lọc sổ giao dịch</h2>
              <Pressable
                type="button"
                aria-label="Đóng bộ lọc"
                onClick={() => setShowFilterSheet(false)}
              >
                <X size={20} />
              </Pressable>
            </header>
            <div className="match-form">
              <label className="form-field">
                Loại giao dịch
                <select
                  value={ledgerFilter.type}
                  onChange={(e) =>
                    setLedgerFilter((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="all">Tất cả thu/chi</option>
                  <option value="income">Thu (+)</option>
                  <option value="expense">Chi (−)</option>
                </select>
              </label>

              <label className="form-field">
                Danh mục
                <select
                  value={ledgerFilter.category}
                  onChange={(e) =>
                    setLedgerFilter((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  <option value="all">Tất cả danh mục</option>
                  {[
                    ...new Set(
                      transactions.map((t) => t.category).filter(Boolean),
                    ),
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Thành viên
                <select
                  value={ledgerFilter.member}
                  onChange={(e) =>
                    setLedgerFilter((f) => ({ ...f, member: e.target.value }))
                  }
                >
                  <option value="all">Tất cả thành viên</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Kỳ xem
                <select
                  value={periodFilter.mode}
                  onChange={(e) =>
                    setPeriodFilter((prev) => ({
                      ...prev,
                      mode: e.target.value,
                    }))
                  }
                >
                  <option value="all">Toàn bộ</option>
                  <option value="month">Theo tháng</option>
                  <option value="range">Khoảng ngày</option>
                </select>
              </label>

              {periodFilter.mode === "month" && (
                <label className="form-field">
                  Tháng
                  <input
                    type="month"
                    value={periodFilter.month}
                    onChange={(e) =>
                      setPeriodFilter((prev) => ({
                        ...prev,
                        month: e.target.value,
                      }))
                    }
                  />
                </label>
              )}

              {periodFilter.mode === "range" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="form-field">
                    Từ ngày
                    <input
                      type="date"
                      value={periodFilter.from}
                      max={periodFilter.to || undefined}
                      onChange={(e) =>
                        setPeriodFilter((prev) => ({
                          ...prev,
                          from: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    Đến ngày
                    <input
                      type="date"
                      value={periodFilter.to}
                      min={periodFilter.from || undefined}
                      onChange={(e) =>
                        setPeriodFilter((prev) => ({
                          ...prev,
                          to: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              <footer className="sheet-footer flex gap-2">
                <Pressable
                  type="button"
                  className="choice-button flex-1"
                  onClick={() => {
                    setLedgerFilter({
                      search: "",
                      type: "all",
                      category: "all",
                      member: "all",
                    });
                    setPeriodFilter({
                      mode: "all",
                      month: localTransactionTime(Date.now(), timeZone).slice(0, 7),
                      from: "",
                      to: "",
                    });
                    setShowFilterSheet(false);
                  }}
                >
                  Xóa bộ lọc
                </Pressable>
                <Pressable
                  type="button"
                  className="primary-button flex-1"
                  onClick={() => setShowFilterSheet(false)}
                >
                  Áp dụng
                </Pressable>
              </footer>
            </div>
          </section>
        </div>
      )}

      {/* TRANSACTION AUDIT HISTORY MODAL */}
      {fund && (
        <ProModal
          open={!!historyId}
          title="Lịch sử giao dịch"
          onClose={() => setHistoryId(null)}
        >
          {historyLoading && <p role="status">Đang tải lịch sử…</p>}
          {historyError && (
            <p role="alert" className="form-error">
              {historyError}
            </p>
          )}
          {historyRows
            .filter(
              (e) =>
                e.request_key === String(historyId) ||
                String(e.payload?.id) === String(historyId),
            )
            .map((e) => (
              <article className="fund-collection" key={e.id}>
                <strong>
                  {teamMembers.find((m) => m.id === e.actor)?.name ||
                    "Người quản lý quỹ"}
                </strong>
                <p>
                  {e.action === "transaction_void"
                    ? "Hủy giao dịch"
                    : e.action === "transaction_save"
                      ? "Lưu giao dịch"
                      : "Đối soát khoản đóng"}{" "}
                  ·{" "}
                  {transactionLabel(
                    { occurredAt: e.created_at, timePrecision: "minute" },
                    timeZone,
                  )}
                </p>
                <p>{e.payload?.reason}</p>
                {e.before_value?.transaction && (
                  <p>
                    Trước:{" "}
                    {formatCurrency(Number(e.before_value.transaction.amount))}
                  </p>
                )}
                {e.after_value?.transaction && (
                  <p>
                    Sau:{" "}
                    {formatCurrency(Number(e.after_value.transaction.amount))}
                  </p>
                )}
              </article>
            ))}
          {!historyLoading &&
            !historyError &&
            !historyRows.some(
              (e) =>
                e.request_key === String(historyId) ||
                String(e.payload?.id) === String(historyId),
            ) && (
              <p className="field-hint">
                Chưa có lịch sử theo cơ chế mới cho giao dịch cũ. Dữ liệu gốc
                được giữ nguyên.
              </p>
            )}
        </ProModal>
      )}

      {/* ADD / EDIT TRANSACTION MODAL */}
      {(showAddTxModal || editingTransaction) && canManage && (
        <div role="dialog" aria-modal="true" className="match-form-overlay">
          <section className="match-form-sheet">
            <header className="sheet-header">
              <h2>{editingTransaction ? "Sửa giao dịch" : "Thêm giao dịch"}</h2>
              <Pressable
                type="button"
                aria-label="Đóng"
                onClick={() => {
                  setShowAddTxModal(false);
                  setEditingTransaction(null);
                }}
              >
                <X size={20} />
              </Pressable>
            </header>
            <form className="match-form" onSubmit={submitTx}>
              <label className="form-field">
                Nội dung
                <input
                  required
                  value={
                    editingTransaction ? editingTransaction.title : newTxTitle
                  }
                  onChange={(e) =>
                    editingTransaction
                      ? setEditingTransaction({
                          ...editingTransaction,
                          title: e.target.value,
                        })
                      : setNewTxTitle(e.target.value)
                  }
                  placeholder="Ví dụ: Tiền thuê sân"
                />
              </label>
              <label className="form-field">
                Loại giao dịch
                <select
                  value={
                    editingTransaction ? editingTransaction.type : newTxType
                  }
                  onChange={(e) =>
                    editingTransaction
                      ? setEditingTransaction({
                          ...editingTransaction,
                          type: e.target.value,
                        })
                      : setNewTxType(e.target.value)
                  }
                >
                  <option value="income">Khoản thu</option>
                  <option value="expense">Khoản chi</option>
                </select>
              </label>
              <label className="form-field">
                Số tiền (đ)
                <input
                  required
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={
                    editingTransaction ? editingTransaction.amount : newTxAmount
                  }
                  onChange={(e) =>
                    editingTransaction
                      ? setEditingTransaction({
                          ...editingTransaction,
                          amount: Number(e.target.value),
                        })
                      : setNewTxAmount(e.target.value)
                  }
                />
              </label>
              <label className="form-field">
                Thời gian giao dịch
                <input
                  type="datetime-local"
                  value={txTime}
                  required={
                    !editingTransaction ||
                    Boolean(editingTransaction.occurredAt)
                  }
                  onChange={(e) => setTxTime(e.target.value)}
                  onInput={(e) => setTxTime(e.currentTarget.value)}
                />
              </label>
              <p className="field-hint">
                Múi giờ đội: {timeZone}.{" "}
                {editingTransaction && !editingTransaction.occurredAt
                  ? `Bản ghi cũ chỉ có ngày ${editingTransaction.date}. Để trống để giữ độ chính xác cũ; không tự thêm giờ.`
                  : "Thời gian giao dịch độc lập với thời gian tạo và chỉnh sửa."}
              </p>
              {editingTransaction?.adjustments?.length > 0 && (
                <p className="field-hint">
                  Đã lưu {editingTransaction.adjustments.length} lần điều chỉnh
                  trên thiết bị; giữ giá trị trước và sau.
                </p>
              )}
              <label className="form-field">
                Danh mục
                <select
                  value={editingTransaction?.category || newCategory}
                  onChange={(e) =>
                    editingTransaction
                      ? setEditingTransaction((t) => ({
                          ...t,
                          category: e.target.value,
                        }))
                      : setNewCategory(e.target.value)
                  }
                >
                  {["Khác", "Thu quỹ", "Sân bóng", "Sinh tố lúa mạch"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="form-field">
                Người liên quan
                <select
                  value={editingTransaction?.playerId || newPlayer}
                  disabled={!!editingTransaction?.chargeId}
                  onChange={(e) =>
                    editingTransaction
                      ? setEditingTransaction((t) => ({
                          ...t,
                          playerId: e.target.value,
                        }))
                      : setNewPlayer(e.target.value)
                  }
                >
                  <option value="">Không chọn</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {editingTransaction && fund && !fund.demo && (
                <label className="form-field">
                  Lý do sửa/hủy
                  <input
                    required
                    minLength={3}
                    value={txReason}
                    onChange={(e) => setTxReason(e.target.value)}
                  />
                </label>
              )}
              {txError && (
                <p role="alert" className="form-error">
                  {txError}
                </p>
              )}
              <footer className="sheet-footer">
                {editingTransaction && fund && !fund.demo && (
                  <Pressable
                    type="button"
                    className="choice-button danger-action mb-2 w-full"
                    disabled={txBusy || fund.busy}
                    onClick={async () => {
                      if (txReason.trim().length < 3) {
                        setTxError("Nhập lý do hủy tối thiểu 3 ký tự.");
                        return;
                      }
                      try {
                        await fund.mutate("transaction_void", {
                          id: editingTransaction.id,
                          reason: txReason,
                        });
                        notify("Đã hủy giao dịch và cập nhật phần còn thiếu.");
                        setEditingTransaction(null);
                      } catch (e) {
                        setTxError(e.message);
                      }
                    }}
                  >
                    Hủy giao dịch
                  </Pressable>
                )}
                <Pressable
                  className="primary-button w-full"
                  disabled={txBusy || fund?.busy}
                >
                  {txBusy ? "Đang lưu…" : "Lưu giao dịch"}
                </Pressable>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
