import Pressable from '../components/Pressable';
import React, { useState } from "react";
import { Wallet, Check, Clock } from "lucide-react";
import { qrUrl, monthKey } from "../lib/teamModel";
import QrPreview from "../components/QrPreview";
import { formatCurrency } from "../lib/formatCurrency";

export default function PersonalFund({ user, treasurerQr, onMarkPaid }) {
  const [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const report = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await onMarkPaid();
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
        <h1>Quỹ đội</h1>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <section className="settings-card mt-5">
        <Wallet size={24} className="text-emerald-700" />
        <h2 className="mt-3">Khoản đóng của bạn</h2>
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
                  onClick={report}
                >
                  Đã chuyển tiền · gửi chờ duyệt
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
      <p className="text-sm text-slate-500 mt-4">
        Sổ giao dịch và duyệt khoản nộp do chủ đội hoặc quản trị viên quản lý.
      </p>
    </div>
  );
}
