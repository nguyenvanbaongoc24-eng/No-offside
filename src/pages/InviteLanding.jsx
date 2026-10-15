import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { savePendingJoin } from "../lib/pendingJoin";

export default function InviteLanding({
  inviteCode = "",
  teamData: initialTeamData = null,
  authenticated = false,
  currentUser = null,
  onJoinSuccess,
  onRequireAuth,
  onBackToApp,
}) {
  const [loading, setLoading] = useState(!initialTeamData);
  const [teamData, setTeamData] = useState(initialTeamData);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAuthPrompt, setPendingAuthPrompt] = useState(false);

  const [profile, setProfile] = useState({
    name: currentUser?.name || "",
    number:
      currentUser?.number !== undefined && currentUser?.number !== null
        ? String(currentUser.number)
        : "",
    role: currentUser?.role || "Tiền đạo (ST)",
  });

  const update = (key, value) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  // Load invite data if only code was provided in URL
  useEffect(() => {
    if (initialTeamData) {
      setTeamData(initialTeamData);
      setLoading(false);
      return;
    }

    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError("Mã mời không hợp lệ.");
      setLoading(false);
      return;
    }

    async function loadInvite() {
      setLoading(true);
      setError("");
      try {
        // 1. Try Supabase RPC first if available
        if (supabase) {
          try {
            const { data, error: rpcError } = await supabase.rpc(
              "no_gov_get_invite",
              {
                p_code: code,
              },
            );
            if (!rpcError && data && data.valid) {
              setTeamData({
                id: data.teamId,
                name: data.teamName,
                logo: data.logo || "",
                category: data.category || "Sân 7",
                venue: data.venue || "",
                captain: data.captain || "Đội trưởng",
                membersCount: data.memberCount || 1,
                takenNumbers: data.takenNumbers || [],
                code: data.code || code,
              });
              setLoading(false);
              return;
            }
          } catch {
            // Proceed to cloud API fallback
          }
        }

        // 2. Cloud API fallback (/api/invites) for cross-device QR scanning
        try {
          const resp = await fetch(
            `/api/invites?code=${encodeURIComponent(code)}`,
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.valid) {
              setTeamData({
                id: data.teamId,
                name: data.teamName,
                logo: data.logo || "",
                category: data.category || "Sân 7",
                venue: data.venue || "",
                captain: data.captain || "Đội trưởng",
                membersCount: data.membersCount || 1,
                takenNumbers: data.takenNumbers || [],
                code: data.code || code,
              });
              setLoading(false);
              return;
            } else if (data && data.error) {
              throw new Error(data.error);
            }
          }
        } catch (apiErr) {
          if (apiErr.message && !apiErr.message.includes("fetch")) {
            throw apiErr;
          }
        }

        throw new Error(
          "Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.",
        );
      } catch (err) {
        setError(
          err.message ||
            "Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [inviteCode, initialTeamData]);

  const isNumberTaken = (num) => {
    if (!teamData?.takenNumbers || num === "" || num === undefined) {
      return false;
    }
    return teamData.takenNumbers.includes(Number(num));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanName = profile.name.trim();
    if (!cleanName) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    const numberVal = Number(profile.number);
    if (!Number.isInteger(numberVal) || numberVal < 0 || numberVal > 99) {
      setError("Số áo phải là số nguyên từ 0 đến 99.");
      return;
    }

    if (isNumberTaken(numberVal)) {
      setError(
        `Số áo ${numberVal} đã có thành viên sử dụng. Vui lòng chọn số khác.`,
      );
      return;
    }

    const payload = {
      code: teamData.code || inviteCode.trim().toUpperCase(),
      teamId: teamData.id,
      teamName: teamData.name,
      teamLogo: teamData.logo,
      teamCategory: teamData.category,
      name: cleanName,
      number: numberVal,
      position: profile.role,
      role: profile.role,
    };

    if (!authenticated) {
      // Save pending join safely in sessionStorage
      savePendingJoin(payload);
      setPendingAuthPrompt(true);
      return;
    }

    setSubmitting(true);
    try {
      if (onJoinSuccess) {
        await onJoinSuccess(payload);
      }
    } catch (err) {
      setError(err.message || "Gia nhập đội thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải thông tin đội bóng...
          </p>
        </div>
      </div>
    );
  }

  if (error && !teamData) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center max-w-md mx-auto">
        <div className="settings-card p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Không tìm thấy lời mời
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <button
            onClick={onBackToApp}
            className="primary-button w-full h-11 text-xs font-bold"
          >
            Quay lại ứng dụng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-5 pt-safe-hero rounded-b-[36px] shadow-md">
        <button
          onClick={onBackToApp}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
          Quay lại ứng dụng
        </button>

        <div className="flex items-center gap-4 mt-5">
          {teamData.logo ? (
            <img
              src={teamData.logo}
              alt="Logo đội"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 bg-white shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Shield className="w-8 h-8" />
            </div>
          )}
          <div className="min-w-0">
            <div className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              Lời mời tham gia
            </div>
            <h1 className="text-xl font-bold break-words">{teamData.name}</h1>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              Đội trưởng:{" "}
              <span className="font-semibold text-white">
                {teamData.captain}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300 mt-4 pt-3 border-t border-slate-800">
          <span className="flex gap-1.5 items-center">
            <Users size={14} className="text-emerald-400" />
            {teamData.membersCount} thành viên · {teamData.category}
          </span>
          {teamData.venue && (
            <span className="flex gap-1.5 items-center">
              <MapPin size={14} className="text-emerald-400" />
              {teamData.venue}
            </span>
          )}
        </div>
      </header>

      <main className="p-5 max-w-md mx-auto space-y-4">
        {/* Step: User not authenticated and requested account creation */}
        {pendingAuthPrompt ? (
          <div className="settings-card p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                Tạo tài khoản để hoàn tất gia nhập đội
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Thông tin hồ sơ tại {teamData.name} (Số áo #{profile.number}) đã
                được ghi nhận. Hãy đăng nhập hoặc đăng ký để lưu giữ tư cách
                thành viên.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  onRequireAuth && onRequireAuth({ mode: "register" })
                }
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản mới</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onRequireAuth && onRequireAuth({ mode: "login" })
                }
                className="w-full h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-slate-600" />
                <span>Đã có tài khoản? Đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingAuthPrompt(false)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 text-center"
              >
                Quay lại chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        ) : !joining ? (
          <div className="settings-card p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">
                Tham gia cùng {teamData.name}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Điền thông tin thành viên (họ tên, số áo thi đấu) để hoàn tất
                gia nhập đội bóng.
              </p>
            </div>
            <button
              className="primary-button w-full h-12 text-xs font-bold"
              onClick={() => setJoining(true)}
            >
              Điền hồ sơ tham gia đội
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="settings-card p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Hồ sơ thành viên trong đội
            </h2>

            <label className="block text-xs font-bold text-slate-700">
              Họ và tên trong đội <span className="text-rose-500">*</span>
              <input
                required
                autoComplete="name"
                placeholder="Nhập họ và tên"
                value={profile.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full h-11 px-3 mt-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Số áo <span className="text-rose-500">* (0 - 99)</span>
              <input
                required
                type="number"
                min="0"
                max="99"
                placeholder="Chọn số áo"
                value={profile.number}
                onChange={(e) => update("number", e.target.value)}
                className={`w-full h-11 px-3 mt-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 ${
                  isNumberTaken(profile.number)
                    ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500"
                    : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500"
                }`}
              />
              {isNumberTaken(profile.number) ? (
                <span className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{`Số áo ${profile.number} đã có người chọn trong đội. Vui lòng chọn số khác.`}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block font-normal">
                  Số áo riêng biệt trong đội này, không ảnh hưởng đội khác.
                </span>
              )}
            </label>

            <label className="block text-xs font-bold text-slate-700">
              Vị trí sở trường (tùy chọn)
              <select
                value={profile.role}
                onChange={(e) => update("role", e.target.value)}
                className="w-full h-11 px-3 mt-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[
                  "Tiền đạo (ST)",
                  "Tiền vệ (MF)",
                  "Hậu vệ (DF)",
                  "Thủ môn (GK)",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                isNumberTaken(profile.number) ||
                !profile.name.trim() ||
                profile.number === ""
              }
              className="primary-button w-full h-12 text-xs font-bold flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý gia nhập...</span>
                </>
              ) : authenticated ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận gia nhập {teamData.name}</span>
                </>
              ) : (
                <span>Tiếp tục gia nhập</span>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
