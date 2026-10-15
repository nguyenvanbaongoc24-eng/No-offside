import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { matchesMemberSearch } from "../lib/memberSearch";
import Avatar from "../components/Avatar";
import MemberQuickProfileModal from "../components/MemberQuickProfileModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  X,
  Crown,
  Shield,
  Cake,
  AlertTriangle,
  QrCode,
  ChevronRight,
  Eye,
} from "lucide-react";

export default function TeamManager({
  isOpen = true,
  onClose,
  members = [],
  currentUserRole = "owner",
  onRemoveMember,
  onOpenInvite,
  onOpenAddMember,
  onLinkMember,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // 'all' | 'leaders' | 'members'
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [linking, setLinking] = useState(null);
  const [linkTarget, setLinkTarget] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const isOwner = currentUserRole === "owner";

  // Lọc thành viên theo từ khóa tìm kiếm và tab
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = matchesMemberSearch(m, searchQuery);

      if (!matchSearch) return false;

      if (filterRole === "leaders") {
        return m.roleType === "owner" || m.roleType === "admin";
      }
      if (filterRole === "members") {
        return m.roleType === "member";
      }
      return true;
    });
  }, [members, searchQuery, filterRole]);

  // Kiểm tra ngày sinh hôm nay & tháng này
  const getBirthdayBadge = (birthdayStr) => {
    if (!birthdayStr) return null;
    const bday = new Date(birthdayStr);
    const today = new Date();
    const isToday =
      bday.getDate() === today.getDate() &&
      bday.getMonth() === today.getMonth();
    const isThisMonth = bday.getMonth() === today.getMonth();

    if (isToday) {
      return (
        <span className="text-[11px] font-bold bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
          Hôm nay!
        </span>
      );
    }
    if (isThisMonth) {
      return (
        <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
          Tháng này
        </span>
      );
    }
    return null;
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete || !onRemoveMember || removeBusy) return;
    setRemoveBusy(true);
    setRemoveError("");
    try {
      await onRemoveMember(memberToDelete.id);
      setMemberToDelete(null);
    } catch (error) {
      setRemoveError(error.message || "Không cập nhật được thành viên.");
    } finally {
      setRemoveBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      >
        {/* Backdrop Click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          className="member-sheet relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-[36px] sm:rounded-[36px] flex flex-col overflow-hidden text-slate-900 dark:text-white z-10 border border-slate-200/80 dark:border-slate-800 shadow-2xl"
        >
          {/* Top Handle bar (Mobile bottom sheet indicator) */}
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Header Bar */}
          <div className="member-sheet-header p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Thành viên đội</span>
                  <span className="member-count text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold tabular-nums border border-emerald-200/60 dark:border-emerald-800/60">
                    {members.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Danh sách toàn bộ thành viên đang sinh hoạt trong đội
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onOpenInvite && onOpenInvite()}
                aria-label="Mời thành viên"
                title="Mời thành viên qua mã Club & QR"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all cursor-pointer outline-none"
              >
                <QrCode className="w-5 h-5" />
              </button>

              <button
                aria-label="Đóng"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar & Action Buttons */}
          <div className="p-4 pb-2 space-y-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, số áo (#9, #10) hoặc vị trí..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-9 pr-9 py-2.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills & Add Member Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="member-filters flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-full text-xs font-bold">
                <button
                  onClick={() => setFilterRole("all")}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Tất cả ({members.length})
                </button>
                <button
                  onClick={() => setFilterRole("leaders")}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === "leaders"
                      ? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  BQL (
                  {
                    members.filter(
                      (m) => m.roleType === "owner" || m.roleType === "admin",
                    ).length
                  }
                  )
                </button>
                <button
                  onClick={() => setFilterRole("members")}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === "members"
                      ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Cầu thủ (
                  {members.filter((m) => m.roleType === "member").length})
                </button>
              </div>

              {/* Action Buttons */}
              {(isOwner || currentUserRole === "admin") && (
                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      if (onOpenAddMember) onOpenAddMember();
                    }}
                    className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap outline-none"
                    title="Thêm thành viên thủ công"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Thêm thành viên</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      if (onOpenInvite) onOpenInvite();
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap outline-none"
                    title="Mời qua QR & Mã Club"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mã / QR</span>
                  </motion.button>
                </div>
              )}
            </div>

            {/* Hint xem hồ sơ nhanh */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 font-medium">
              <Eye size={12} className="text-emerald-500 shrink-0" />
              <span>Chạm vào thành viên bất kỳ để xem nhanh hồ sơ & liên hệ</span>
            </div>
          </div>

          {/* Members List Container */}
          <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-2.5 max-h-[60vh] sm:max-h-[65vh]">
            {linking && (
              <section
                className="settings-card p-3"
                aria-label="Liên kết hồ sơ cầu thủ"
              >
                <h3 className="font-semibold">
                  Liên kết {linking.name} · #{linking.number}
                </h3>
                <p className="text-sm text-slate-600 my-2">
                  Chọn tài khoản đã đăng ký và gia nhập đội của cùng cầu thủ. Số
                  áo được chuyển sang tài khoản này; hồ sơ gốc và lịch sử được
                  giữ lại.
                </p>
                <label className="text-sm">
                  Tài khoản cầu thủ
                  <select
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    className="w-full my-2"
                    disabled={linkBusy}
                  >
                    <option value="">Chọn tài khoản</option>
                    {members
                      .filter(
                        (m) =>
                          !m.isManual &&
                          m.membershipStatus !== "locked" &&
                          (isOwner || m.roleType === "member"),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · #{m.number}
                        </option>
                      ))}
                  </select>
                </label>
                {linkError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {linkError}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!linkTarget || linkBusy}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setLinkBusy(true);
                      setLinkError("");
                      try {
                        await onLinkMember(linking.id, linkTarget);
                        setLinking(null);
                        setLinkTarget("");
                      } catch (err) {
                        setLinkError(err.message || "Không liên kết được hồ sơ.");
                      } finally {
                        setLinkBusy(false);
                      }
                    }}
                  >
                    {linkBusy ? "Đang lưu…" : "Xác nhận liên kết"}
                  </button>
                  <button
                    type="button"
                    className="choice-button"
                    disabled={linkBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinking(null);
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </section>
            )}
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                Không tìm thấy thành viên nào phù hợp với "{searchQuery}"
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isMemberOwner = member.roleType === "owner";
                const isMemberAdmin = member.roleType === "admin";
                const canDelete =
                  !isMemberOwner &&
                  (isOwner ||
                    (currentUserRole === "admin" &&
                      member.roleType === "member"));

                return (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedMember(member)}
                    className="member-row p-3 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 flex items-center justify-between transition-all shadow-2xs cursor-pointer active:scale-[0.99] group"
                    title="Chạm để xem thông tin hồ sơ nhanh"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with Shirt number badge */}
                      <div className="relative shrink-0">
                        <Avatar
                          src={member.avatar}
                          name={member.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-slate-900 dark:bg-emerald-950 text-emerald-400 dark:text-emerald-300 tabular-nums font-bold text-xs px-1.5 py-0.2 rounded-full border border-white dark:border-slate-800 shadow-xs">
                          #{member.number}
                        </span>
                      </div>

                      {/* Info: Name, Role, Birthday */}
                      <div className="min-w-0">
                        {member.isManual &&
                          onLinkMember &&
                          ["owner", "admin"].includes(currentUserRole) && (
                            <button
                              type="button"
                              className="text-xs text-emerald-700 min-h-11"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinking(member);
                                setLinkTarget("");
                                setLinkError("");
                              }}
                            >
                              Liên kết tài khoản
                            </button>
                          )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {member.name}
                          </p>

                          {/* Role Badge */}
                          {isMemberOwner ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                              <Crown className="w-2.5 h-2.5 text-amber-500" />
                              <span>Chủ đội</span>
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/50 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                              <Shield className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{member.customTitle || "Admin"}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px] whitespace-nowrap">
                              Cầu thủ
                            </span>
                          )}

                          {/* Birthday status badge */}
                          {getBirthdayBadge(member.birthday)}
                        </div>

                        {/* Sub info: Position & Birthday date */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                          <span>{member.role || "Cầu thủ"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums">
                            <Cake className="w-3 h-3 text-pink-500" />
                            {member.birthday
                              ? new Date(member.birthday).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "Chưa cập nhật"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Delete from team & View profile arrow */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {canDelete ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(member);
                          }}
                          className="px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200/80 dark:border-rose-800/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap outline-none"
                          title="Xóa cầu thủ này khỏi đội"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      ) : (
                        isMemberOwner && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold px-2 py-1">
                            Chủ đội
                          </span>
                        )
                      )}

                      <div className="p-1 rounded-full text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            Gợi ý: Chia sẻ mã QR hoặc link tham gia để mời thêm bạn bè vào đội
          </div>

          {/* Modal xác nhận xóa thành viên */}
          {memberToDelete && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
            >
              <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Xóa thành viên khỏi đội
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                  Bạn có chắc chắn muốn xóa{" "}
                  <strong>
                    {memberToDelete.name} (#{memberToDelete.number})
                  </strong>{" "}
                  khỏi danh sách đội bóng?
                </p>

                <div className="mt-5 space-y-2">
                  {removeError && (
                    <p role="alert" className="text-sm text-rose-700">
                      {removeError}
                    </p>
                  )}
                  <motion.button
                    disabled={removeBusy}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmDelete}
                    className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 cursor-pointer whitespace-nowrap outline-none"
                  >
                    Xác Nhận Xóa
                  </motion.button>

                  <button
                    onClick={() => setMemberToDelete(null)}
                    className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer whitespace-nowrap outline-none"
                  >
                    Hủy Bỏ
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal xem nhanh hồ sơ thành viên */}
      <MemberQuickProfileModal
        isOpen={Boolean(selectedMember)}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        currentUserRole={currentUserRole}
      />
    </AnimatePresence>,
    document.body
  );
}
