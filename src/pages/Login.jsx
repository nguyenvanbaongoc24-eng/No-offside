import ProModal from '../components/pro/ProModal';
import Pressable from '../components/Pressable';
import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Sun,
  Moon,
  Ellipsis,
  Monitor,
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
  ChevronRight,
  Check,
  ChevronDown,
} from "../components/icons";
import { supabase } from "../lib/supabase";
import { readStored, writeStored } from "../lib/storage";
import { authText } from "../lib/authCopy";
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
    lower.includes("user not found") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the function") ||
    lower.includes("no_auth_resolve_username")
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

export default function Login({ onLoginSuccess, initialMode, theme = "system", onThemeChange }) {
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches));
  const activeTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [language, setLanguage] = useState(() => readStored("no_offside_auth_language", "vi") === "en" ? "en" : "vi");
  const t = (text) => authText(text, language);
  useEffect(() => {
    if (typeof document === "undefined" || !document.documentElement) return;
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language, theme]);
  const changeLanguage = (next) => {
    setLanguage(next);
    writeStored("no_offside_auth_language", next);
  };
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const themeRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    if (!themeMenuOpen && !langMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setThemeMenuOpen(false);
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [themeMenuOpen, langMenuOpen]);
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
  const formSubmitting = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [unconfirmedEmailAlert, setUnconfirmedEmailAlert] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0 || resendingEmail || !unconfirmedEmailAlert?.email) return;
    setResendingEmail(true);
    setResendNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmailAlert.email,
      });
      if (resendError) throw resendError;
      setResendNotice("Đã gửi lại email xác minh. Hãy kiểm tra hộp thư của bạn.");
      setResendCooldown(60);
    } catch (err) {
      setResendNotice("Lỗi: " + (err.message || "Không thể gửi lại email xác minh lúc này."));
    } finally {
      setResendingEmail(false);
    }
  };

  // Google first-time user state
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  const [accountSheet, setAccountSheet] = useState(false);
  const accountSheetRef = useRef(null);
  useEffect(() => {
    if (!accountSheet) return;
    const dialog = accountSheetRef.current?.closest('[role="dialog"]');
    if (!dialog) return;
    const previous = document.activeElement;
    const controls = () => [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')];
    controls()[0]?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setAccountSheet(false); }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown',onKey);
    return () => { document.removeEventListener('keydown',onKey); if (previous?.isConnected) previous.focus(); };
  },[accountSheet]);
  const switchMode = next => {
    setMode(next); setError(""); setSuccess(""); setUnconfirmedEmailAlert(null); setResendNotice("");
  };
  const chooseAccount = account => {
    setUsername(account.username); setAccountSheet(false);
    requestAnimationFrame(() => document.getElementById('login-password')?.focus());
  };
  // Remembered accounts on device
  const [rememberedAccounts, setRememberedAccounts] = useState(() =>
    readStored("no_offside_remembered_accounts", []),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
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
        email: acc.email || "",
        lastUsed: Date.now(),
      },
      ...currentList.filter(
        (a) => a.username.toLowerCase() !== acc.username.toLowerCase(),
      ),
    ].slice(0, 5);
    writeStored("no_offside_remembered_accounts", updated);
    if (acc.email) {
      const curMap = readStored("no_offside_username_map", {});
      writeStored("no_offside_username_map", {
        ...curMap,
        [acc.username.toLowerCase()]: acc.email,
      });
    }
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
    if (formSubmitting.current) return;
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

    formSubmitting.current = true;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      let resolvedEmail = "";

      // 1. If user typed an email directly, use it directly
      if (cleanUsername.includes("@")) {
        resolvedEmail = cleanUsername;
      } else {
        // 2. Check local device memory / remembered accounts first (instant & offline safe)
        const remembered = readStored("no_offside_remembered_accounts", []);
        const matchedRemembered = remembered.find(
          (a) =>
            (a.username || "").toLowerCase() === cleanUsername.toLowerCase() &&
            a.email,
        );
        const localMap = readStored("no_offside_username_map", {});
        const mappedEmail =
          matchedRemembered?.email || localMap[cleanUsername.toLowerCase()];

        if (mappedEmail) {
          resolvedEmail = mappedEmail;
        } else {
          // 3. Resolve email via /api/resolve-username
          try {
            const apiRes = await fetch("/api/resolve-username", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: cleanUsername }),
            });
            if (apiRes.ok) {
              const resData = await apiRes.json();
              if (resData?.email) {
                resolvedEmail = resData.email;
                const curMap = readStored("no_offside_username_map", {});
                writeStored("no_offside_username_map", {
                  ...curMap,
                  [cleanUsername.toLowerCase()]: resData.email,
                });
              }
            } else if (apiRes.status === 404) {
              throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác.");
            }
          } catch (apiErr) {
            if (
              apiErr.message === "Tên đăng nhập hoặc mật khẩu không chính xác."
            ) {
              throw apiErr;
            }
          }

          // 4. Fallback to Supabase RPC if API didn't resolve
          if (!resolvedEmail) {
            try {
              const { data: resolved, error: rpcError } = await supabase.rpc(
                "no_auth_resolve_username",
                {
                  p_username: cleanUsername,
                  p_client_id: "web",
                },
              );
              if (!rpcError && resolved?.email) {
                resolvedEmail = resolved.email;
              }
            } catch {}
          }
        }
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
        const isUnconfirmed =
          signInError.code === "email_not_confirmed" ||
          signInError.message?.toLowerCase().includes("email not confirmed");

        if (isUnconfirmed) {
          setUnconfirmedEmailAlert({
            email: resolvedEmail || email || cleanUsername,
          });
          setError("");
          return;
        }

        setUnconfirmedEmailAlert(null);
        // Record failed attempt for rate limiting
        try {
          await supabase.rpc("no_auth_record_login_result", {
            p_username: cleanUsername,
            p_success: false,
            p_client_id: "web",
          });
        } catch {}
        throw signInError;
      }

      setUnconfirmedEmailAlert(null);

      // Record successful login (clears failed attempts)
      try {
        await supabase.rpc("no_auth_record_login_result", {
          p_username: cleanUsername,
          p_success: true,
          p_client_id: "web",
        });
      } catch {}

      // Remember account on device with email
      if (data?.user) {
        saveRememberedAccount({
          username: cleanUsername,
          name:
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            cleanUsername,
          avatar: data.user.user_metadata?.avatar_url || "",
          id: data.user.id,
          email: resolvedEmail || data.user.email,
        });
      }

      if (data?.session && onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      formSubmitting.current = false;
      setBusy(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (formSubmitting.current) return;
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

    formSubmitting.current = true;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      // 1. Check availability on server first
      try {
        const apiRes = await fetch("/api/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUsername,
            email: cleanEmail,
          }),
        });
        if (apiRes.ok) {
          const avail = await apiRes.json();
          if (!avail.usernameAvailable) {
            throw new Error(
              "Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.",
            );
          }
          if (!avail.emailAvailable) {
            throw new Error(
              "Email này đã được đăng ký tài khoản. Vui lòng chọn Đăng nhập.",
            );
          }
        }
      } catch (checkErr) {
        if (
          checkErr.message.includes("đã được") ||
          checkErr.message.includes("Vui lòng chọn")
        ) {
          throw checkErr;
        }
      }

      try {
        const { data: avail, error: availError } = await supabase.rpc(
          "no_auth_check_availability",
          {
            p_username: cleanUsername,
            p_email: cleanEmail,
          },
        );

        if (!availError && avail) {
          if (!avail.usernameAvailable) {
            throw new Error(
              "Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.",
            );
          }
          if (!avail.emailAvailable) {
            throw new Error(
              "Email này đã được đăng ký tài khoản. Vui lòng chọn Đăng nhập.",
            );
          }
        }
      } catch (checkErr) {
        if (
          checkErr.message.includes("đã được") ||
          checkErr.message.includes("Vui lòng chọn")
        ) {
          throw checkErr;
        }
      }

      // 2. Perform Supabase Auth registration
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
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

      // 4. Remember account identifier and email on device for fast filling & instant resolution
      saveRememberedAccount({
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
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
      formSubmitting.current = false;
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
    <div lang={language} className="auth-page auth-redesign min-h-screen font-sans antialiased relative">

      <div className="auth-shell mx-auto w-full relative z-10">
        <header className="auth-header">
          <div className="auth-identity">
            <img src="/pwa-512x512.png" width="38" height="38" alt="" />
            <h1>No Offside</h1>
          </div>

          <div className="auth-header-controls">
            {/* Theme Control */}
            <div className="relative" ref={themeRef}>
              <Pressable
                type="button"
                id="theme-select-btn"
                aria-label={t("Chọn giao diện")}
                title={t("Chọn giao diện")}
                aria-expanded={themeMenuOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  setThemeMenuOpen((prev) => !prev);
                  setLangMenuOpen(false);
                }}
                className="auth-control-btn auth-theme-btn"
              >
                {theme === "light" ? (
                  <Sun size={20} filled  className="text-amber-500" aria-hidden="true" />
                ) : theme === "dark" ? (
                  <Moon size={20} filled  className="text-emerald-400" aria-hidden="true" />
                ) : (
                  <Monitor size={20} filled  className="text-slate-600 dark:text-slate-300" aria-hidden="true" />
                )}
              </Pressable>

              {themeMenuOpen && (
                <div
                  role="listbox"
                  aria-label={t("Chọn giao diện")}
                  className="auth-popover-menu min-w-[152px]"
                >
                  <Pressable
                    type="button"
                    role="option"
                    aria-selected={theme === "light"}
                    onClick={() => {
                      onThemeChange?.("light");
                      setThemeMenuOpen(false);
                    }}
                    className="auth-popover-item"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sun size={20} filled={theme === "light"}  className="text-amber-500 shrink-0" aria-hidden="true" />
                      <span>{t("Sáng")}</span>
                    </div>
                    {theme === "light" && <Check size={16}  className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />}
                  </Pressable>

                  <Pressable
                    type="button"
                    role="option"
                    aria-selected={theme === "dark"}
                    onClick={() => {
                      onThemeChange?.("dark");
                      setThemeMenuOpen(false);
                    }}
                    className="auth-popover-item"
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon size={20} filled={theme === "dark"}  className="text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>{t("Tối")}</span>
                    </div>
                    {theme === "dark" && <Check size={16}  className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />}
                  </Pressable>

                  <Pressable
                    type="button"
                    role="option"
                    aria-selected={theme === "system"}
                    onClick={() => {
                      onThemeChange?.("system");
                      setThemeMenuOpen(false);
                    }}
                    className="auth-popover-item"
                  >
                    <div className="flex items-center gap-2.5">
                      <Monitor size={20} filled={theme === "system"}  className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{t("Theo thiết bị")}</span>
                    </div>
                    {theme === "system" && <Check size={16}  className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />}
                  </Pressable>
                </div>
              )}
            </div>

            {/* Language Control */}
            <div className="relative" ref={langRef}>
              <Pressable
                type="button"
                id="language-select-btn"
                aria-label={t("Chọn ngôn ngữ")}
                title={t("Chọn ngôn ngữ")}
                aria-expanded={langMenuOpen}
                aria-haspopup="listbox"
                onClick={() => {
                  setLangMenuOpen((prev) => !prev);
                  setThemeMenuOpen(false);
                }}
                className="auth-control-btn auth-lang-btn"
              >
                <span>{language.toUpperCase()}</span>
                <ChevronDown size={14}  className={`transition-transform duration-200 ${langMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </Pressable>

              {langMenuOpen && (
                <div
                  role="listbox"
                  aria-label={t("Chọn ngôn ngữ")}
                  className="auth-popover-menu min-w-[136px]"
                >
                  <Pressable
                    type="button"
                    role="option"
                    aria-selected={language === "vi"}
                    onClick={() => {
                      changeLanguage("vi");
                      setLangMenuOpen(false);
                    }}
                    className="auth-popover-item"
                  >
                    <span>Tiếng Việt</span>
                    {language === "vi" && <Check size={16}  className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />}
                  </Pressable>

                  <Pressable
                    type="button"
                    role="option"
                    aria-selected={language === "en"}
                    onClick={() => {
                      changeLanguage("en");
                      setLangMenuOpen(false);
                    }}
                    className="auth-popover-item"
                  >
                    <span>English</span>
                    {language === "en" && <Check size={16}  className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />}
                  </Pressable>
                </div>
              )}
            </div>
          </div>
        </header>

        {["signin", "signup"].includes(mode) && <section className="auth-intro">
          <h2>{t(mode === "signin" ? "Hẹn nhau ra sân." : "Tạo tài khoản")}</h2>
          <p>{t(mode === "signin" ? "Đăng nhập để kết nối với đội bóng." : "Tạo tài khoản để hẹn nhau ra sân.")}</p>
        </section>}

        {/* Card Frame */}
        <div className="auth-card p-6 relative">
          {pendingJoin && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-300 truncate">
                  {t("Gia nhập:")} {pendingJoin.teamName || t("Đội bóng")}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {t("Cầu thủ:")} {pendingJoin.name} · {t("Số áo")} #{pendingJoin.number}
                </p>
              </div>
            </div>
          )}

          {/* Unconfirmed Email Alert */}
          {unconfirmedEmailAlert && (
            <div
              role="alert"
              className="mb-4 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-100 text-xs shadow-lg space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5 stroke-[2.2]" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200 text-xs leading-snug">
                    Email của bạn chưa được xác minh. Hãy kiểm tra hộp thư, mở liên kết xác minh rồi đăng nhập lại.
                  </p>
                  <p className="text-[11px] text-rose-300/90 font-medium">
                    Nếu chưa thấy email, hãy kiểm tra thư rác.
                  </p>
                </div>
              </div>

              {resendNotice && (
                <p className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                  {resendNotice}
                </p>
              )}

              <div className="pt-1">
                <Pressable
                  type="button"
                  disabled={resendingEmail || resendCooldown > 0}
                  onClick={handleResendVerificationEmail}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    resendingEmail || resendCooldown > 0
                      ? "bg-rose-900/40 text-rose-300/60 border border-rose-800/40 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:scale-95"
                  }`}
                >
                  {resendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi lại...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Gửi lại sau {resendCooldown}s</span>
                  ) : (
                    <span>Gửi lại email xác minh</span>
                  )}
                </Pressable>
              </div>
            </div>
          )}

          {/* Alert Messages */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 font-medium">{t(error)}</div>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 font-medium">{t(success)}</div>
            </div>
          )}

          {/* TAB 1: ĐĂNG NHẬP (SIGN IN) */}
          {mode === "signin" && (
            <div>
              {rememberedAccounts.length > 0 && <section className="auth-remembered" aria-label={t("Tài khoản trên thiết bị này:")}>
                {(() => {
                  const account = rememberedAccounts.find(a=>a.username.toLowerCase()===username.toLowerCase()) || rememberedAccounts[0];
                  return <Pressable type="button" className="auth-account-row" onClick={()=>chooseAccount(account)}>
                    <span className="auth-account-avatar" aria-hidden="true">{account.avatar ? <img src={account.avatar} alt=""/> : (account.name || account.username).slice(0,1).toUpperCase()}</span>
                    <span className="auth-account-copy"><strong>{t("Tiếp tục với")} {account.name || account.username}</strong><span>{t("Đã dùng trên thiết bị này")}</span></span>
                    <ChevronRight size={20} aria-hidden="true"/>
                  </Pressable>;
                })()}
                {rememberedAccounts.length > 1 && <Pressable type="button" className="auth-text-link auth-change-account" onClick={()=>setAccountSheet(true)}>{t("Đổi tài khoản")}</Pressable>}
                {rememberedAccounts.length === 1 && <Pressable type="button" className="auth-text-link auth-change-account" onClick={()=>setAccountSheet(true)}>{t("Quản lý tài khoản trên thiết bị")}</Pressable>}
                <div className="auth-divider"><span>{t("Hoặc dùng tài khoản khác")}</span></div>
              </section>}

              <form onSubmit={handleSignIn} className="auth-main-form">
                {/* Username Input */}
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Tên đăng nhập")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-username"
                      autoComplete="username"
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t("Nhập tên đăng nhập")}
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>

                </div>

                {/* 6-Digit Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-300"
                    >
                      {t("Mật khẩu")}
                    </label>

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
                    <Pressable
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Pressable>
                  </div>
                  <div className="auth-forgot">                    <Pressable
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                        setSuccess("");
                      }}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      {t("Quên mật khẩu?")}
                    </Pressable></div>
                </div>

                {/* Submit Sign In Button */}
                <Pressable
                  type="submit"
                  disabled={busy}
                  className="auth-primary w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("Đang kiểm tra...")}</span>
                    </>
                  ) : (
                    <span>{t("Đăng nhập")}</span>
                  )}
                </Pressable>
              </form>

              <div className="auth-divider"><span>{t("Hoặc")}</span></div>

              {/* Google OAuth Button */}
              <Pressable
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="auth-google w-full py-2.5 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>{t("Tiếp tục với Google")}</span>
              </Pressable>

              <p className="auth-mode-link">{t("Chưa có tài khoản?")} <Pressable type="button" className="auth-text-link" onClick={()=>switchMode('signup')}>{t("Tạo tài khoản")}</Pressable></p>

              <Pressable
                type="button"
                id="demo-signin-btn"
                onClick={handleDemoAccess}
                className="auth-demo-link auth-text-link"
              >
                <span>{t("Trải nghiệm bản demo")}</span>
              </Pressable>
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
                    {t("Họ và tên")}
                  </label>
                  <input
                    id="signup-name"
                    autoComplete="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("Nguyễn Văn A")}
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
                      autoComplete="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("vidu@gmail.com")}
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
                    {t("Tên đăng nhập")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-username"
                      autoComplete="username"
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
                    {t("3–20 ký tự (chữ cái, chữ số, _ hoặc -); không phân biệt hoa/thường.")}
                  </p>
                </div>

                {/* 6-Digit Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Mật khẩu 6 số")}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-password"
                      autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <Pressable
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Pressable>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t("Mật khẩu gồm đúng 6 chữ số từ 0–9.")}
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Xác nhận mật khẩu")}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
                      autoComplete="new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2 pl-9 pr-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 tracking-widest font-mono transition-all"
                    />
                    <Pressable
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Pressable>
                  </div>
                </div>

                {/* Submit Register Button */}
                <Pressable
                  type="submit"
                  disabled={busy}
                  className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("Đang tạo tài khoản...")}</span>
                    </>
                  ) : (
                    <span>{t("Đăng ký")}</span>
                  )}
                </Pressable>
              </form>

              <div className="auth-divider"><span>{t("Hoặc")}</span></div>

              {/* Google Register Button */}
              <Pressable
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="auth-google w-full py-2.5 bg-white hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon />
                <span>{t("Đăng ký bằng Google")}</span>
              </Pressable>
              <p className="auth-mode-link">{t("Đã có tài khoản?")} <Pressable type="button" className="auth-text-link" onClick={()=>switchMode('signin')}>{t("Đăng nhập")}</Pressable></p>
            </div>
          )}

          {/* TAB 3: QUÊN MẬT KHẨU (FORGOT PASSWORD) */}
          {mode === "forgot" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Pressable
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setSuccess("");
                  }}
                  aria-label={t("Quay lại đăng nhập")}
                  className="auth-back-link p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Pressable>
                <h2 className="text-sm font-bold text-white">{t("Khôi phục mật khẩu")}</h2>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Địa chỉ Gmail đã đăng ký")}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      autoComplete="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("vidu@gmail.com")}
                      className="w-full bg-slate-900/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    {t("Hệ thống sẽ gửi liên kết bảo mật để bạn thiết lập lại mật khẩu 6 số mới.")}
                  </p>
                </div>

                <Pressable
                  type="submit"
                  disabled={busy || forgotCooldown > 0}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("Đang gửi liên kết...")}</span>
                    </>
                  ) : forgotCooldown > 0 ? (
                    <span>{t("Gửi lại sau")} ({forgotCooldown}s)</span>
                  ) : (
                    <span>{t("Gửi liên kết đặt lại mật khẩu")}</span>
                  )}
                </Pressable>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
                <Pressable
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors font-medium"
                >
                  {t("Quay lại đăng nhập")}
                </Pressable>
              </div>
            </div>
          )}

          {/* TAB 4: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD) */}
          {mode === "reset_password" && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-white">
                  {t("Đặt lại mật khẩu 6 số mới")}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t("Nhập mật khẩu 6 chữ số mới để tiếp tục sử dụng No Offside.")}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="reset-password-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Mật khẩu 6 số mới")}
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
                    <Pressable
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Pressable>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Xác nhận mật khẩu 6 số")}
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
                    <Pressable
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Pressable>
                  </div>
                </div>

                <Pressable
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("Đang cập nhật...")}</span>
                    </>
                  ) : (
                    <span>{t("Lưu mật khẩu mới")}</span>
                  )}
                </Pressable>
              </form>
            </div>
          )}

          {/* TAB 5: HOÀN TẤT USERNAME CHO GOOGLE USER MỚI */}
          {mode === "google_username" && (
            <div>
              <div className="mb-4">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {t("Xác nhận tài khoản Google")}
                </span>
                <h2 className="text-sm font-bold text-white mt-2">
                  {t("Chọn Tên đăng nhập của bạn")}
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t("Đồng đội sẽ tìm kiếm và gắn thẻ bạn bằng tên đăng nhập này.")}
                </p>
              </div>

              <form onSubmit={handleCompleteGoogleUsername} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="google-username-input"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    {t("Tên đăng nhập")}
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
                    {t("3–20 ký tự (chữ cái, chữ số, _ hoặc -); không phân biệt hoa/thường.")}
                  </p>
                </div>

                <Pressable
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("Đang lưu...")}</span>
                    </>
                  ) : (
                    <span>{t("Hoàn tất & Về đăng nhập")}</span>
                  )}
                </Pressable>
              </form>
            </div>
          )}
        </div>



        {/* Footer */}
        <p className="text-[11px] text-center text-slate-500 mt-4 font-medium">
          {t("© No Offside · Hẹn nhau ra sân.")}
        </p>
      </div>
      {accountSheet && <ProModal open={accountSheet} title={t("Tài khoản trên thiết bị này:")} onClose={()=>setAccountSheet(false)}>
        <div ref={accountSheetRef} className="auth-account-sheet">
          <p>{t("Chọn tài khoản để nhập mật khẩu. Quên trên thiết bị không xóa tài khoản hệ thống.")}</p>
          {rememberedAccounts.map(account=><div className="auth-account-sheet-item" key={account.username}>
            <Pressable type="button" className="auth-account-row" onClick={()=>chooseAccount(account)}>
              <span className="auth-account-avatar" aria-hidden="true">{(account.name || account.username).slice(0,1).toUpperCase()}</span>
              <span className="auth-account-copy"><strong>{account.name || account.username}</strong><span>{account.username}</span></span><ChevronRight size={20} aria-hidden="true"/>
            </Pressable>
            <Pressable type="button" className="auth-forget-account" onClick={e=>removeRememberedAccount(e,account.username)} aria-label={`${t("Quên tài khoản trên thiết bị này")} · ${account.username}`}>{t("Quên tài khoản trên thiết bị này")}</Pressable>
          </div>)}
          {!rememberedAccounts.length && <p>{t("Chưa có tài khoản đã nhớ.")}</p>}
        </div>
      </ProModal>}
    </div>
  );
}
