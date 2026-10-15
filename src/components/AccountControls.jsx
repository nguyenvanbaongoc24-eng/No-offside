import {notify} from '../lib/feedback';
import Pressable from './Pressable';
import React, { useEffect, useState } from "react";
import { ArrowRightLeft, LogOut, Plus, Check, X, User, Trash2 } from "lucide-react";
import { readStored, writeStored } from "../lib/storage";
import { maskedIdentifier } from "../lib/accounts";

export default function AccountControls({
  user,
  accountId,
  session,
  onLogout,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoLogin, setAutoLogin] = useState(() =>
    readStored("no_offside_autologin_" + accountId, false),
  );

  const [rememberedAccounts, setRememberedAccounts] = useState(() =>
    readStored("no_offside_remembered_accounts", []),
  );

  const current = {
    id: accountId,
    username: user.username || accountId,
    name: user.name,
    avatar: user.avatar,
    identifier: maskedIdentifier(session?.user.email || user.username || session?.user.phone),
  };

  useEffect(() => {
    setAutoLogin(readStored("no_offside_autologin_" + accountId, false));
  }, [accountId]);

  const handleToggleAutoLogin = (enabled) => {
    if(!writeStored("no_offside_autologin_" + accountId, enabled)){notify("Không lưu được tùy chọn đăng nhập.","error");return;}
    setAutoLogin(enabled);notify("Đã lưu tùy chọn đăng nhập trên thiết bị này");
    if (enabled) {
      writeStored("no_offside_last_autologin_account", accountId);
    } else {
      const last = readStored("no_offside_last_autologin_account", null);
      if (last === accountId) {
        writeStored("no_offside_last_autologin_account", null);
      }
    }
  };

  const handleForgetAccount = (e, targetUsername) => {
    e.stopPropagation();
    const updated = rememberedAccounts.filter(
      (a) => a.username?.toLowerCase() !== targetUsername.toLowerCase(),
    );
    writeStored("no_offside_remembered_accounts", updated);
    setRememberedAccounts(updated);
  };

  const leave = async (scope, targetUsername = null) => {
    setBusy(true);
    setError("");
    try {
      await onLogout(scope);
      if (targetUsername) {
        // Will be picked up by Login form prefill
        sessionStorage.setItem("no_offside_prefill_username", targetUsername);
      }
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

      {/* Auto-login Toggle per Section 6 */}
      <div className="mt-4 pt-3 border-t border-slate-200/80">
        <label
          htmlFor="autologin-checkbox"
          className="flex items-start justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex-1 pr-2">
            <span className="text-sm font-semibold text-slate-800 block">
              Tự động đăng nhập trên thiết bị này
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block leading-relaxed">
              Mặc định tắt. Khi tắt: Mỗi lần mở lại ứng dụng mới bạn sẽ phải nhập mật khẩu.
            </span>
          </div>
          <input
            id="autologin-checkbox"
            type="checkbox"
            checked={Boolean(autoLogin)}
            onChange={(e) => handleToggleAutoLogin(e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Pressable
          type="button"
          className="choice-button"
          onClick={() => {
            setRememberedAccounts(readStored("no_offside_remembered_accounts", []));
            setOpen(true);
          }}
        >
          <ArrowRightLeft size={18} />
          Chuyển tài khoản
        </Pressable>
        <Pressable
          type="button"
          className="choice-button text-rose-700"
          disabled={busy}
          onClick={() => leave("local")}
        >
          <LogOut size={18} />
          Đăng xuất
        </Pressable>
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
            <Pressable
              type="button"
              className="sheet-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </Pressable>
            <h2 id="account-switch-title" className="text-xl font-semibold">
              Chuyển tài khoản
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Danh sách tài khoản đã sử dụng trên thiết bị. Để đảm bảo an toàn,
              bạn sẽ cần nhập mật khẩu của tài khoản muốn chuyển.
            </p>

            <div className="space-y-2 mt-4">
              {/* Current Account */}
              <div className="account-row border-emerald-500 bg-emerald-50/40">
                {current.avatar ? (
                  <img src={current.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User size={28} className="text-slate-500" />
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm break-words">{current.name}</strong>
                  <span className="block text-xs text-slate-500 break-words">
                    @{current.username}
                  </span>
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Check size={16} />
                  Đang dùng
                </span>
              </div>

              {/* Other Remembered Accounts */}
              {rememberedAccounts
                .filter((a) => a.username?.toLowerCase() !== current.username?.toLowerCase())
                .map((a) => (
                  <div
                    key={a.username}
                    className="account-row group hover:bg-slate-50 cursor-pointer"
                    onClick={() => leave("local", a.username)}
                  >
                    {a.avatar ? (
                      <img src={a.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User size={28} className="text-slate-500" />
                    )}
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm break-words">{a.name}</strong>
                      <span className="block text-xs text-slate-500 break-words">
                        @{a.username}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 font-bold group-hover:underline">
                        Đăng nhập lại
                      </span>
                      <Pressable
                        type="button"
                        title="Quên tài khoản này trên máy"
                        aria-label={`Quên tài khoản ${a.username}`}
                        onClick={(e) => handleForgetAccount(e, a.username)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                      >
                        <Trash2 size={15} />
                      </Pressable>
                    </div>
                  </div>
                ))}
            </div>

            <Pressable
              type="button"
              className="primary-button w-full mt-4"
              disabled={busy}
              onClick={() => leave("local")}
            >
              <Plus size={20} />
              Đăng nhập tài khoản khác
            </Pressable>

            {session && (
              <Pressable
                type="button"
                className="choice-button w-full mt-3 text-rose-700"
                disabled={busy}
                onClick={() => leave("global")}
              >
                Đăng xuất mọi phiên của tài khoản này
              </Pressable>
            )}

            <p className="text-xs text-slate-500 mt-3">
              Không lưu trữ mật khẩu trên máy. Chuyển tài khoản luôn yêu cầu xác thực an toàn.
            </p>

            {error && (
              <p role="alert" className="text-rose-700 mt-3 text-sm">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
