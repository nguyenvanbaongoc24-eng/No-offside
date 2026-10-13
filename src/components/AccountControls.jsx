import React, { useEffect, useState } from "react";
import { ArrowRightLeft, LogOut, Plus, Check, X, User } from "lucide-react";
import { readStored, writeStored } from "../lib/storage";
import { maskedIdentifier } from "../lib/accounts";
export default function AccountControls({
  user,
  accountId,
  session,
  onLogout,
  onNavigate,
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [accounts, setAccounts] = useState(() =>
    readStored("no_offside_account_labels", []),
  );
  const current = {
    id: accountId,
    name: user.name,
    avatar: user.avatar,
    identifier: maskedIdentifier(session?.user.email || session?.user.phone),
  };
  useEffect(() => {
    if (!session || accountId === "demo") return;
    const next = [
      current,
      ...readStored("no_offside_account_labels", []).filter(
        (a) => a.id !== accountId,
      ),
    ].slice(0, 8);
    if (writeStored("no_offside_account_labels", next)) setAccounts(next);
  }, [
    accountId,
    user.name,
    user.avatar,
    session?.user.email,
    session?.user.phone,
  ]);
  const leave = async (scope) => {
    setBusy(true);
    setError("");
    try {
      await onLogout(scope);
      onNavigate("dashboard");
    } catch {
      setError("Đăng xuất chưa thành công. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="account-controls" className="settings-card">
      <h2>Tài khoản đăng nhập</h2>
      <p className="text-sm text-slate-500 mt-2">{current.identifier}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button className="choice-button" onClick={() => setOpen(true)}>
          <ArrowRightLeft size={18} />
          Chuyển tài khoản
        </button>
        <button
          className="choice-button text-rose-700"
          disabled={busy}
          onClick={() => leave("local")}
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
      {error && (
        <p role="alert" className="text-rose-700 text-sm mt-3">
          {error}
        </p>
      )}
      {open && (
        <div
          className="simple-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-switch-title"
        >
          <section className="simple-sheet">
            <button
              className="sheet-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 id="account-switch-title" className="text-xl font-semibold">
              Chuyển tài khoản
            </h2>
            <p className="text-sm text-slate-600 mt-3">
              Mỗi lần dùng một phiên đăng nhập. Tài khoản khác cần xác thực lại;
              thao tác này khác với chuyển đội bóng.
            </p>
            {[current, ...accounts.filter((a) => a.id !== accountId)].map(
              (a) => (
                <button
                  key={a.id}
                  className="account-row"
                  disabled={busy || a.id === accountId}
                  onClick={() => leave("local")}
                >
                  {a.avatar ? (
                    <img src={a.avatar} alt="" />
                  ) : (
                    <User size={32} />
                  )}
                  <span className="min-w-0 flex-1">
                    <strong className="block break-words">{a.name}</strong>
                    <span className="block text-xs text-slate-500 break-words">
                      {a.identifier}
                    </span>
                  </span>
                  {a.id === accountId ? (
                    <span className="text-xs text-emerald-700 flex gap-1">
                      <Check size={16} />
                      Đang dùng
                    </span>
                  ) : (
                    <span className="text-xs">Xác thực lại</span>
                  )}
                </button>
              ),
            )}
            <button
              className="primary-button w-full mt-4"
              disabled={busy}
              onClick={() => leave("local")}
            >
              <Plus size={20} />
              Thêm tài khoản
            </button>
            {session && (
              <button
                className="choice-button w-full mt-3 text-rose-700"
                disabled={busy}
                onClick={() => leave("global")}
              >
                Đăng xuất mọi phiên của tài khoản hiện tại
              </button>
            )}
            <p className="text-xs text-slate-500 mt-3">
              Đăng xuất thông thường chỉ kết thúc phiên trên thiết bị này. Danh
              sách chỉ lưu tên, ảnh và định danh đã che; không lưu thêm token
              hay mật khẩu.
            </p>
            {error && (
              <p role="alert" className="text-rose-700 mt-3">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
