import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Shirt, Wallet, ChevronRight, Check } from 'lucide-react';

export default function WelcomeAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hideWelcomePopup') !== 'true';
    }
    return true;
  });

  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);

  const handleClose = () => {
    if (dontShowAgain) {
      sessionStorage.setItem('hideWelcomePopup', 'true');
    }
    setIsOpen(false);
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setDontShowAgain(checked);
    if (checked) {
      sessionStorage.setItem('hideWelcomePopup', 'true');
    } else {
      sessionStorage.removeItem('hideWelcomePopup');
    }
  };

  // Tự động đóng (Auto-dismiss) sau đúng 5 giây bằng useEffect và setTimeout
  useEffect(() => {
    if (!isOpen) return;

    // Đếm ngược từng giây cho UI mượt mà
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Tự động đóng sau 5000ms
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isOpen, dontShowAgain]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        
        {/* Backdrop click để đóng */}
        <div className="absolute inset-0" onClick={handleClose} />

        {/* Modal Animation: scale từ 0.8 lên 1 với độ nảy nhẹ (spring) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-gray-900 z-10 overflow-hidden"
        >
          {/* Thanh chạy thời gian tự động đóng 5 giây */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-emerald-400 to-green-500"
            />
          </div>

          {/* Header Modal */}
          <div className="flex items-start justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shadow-xs">
                📣
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight leading-snug">
                  Thông báo mới từ Đội bóng
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  Cập nhật tin tức quan trọng trước trận đấu
                </p>
              </div>
            </div>

            {/* Nút Đóng màu xám góc trên cùng */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer -mr-1 -mt-1"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Danh sách 2 nội dung thông báo gần nhất */}
          <div className="mt-4 space-y-2.5">
            {/* Nội dung 1 */}
            <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-3 border border-gray-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Shirt className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 leading-snug">
                  Nhắc nhở: Trận tới mặc áo Xanh Neon
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Quần đen tất đen • Có mặt 18h15 khởi động tại Sân 3
                </p>
              </div>
            </div>

            {/* Nội dung 2 */}
            <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-3 border border-gray-200/60 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 leading-snug">
                  Vui lòng hoàn thành quỹ tháng 10
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Đóng qua VietQR trước ngày 25/10 (150.000 đ)
                </p>
              </div>
            </div>
          </div>

          {/* Ô Checkbox lưu sessionStorage & Nút Đóng */}
          <div className="mt-5 pt-3 border-t border-gray-100 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 hover:text-gray-900 font-medium">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={handleCheckboxChange}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer accent-emerald-600"
              />
              <span>Không nhắc lại trong phiên đăng nhập này</span>
            </label>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Đóng thông báo</span>
              <span className="text-[10px] text-gray-400 font-mono font-normal">
                ({secondsLeft}s)
              </span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
