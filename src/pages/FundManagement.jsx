import React, { useState, useRef } from "react";
import {
  MoreHorizontal,
  PlusCircle,
  X,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  ChevronLeft,
} from "lucide-react";
import { qrUrl, uid } from "../lib/teamModel";
import { formatCurrency } from "../lib/formatCurrency";

export default function FundManagement({
  onBack,
  treasurerQr,
  onUpdateTreasurerQr,
  funds,
  onChangeFunds,
  onApprove,
  currentUserRole = "owner",
}) {
  const canManage = ["owner", "admin"].includes(currentUserRole);
  const moreRef = useRef(null);
  const [activeTab, setActiveTab] = useState("transactions"); // 'transactions' | 'approvals' | 'debtors' | 'qr-config'
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

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
  const qrPreviewUrl = qrUrl({
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
    const cell = (value) => {
      const text = String(value ?? "");
      return (
        '"' +
        (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') +
        '"'
      );
    };

    const rows = transactions.map((t, index) => [
      index + 1,
      cell(t.date),
      cell(t.title),
      t.type === "income" ? "Khoản Thu" : "Khoản Chi",
      t.amount,
      cell(t.author),
    ]);

    rows.push([]);
    rows.push(["", "", "Tổng Thu:", "", totalIncome, ""]);
    rows.push(["", "", "Tổng Chi:", "", totalExpense, ""]);
    rows.push(["", "", "Số Dư Hiện Tại:", "", currentBalance, ""]);

    const csvContent =
      "\uFEFF" + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `No_Offside_So_Quy_FC_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApprove = onApprove;

  const handleSaveQrConfig = (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (!qrPreviewUrl) {
      alert("Số tài khoản phải gồm 6–25 chữ số.");
      return;
    }
    if (onUpdateTreasurerQr) {
      onUpdateTreasurerQr({
        bankName: qrBankName,
        bankCode: qrBankCode,
        accountNumber: qrAccountNumber,
        accountHolder: qrAccountHolder,
        qrImageUrl: qrPreviewUrl,
      });
    }
    setQrSavedNotice(true);
    setTimeout(() => setQrSavedNotice(false), 2500);
  };

  const handleSaveEditedTx = (e) => {
    e.preventDefault();
    if (!canManage || !editingTransaction) return;
    if (
      !editingTransaction.title.trim() ||
      !Number.isInteger(Number(editingTransaction.amount)) ||
      Number(editingTransaction.amount) <= 0
    ) {
      alert("Nội dung và số tiền phải hợp lệ.");
      return;
    }
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === editingTransaction.id ? editingTransaction : t,
      ),
    );
    setEditingTransaction(null);
  };

  const handleCreateTx = (e) => {
    e.preventDefault();
    if (!canManage) return;
    if (
      !newTxTitle.trim() ||
      !Number.isInteger(Number(newTxAmount)) ||
      Number(newTxAmount) <= 0
    ) {
      alert("Nhập nội dung và số tiền nguyên lớn hơn 0.");
      return;
    }
    const newTx = {
      id: uid(),
      title: newTxTitle.trim(),
      amount: parseInt(newTxAmount) || 0,
      type: newTxType,
      date: new Date().toLocaleDateString("vi-VN"),
      author: "Thủ quỹ",
    };
    setTransactions([newTx, ...transactions]);
    setNewTxTitle("");
    setNewTxAmount("");
    setShowAddTxModal(false);
  };

  const closeMore = () => {
    if (moreRef.current) moreRef.current.open = false;
  };
  const banks = [
    ["970422", "MB Bank"],
    ["970436", "Vietcombank"],
    ["970407", "Techcombank"],
    ["970415", "VietinBank"],
    ["970418", "BIDV"],
    ["970405", "Agribank"],
    ["970416", "ACB"],
    ["970432", "VPBank"],
    ["970403", "Sacombank"],
  ];
  return (
    <div className="fund-page">
      <header className="compact-header">
        <h1>Quỹ đội</h1>
        <details className="action-menu" ref={moreRef}>
          <summary aria-label="Thêm tùy chọn quỹ">
            <MoreHorizontal size={20} />
            <span>Thêm</span>
          </summary>
          <div className="menu-popover">
            <button
              onClick={() => {
                handleExportExcel();
                closeMore();
              }}
            >
              <FileSpreadsheet size={18} />
              Xuất Excel
            </button>
            {canManage && (
              <button
                onClick={() => {
                  setActiveTab("qr-config");
                  closeMore();
                }}
              >
                <CreditCard size={18} />
                Tài khoản nhận quỹ
              </button>
            )}
          </div>
        </details>
      </header>
      <section className="fund-summary">
        <p className="text-sm text-slate-600">Tổng quan quỹ</p>
        <p className="fund-balance tabular-nums">
          {formatCurrency(currentBalance)}
        </p>
        <p className="text-xs text-slate-500">Toàn bộ giao dịch đã ghi</p>
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
            ["debtors", "Chưa nộp", debtors.length],
          ].map(([id, label, count]) => (
            <button
              key={id}
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
            >
              <span>{label}</span>
              <span className="segment-count">{count}</span>
            </button>
          ))}
        </div>
      )}
      <div className="fund-content">
        {activeTab === "transactions" && (
          <section>
            <div className="section-toolbar">
              <h2>Giao dịch</h2>
              {canManage && (
                <button
                  className="text-action"
                  onClick={() => setShowAddTxModal(true)}
                >
                  <PlusCircle size={18} />
                  Thêm giao dịch
                </button>
              )}
            </div>
            <div className="transaction-list">
              {transactions.map((t) => (
                <article key={t.id} className="transaction-row">
                  <div className="transaction-description">
                    <p className="transaction-name">{t.title}</p>
                    <p className="transaction-meta">
                      {t.date} · {t.author}
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
                        <button
                          onClick={(e) => {
                            setEditingTransaction({ ...t });
                            e.currentTarget.closest("details").open = false;
                          }}
                        >
                          <Edit3 size={18} />
                          Sửa giao dịch
                        </button>
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
                    <button
                      className="primary-button shrink-0"
                      onClick={() => handleApprove(p.id)}
                    >
                      Xác nhận
                    </button>
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
                        <button
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
                        </button>
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
            <button
              className="text-action mb-3"
              onClick={() => setActiveTab("transactions")}
            >
              <ChevronLeft size={18} />
              Giao dịch
            </button>
            <h2>Tài khoản nhận quỹ</h2>
            <form className="match-form mt-4" onSubmit={handleSaveQrConfig}>
              <label className="form-field">
                Ngân hàng
                <select
                  value={qrBankCode}
                  onChange={(e) => {
                    setQrBankCode(e.target.value);
                    setQrBankName(
                      banks.find((b) => b[0] === e.target.value)[1],
                    );
                    setQrSavedNotice(false);
                  }}
                >
                  {banks.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
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
              {qrPreviewUrl && (
                <img
                  src={qrPreviewUrl}
                  alt="Mã QR tài khoản nhận quỹ"
                  className="w-48 max-w-full mx-auto rounded-2xl"
                />
              )}
              <button className="primary-button w-full">Lưu tài khoản</button>
              {qrSavedNotice && (
                <p role="status" className="text-sm text-emerald-700">
                  Đã lưu tài khoản nhận quỹ.
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
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => {
                  setShowAddTxModal(false);
                  setEditingTransaction(null);
                }}
              >
                <X size={20} />
              </button>
            </header>
            <form
              className="match-form"
              onSubmit={
                editingTransaction ? handleSaveEditedTx : handleCreateTx
              }
            >
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
              <footer className="sheet-footer">
                <button className="primary-button w-full">Lưu giao dịch</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
