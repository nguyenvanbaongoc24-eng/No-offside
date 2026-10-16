import { notify } from "../lib/feedback";
import ProModal from "../components/pro/ProModal";
import Pressable from "../components/Pressable";
import React, { useState } from "react";
import { Wallet, Check, Clock, ArrowLeft } from "../components/icons";
import { qrUrl, monthKey } from "../lib/teamModel";
import QrPreview from "../components/QrPreview";
import { formatCurrency } from "../lib/formatCurrency";

export default function PersonalFund({
  user,
  treasurerQr,
  onMarkPaid,
  onBack,
  showLegacy = true,
}) {
  const [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [confirming, setConfirming] = useState(false);
  const report = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await onMarkPaid();
      setConfirming(false);
      notify("Đã gửi yêu cầu · Chờ Thủ quỹ duyệt.");
    } catch (error) {
      setError(error.message || "Chưa gửi được yêu cầu.");
    } finally {
      setSending(false);
    }
  };
  const memo = `NO OFFSIDE SO ${user.number} DONG QUY ${monthKey()}`;
  const uploaded = treasurerQr?.qrMode === "uploaded";
  const image = uploaded
    ? treasurerQr.uploadedQrImage
    : qrUrl(treasurerQr, user.fundDebt || 0, memo);
  return (
    <div className="p-5">
      <header className="compact-header !p-0">
        {onBack && (
          <Pressable aria-label="Quay lại" onClick={onBack}>
            <ArrowLeft size={22} />
          </Pressable>
        )}
        <h1>Quỹ đội</h1>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {showLegacy && (
        <section className="settings-card mt-5">
          <Wallet size={24} className="text-emerald-700" />
          <h2 className="mt-3">Khoản quỹ theo tháng</h2>
          <p className="fund-balance tabular-nums">
            {formatCurrency(user.fundDebt || 0)}
          </p>
          <p className="text-sm text-slate-600 flex items-center gap-2">
            {user.isFundPaid ? (
              <Check size={18} />
            ) : user.fundPaymentPending ? (
              <Clock size={18} />
            ) : null}
            {user.isFundPaid
              ? "Đã được xác nhận"
              : user.fundPaymentPending
                ? "Đang chờ duyệt"
                : user.fundRejection
                  ? "Bị từ chối: " + user.fundRejection.reason
                  : user.fundDebt > 0
                    ? "Chưa gửi xác nhận"
                    : "Chưa có khoản cần đóng"}
          </p>
          {!user.isFundPaid && user.fundDebt > 0 && (
            <div className="mt-5 space-y-3">
              {image ? (
                <>
                  <QrPreview src={image} uploaded={uploaded} />
                  <p className="text-sm break-words">
                    {treasurerQr.bankName} · {treasurerQr.accountNumber}
                  </p>
                  <p className="text-sm break-words">
                    {treasurerQr.accountHolder}
                  </p>
                  <p className="text-sm break-words">Nội dung: {memo}</p>
                  <Pressable
                    className="primary-button w-full"
                    disabled={user.fundPaymentPending || sending}
                    onClick={() => setConfirming(true)}
                  >
                    {sending
                      ? "Đang gửi…"
                      : user.fundPaymentPending
                        ? "Chờ Thủ quỹ duyệt"
                        : "Đã chuyển tiền · gửi chờ duyệt"}
                  </Pressable>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Chủ đội chưa cấu hình tài khoản nhận quỹ.
                </p>
              )}
            </div>
          )}
        </section>
      )}
      <ProModal
        open={confirming}
        title="Xác nhận báo chuyển tiền"
        onClose={() => setConfirming(false)}
        busy={sending}
      >
        <p>
          Khoản quỹ kỳ {monthKey()} · {formatCurrency(user.fundDebt || 0)}
        </p>
        <p className="field-hint">
          Yêu cầu chờ đối soát, chưa cộng vào số dư quỹ.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Pressable
          className="primary-button mt-4"
          disabled={sending}
          onClick={report}
        >
          {sending ? "Đang gửi…" : "Gửi yêu cầu xác nhận"}
        </Pressable>
      </ProModal>
      <p className="text-sm text-slate-500 mt-4">
        Sổ giao dịch và duyệt khoản nộp do chủ đội hoặc quản trị viên quản lý.
      </p>
    </div>
  );
}
