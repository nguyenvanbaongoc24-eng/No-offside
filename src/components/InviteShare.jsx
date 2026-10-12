import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Download,
  Shield,
  Users
} from 'lucide-react';

export default function InviteShare({
  isOpen = true,
  onClose,
  teamName = 'FC No Offside',
  teamCode = 'fc-no-offside-99',
  onPreviewLanding
}) {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Generate full invite URL
  const baseUrl = window.location.origin || 'https://no-offside.app';
  const inviteUrl = `${baseUrl}/invite/${teamCode}`;

  const handleCopyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Trình duyệt chưa hỗ trợ sao chép. Hãy chọn và sao chép liên kết.');
      await navigator.clipboard.writeText(inviteUrl); setCopied(true);
      setTimeout(() => setCopied(false), 2000); return true;
    } catch (err) { alert(err.message || 'Không sao chép được liên kết.'); return false; }
  };

  const handleShareZalo = async () => {
    // Open Web Share API or mock Zalo share
    if (navigator.share) {
      navigator.share({
        title: `Gia nhập ${teamName} trên No Offside`,
        text: `Tham gia đội bóng ${teamName} cùng chúng tôi nhé! Bấm vào link để vào đội:`,
        url: inviteUrl,
      }).catch(() => {});
    } else {
      if (!await handleCopyLink()) return;
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
      window.open(`https://zalo.me/`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">

        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ⚽
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Mời Thành Viên Mới</h3>
              <p className="text-xs text-gray-400">Gửi mã QR hoặc link cho cầu thủ</p>
            </div>
          </div>

          {onClose && (
            <button
              aria-label="Đóng"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Text Tiêu đề */}
        <div className="text-center my-4">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Quét mã để gia nhập {teamName}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Link mời hiện chỉ có dữ liệu trên thiết bị đã lưu đội. Đồng bộ giữa các thiết bị chưa được kết nối.
          </p>
        </div>

        {/* KHỐI VUÔNG TO Ở GIỮA HIỂN THỊ QR CODE */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className="p-4 bg-white rounded-3xl border-2 border-dashed border-emerald-400/80 shadow-soft flex flex-col items-center justify-center relative">
            {/* SVG QR Code */}
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              level="H"
              includeMargin={true}
              fgColor="#0f172a"
            />

            {/* Team Logo Badge centered in QR card */}
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80">
              <Shield className="w-3 h-3 text-emerald-600" />
              <span>{teamName}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Mã định danh đội: <span className="tabular-nums font-bold text-gray-700">{teamCode}</span>
          </p>
        </div>

        {/* BOX HIỂN THỊ LINK MỜI */}
        <div className="mt-4">
          <label className="text-xs font-bold text-gray-600 block mb-1.5 px-1">
            Đường dẫn tham gia trực tiếp
          </label>

          <div className="h-14 bg-gray-100 border border-gray-200/80 rounded-full px-4 flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums font-bold text-gray-800 truncate select-all flex-1">
              {inviteUrl}
            </span>

            <button
              onClick={handleCopyLink}
              className={`h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* NÚT BẤM LỚN: CHIA SẺ LINK QUA ZALO */}
        <div className="mt-5 space-y-2.5">
          <button
            onClick={handleShareZalo}
            className="w-full h-14 rounded-full bg-[#0068FF] hover:bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia sẻ Link qua Zalo</span>
          </button>

          {/* Test Link Trigger (Để người dùng xem trước giao diện thành viên quét mã) */}
          {onPreviewLanding && (
            <button
              onClick={onPreviewLanding}
              className="w-full h-12 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/80 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xem Thử Giao Diện Thành Viên Quét Mã (Landing Page)</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-full text-gray-500 hover:text-gray-800 font-bold text-xs active:scale-95 transition-all cursor-pointer"
            >
              Đóng
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
