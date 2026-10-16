import {useLayerBack} from '../hooks/useLayerBack';
import Pressable from '../components/Pressable';
import { createWorkbook } from "../lib/exportWorkbook";
import React, { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  PlusCircle,
  X,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  ChevronLeft,
} from "../components/icons";
import { qrUrl, uid } from "../lib/teamModel";
import BankPicker from "../components/BankPicker";
import QrPreview from "../components/QrPreview";
import { readQrImage } from "../lib/qrImage";
import {
  localTransactionTime,
  transactionInstant,
  transactionLabel,
  legacyTransactionDay,
  editTransaction,
  filterTransactions,
  transactionTotals,
} from "../lib/transactionTime";
import { formatCurrency } from "../lib/formatCurrency";

export default function FundManagement({
  onBack,
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
}) {
  const canManage = ["owner", "admin"].includes(currentUserRole);
  const moreRef = useRef(null);
  const [periodFilter, setPeriodFilter] = useState(viewState?.periodFilter || {
    mode: "all",
    month: localTransactionTime(Date.now(), timeZone).slice(0, 7),
    from: "",
    to: "",
  });
  const [activeTab, setActiveTab] = useState(viewState?.activeTab || "transactions"); // 'transactions' | 'approvals' | 'debtors' | 'qr-config'
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  useEffect(()=>{if(createRequest && canManage){setShowAddTxModal(true);onCreateOpened?.();}},[createRequest,canManage]);

  const fundTabBeforeQr=useRef(activeTab);
  useEffect(()=>{onViewStateChange?.({periodFilter,activeTab:activeTab==='qr-config'?fundTabBeforeQr.current:activeTab});},[periodFilter,activeTab]);
  useLayerBack(showAddTxModal || !!editingTransaction || activeTab==='qr-config',()=>{setShowAddTxModal(false);setEditingTransaction(null);setActiveTab(prev=>prev==='qr-config'?fundTabBeforeQr.current:prev);});

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
  const [qrMode, setQrMode] = useState(treasurerQr?.qrMode || "generated"),
    [qrImage, setQrImage] = useState(treasurerQr?.uploadedQrImage || ""),
    [qrBusy, setQrBusy] = useState(false),
    [qrError, setQrError] = useState("");
  const [txTime, setTxTime] = useState(""),
    [txError, setTxError] = useState(""),
    [txBusy, setTxBusy] = useState(false);
  const txSubmitting = useRef(false);
  const qrPreviewUrl =
    qrMode === "uploaded"
      ? qrImage
      : qrUrl({
          bankCode: qrBankCode,
          accountNumber: qrAccountNumber,
          accountHolder: qrAccountHolder,
        });
  const [qrSavedNotice, setQrSavedNotice] = useState(false);

  // New Transaction State
  const [newTxTitle, setNewTxTitle] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxType, setNewTxType] = useState("expense"); // 'income' | 'expense'

  // Transactions list (Có thể Edit / Sửa)
  const transactions = funds.transactions;
  const visibleTransactions = filterTransactions(
    transactions,
    periodFilter,
    timeZone,
  );
  const periodTotals = transactionTotals(visibleTransactions);
  const periodLabel =
    periodFilter.mode === "all"
      ? "Toàn bộ giao dịch"
      : periodFilter.mode === "month"
        ? "Tháng " + periodFilter.month
        : (periodFilter.from || "Từ đầu") +
          " – " +
          (periodFilter.to || "đến nay");
  const setTransactions = (value) =>
    onChangeFunds((prev) => ({
      ...prev,
      transactions:
        typeof value === "function" ? value(prev.transactions) : value,
    }));

  // Pending Approvals
  const pendingApprovals = funds.pendingApprovals;
  const setPendingApprovals = (value) =>
    onChangeFunds((prev) => ({
      ...prev,
      pendingApprovals:
        typeof value === "function" ? value(prev.pendingApprovals) : value,
    }));

  // Debtors list
  const debtors = funds.debtors;
  const setDebtors = (value) =>
    onChangeFunds((prev) => ({
      ...prev,
      debtors: typeof value === "function" ? value(prev.debtors) : value,
    }));

  // Dynamic calculations for Tổng thu, Tổng chi, Số dư
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // HÀM XUẤT EXCEL (CSV VỚI UTF-8 BOM CHO EXCEL VIỆT NAM)
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
      await onReject(id, reason);
    } catch (error) {
      setTxError(error.message);
    }
  };
  const handleApprove = async (id) => {
    try {
      await onApprove(id);
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
      await onChangeFunds((prev) => ({
        ...prev,
        transactions: original
          ? prev.transactions.map((t) => (t.id === next.id ? next : t))
          : [next, ...prev.transactions],
      }));
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
  return (
    <div className="fund-page">
      {txError && !showAddTxModal && !editingTransaction && (
        <p role="alert" className="form-error mx-4 mt-4">
          {txError}
        </p>
      )}
      <header className="compact-header fund-header">
        {onBack && <Pressable type="button" aria-label="Quay lại" className="header-back" onClick={onBack}><ChevronLeft size={22}/></Pressable>}
        <h1>Quỹ đội</h1>
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
            {canManage && (
              <Pressable
                onClick={() => {
                  fundTabBeforeQr.current=activeTab;
                  setActiveTab("qr-config");
                  closeMore();
                }}
              >
                <CreditCard size={18} />
                Tài khoản nhận quỹ
              </Pressable>
            )}
          </div>
        </details>
      </header>
      <section className="fund-summary">
        <p className="text-sm text-slate-600">Số dư hiện tại</p>
        <p className="fund-balance tabular-nums">
          {formatCurrency(currentBalance)}
        </p>
        <dl className="fund-totals">
          <div>
            <dt>Tổng thu</dt>
            <dd className="tabular-nums">{formatCurrency(totalIncome)}</dd>
          </div>
          <div>
            <dt>Tổng chi</dt>
            <dd className="tabular-nums">{formatCurrency(totalExpense)}</dd>
          </div>
        </dl>
      </section>
      {activeTab !== "qr-config" && (
        <div className="fund-segments" aria-label="Mục quỹ">
          {[
            ["transactions", "Giao dịch", transactions.length],
            ["approvals", "Chờ duyệt", pendingApprovals.length],
            ["debtors", "Cần đóng", debtors.length],
          ].map(([id, label, count]) => (
            <Pressable
              key={id}
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              <span>{label}</span>
              <span className="segment-count">{count}</span>
            </Pressable>
          ))}
        </div>
      )}
      <div className="fund-content">
        {activeTab === "transactions" && (
          <section>
            <div className="section-toolbar">
              <h2>Giao dịch</h2>
              {canManage && (
                <Pressable
                  className="text-action"
                  onClick={() => {
                    setTxTime(localTransactionTime(Date.now(), timeZone));
                    setTxError("");
                    setShowAddTxModal(true);
                  }}
                >
                  <PlusCircle size={18} />
                  Thêm giao dịch
                </Pressable>
              )}
            </div>
            <fieldset className="ledger-filters">
              <legend>Lọc sổ giao dịch</legend>
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
              <p className="text-sm text-slate-600">
                {periodLabel} · {visibleTransactions.length} giao dịch
              </p>
              {periodFilter.mode !== "all" && (
                <dl className="fund-period-totals">
                  <div>
                    <dt>Thu trong kỳ</dt>
                    <dd>{formatCurrency(periodTotals.income)}</dd>
                  </div>
                  <div>
                    <dt>Chi trong kỳ</dt>
                    <dd>{formatCurrency(periodTotals.expense)}</dd>
                  </div>
                  <div>
                    <dt>Chênh lệch kỳ</dt>
                    <dd>{formatCurrency(periodTotals.net)}</dd>
                  </div>
                </dl>
              )}
            </fieldset>
            {!visibleTransactions.length && (
              <p className="panel-empty">
                Không có giao dịch trong kỳ đã chọn.
              </p>
            )}
            <div className="transaction-list">
              {visibleTransactions.map((t) => (
                <article key={t.id} className="transaction-row">
                  <div className="transaction-description">
                    <p className="transaction-name">{t.title}</p>
                    <p className="transaction-meta">
                      {transactionLabel(t, timeZone)} · {t.author}
                    </p>
                  </div>
                  <div className="transaction-value">
                    <span
                      className={
                        t.type === "income"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }
                    >
                      {t.type === "income" ? "Thu" : "Chi"}
                    </span>
                    <strong className="tabular-nums">
                      {t.type === "income" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </strong>
                  </div>
                  {canManage && (
                    <details className="action-menu transaction-menu">
                      <summary aria-label={"Thao tác giao dịch " + t.title}>
                        <MoreHorizontal size={20} />
                      </summary>
                      <div className="menu-popover">
                        <Pressable
                          onClick={(e) => {
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
                          <Edit3 size={18} />
                          Sửa giao dịch
                        </Pressable>
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </div>
            {!transactions.length && (
              <p className="panel-empty">Chưa có giao dịch.</p>
            )}
          </section>
        )}
        {activeTab === "approvals" && (
          <section>
            <h2>Khoản nộp chờ duyệt</h2>
            {!pendingApprovals.length ? (
              <p className="panel-empty">Không có khoản nộp chờ duyệt.</p>
            ) : (
              pendingApprovals.map((p) => (
                <article key={p.id} className="fund-person-row">
                  <div className="min-w-0">
                    <h3>{p.name}</h3>
                    <p className="tabular-nums font-semibold mt-1">
                      {formatCurrency(p.amount)}
                    </p>
                    <p className="text-xs text-slate-600 break-words">
                      {p.bank} · {p.month}
                    </p>
                    <p className="text-xs text-slate-600 break-words">
                      {p.memo}
                    </p>
                  </div>
                  {canManage && (
                    <div className="grid gap-2 shrink-0">
                      <Pressable
                        className="primary-button shrink-0"
                        onClick={() => handleApprove(p.id)}
                      >
                        Xác nhận
                      </Pressable>
                      {onReject && (
                        <Pressable
                          type="button"
                          className="choice-button danger-action"
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
        {activeTab === "debtors" && (
          <section>
            <h2>Khoản quỹ chưa được xác nhận</h2>
            <p className="text-sm text-slate-600 mt-2">
              Khoản đang chờ duyệt vẫn nằm trong danh sách cho đến khi được xác
              nhận.
            </p>
            {!debtors.length ? (
              <p className="panel-empty">
                Không có khoản quỹ chưa được xác nhận.
              </p>
            ) : (
              debtors.map((d) => (
                <article key={d.id} className="fund-person-row">
                  <div className="min-w-0">
                    <h3>{d.name}</h3>
                    <p className="text-xs text-slate-600">
                      {d.phone} · {d.month}
                    </p>
                    <p className="text-xs mt-1 text-slate-600">
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
                    <details className="action-menu">
                      <summary aria-label={"Thao tác khoản đóng của " + d.name}>
                        <MoreHorizontal size={20} />
                      </summary>
                      <div className="menu-popover">
                        <Pressable
                          onClick={(e) => {
                            e.currentTarget.closest("details").open = false;
                            alert(
                              "Liên hệ " +
                                d.name +
                                ": " +
                                d.phone +
                                ". Chưa kết nối gửi tin Zalo tự động.",
                            );
                          }}
                        >
                          Thông tin liên hệ
                        </Pressable>
                      </div>
                    </details>
                  </div>
                </article>
              ))
            )}
          </section>
        )}
        {activeTab === "qr-config" && canManage && (
          <section>
            <Pressable
              className="text-action mb-3"
              onClick={() => setActiveTab(fundTabBeforeQr.current)}
            >
              <ChevronLeft size={18} />
              Quay lại Quỹ đội
            </Pressable>
            <h2>Tài khoản nhận quỹ</h2>
            <form className="match-form mt-4" onSubmit={handleSaveQrConfig}>
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
                      className="text-action"
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
                <p role="status">Đang xử lý ảnh hoặc lưu tài khoản…</p>
              )}
              {qrError && (
                <p role="alert" className="form-error">
                  {qrError}
                </p>
              )}
              <p className="field-hint">
                Lưu trên thiết bị theo tài khoản và đội hiện tại. Chưa cấu hình
                Supabase Storage hoặc đồng bộ ảnh giữa các thành viên.
              </p>
              <Pressable className="primary-button w-full" disabled={qrBusy}>
                Lưu tài khoản
              </Pressable>
              {qrSavedNotice && (
                <p role="status" className="text-sm text-emerald-700">
                  Đã lưu tài khoản nhận quỹ trên thiết bị.
                </p>
              )}
            </form>
          </section>
        )}
      </div>
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
              {txError && (
                <p role="alert" className="form-error">
                  {txError}
                </p>
              )}
              <footer className="sheet-footer">
                <Pressable className="primary-button w-full" disabled={txBusy}>
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
