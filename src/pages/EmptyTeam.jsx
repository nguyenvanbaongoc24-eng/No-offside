import {useTeamInvite} from "../hooks/useTeamInvite";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  Users2,
  QrCode,
  Copy,
  Check,
  ChevronRight,
  Shield,
  Crown,
} from "lucide-react";
import MatchFormSheet from "../components/MatchFormSheet";
import AddMemberModal from "../components/AddMemberModal";
import InviteShare from "../components/InviteShare";
import TeamManager from "./TeamManager";

export default function EmptyTeam({
  teamSettings = {},
  leader = false,
  members = [],
  onAddMember,
  onRemoveMember,
  currentUserRole = "player",
  user,
  onCreateInvite,
  onReadInvite,
  onRevokeInvite,
  onSaveMatch,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamManagerModal, setShowTeamManagerModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copyError,setCopyError]=useState("");

  const [form, setForm] = useState({
    opponent: "",
    venue: teamSettings.venue || "",
    datetime: "",
    timeoutDatetime: "",
    penaltyEnabled: false,
    penaltyFine: 0,
  });

  const isLeader =
    leader ||
    currentUserRole === "owner" ||
    currentUserRole === "admin";

  const invite = useTeamInvite(teamSettings, currentUserRole, onCreateInvite, onRevokeInvite, onReadInvite);
  const inviteCode = invite.code;
  const openInvite = () => {setShowInviteModal(true); invite.load().catch(() => {});};
  const activeMembers = members.filter(
    (m) => m.membershipStatus !== "removed",
  );

  const handleCopyCode = async () => {
    if (!inviteCode) {openInvite(); return;}
    setCopyError("");
    try {
      const valid=await invite.load();
      if (!navigator.clipboard?.writeText) throw Error("Trình duyệt chưa hỗ trợ sao chép.");
      await navigator.clipboard.writeText(valid.code);
      setCopiedCode(true);
    } catch(err) {setCopyError(err.message || "Không sao chép được mã. Mở Mã / QR để chọn và sao chép thủ công.");}
  };
  useEffect(() => {if(!copiedCode)return;const timer=setTimeout(()=>setCopiedCode(false),2000);return ()=>clearTimeout(timer);},[copiedCode]);
  return (
    <section className="empty-team p-4 max-w-lg mx-auto space-y-4">
      {/* HEADER ĐỘI BÓNG */}
      <div className="pt-2">
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
          {teamSettings.teamName || "Đội bóng của bạn"}
        </p>
        <h1 className="text-2xl font-extrabold mt-0.5 text-slate-900 dark:text-white tracking-tight">
          Trang chủ
        </h1>
      </div>

      {/* CARD 1: CHƯA CÓ TRẬN SẮP TỚI */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-soft text-center transition-all">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CalendarDays size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Chưa có trận sắp tới
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {leader
            ? "Tạo lịch thi đấu để đội bắt đầu điểm danh."
            : "Chờ chủ đội hoặc quản trị viên tạo lịch thi đấu."}
        </p>
        {leader && (
          <button
            className="primary-button mt-4 px-6 py-2.5 rounded-full font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Tạo trận</span>
          </button>
        )}
      </div>

      {/* CARD 2: THÀNH VIÊN ĐỘI */}
      <div className="w-full bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-3.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thành viên đội
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 tabular-nums">
                  {activeMembers.length} người
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Danh sách cầu thủ và ban quản lý
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {isLeader && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Thêm thành viên thủ công"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="whitespace-nowrap">Thêm thành viên</span>
              </button>
            </div>
          )}
        </div>

        {/* Member Preview List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pt-1">
          {activeMembers.slice(0, 5).map((m) => {
            const isOwner = m.roleType === "owner" || m.role === "owner";
            const isAdmin = m.roleType === "admin" || m.role === "admin";
            const roleLabel = isOwner
              ? "Chủ đội"
              : isAdmin
              ? "Quản trị viên"
              : "Cầu thủ";
            return (
              <div
                key={m.id || m.number}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                    {m.number || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {m.name || "Cầu thủ"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {m.position || m.role || "Chưa rõ vị trí"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                    isOwner
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50"
                      : isAdmin
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/50"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Button mở toàn bộ danh sách */}
        {activeMembers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTeamManagerModal(true)}
            className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-1.5 border border-slate-200/60 dark:border-slate-800 transition-all cursor-pointer outline-none active:scale-[0.99]"
          >
            <span>Xem toàn bộ {activeMembers.length} thành viên</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* CARD 3: MỜI VÀO ĐỘI (MÃ CLUB & QR CODE) */}
      <div className="w-full bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-3.5 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Mời vào đội bóng
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chia sẻ mã Club hoặc quét QR để đồng đội tham gia ngay
            </p>
          </div>
        </div>

        {/* Club Code & QR Buttons */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              MÃ CLUB
            </span>
            <span className="text-base font-extrabold font-mono tracking-wider text-slate-900 dark:text-white select-all block truncate">
              {inviteCode || "Chưa có mã mời"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all outline-none"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sao chép</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={openInvite}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all outline-none"
              title="Mở mã QR và link chia sẻ"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR</span>
            </button>
          </div>
        </div>
      </div>

      {copyError && <p role="alert" className="form-error">{copyError}</p>}
      {/* FOOTER LINK XEM PROFILE */}
      <button
        className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 w-full py-2 cursor-pointer transition-colors outline-none"
        onClick={() => onNavigate("profile")}
      >
        Xem thông tin cá nhân và đội bóng
      </button>

      {/* MODAL 1: TẠO TRẬN ĐẤU */}
      {open && leader && (
        <MatchFormSheet
          draft={form}
          onChange={setForm}
          error={error}
          onClose={() => setOpen(false)}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onSaveMatch(form);
              setOpen(false);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}

      {/* MODAL 2: THÊM THÀNH VIÊN THỦ CÔNG */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        members={members}
        onAddMember={onAddMember}
      />

      {/* MODAL 3: POPUP CHIA SẺ MÃ QR VÀ LINK */}
      <InviteShare
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamName={teamSettings?.teamName || "FC No Offside"}
        teamLogo={teamSettings?.logo || ""}
        teamCode={inviteCode}
        clubCode={inviteCode}
        inviteStatus={invite.status}
        loading={invite.loading} error={invite.error} onRetry={() => invite.load()}
        currentUserRole={currentUserRole}
        onCreateInvite={() => invite.load(true)}
        onRevokeInvite={invite.revoke}
        onPreviewLanding={() => {
          setShowInviteModal(false);
          if (inviteCode) window.open(`/invite/${encodeURIComponent(inviteCode)}`, "_blank", "noopener,noreferrer");
        }}
      />

      {/* MODAL 4: QUẢN LÝ THÀNH VIÊN ĐỘI */}
      {showTeamManagerModal && (
        <TeamManager
          isOpen={true}
          members={members}
          currentUserRole={currentUserRole}
          onClose={() => setShowTeamManagerModal(false)}
          onRemoveMember={onRemoveMember}
          onOpenInvite={() => {
            setShowTeamManagerModal(false);
            openInvite();
          }}
          onOpenAddMember={() => {
            setShowTeamManagerModal(false);
            setShowAddMemberModal(true);
          }}
        />
      )}
    </section>
  );
}
