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

export default function FundManagement({ 
  onBack, 
  treasurerQr,
  onUpdateTreasurerQr,
  currentUserRole = 'admin' 
}) {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'approvals' | 'debtors' | 'qr-config'
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // QR config state
  const [qrBankName, setQrBankName] = useState(treasurerQr?.bankName || 'MB Bank (Quân Đội)');
  const [qrAccountNumber, setQrAccountNumber] = useState(treasurerQr?.accountNumber || '998877665544');
  const [qrAccountHolder, setQrAccountHolder] = useState(treasurerQr?.accountHolder || 'NGUYEN HOANG HAI');
  const [qrPreviewUrl, setQrPreviewUrl] = useState(treasurerQr?.qrImageUrl || `https://api.vietqr.io/image/970422-998877665544-compact2.png?amount=150000&addInfo=NO%20OFFSIDE%20DONG%20QUY&accountName=NGUYEN%20HOANG%20HAI`);
  const [qrSavedNotice, setQrSavedNotice] = useState(false);

  // New Transaction State
  const [newTxTitle, setNewTxTitle] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxType, setNewTxType] = useState('expense'); // 'income' | 'expense'

  // Transactions list (Có thể Edit / Sửa)
  const [transactions, setTransactions] = useState([
    { id: 1, title: 'Thu quỹ tháng 10 (14 thành viên)', amount: 2100000, type: 'income', date: '12/10/2026', author: 'Thủ quỹ Hải' },
    { id: 2, title: 'Tiền thuê Sân Chuyên Việt (Tháng 9)', amount: 1200000, type: 'expense', date: '10/10/2026', author: 'Thủ quỹ Hải' },
    { id: 3, title: 'Mua 2 lốc nước khoáng Lavie', amount: 120000, type: 'expense', date: '08/10/2026', author: 'Thủ quỹ Hải' },
    { id: 4, title: 'Mua 2 quả bóng Động Lực UHV 2.05', amount: 980000, type: 'expense', date: '01/10/2026', author: 'Đội trưởng' },
    { id: 5, title: 'Thu tiền tài trợ áo đấu mới', amount: 3500000, type: 'income', date: '28/09/2026', author: 'Bầu Thắng' },
    { id: 6, title: 'In ấn logo và số áo thi đấu', amount: 850000, type: 'expense', date: '26/09/2026', author: 'Thủ quỹ Hải' },
  ]);

  // Pending Approvals
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, name: 'Nguyễn Quang Hải (#19)', amount: 150000, time: '10 phút trước', bank: 'Vietcombank', memo: 'NO OFFSIDE SO 19 DONG QUY' },
    { id: 2, name: 'Đoàn Văn Hậu (#5)', amount: 150000, time: '35 phút trước', bank: 'MB Bank', memo: 'NO OFFSIDE SO 5 DONG QUY' },
    { id: 3, name: 'Bùi Tiến Dũng (#4)', amount: 150000, time: '1 giờ trước', bank: 'Techcombank', memo: 'NO OFFSIDE SO 4 DONG QUY' },
  ]);

  // Debtors list
  const [debtors, setDebtors] = useState([
    { id: 1, name: 'Nguyễn Tuấn Anh (#11)', phone: '0901234567', amount: 150000, status: 'unpaid' },
    { id: 2, name: 'Nguyễn Tiến Linh (#22)', phone: '0902345678', amount: 150000, status: 'unpaid' },
    { id: 3, name: 'Đỗ Duy Mạnh (#28)', phone: '0903456789', amount: 150000, status: 'unpaid' },
    { id: 4, name: 'Vũ Văn Thanh (#17)', phone: '0904567890', amount: 150000, status: 'unpaid' },
    { id: 5, name: 'Phan Văn Đức (#20)', phone: '0905678901', amount: 150000, status: 'unpaid' },
    { id: 6, name: 'Hồ Tấn Tài (#13)', phone: '0906789012', amount: 150000, status: 'unpaid' },
  ]);

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
    // Header line
    const headers = ['STT', 'Ngày Giao Dịch', 'Nội Dung Thu Chi', 'Loại', 'Số Tiền (VNĐ)', 'Người Phụ Trách'];
    
    // Rows data
    const rows = transactions.map((t, index) => [
      index + 1,
      `"${t.date}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Khoản Thu' : 'Khoản Chi',
      t.amount,
      `"${t.author}"`
    ]);

    // Summary rows
    rows.push([]);
    rows.push(['', '', 'Tổng Thu:', '', totalIncome, '']);
    rows.push(['', '', 'Tổng Chi:', '', totalExpense, '']);
    rows.push(['', '', 'Số Dư Hiện Tại:', '', currentBalance, '']);

    // Build CSV string with UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n');
    
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `No_Offside_So_Quy_FC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprove = (id) => {
    const item = pendingApprovals.find(p => p.id === id);
    if (!item) return;
    setPendingApprovals(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => [
      {
        id: Date.now(),
        title: `Thu quỹ: ${item.name}`,
        amount: item.amount,
        type: 'income',
        date: 'Hôm nay',
        author: 'Duyệt tự động'
      },
      ...prev
    ]);
  };

  const handleSaveQrConfig = (e) => {
    e.preventDefault();
    const updated = {
      bankName: qrBankName,
      accountNumber: qrAccountNumber,
      accountHolder: qrAccountHolder,
      qrImageUrl: qrPreviewUrl
    };
    if (onUpdateTreasurerQr) {
      onUpdateTreasurerQr(updated);
    }
    setQrSavedNotice(true);
    setTimeout(() => setQrSavedNotice(false), 2500);
  };

  const handleQrImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setQrPreviewUrl(url);
    }
  };

  const handleSaveEditedTx = (e) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setTransactions(prev => prev.map(t => 
      t.id === editingTransaction.id ? editingTransaction : t
    ));
    setEditingTransaction(null);
  };

  const handleCreateTx = (e) => {
    e.preventDefault();
    if (!newTxTitle.trim() || !newTxAmount) return;
    const newTx = {
      id: Date.now(),
      title: newTxTitle.trim(),
      amount: parseInt(newTxAmount) || 0,
      type: newTxType,
      date: 'Hôm nay',
      author: 'Thủ quỹ'
    };
    setTransactions(prev => [newTx, ...prev]);
    setNewTxTitle('');
    setNewTxAmount('');
    setShowAddTxModal(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. Header Dark Geometric Style */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-12 px-5 rounded-b-[40px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            {onBack && (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="flex items-center gap-1 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </motion.button>
            )}

            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Module Thủ Quỹ Chuyên Nghiệp
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Quản Lý Quỹ Đội</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  Thủ Quỹ
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Sổ quỹ thu chi, duyệt VietQR và cấu hình tài khoản nhận tiền
              </p>
            </div>

            {/* NÚT XUẤT EXCEL (.CSV) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
              title="Tải file CSV báo cáo thu chi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD HIỂN THỊ: TỔNG THU - TỔNG CHI - SỐ DƯ HIỆN TẠI */}
      <div className="max-w-md mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-3 px-1">
            BÁO CÁO TÀI CHÍNH THỰC TẾ
          </span>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Tổng Thu */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100/80">
              <span className="text-[10px] font-bold text-emerald-800 block">Tổng Thu</span>
              <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block truncate">
                +{totalIncome.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[9px] text-emerald-600 font-medium">Từ nộp quỹ & tài trợ</span>
            </div>

            {/* Tổng Chi */}
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-100/80">
              <span className="text-[10px] font-bold text-rose-800 block">Tổng Chi</span>
              <span className="text-base font-black text-rose-600 font-mono mt-0.5 block truncate">
                -{totalExpense.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[9px] text-rose-500 font-medium">Sân, bóng, nước</span>
            </div>

            {/* Số Dư Hiện Tại */}
            <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 block">Số Dư Quỹ</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block truncate">
                {currentBalance.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[9px] text-gray-300 font-medium">Tồn quỹ an toàn</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS ĐIỀU HƯỚNG SUB-MODULES */}
      <div className="max-w-md mx-auto px-4 mt-3">
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl text-xs font-bold text-center">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'transactions' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lịch sử ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'approvals' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Duyệt ({pendingApprovals.length})
          </button>

          <button
            onClick={() => setActiveTab('debtors')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'debtors' 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chưa nộp ({debtors.length})
          </button>

          <button
            onClick={() => setActiveTab('qr-config')}
            className={`py-2 rounded-xl transition-all ${
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
      <div className="max-w-md mx-auto px-4 mt-3">

        {/* TAB 1: LỊCH SỬ THU CHI (CÓ THỂ SỬA EDIT & XUẤT EXCEL) */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                  LỊCH SỬ THU / CHI ĐỘI BÓNG
                </h3>
                <p className="text-[10px] text-gray-400">Chạm icon bút chì để sửa khoản đã nhập sai</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddTxModal(true)}
                className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Thêm khoản</span>
              </motion.button>
            </div>

            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="p-3 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-between group hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-400">{t.date} • {t.author}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-mono font-black ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')} đ
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
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
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
                      <p className="text-xs font-black text-gray-900">{p.name}</p>
                      <p className="text-[11px] font-bold text-emerald-600">{p.amount.toLocaleString('vi-VN')} đ • {p.bank}</p>
                      <p className="text-[9px] text-gray-400 font-mono">{p.memo}</p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(p.id)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
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
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                DANH SÁCH CHƯA NỘP QUỸ ({debtors.length})
              </h3>
              <span className="text-xs font-black text-rose-600 font-mono">
                Tổng nợ: {(debtors.length * 150000).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="space-y-2">
              {debtors.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-gray-900">{d.name}</p>
                    <p className="text-[10px] text-gray-500">SĐT: {d.phone}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-600 font-mono">-150.000 đ</span>
                    <button
                      onClick={() => alert(`Đã gửi thông báo nhắc nợ quỹ tới ${d.name} qua Zalo!`)}
                      className="px-2.5 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] cursor-pointer"
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
          <div className="bg-white rounded-[32px] shadow-soft border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                  CẤU HÌNH QR THỦ QUỸ
                </h3>
                <p className="text-[10px] text-gray-400">
                  Mã QR này sẽ hiển thị ở trang chủ cho mọi thành viên khi bấm Nộp Quỹ
                </p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Thủ Quỹ
              </span>
            </div>

            <form onSubmit={handleSaveQrConfig} className="space-y-3.5 text-xs">
              {/* QR Code Preview */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                <img 
                  src={qrPreviewUrl} 
                  alt="QR Thủ Quỹ" 
                  className="w-44 h-44 object-contain rounded-xl shadow-sm border border-gray-200 bg-white"
                />
                <label className="mt-3 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1.5 hover:bg-gray-50 cursor-pointer shadow-xs active:scale-95">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tải ảnh mã QR ngân hàng cá nhân</span>
                  <input type="file" accept="image/*" onChange={handleQrImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Tên Ngân Hàng</label>
                <input
                  type="text"
                  required
                  value={qrBankName}
                  onChange={(e) => setQrBankName(e.target.value)}
                  placeholder="MB Bank, Vietcombank, Techcombank..."
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-gray-700 block mb-1 font-bold">Số Tài Khoản</label>
                <input
                  type="text"
                  required
                  value={qrAccountNumber}
                  onChange={(e) => setQrAccountNumber(e.target.value)}
                  placeholder="Số tài khoản ngân hàng"
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-mono font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer mt-2"
              >
                {qrSavedNotice ? '✓ Đã Lưu Cấu Hình QR Thủ Quỹ' : 'Lưu QR Vào Trang Chủ Cả Đội'}
              </motion.button>
            </form>
          </div>
        )}

      </div>

      {/* MODAL EDIT (SỬA) KHOẢN TIỀN & NỘI DUNG ĐÃ NHẬP SAI */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-sm text-gray-900">Sửa Khoản Thu Chi</h3>
              </div>
              <button onClick={() => setEditingTransaction(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
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
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  required
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseInt(e.target.value) || 0 })}
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-mono font-black text-gray-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'income' })}
                    className={`h-10 rounded-xl font-bold transition-all ${
                      editingTransaction.type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'expense' })}
                    className={`h-10 rounded-xl font-bold transition-all ${
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
                  className="w-full h-12 rounded-full bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-sm text-gray-900">Tạo Khoản Thu/Chi Mới</h3>
              </div>
              <button onClick={() => setShowAddTxModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
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
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-gray-900 focus:bg-white focus:outline-none"
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
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-mono font-black text-gray-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-bold">Loại</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTxType('income')}
                    className={`h-10 rounded-xl font-bold transition-all ${
                      newTxType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Khoản Thu (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTxType('expense')}
                    className={`h-10 rounded-xl font-bold transition-all ${
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
                  className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer"
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
