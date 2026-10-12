import React, { useState } from 'react';
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
  CreditCard
} from 'lucide-react';

export default function FundManagement({ onBack }) {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'debtors' | 'transactions'
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState('expense'); // 'income' | 'expense'

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

  // Transactions list
  const [transactions, setTransactions] = useState([
    { id: 1, title: 'Thu quỹ tháng 10 (14 thành viên)', amount: 2100000, type: 'income', date: '12/10/2026', author: 'Thủ quỹ Hải' },
    { id: 2, title: 'Tiền thuê Sân Chuyên Việt (Tháng 9)', amount: 1200000, type: 'expense', date: '10/10/2026', author: 'Thủ quỹ Hải' },
    { id: 3, title: 'Mua 2 lốc nước khoáng Lavie', amount: 120000, type: 'expense', date: '08/10/2026', author: 'Thủ quỹ Hải' },
    { id: 4, title: 'Mua 2 quả bóng Động Lực UHV 2.05', amount: 980000, type: 'expense', date: '01/10/2026', author: 'Đội trưởng' },
  ]);

  const handleApprove = (id) => {
    const item = pendingApprovals.find(p => p.id === id);
    if (!item) return;
    setPendingApprovals(prev => prev.filter(p => p.id !== id));
    // Add to transactions
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

  const handleRemindDebtor = (name) => {
    alert(`Đã gửi thông báo nhắc nợ quỹ tháng 10 tới ${name} qua Zalo Đội!`);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-['Be_Vietnam_Pro'] antialiased select-none">
      
      {/* 1. Header Dark Style với texture geometric */}
      <section className="bg-slate-900 text-white pt-safe-hero pb-12 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  Kế Toán & Thủ Quỹ
                </span>
                <h1 className="text-xl font-black text-white">Quản Lý Quỹ Đội</h1>
              </div>
            </div>

            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              Chỉ Dành Cho Admin
            </span>
          </div>

          {/* Sổ quỹ tổng quan */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] text-gray-400 block font-medium">Tổng Quỹ Hiện Tại</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">+5.850.000 đ</span>
              <span className="text-[10px] text-emerald-300/80">Số dư thực tế</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] text-gray-400 block font-medium">Chưa Thu (6 người)</span>
              <span className="text-xl font-black text-rose-400 font-mono mt-0.5 block">-900.000 đ</span>
              <span className="text-[10px] text-rose-300/80">Nợ quỹ tháng 10</span>
            </div>
          </div>

          {/* 2 Nút Thu / Chi */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => { setTxType('income'); setShowAddTxModal(true); }}
              className="py-2.5 px-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Ghi Khoản Thu</span>
            </button>
            <button
              onClick={() => { setTxType('expense'); setShowAddTxModal(true); }}
              className="py-2.5 px-3 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Ghi Khoản Chi</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Tabs Selector (Approvals, Debtors, Transactions) */}
      <div className="px-4 mt-3">
        <div className="bg-white p-1 rounded-2xl shadow-soft border border-gray-100 flex gap-1">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === 'approvals'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Chờ Duyệt ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab('debtors')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === 'debtors'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Nợ Quỹ ({debtors.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Lịch Sử Thu Chi
          </button>
        </div>
      </div>

      {/* 3. Tab Content */}
      <div className="px-4 mt-3">

        {/* Tab 1: Chờ duyệt tiền */}
        {activeTab === 'approvals' && (
          <div className="space-y-2.5">
            {pendingApprovals.length === 0 ? (
              <div className="bg-white rounded-[28px] p-8 text-center border border-gray-100 shadow-soft">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-extrabold text-sm text-gray-900">Không có khoản chờ duyệt</h4>
                <p className="text-xs text-gray-400 mt-1">Toàn bộ giao dịch chuyển khoản VietQR đã được xử lý xong!</p>
              </div>
            ) : (
              pendingApprovals.map((item) => (
                <div key={item.id} className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-soft flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">{item.name}</h4>
                    <p className="text-xs font-black text-emerald-600 font-mono mt-0.5">
                      +{item.amount.toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{item.bank} • {item.time}</p>
                  </div>
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all duration-200"
                  >
                    Duyệt Tiền
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Danh sách nợ quỹ */}
        {activeTab === 'debtors' && (
          <div className="space-y-2.5">
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
              <span className="text-amber-800 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                6 thành viên chưa nộp quỹ T10
              </span>
              <button
                onClick={() => alert('Đã gửi thông báo nhắc nợ toàn bộ thành viên vào nhóm Zalo Đội!')}
                className="px-2.5 py-1 rounded-full bg-amber-600 text-white font-bold text-[11px] active:scale-95 transition-all"
              >
                Nhắc Tất Cả
              </button>
            </div>

            {debtors.map((debtor) => (
              <div key={debtor.id} className="bg-white rounded-[24px] p-3.5 border border-gray-100 shadow-soft flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{debtor.name}</h4>
                  <p className="text-xs font-black text-rose-500 font-mono">
                    -{debtor.amount.toLocaleString('vi-VN')} đ
                  </p>
                </div>
                <button
                  onClick={() => handleRemindDebtor(debtor.name)}
                  className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all duration-200"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhắc Nợ</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Lịch sử thu chi */}
        {activeTab === 'transactions' && (
          <div className="space-y-2.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white rounded-[24px] p-3.5 border border-gray-100 shadow-soft flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{tx.title}</h4>
                    <p className="text-[10px] text-gray-400 font-medium">{tx.date} • {tx.author}</p>
                  </div>
                </div>
                <span className={`text-xs font-black font-mono ${
                  tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal Thêm Khoản Thu / Chi */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900">
                {txType === 'income' ? '+ Ghi Khoản Thu' : '- Ghi Khoản Chi'}
              </h3>
              <button onClick={() => setShowAddTxModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-gray-500 block mb-1 font-bold">Nội dung</label>
                <input
                  type="text"
                  placeholder={txType === 'income' ? 'Ví dụ: Tiền đóng thêm áo đấu' : 'Ví dụ: Mua đá lạnh & nước suối'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900"
                />
              </div>

              <div>
                <label className="text-gray-500 block mb-1 font-bold">Số tiền (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 120000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-mono"
                />
              </div>
            </div>

            <div className="mt-5 pt-2">
              <button
                onClick={() => {
                  alert('Đã lưu giao dịch vào sổ quỹ đội thành công!');
                  setShowAddTxModal(false);
                }}
                className={`w-full py-3.5 rounded-full text-white font-bold text-xs active:scale-95 transition-all shadow-md ${
                  txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                Xác Nhận Lưu Sổ Quỹ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
