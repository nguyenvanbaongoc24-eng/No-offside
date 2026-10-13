import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { readStored, writeStored } from "../lib/storage";
import { getPendingJoin } from "../lib/pendingJoin";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function translateAuthError(msg) {
  if (!msg) return "Tên đăng nhập hoặc mật khẩu không chính xác.";
  const lower = msg.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credential") ||
    lower.includes("not found") ||
    lower.includes("user not found")
  ) {
    return "Tên đăng nhập hoặc mật khẩu không chính xác.";
  }
  if (lower.includes("email not confirmed"))
    return "Email chưa được kích hoạt. Vui lòng kiểm tra hộp thư email của bạn.";
  if (lower.includes("user already registered"))
    return "Email này đã được đăng ký tài khoản. Vui lòng chọn Đăng nhập.";
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("quá nhiều lần"))
    return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút rồi thử lại.";
  if (lower.includes("provider is not enabled"))
    return "Đăng nhập Google chưa được kích hoạt trên Supabase Dashboard.";
  return msg;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const PASSWORD_6_DIGITS = /^\d{6}$/;

export default function Login({ onLoginSuccess, initialMode }) {
  const [pendingJoin] = useState(() => getPendingJoin());
  const [mode, setMode] = useState(() => initialMode || (getPendingJoin() ? "signup" : "signin")); // 'signin' | 'signup' | 'forgot' | 'reset_password' | 'google_username'
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Google first-time user state
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  // Remembered accounts on device
  const [rememberedAccounts, setRememberedAccounts] = useState(() =>
    readStored("no_offside_remembered_accounts", []),
  );

  useEffect(() => {
    // Check URL parameters / hash for recovery or OAuth errors
    const searchParams = new URLSearchParams(window.location.search);
    let hashParams = new URLSearchParams();
    const rawHash = window.location.hash;
    if (rawHash && rawHash.includes("=")) {
      hashParams = new URLSearchParams(rawHash.replace(/^#/, ""));
    }

    if (
      rawHash.includes("type=recovery") ||
      rawHash.includes("reset-password") ||
      searchParams.get("type") === "recovery"
    ) {
      setMode("reset_password");
    }

    const errorCode = searchParams.get("error") || hashParams.get("error");
    const errorDescription =
      searchParams.get("error_description") ||
      hashParams.get("error_description");

    if (errorCode) {
      if (errorCode === "access_denied") {
        setError("Quá trình đăng nhập đã bị hủy hoặc bị từ chối.");
      } else if (errorDescription) {
        setError(
          translateAuthError(
            decodeURIComponent(errorDescription.replace(/\+/g, " ")),
          ),
        );
      } else {
        setError(`Xác thực không thành công (${errorCode}).`);
      }
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl || "/");
    }

    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset_password");
      } else if (event === "SIGNED_IN" && session?.user) {
        // Check if user has completed username registration
        const user = session.user;
        const provider = user.app_metadata?.provider;
        if (provider === "google") {
          // Check if profile exists and has username
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", user.id)
              .maybeSingle();

            if (!profile || !profile.username) {
              // First-time Google user needs to set a unique username
              setGoogleUser(user);
              const suggested = (
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "player"
              )
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "")
                .slice(0, 15);
              setGoogleUsername(suggested);
              setMode("google_username");
              return;
            }
          } catch {
            // If offline or profile read fails, let normal flow proceed
          }
        }
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const saveRememberedAccount = (acc) => {
    if (!acc.username) return;
    const currentList = readStored("no_offside_remembered_accounts", []);
    const updated = [
      {
        username: acc.username,
        name: acc.name || acc.username,
        avatar: acc.avatar || "",
        accountId: acc.id || acc.username,
        lastUsed: Date.now(),
      },
      ...currentList.filter(
        (a) => a.username.toLowerCase() !== acc.username.toLowerCase(),
      ),
    ].slice(0, 5);
    writeStored("no_offside_remembered_accounts", updated);
    setRememberedAccounts(updated);
  };

  const removeRememberedAccount = (e, targetUsername) => {
    e.stopPropagation();
    const currentList = readStored("no_offside_remembered_accounts", []);
    const updated = currentList.filter(
      (a) => a.username.toLowerCase() !== targetUsername.toLowerCase(),
    );
    writeStored("no_offside_remembered_accounts", updated);
    setRememberedAccounts(updated);
    if (username.toLowerCase() === targetUsername.toLowerCase()) {
      setUsername("");
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError(
        "Chưa kết nối Supabase. Vui lòng kiểm tra biến môi trường VITE_SUPABASE_URL.",
      );
      return;
    }

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (!PASSWORD_6_DIGITS.test(password)) {
      setError("Mật khẩu phải gồm đúng 6 chữ số (0–9).");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      let resolvedEmail = "";

      // If user typed an email directly, use it directly
      if (cleanUsername.includes("@")) {
        resolvedEmail = cleanUsername;
      } else {
        // Resolve email via secure server RPC with rate limiting
        const { data: resolved, error: rpcError } = await supabase.rpc(
          "no_auth_resolve_username",
          {
            p_username: cleanUsername,
            p_client_id: "web",
          },
        );

        if (rpcError) {
          throw new Error(translateAuthError(rpcError.message));
        }
        resolvedEmail = resolved?.email;
      }

      if (!resolvedEmail) {
        throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      // Authenticate with Supabase Auth using resolved email & 6-digit password
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: password,
        });

      if (signInError) {
        // Record failed attempt for rate limiting
        await supabase.rpc("no_auth_record_login_result", {
          p_username: cleanUsername,
          p_success: false,
          p_client_id: "web",
        }).catch(() => {});
        throw signInError;
      }

      // Record successful login (clears failed attempts)
      await supabase.rpc("no_auth_record_login_result", {
        p_username: cleanUsername,
        p_success: true,
        p_client_id: "web",
      }).catch(() => {});

      // Remember account on device without password
      if (data?.user) {
        saveRememberedAccount({
          username: cleanUsername,
          name:
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            cleanUsername,
          avatar: data.user.user_metadata?.avatar_url || "",
          id: data.user.id,
        });
      }

      if (data?.session && onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Chưa kết nối Supabase.");
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (!cleanName) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Vui lòng nhập địa chỉ Gmail hợp lệ.");
      return;
    }
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError(
        "Tên đăng nhập phải từ 3 đến 20 ký tự, chỉ gồm chữ cái, chữ số, gạch dưới (_) hoặc gạch ngang (-).",
      );
      return;
    }
    if (!PASSWORD_6_DIGITS.test(password)) {
      setError("Mật khẩu phải gồm đúng 6 chữ số từ 0–9.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      // 1. Check availability on server first
      const { data: avail, error: availError } = await supabase.rpc(
        "no_auth_check_availability",
        {
          p_username: cleanUsername,
          p_email: cleanEmail,
        },
      );

      if (!availError && avail) {
        if (!avail.usernameAvailable) {
          throw new Error("Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.");
        }
        if (!avail.emailAvailable) {
          throw new Error("Email này đã được đăng ký tài khoản. Vui lòng chọn Đăng nhập.");
        }
      }

      // 2. Perform Supabase Auth registration
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            username: cleanUsername.toLowerCase(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) throw signUpError;

      // 3. If a session was automatically created, sign out per Section 2 requirement:
      // "Sau khi đăng ký thành công: Hiển thị Đăng ký thành công, điều hướng về đăng nhập,
      // điền sẵn username, không tự động đưa người dùng vào dashboard, nếu tạo session phải kết thúc."
      if (signUpData?.session) {
        await supabase.auth.signOut({ scope: "local" });
      }

      // 4. Remember account identifier on device for fast filling
      saveRememberedAccount({
        username: cleanUsername,
        name: cleanName,
        id: signUpData?.user?.id || cleanUsername,
      });

      // 5. Navigate to signin mode with username prefilled
      setSuccess("Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.");
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteGoogleUsername = async (e) => {
    e.preventDefault();
    const clean = googleUsername.trim().toLowerCase();
    if (!USERNAME_REGEX.test(clean)) {
      setError(
        "Tên đăng nhập phải từ 3 đến 20 ký tự, chỉ gồm chữ cái, chữ số, gạch dưới (_) hoặc gạch ngang (-).",
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { error: rpcErr } = await supabase.rpc("no_set_username", {
        p_username: clean,
      });

      if (rpcErr) throw rpcErr;

      // Remember account on device
      saveRememberedAccount({
        username: clean,
        name: googleUser?.user_metadata?.full_name || clean,
        avatar: googleUser?.user_metadata?.avatar_url || "",
        id: googleUser?.id,
      });

      // Sign out per Section 3 requirement:
      // "Sau khi hoàn thành đăng ký, kết thúc session và chuyển về màn hình đăng nhập theo yêu cầu chung."
      await supabase.auth.signOut({ scope: "local" });

      setUsername(clean);
      setSuccess("Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.");
      setMode("signin");
      setGoogleUser(null);
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Chưa kết nối Supabase.");
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Vui lòng nhập địa chỉ Gmail đã đăng ký.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/#reset-password`,
        },
      );
      if (resetError) throw resetError;

      setSuccess(
        "Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.",
      );
      setForgotCooldown(60);
      const timer = setInterval(() => {
        setForgotCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Chưa kết nối Supabase.");
      return;
    }
    if (!PASSWORD_6_DIGITS.test(password)) {
      setError("Mật khẩu mới phải gồm đúng 6 chữ số (0–9).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      // Sign out and transition to signin
      await supabase.auth.signOut({ scope: "local" });
      setSuccess("Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.");
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError("Dịch vụ xác thực Supabase chưa được cấu hình.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(translateAuthError(err.message));
      setBusy(false);
    }
  };

  const handleDemoAccess = () => {
    if (onLoginSuccess) {
      onLoginSuccess({ demo: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center px-4 py-8 font-sans antialiased relative overflow-hidden select-none">
      {/* Decorative gradient accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[320px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[360px] h-[360px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-sm mx-auto w-full relative z-10">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-400 text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/30 mb-3">
            ⚽
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            NO OFFSIDE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Nền tảng quản lý đội bóng phong trào số 1
          </p>
        </div>

        {/* Card Frame */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl relative">
          {pendingJoin && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-300 truncate">
                  Gia nhập: {pendingJoin.teamName || "Đội bóng"}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Cầu thủ: {pendingJoin.name} · Số áo #{pendingJoin.number}
                </p>
              </div>
            </div>
          )}

          {/* Header Switcher Tabs (Sign In vs Sign Up) */}
          {["signin", "signup"].includes(mode) && (
            <div className="flex bg-slate-900/80 p-1 rounded-2xl mb-5 border border-slate-700/40">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "signin"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === "signup"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tạo tài khoản
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* TAB 1: ĐĂNG NHẬP (SIGN IN) */}
          {mode === "signin" && (
            <div>
              {/* Remembered Accounts Quick Selector */}
              {rememberedAccounts.length > 0 && (
                <div className="mb-4 pb-3 border-b border-slate-700/40">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                    <span>Tài khoản trên thiết bị này:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rememberedAccounts.map((acc) => (
                      <div
                        key={acc.username}
                        onClick={() => setUsername(acc.username)}
                        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                          username.toLowerCase() === acc.username.toLowerCase()
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-900/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60"
                        }`}
                      >
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{acc.username}</span>
                        <button
                          type="button"
                          title="Xóa khỏi thiết bị"
                          aria-label={`Xóa tài khoản ${acc.username} khỏi máy`}
                          onClick={(e) => removeRememberedAccount(e, acc.username)}
                          className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-3.5">
                {/* Username Input */}
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Tên đăng nhập
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ví dụ: Ngocnguyen566"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    3–20 ký tự (chữ cái, chữ số, _ hoặc -); không phân biệt hoa/thường.
                  </p>
                </div>

                {/* 6-Digit Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-300"
                    >
                      Mật khẩu 6 số
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setSuccess("");
                      }}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mật khẩu gồm đúng 6 chữ số từ 0–9.
                  </p>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/60" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400 font-semibold tracking-wider">
                    Hoặc
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full py-2.5 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>Tiếp tục với Google</span>
              </button>
            </div>
          )}

          {/* TAB 2: ĐĂNG KÝ (SIGN UP) */}
          {mode === "signup" && (
            <div>
              <form onSubmit={handleSignUp} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Họ và tên
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                  />
                </div>

                {/* Email (Gmail) */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Gmail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vidu@gmail.com"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="signup-username"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Tên đăng nhập
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-username"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ngocnguyen566"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    3–20 ký tự (chữ cái, chữ số, _ hoặc -); không phân biệt hoa/thường.
                  </p>
                </div>

                {/* 6-Digit Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Mật khẩu 6 số
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mật khẩu gồm đúng 6 chữ số từ 0–9.
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <span>Đăng ký</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/60" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400 font-semibold tracking-wider">
                    Hoặc
                  </span>
                </div>
              </div>

              {/* Google Register Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full py-2.5 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>Đăng ký bằng Google</span>
              </button>
            </div>
          )}

          {/* TAB 3: QUÊN MẬT KHẨU (FORGOT PASSWORD) */}
          {mode === "forgot" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setSuccess("");
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-bold text-white">Khôi phục mật khẩu</h2>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Địa chỉ Gmail đã đăng ký
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vidu@gmail.com"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    Hệ thống sẽ gửi liên kết bảo mật để bạn thiết lập lại mật khẩu 6 số mới.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy || forgotCooldown > 0}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi liên kết...</span>
                    </>
                  ) : forgotCooldown > 0 ? (
                    <span>Gửi lại sau ({forgotCooldown}s)</span>
                  ) : (
                    <span>Gửi liên kết đặt lại mật khẩu</span>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD) */}
          {mode === "reset_password" && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-white">
                  Đặt lại mật khẩu 6 số mới
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nhập mật khẩu 6 chữ số mới để tiếp tục sử dụng No Offside.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="reset-password-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Mật khẩu 6 số mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Xác nhận mật khẩu 6 số
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Lưu mật khẩu mới</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: HOÀN TẤT USERNAME CHO GOOGLE USER MỚI */}
          {mode === "google_username" && (
            <div>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Xác nhận tài khoản Google
                </span>
                <h2 className="text-sm font-bold text-white mt-2">
                  Chọn Tên đăng nhập của bạn
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Đồng đội sẽ tìm kiếm và gắn thẻ bạn bằng tên đăng nhập này.
                </p>
              </div>

              <form onSubmit={handleCompleteGoogleUsername} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="google-username-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Tên đăng nhập
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="google-username-input"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={googleUsername}
                      onChange={(e) => setGoogleUsername(e.target.value)}
                      placeholder="ngocnguyen"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    3–20 ký tự (chữ cái, chữ số, _ hoặc -); không phân biệt hoa/thường.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Hoàn tất & Về đăng nhập</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Quick Demo Access Button */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleDemoAccess}
            className="text-xs text-slate-400 hover:text-emerald-400 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-slate-800/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trải nghiệm với dữ liệu mẫu</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-slate-500 mt-4 font-medium">
          © No Offside — Bảo mật và quản lý bóng đá phong trào
        </p>
      </div>
    </div>
  );
}
