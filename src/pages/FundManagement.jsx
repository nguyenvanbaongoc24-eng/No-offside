import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Share2,
  Calendar,
  ChevronRight,
  Sparkles,
  X,
  CreditCard,
  Download,
  Edit3,
  QrCode,
  Save,
  FileSpreadsheet,
  Camera,
  ChevronLeft
} from 'lucide-react';
import { qrUrl, uid } from '../lib/teamModel';
import { formatCurrency, formatCompactCurrency } from '../lib/formatCurrency';

export default function FundManagement({
  onBack,
  treasurerQr,
  onUpdateTreasurerQr,
  funds, onChangeFunds, onApprove,
  currentUserRole = 'owner'
}) {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'approvals' | 'debtors' | 'qr-config'
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // QR config state
  const [qrBankName, setQrBankName] = useState(treasurerQr?.bankName || 'MB Bank (Quân Đội)');
  const [qrAccountNumber, setQrAccountNumber] = useState(treasurerQr?.accountNumber ?? '');
  const [qrAccountHolder, setQrAccountHolder] = useState(treasurerQr?.accountHolder ?? '');
  const [qrBankCode, setQrBankCode] = useState(treasurerQr?.bankCode || '970422');
  const qrPreviewUrl = qrUrl({bankCode: qrBankCode, accountNumber: qrAccountNumber, accountHolder: qrAccountHolder});
  const [qrSavedNotice, setQrSavedNotice] = useState(false);

  // New Transaction State
  const [newTxTitle, setNewTxTitle] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxType, setNewTxType] = useState('expense'); // 'income' | 'expense'

  // Transactions list (Có thể Edit / Sửa)
  const transactions = funds.transactions;
  const setTransactions = value => onChangeFunds(prev => ({ ...prev, transactions: typeof value === 'function' ? value(prev.transactions) : value }));

  // Pending Approvals
  const pendingApprovals = funds.pendingApprovals;
  const setPendingApprovals = value => onChangeFunds(prev => ({ ...prev, pendingApprovals: typeof value === 'function' ? value(prev.pendingApprovals) : value }));

  // Debtors list
  const debtors = funds.debtors;
  const setDebtors = value => onChangeFunds(prev => ({ ...prev, debtors: typeof value === 'function' ? value(prev.debtors) : value }));

  // Dynamic calculations for Tổng thu, Tổng chi, Số dư
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // HÀM XUẤT EXCEL (CSV VỚI UTF-8 BOM CHO EXCEL VIỆT NAM)
  const handleExportExcel = () => {
    const headers = ['STT', 'Ngày Giao Dịch', 'Nội Dung Thu Chi', 'Loại', 'Số Tiền (VNĐ)', 'Người Phụ Trách'];
    const cell = value => { const text = String(value ?? ''); return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"'; };

    const rows = transactions.map((t, index) => [
      index + 1,
      cell(t.date),
      cell(t.title),
      t.type === 'income' ? 'Khoản Thu' : 'Khoản Chi',
      t.amount,
      cell(t.author)
    ]);

    rows.push([]);
    rows.push(['', '', 'Tổng Thu:', '', totalIncome, '']);
    rows.push(['', '', 'Tổng Chi:', '', totalExpense, '']);
    rows.push(['', '', 'Số Dư Hiện Tại:', '', currentBalance, '']);

    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `No_Offside_So_Quy_FC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleApprove = onApprove;

  const handleSaveQrConfig = (e) => {
    e.preventDefault();
    if (!qrPreviewUrl) { alert('Số tài khoản phải gồm 6–25 chữ số.'); return; }
    if (onUpdateTreasurerQr) {
      onUpdateTreasurerQr({
        bankName: qrBankName, bankCode: qrBankCode,
        accountNumber: qrAccountNumber,
        accountHolder: qrAccountHolder,
        qrImageUrl: qrPreviewUrl
      });
    }
    setQrSavedNotice(true);
    setTimeout(() => setQrSavedNotice(false), 2500);
  };



  const handleSaveEditedTx = (e) => {
    e.preventDefault();
    if (!editingTransaction) return;
    if (!editingTransaction.title.trim() || !Number.isInteger(Number(editingTransaction.amount)) || Number(editingTransaction.amount) <= 0) { alert('Nội dung và số tiền phải hợp lệ.'); return; }
    setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? editingTransaction : t));
    setEditingTransaction(null);
  };

  const handleCreateTx = (e) => {
    e.preventDefault();
    if (!newTxTitle.trim() || !Number.isInteger(Number(newTxAmount)) || Number(newTxAmount) <= 0) { alert('Nhập nội dung và số tiền nguyên lớn hơn 0.'); return; }
    const newTx = {
      id: uid(),
      title: newTxTitle.trim(),
      amount: parseInt(newTxAmount) || 0,
      type: newTxType,
      date: new Date().toLocaleDateString('vi-VN'),
      author: 'Thủ quỹ'
    };
    setTransactions([newTx, ...transactions]);
    setNewTxTitle('');
    setNewTxAmount('');
    setShowAddTxModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-safe pb-32 font-sans antialiased">

      {/* 1. Header Dark Geometric Style */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-8 px-4 rounded-b-[36px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="max-w-md mx-auto">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
            {onBack && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" /> <span>Quay lại</span>
              </motion.button>
            )}

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap flex-shrink-0">
              Module Thủ Quỹ Chuyên Nghiệp
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Quản Lý Quỹ Đội</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 whitespace-nowrap">
                  👑 Thủ Quỹ
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Sổ quỹ thu chi, duyệt VietQR và xuất báo cáo
              </p>
            </div>

            {/* NÚT XUẤT EXCEL (.CSV) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/30 cursor-pointer whitespace-nowrap flex-shrink-0"
              title="Tải file CSV báo cáo thu chi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD HIỂN THỊ: TỔNG THU - TỔNG CHI - SỐ DƯ HIỆN TẠI (ÁP DỤNG HELPER FORMAT CURRENCY) */}
      <div className="max-w-md mx-auto px-3.5 -mt-4 relative z-10">
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2.5 px-1">
            BÁO CÁO TÀI CHÍNH THỰC TẾ
          </span>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Tổng Thu */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100/80">
              <span className="text-xs font-bold text-emerald-800 block">Tổng Thu</span>
              <span className="text-base font-bold text-emerald-700 tabular-nums mt-0.5 block truncate">
                +{formatCompactCurrency(totalIncome)}
              </span>
              <span className="text-xs text-emerald-600 font-medium block truncate" title={formatCurrency(totalIncome)}>
                {formatCurrency(totalIncome)}
              </span>
            </div>

            {/* Tổng Chi */}
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-100/80">
              <span className="text-xs font-bold text-rose-800 block">Tổng Chi</span>
              <span className="text-base font-bold text-rose-600 tabular-nums mt-0.5 block truncate">
                -{formatCompactCurrency(totalExpense)}
              </span>
              <span className="text-xs text-rose-500 font-medium block truncate" title={formatCurrency(totalExpense)}>
                {formatCurrency(totalExpense)}
              </span>
            </div>

            {/* Số Dư Hiện Tại */}
            <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-sm">
              <span className="text-xs font-bold text-emerald-400 block">Số Dư Quỹ</span>
              <span className="text-base font-bold text-white tabular-nums mt-0.5 block truncate">
                {currentBalance >= 0 ? '+' : ''}{formatCompactCurrency(currentBalance)}
              </span>
              <span className="text-xs text-gray-300 font-medium block truncate" title={formatCurrency(currentBalance)}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS ĐIỀU HƯỚNG SUB-MODULES */}
      <div className="max-w-md mx-auto px-3.5 mt-3">
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl text-xs font-bold text-center">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lịch sử ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Duyệt ({pendingApprovals.length})
          </button>

          <button
            onClick={() => setActiveTab('debtors')}
            className={`py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'debtors'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chưa nộp ({debtors.length})
          </button>

          <button
            onClick={() => setActiveTab('qr-config')}
            className={`py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'qr-config'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            QR Thủ Quỹ
          </button>
        </div>
      </div>

      {/* 4. NỘI DUNG TỪNG TAB */}
      <div className="max-w-md mx-auto px-3.5 mt-3">

        {/* TAB 1: LỊCH SỬ THU CHI (CÓ THỂ SỬA EDIT & XUẤT EXCEL) */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  LỊCH SỬ THU / CHI ĐỘI BÓNG
                </h3>
                <p className="text-xs text-gray-400">Chạm icon bút chì để sửa khoản đã nhập sai</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddTxModal(true)}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-green-500/25 whitespace-nowrap flex-shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Thêm khoản</span>
              </motion.button>
            </div>

            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-slate-50 border border-gray-100 flex flex-wrap gap-3 items-center justify-between group hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 w-full">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 break-words">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.date} • {t.author}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className={`text-xs tabular-nums font-bold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>

                    {/* NÚT EDIT (SỬA) KHOẢN TIỀN / NỘI DUNG */}
                    <button
                      onClick={() => setEditingTransaction({ ...t })}
                      className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-300 active:scale-90 transition-all cursor-pointer shadow-xs"
                      title="Sửa khoản giao dịch này"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DUYỆT TIỀN THÀNH VIÊN ĐÓNG QUA VIETQR */}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                CHỜ THỦ QUỸ DUYỆT TIỀN ({pendingApprovals.length})
              </h3>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                🎉 Đã duyệt hết tất cả các khoản đóng quỹ!
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.map((p) => (
                  <div key={p.id} className="p-3 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{p.name}</p>
                      <p className="text-xs font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(p.amount)} • {p.bank}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">{p.memo}</p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(p.id)}
                      className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-md shadow-green-500/25 cursor-pointer whitespace-nowrap flex-shrink-0 flex items-center justify-center"
                    >
                      Duyệt
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DANH SÁCH THÀNH VIÊN CHƯA NỘP QUỸ */}
        {activeTab === 'debtors' && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                DANH SÁCH CHƯA NỘP QUỸ ({debtors.length})
              </h3>
              <span className="text-xs font-bold text-rose-600 tabular-nums">
                Tổng nợ: {formatCurrency(debtors.length * 150000)}
              </span>
            </div>

            <div className="space-y-2">
              {debtors.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">SĐT: {d.phone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 tabular-nums">
                      -{formatCurrency(d.amount)}
                    </span>
                    <button
                      onClick={() => alert(`Liên hệ ${d.name}: ${d.phone}. Chưa kết nối gửi tin Zalo tự động.`)}
                      className="px-2.5 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs cursor-pointer whitespace-nowrap"
                    >
                      🔔 Nhắc
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CẤU HÌNH QR THỦ QUỸ (HIỂN THỊ CHO TOÀN BỘ THÀNH VIÊN) */}
        {activeTab === 'qr-config' && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  CẤU HÌNH QR THỦ QUỸ
                </h3>
                <p className="text-xs text-gray-400">
                  Mã QR này sẽ hiển thị ở trang chủ cho mọi thành viên khi bấm Nộp Quỹ
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                Thủ Quỹ
              </span>
            </div>

            <form onSubmit={handleSaveQrConfig} className="space-y-3 text-xs">
              {/* QR Code Preview */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                <img
                  src={qrPreviewUrl}
                  alt="QR Thủ Quỹ"
                  className="w-44 h-44 object-contain rounded-xl shadow-sm border border-gray-200 bg-white"
                />
                <p className="text-sm text-slate-500 mt-3">QR được tạo từ ngân hàng và số tài khoản bên dưới.</p>
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Tên Ngân Hàng</label>
                <select aria-label="Ngân hàng nhận quỹ" className="w-full h-12 rounded-xl border border-slate-200 px-3" value={qrBankCode} onChange={e=>{setQrBankCode(e.target.value);setQrBankName(e.target.options[e.target.selectedIndex].text);}}><option value="970422">MB Bank</option><option value="970436">Vietcombank</option><option value="970407">Techcombank</option><option value="970418">BIDV</option><option value="970415">VietinBank</option><option value="970416">ACB</option><option value="970432">VPBank</option><option value="970403">Sacombank</option><option value="970405">Agribank</option></select>
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Số Tài Khoản</label>
                <input
                  type="text"
                  required
                  value={qrAccountNumber}
                  onChange={(e) => setQrAccountNumber(e.target.value)}
                  placeholder="Số tài khoản ngân hàng"
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Tên Chủ Tài Khoản (In hoa không dấu)</label>
                <input
                  type="text"
                  required
                  value={qrAccountHolder}
                  onChange={(e) => setQrAccountHolder(e.target.value.toUpperCase())}
                  placeholder="NGUYEN HOANG HAI"
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer mt-2 whitespace-nowrap flex items-center justify-center"
              >
                {qrSavedNotice ? '✓ Đã Lưu Cấu Hình QR Thủ Quỹ' : 'Lưu QR Vào Trang Chủ Cả Đội'}
              </motion.button>
            </form>
          </div>
        )}

      </div>

      {/* MODAL EDIT (SỬA) KHOẢN TIỀN & NỘI DUNG ĐÃ NHẬP SAI */}
      {editingTransaction && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900">Sửa Khoản Thu Chi</h3>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTx} className="mt-3.5 space-y-3 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-bold">Nội dung khoản tiền</label>
                <input
                  type="text"
                  required
                  value={editingTransaction.title}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, title: e.target.value })}
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-900 focus:bg-white focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  required
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseInt(e.target.value) || 0 })}
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'income' })}
                    className={`h-10 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      editingTransaction.type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'expense' })}
                    className={`h-10 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      editingTransaction.type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Chi (-)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full h-12 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  Lưu Chỉnh Sửa Khoản Này
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM KHOẢN MỚI */}
      {showAddTxModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-gray-900">Tạo Khoản Thu/Chi Mới</h3>
              </div>
              <button aria-label="Đóng" onClick={() => setShowAddTxModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="mt-3.5 space-y-3 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-bold">Nội dung</label>
                <input
                  type="text"
                  required
                  value={newTxTitle}
                  onChange={(e) => setNewTxTitle(e.target.value)}
                  placeholder="Ví dụ: Tiền nước, bóng thi đấu..."
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-900 focus:bg-white focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  required
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(e.target.value)}
                  placeholder="150000"
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Loại</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTxType('income')}
                    className={`h-10 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      newTxType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTxType('expense')}
                    className={`h-10 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      newTxType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Chi (-)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-lg shadow-green-500/30 cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  Xác Nhận Thêm Vào Sổ Quỹ
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
