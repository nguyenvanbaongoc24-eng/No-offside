import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Shield,
  Users,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { savePendingJoin } from '../lib/pendingJoin';

export default function ClubCodeModal({
  isOpen = true,
  onClose,
  isLoggedIn = false,
  currentUser = null,
  onJoinSuccess,
  onRequireAuth,
  initialCode = '',
}) {
  const [step, setStep] = useState('input'); // 'input' | 'form'
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamInfo, setTeamInfo] = useState(null);

  // Form states
  const [name, setName] = useState(currentUser?.name || '');
  const [number, setNumber] = useState(
    currentUser?.number !== undefined && currentUser?.number !== null
      ? String(currentUser.number)
      : '',
  );
  const [position, setPosition] = useState(currentUser?.role || 'Tiền đạo');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    setError('');
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Vui lòng nhập mã Club.');
      return;
    }

    setLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error: rpcError } = await supabase.rpc('no_gov_get_invite', {
            p_code: cleanCode,
          });
          if (rpcError) {
            const isMissingRpc =
              rpcError.code === "PGRST202" ||
              rpcError.code === "42883" ||
              rpcError.message?.includes("schema cache") ||
              rpcError.message?.includes("Could not find the function");
            if (!isMissingRpc) throw new Error(rpcError.message);
          } else if (data && data.valid) {
            setTeamInfo(data);
            setStep('form');
            return;
          }
        } catch (e) {
          if (
            !e.message?.includes("schema cache") &&
            !e.message?.includes("Could not find the function")
          ) {
            throw e;
          }
        }
      }

      // Local / Offline fallback lookup
      try {
        const localTeamKey = `no_offside_team_${cleanCode.toLowerCase()}`;
        const localRaw = window?.localStorage?.getItem(localTeamKey);
        if (localRaw) {
          const t = JSON.parse(localRaw);
          setTeamInfo({
            valid: true,
            code: cleanCode,
            teamId: t.id,
            teamName: t.teamName,
            logo: t.logo,
            captain: t.members?.find((m) => m.roleType === 'owner')?.name || 'Đội trưởng',
            memberCount: t.members?.length || 0,
            takenNumbers: (t.members || []).map((m) => Number(m.number)),
          });
          setStep('form');
          return;
        }
      } catch {}

      throw new Error('Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.');
    } catch (err) {
      setError(err.message || 'Không thể xác thực mã mời. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const isNumberTaken = (num) => {
    if (!teamInfo?.takenNumbers || num === '' || num === undefined) return false;
    return teamInfo.takenNumbers.includes(Number(num));
  };

  const handleConfirmJoin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const numVal = Number(number);
    if (!Number.isInteger(numVal) || numVal < 0 || numVal > 99) {
      setError('Số áo phải là số nguyên từ 0 đến 99.');
      return;
    }

    if (isNumberTaken(numVal)) {
      setError(`Số áo ${numVal} đã có thành viên trong đội sử dụng. Vui lòng chọn số khác.`);
      return;
    }

    const memberPayload = {
      code: teamInfo.code,
      teamId: teamInfo.teamId,
      teamName: teamInfo.teamName,
      teamLogo: teamInfo.logo,
      name: cleanName,
      number: numVal,
      position,
    };

    if (!isLoggedIn) {
      // Save pending join safely to sessionStorage
      savePendingJoin(memberPayload);
      if (onRequireAuth) {
        onRequireAuth(memberPayload);
      }
      onClose();
      return;
    }

    // Authenticated user completing join
    setSubmitting(true);
    try {
      if (onJoinSuccess) {
        await onJoinSuccess(memberPayload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Gia nhập đội không thành công. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'form' ? (
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setError('');
                }}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800"
                aria-label="Quay lại nhập mã"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <KeyRound className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {step === 'input' ? 'Gia nhập bằng mã Club' : 'Thông tin thành viên'}
              </h3>
              <p className="text-xs text-gray-400">
                {step === 'input'
                  ? 'Nhập mã gồm 6 ký tự do đội bóng cung cấp'
                  : teamInfo?.teamName || 'Xác nhận hồ sơ vào đội'}
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: INPUT CODE */}
        {step === 'input' && (
          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            <div>
              <label htmlFor="club-code-input" className="block text-xs font-bold text-gray-700 mb-1.5">
                Mã Club của đội bóng
              </label>
              <div className="relative">
                <input
                  id="club-code-input"
                  type="text"
                  autoFocus
                  required
                  maxLength={12}
                  placeholder="Ví dụ: NO7X9K"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  className="w-full h-14 text-center font-mono tracking-widest text-lg font-bold uppercase rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Mã không phân biệt chữ hoa, chữ thường và khoảng trắng.
              </p>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra mã...</span>
                </>
              ) : (
                <span>Tiếp tục kiểm tra đội</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY TEAM & MEMBER FORM */}
        {step === 'form' && teamInfo && (
          <form onSubmit={handleConfirmJoin} className="mt-4 space-y-4">
            {/* Team Preview Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3.5">
              {teamInfo.logo ? (
                <img
                  src={teamInfo.logo}
                  alt={teamInfo.teamName}
                  className="w-12 h-12 rounded-2xl object-cover border border-emerald-200 bg-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  <Shield className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-900 truncate">
                    {teamInfo.teamName}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-bold shrink-0">
                    Mã: {teamInfo.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Đội trưởng: <span className="font-semibold text-slate-700">{teamInfo.captain}</span>
                  {teamInfo.memberCount ? ` · ${teamInfo.memberCount} thành viên` : ''}
                </p>
              </div>
            </div>

            {/* Member Form Fields */}
            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="member-fullname" className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên trong đội <span className="text-rose-500">*</span>
                </label>
                <input
                  id="member-fullname"
                  type="text"
                  required
                  placeholder="Nhập họ và tên của bạn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Điền sẵn từ tài khoản, bạn có thể chỉnh tên hiển thị riêng trong đội.
                </p>
              </div>

              <div>
                <label htmlFor="member-jersey" className="block text-xs font-bold text-slate-700 mb-1">
                  Số áo thi đấu <span className="text-rose-500">* (0 - 99)</span>
                </label>
                <input
                  id="member-jersey"
                  type="number"
                  min="0"
                  max="99"
                  required
                  placeholder="Chọn số áo (0 - 99)"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl border text-xs font-bold ${
                    isNumberTaken(number)
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:ring-emerald-500'
                  } focus:outline-none focus:ring-2`}
                />
                {isNumberTaken(number) ? (
                  <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{`Số áo ${number} đã có người chọn trong đội. Vui lòng chọn số khác.`}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Số áo thuộc về thành viên trong đội này, không đổi số áo ở đội khác.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="member-position" className="block text-xs font-bold text-slate-700 mb-1">
                  Vị trí thi đấu sở trường (tùy chọn)
                </label>
                <select
                  id="member-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Tiền đạo (ST)">Tiền đạo (ST)</option>
                  <option value="Tiền vệ (MF)">Tiền vệ (MF)</option>
                  <option value="Hậu vệ (DF)">Hậu vệ (DF)</option>
                  <option value="Thủ môn (GK)">Thủ môn (GK)</option>
                </select>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isNumberTaken(number) || !name.trim() || number === ''}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang hoàn tất gia nhập...</span>
                </>
              ) : isLoggedIn ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận gia nhập đội</span>
                </>
              ) : (
                <span>Tiếp tục gia nhập (Cần tài khoản)</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
