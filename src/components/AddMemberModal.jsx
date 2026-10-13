import React, { useState } from "react";
import { X, UserPlus, AlertCircle, Loader2, Check } from "lucide-react";

export default function AddMemberModal({
  isOpen,
  onClose,
  members = [],
  onAddMember,
}) {
  const [fullName, setFullName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("Tiền Đạo (ST)");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const positions = [
    "Tiền Đạo (ST)",
    "Tiền Vệ (MF)",
    "Hậu Vệ (DF)",
    "Thủ Môn (GK)",
  ];

  // Real-time check for duplicate jersey number
  const numVal = parseInt(jerseyNumber, 10);
  const isJerseyDuplicate =
    Number.isInteger(numVal) &&
    members.some(
      (m) =>
        m.membershipStatus !== "removed" && Number(m.number) === numVal,
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Vui lòng nhập họ và tên thành viên (tối thiểu 2 ký tự).");
      return;
    }

    if (!Number.isInteger(numVal) || numVal < 1 || numVal > 99) {
      setError("Số áo thi đấu không hợp lệ. Vui lòng nhập số từ 1 đến 99.");
      return;
    }

    if (isJerseyDuplicate) {
      const existing = members.find(
        (m) =>
          m.membershipStatus !== "removed" && Number(m.number) === numVal,
      );
      setError(
        `Số áo #${numVal} đã được sử dụng bởi ${existing?.name || "thành viên khác"}. Vui lòng chọn số áo khác.`,
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (onAddMember) {
        await onAddMember({
          name: trimmedName,
          number: numVal,
          role: position,
          phone: phone.trim(),
        });
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFullName("");
        setJerseyNumber("");
        setPhone("");
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || "Không thể lưu thành viên. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
      className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl z-10 border border-gray-100 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-member-title" className="font-bold text-base text-gray-900">
                Thêm thành viên thủ công
              </h3>
              <p className="text-xs text-gray-500">
                Thêm trực tiếp cầu thủ vào danh sách đội bóng
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span className="font-bold">Đã lưu thành viên thành công!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Họ tên */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Họ và tên</span>
              <span className="text-rose-500 text-[11px] font-bold">* Bắt buộc</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn Toàn"
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Số áo */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Số áo thi đấu (1 - 99)</span>
              <span className="text-rose-500 text-[11px] font-bold">* Bắt buộc</span>
            </label>
            <input
              type="number"
              min="1"
              max="99"
              required
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="VD: 9"
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-mono font-bold focus:bg-white focus:outline-none transition-all ${
                isJerseyDuplicate
                  ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/50"
                  : "border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              }`}
            />
            {isJerseyDuplicate && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                Số áo #{jerseyNumber} đã có thành viên trong đội sử dụng.
              </p>
            )}
          </div>

          {/* Vị trí */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">
              Vị trí sở trường
            </label>
            <div className="grid grid-cols-2 gap-2">
              {positions.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    position === pos
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                      : "bg-slate-50 border-gray-200 text-gray-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{pos}</span>
                  {position === pos && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Số điện thoại liên hệ */}
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Số điện thoại liên hệ</span>
              <span className="text-gray-400 text-[11px] font-medium">Tùy chọn</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxx"
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Ghi chú về liên kết tài khoản */}
          <p className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded-xl border border-gray-200 leading-relaxed">
            Hồ sơ này sẽ được lưu vào đội bóng hiện tại. Khi thành viên đăng ký tài khoản No Offside bằng số điện thoại này, hệ thống sẽ tự động liên kết tài khoản.
          </p>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-full border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isJerseyDuplicate}
              className={`flex-1 py-3 rounded-full font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isSubmitting || isJerseyDuplicate
                  ? "bg-gray-300 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu thành viên</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
