import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Shield,
  RotateCw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function InviteShare({
  isOpen = true,
  onClose,
  teamName = 'FC No Offside',
  teamLogo = '',
  teamCode = 'NO-FC99',
  inviteStatus = 'active',
  isLeader = false,
  onRegenerateCode,
  onRevokeCode,
  onPreviewLanding,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Generate full invite URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://no-offside.app';
  const inviteUrl = `${baseUrl}/invite/${teamCode}`;

  const handleCopyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Trình duyệt chưa hỗ trợ sao chép.');
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      return true;
    } catch {
      alert('Không sao chép được liên kết. Vui lòng tự chọn và sao chép.');
      return false;
    }
  };

  const handleCopyCode = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Trình duyệt chưa hỗ trợ sao chép.');
      await navigator.clipboard.writeText(teamCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      return true;
    } catch {
      alert('Không sao chép được mã. Vui lòng ghi lại mã bằng tay.');
      return false;
    }
  };

  const handleDeviceShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Gia nhập ${teamName} trên No Offside`,
          text: `Tham gia đội bóng ${teamName} cùng chúng tôi! Mã Club: ${teamCode}\nBấm vào liên kết để vào đội:`,
          url: inviteUrl,
        });
      } catch {}
    } else {
      await handleCopyLink();
      window.open('https://zalo.me/', '_blank');
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateCode) return;
    if (
      !window.confirm(
        'Tạo mã mới sẽ vô hiệu hóa mã Club và mã QR hiện tại. Bạn có chắc chắn muốn tạo lại?',
      )
    )
      return;
    setBusy(true);
    try {
      await onRegenerateCode();
    } catch (err) {
      alert(err.message || 'Không tạo được mã mới.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!onRevokeCode) return;
    setBusy(true);
    try {
      await onRevokeCode();
      setConfirmRevoke(false);
    } catch (err) {
      alert(err.message || 'Không thể thu hồi mã mời.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {teamLogo ? (
              <img
                src={teamLogo}
                alt={teamName}
                className="w-9 h-9 rounded-full object-cover border border-emerald-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-base text-gray-900">Mời thành viên mới</h3>
              <p className="text-xs text-gray-400">Gửi mã Club hoặc mã QR cho cầu thủ</p>
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

        {/* Trạng thái lời mời */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Trạng thái:</span>
            {inviteStatus === 'active' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đang hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                <Ban className="w-3 h-3 text-rose-600" />
                Đã thu hồi
              </span>
            )}
          </div>

          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {teamName}
          </span>
        </div>

        {/* KHỐI QR CODE */}
        <div className="flex flex-col items-center justify-center my-3">
          <div className="p-4 bg-white rounded-3xl border-2 border-dashed border-emerald-400/80 shadow-soft flex flex-col items-center justify-center relative">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              level="H"
              includeMargin={true}
              fgColor={inviteStatus === 'active' ? '#0f172a' : '#94a3b8'}
            />

            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 max-w-[200px] truncate">
              <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">{teamName}</span>
            </div>
          </div>
        </div>

        {/* BOX HIỂN THỊ MÃ CLUB VỚI NÚT CHÉP */}
        <div className="mt-3">
          <label className="text-xs font-bold text-gray-700 block mb-1 px-1">
            Mã Club (nhập trong app để gia nhập)
          </label>
          <div className="h-13 bg-slate-50 border border-slate-200 rounded-2xl px-4 flex items-center justify-between gap-2">
            <span className="font-mono text-base font-extrabold tracking-widest text-slate-900 select-all">
              {teamCode}
            </span>

            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Sao chép mã Club"
              className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 ${
                copiedCode
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 shadow-xs'
              }`}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Đã chép mã!' : 'Sao chép mã'}</span>
            </button>
          </div>
        </div>

        {/* BOX HIỂN THỊ LINK MỜI TRỰC TIẾP */}
        <div className="mt-3">
          <label className="text-xs font-bold text-gray-700 block mb-1 px-1">
            Đường dẫn mời trực tiếp
          </label>
          <div className="h-12 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-slate-700 truncate select-all flex-1">
              {inviteUrl}
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Sao chép liên kết mời"
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 ${
                copiedLink
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Đã chép!' : 'Chép link'}</span>
            </button>
          </div>
        </div>

        {/* NÚT CHIA SẺ THIẾT BỊ (NATIVE / ZALO) */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleDeviceShare}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia sẻ mã & lời mời</span>
          </button>

          {/* Test Link Trigger */}
          {onPreviewLanding && (
            <button
              type="button"
              onClick={onPreviewLanding}
              className="w-full h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/80 transition-all active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xem Thử Trang Landing Quét Mã</span>
            </button>
          )}

          {/* Leader Actions: Regenerate and Revoke */}
          {isLeader && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleRegenerate}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                title="Tạo lại mã Club mới (mã cũ sẽ bị hủy)"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                <span>Tạo mã mới</span>
              </button>

              {inviteStatus === 'active' && !confirmRevoke && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmRevoke(true)}
                  className="h-10 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  title="Thu hồi mã mời này"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Thu hồi</span>
                </button>
              )}

              {confirmRevoke && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRevoke}
                  className="h-10 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <span>Chắc chắn thu hồi?</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
