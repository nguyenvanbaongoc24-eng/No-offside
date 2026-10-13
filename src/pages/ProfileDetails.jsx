import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Phone,
  Settings,
  Bell,
  CreditCard,
  LogOut,
  ChevronRight,
  Edit3,
  Check,
  Trophy,
  Activity,
  Lock,
  Camera,
  AlertTriangle,
  X,
  CheckCircle2,
  Sliders,
  QrCode,
  PlusCircle,
  Share2,
  Users,
  Trash2,
  Sparkles,
  Tag,
  ArrowRightLeft,
  UserCheck,
  UserX,
  BookOpen,
} from "lucide-react";
import { imageDataUrl } from "../lib/images";

export default function ProfileDetails({
  detail = "profile",
  user,
  currentUserRole = "owner",
  onToggleRole,
  onLogout,
  accountPanel,
  appearancePanel,
  onNavigate,
  teamSettings,
  onUpdateTeamName,
  onUpdateSubAdminTitle,
  onAddSubAdmin,
  onRemoveSubAdmin,
  onTransferOwnership,
  onApproveAdminRequest,
  onRejectAdminRequest,
  onUpdateProfile,
  onRequestAdmin,
  demoSession,
}) {
  // Personal Info Form State
  const [avatar, setAvatar] = useState(user.avatar);
  const [name, setName] = useState(user.name);
  const [number, setNumber] = useState(user.number || 9);
  const [role, setRole] = useState(user.role || "Tiền Đạo (ST)");
  const [height, setHeight] = useState(user.height || 175);
  const [weight, setWeight] = useState(user.weight || 68);
  const [phone, setPhone] = useState(user.phone || "");
  const [isSaved, setIsSaved] = useState(false);

  // Captain Team Name State
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const [editingTeamName, setEditingTeamName] = useState(
    teamSettings?.teamName || user.teamName || "FC No Offside",
  );
  const [teamNameSaved, setTeamNameSaved] = useState(false);

  // Sub-Admins list
  const subAdmins = teamSettings?.subAdmins || [
    {
      id: 101,
      name: "Nguyễn Hoàng Hải",
      number: 10,
      customTitle: "Thủ Quỹ",
      phone: "0988776655",
    },
    {
      id: 102,
      name: "Đặng Văn Lâm",
      number: 1,
      customTitle: "Đội Phó",
      phone: "0977889900",
    },
  ];

  // Pending Admin Nominations
  const pendingRequests = teamSettings?.pendingAdminRequests || [];

  // Title assignment modal / popover
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [customTitleInput, setCustomTitleInput] = useState("");

  // Admin Delegation Modal
  const [selectedPromotee, setSelectedPromotee] = useState(null);
  const [promoteTitle, setPromoteTitle] = useState("Đội Phó");
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Removing Admin Double Confirmation Modal
  const [adminToRemove, setAdminToRemove] = useState(null);
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);

  // Yêu cầu 2: Double Confirmation Modal Từ Chức / Nhường Quyền Owner
  const [showTransferOwnerModal, setShowTransferOwnerModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);

  // Invite QR & Link Modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  const titlePresets = ["Thủ Quỹ", "Đội Phó", "Bầu Đội", "HLV", "Kế Toán"];

  const availableMembers = (teamSettings?.members || []).filter(
    (m) => m.roleType === "member",
  );

  const handleAvatarChange = async (e) => {
    try {
      setAvatar(await imageDataUrl(e.target.files?.[0]));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    try {
      onUpdateProfile({
        name,
        number,
        role,
        height: Number(height),
        weight: Number(weight),
        avatar,
        phone: phone.trim(),
      });
    } catch (err) {
      alert(err.message);
      return;
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSaveTeamName = (e) => {
    e.preventDefault();
    if (!editingTeamName.trim()) return;
    if (onUpdateTeamName) {
      onUpdateTeamName(editingTeamName.trim());
    }
    setTeamNameSaved(true);
    setTimeout(() => setTeamNameSaved(false), 2500);
  };

  const handleConfirmPromote = () => {
    if (isOwner) {
      if (onAddSubAdmin && selectedPromotee) {
        onAddSubAdmin({
          id: selectedPromotee.id,
          name: selectedPromotee.name,
          number: selectedPromotee.number,
          customTitle: promoteTitle || "Đội Phó",
        });
      }
      alert(
        `Đã cấp quyền Admin với chức danh "${promoteTitle}" cho ${selectedPromotee.name} thành công!`,
      );
    } else {
      onRequestAdmin({ ...selectedPromotee, customTitle: promoteTitle });
      alert(
        `Đã gửi yêu cầu phong Admin (${promoteTitle}) cho ${selectedPromotee.name} tới Chủ đội phê duyệt!`,
      );
    }
    setShowPromoteModal(false);
    setSelectedPromotee(null);
  };

  const handleConfirmRemoveAdmin = () => {
    if (onRemoveSubAdmin && adminToRemove) {
      onRemoveSubAdmin(adminToRemove.id);
    }
    alert(`Đã giáng chức ${adminToRemove.name} từ Admin xuống Thành viên!`);
    setShowRemoveAdminModal(false);
    setAdminToRemove(null);
  };

  const handleConfirmTransferOwner = () => {
    if (!selectedNewOwner) return;
    if (onTransferOwnership) {
      onTransferOwnership(selectedNewOwner.id);
    }
    alert(
      `Bạn đã nhường toàn quyền Chủ đội cho ${selectedNewOwner.name}! Vai trò của bạn hiện là Thành Viên.`,
    );
    setShowTransferOwnerModal(false);
    setSelectedNewOwner(null);
  };

  const handleUpdateTitleSubmit = () => {
    if (onUpdateSubAdminTitle && editingSubAdmin && customTitleInput.trim()) {
      onUpdateSubAdminTitle(editingSubAdmin.id, customTitleInput.trim());
    }
    setEditingSubAdmin(null);
    setCustomTitleInput("");
  };

  return (
    <div className="profile-detail-content">
      {/* 1. FORM CẬP NHẬT THÔNG TIN CÁ NHÂN */}
      {detail === "profile" && (
        <section className="settings-card">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold  tracking-wider text-gray-800">
                Hồ sơ cá nhân
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-bold">
              Chỉnh sửa & Cập nhật
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <label className="form-field" htmlFor="profile-avatar">Ảnh đại diện
              <img src={avatar} alt="Ảnh đại diện hiện tại" className="w-16 h-16 rounded-full object-cover"/>
              <input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange}/>
            </label>
            <div>
              <label htmlFor="profile-name" className="text-gray-600 block mb-1 font-bold">
                Họ và tên
              </label>
              <input
                type="text"
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="profile-number"
                  className="text-gray-600 block mb-1 font-bold"
                >
                  Số áo thi đấu
                </label>
                <input
                  type="number"
                  id="profile-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-role"
                  className="text-gray-600 block mb-1 font-bold"
                >
                  Vị trí sở trường
                </label>
                <input
                  type="text"
                  id="profile-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="profile-height"
                  className="text-gray-600 block mb-1 font-bold"
                >
                  Chiều cao (cm)
                </label>
                <input
                  type="number"
                  id="profile-height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-weight"
                  className="text-gray-600 block mb-1 font-bold"
                >
                  Cân nặng (kg)
                </label>
                <input
                  type="number"
                  id="profile-weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 tabular-nums font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-phone" className="text-gray-600 block mb-1 font-bold">
                Số điện thoại liên hệ (tùy chọn)
              </label>
              <input
                type="tel"
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full h-11 bg-gray-50 border border-gray-200/90 rounded-2xl px-3.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
              <span className="block mt-1 text-[11px] text-gray-400 font-normal">
                Chỉ dùng để đồng đội liên lạc, không dùng để đăng nhập và không
                bắt buộc xác minh.
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full h-11 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-lg shadow-green-500/30 flex items-center justify-center whitespace-nowrap cursor-pointer mt-1"
            >
              {isSaved ? " Đã Lưu Thông Tin" : "Lưu Hồ Sơ Thành viên"}
            </motion.button>
          </form>
        </section>
      )}
      {/* 3. WORKFLOW XÉT DUYỆT PHONG ADMIN (CHỜ OWNER PHÊ DUYỆT) */}
      {detail === "requests" && isOwner && pendingRequests.length > 0 && (
        <section className="bg-amber-50/90 rounded-[28px] border border-amber-200 p-4 mx-3.5 mt-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h3 className="text-xs font-bold text-amber-950  tracking-tight">
                Yêu Cầu Phong Admin Chờ Duyệt ({pendingRequests.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Chờ chủ đội duyệt
            </span>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 bg-white rounded-2xl border border-amber-200 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={req.avatar}
                    alt={req.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-amber-300"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {req.name}{" "}
                      <span className="text-amber-700 font-bold">
                        #{req.number}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Đề xuất làm:{" "}
                      <strong className="text-amber-800 font-bold">
                        {" "}
                        {req.requestedTitle}
                      </strong>{" "}
                      • Bởi: {req.requestedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (onApproveAdminRequest) onApproveAdminRequest(req.id);
                      alert(
                        `Đã chấp thuận phong chức ${req.requestedTitle} cho ${req.name}!`,
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Duyệt</span>
                  </motion.button>

                  <button
                    onClick={() => {
                      if (onRejectAdminRequest) onRejectAdminRequest(req.id);
                      alert(`Đã từ chối yêu cầu của ${req.name}.`);
                    }}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-rose-100 text-gray-500 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
                    title="Từ chối"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. QUẢN LÝ ĐỘI BÓNG & PHÂN QUYỀN (CAPTAIN VS ADMIN PHỤ) */}
      {detail === "admin" && (isOwner || isAdmin) && (
        <section className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 mx-3.5 mt-3 border border-gray-100">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold  tracking-wider text-gray-900">
                {isOwner ? "Quản trị đội bóng" : "Quản trị đội bóng"}
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {isOwner ? "Chủ đội" : "Quản trị viên"}
            </span>
          </div>

          {/* Form Đổi Tên FC - CHỈ OWNER MỚI CÓ QUYỀN */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-gray-100 mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tên Đội Bóng (FC):</span>
              </span>
              {!isOwner && (
                <span className="text-xs text-gray-400 font-medium">
                  Chỉ Đội Trưởng mới đổi được
                </span>
              )}
            </div>

            {isOwner ? (
              <form
                onSubmit={handleSaveTeamName}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="flex-1 h-10 bg-white border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shrink-0 cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  {teamNameSaved ? " Đã Lưu" : "Đổi Tên"}
                </motion.button>
              </form>
            ) : (
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {teamSettings?.teamName || user.teamName}
              </p>
            )}
          </div>

          {/* Danh Sách Admin Phụ & Cấp Biệt Danh/Chức Danh (Badge Vàng Gold) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Danh Sách Admin ({subAdmins.length}):</span>
              </span>
              {isOwner && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Có thể sửa chức danh / giáng chức
                </span>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {subAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white tabular-nums text-xs font-bold flex items-center justify-center shrink-0">
                      #{admin.number}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        <span>{admin.name}</span>
                        {/* BADGE CHỨC DANH MÀU VÀNG GOLD */}
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1 shadow-xs whitespace-nowrap">
                          {admin.customTitle || "Admin Phụ"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {admin.phone || "Admin"}
                      </p>
                    </div>
                  </div>

                  {/* Nút sửa chức danh & Xóa (Chỉ Đội Trưởng) */}
                  {isOwner && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingSubAdmin(admin);
                          setCustomTitleInput(admin.customTitle || "");
                        }}
                        className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 font-bold text-xs border border-amber-200/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                        title="Đổi chức danh"
                      >
                        <Tag className="w-3 h-3 text-amber-600" />
                        <span>Chức danh</span>
                      </button>

                      <button
                        onClick={() => {
                          setAdminToRemove(admin);
                          setShowRemoveAdminModal(true);
                        }}
                        className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-90 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center"
                        title="Đổi về thành viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nút Cấp quyền Admin cho thành viên mới */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 block mb-2">
                {isOwner
                  ? "Cấp Quyền Admin Cho Thành Viên:"
                  : "Đề Xuất Phong Admin Cho Thành Viên:"}
              </span>

              <div className="space-y-1.5">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-2 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">
                        #{member.number}
                      </span>
                      <span className="text-xs font-bold text-gray-800">
                        {member.name}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPromotee(member);
                        setPromoteTitle("Đội Phó");
                        setShowPromoteModal(true);
                      }}
                      className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center"
                    >
                      {isOwner ? "+ Cấp Quyền Admin" : "+ Đề Xuất Admin"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Yêu cầu 2: Nút Từ Chức / Nhường Quyền Đội Trưởng (Owner Only) */}
            {isOwner && (
              <div className="mt-4 pt-3 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setShowTransferOwnerModal(true)}
                  className="w-full py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Từ Chức & Nhường Quyền Đội Trưởng</span>
                </button>
                <p className="text-xs text-gray-400 text-center mt-1">
                  Chuyển quyền kiểm soát toàn đội cho một Admin phụ khác
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL SỬA CHỨC DANH / BIỆT DANH CHO ADMIN PHỤ */}
      {editingSubAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-gray-900">
                  Cấp Chức Danh Cho {editingSubAdmin.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingSubAdmin(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Chọn chức danh nhanh:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {titlePresets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomTitleInput(t)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        customTitleInput === t
                          ? "bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Hoặc tự nhập biệt danh:
                </label>
                <input
                  type="text"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  placeholder="Ví dụ: Bầu Đội, Kế Toán, Trưởng Đoàn..."
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleUpdateTitleSubmit}
                className="w-full h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer mt-2 whitespace-nowrap flex items-center justify-center"
              >
                Lưu Chức Danh (Hiện Badge Vàng)
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL KHI CẤP QUYỀN ADMIN CHO THÀNH VIÊN */}
      {showPromoteModal && selectedPromotee && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-base text-gray-900">
              {isOwner ? "Xác Nhận Cấp Quyền Admin" : "Đề Xuất Phong Admin"}
            </h3>

            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              {isOwner ? (
                <>
                  Bạn có chắc chắn muốn cấp quyền Admin cho{" "}
                  <strong>
                    {selectedPromotee.name} (#{selectedPromotee.number})
                  </strong>
                  ?
                </>
              ) : (
                <>
                  Gửi đề xuất phong Admin cho{" "}
                  <strong>{selectedPromotee.name}</strong> tới Đội Trưởng?
                </>
              )}
            </p>

            {/* Chọn chức danh khi cấp */}
            <div className="my-3 text-left">
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Gán chức danh:
              </label>
              <div className="flex flex-wrap gap-1">
                {titlePresets.map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setPromoteTitle(tp)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap ${
                      promoteTitle === tp
                        ? "bg-amber-400 text-slate-950"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmPromote}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                {isOwner
                  ? "Xác Nhận Cấp Quyền Admin"
                  : "Gửi Yêu Cầu Cho Đội Trưởng"}
              </motion.button>

              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedPromotee(null);
                }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL KHI GIÁNG CHỨC / GỠ QUYỀN ADMIN */}
      {showRemoveAdminModal && adminToRemove && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-base text-gray-900">
              Giáng chức admin
            </h3>

            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa quyền Admin của{" "}
              <strong>{adminToRemove.name}</strong>? Người này sẽ bị giáng xuống
              thành Cầu thủ (Member).
            </p>

            <div className="mt-5 space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmRemoveAdmin}
                className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                Xác Nhận Giáng Chức
              </motion.button>

              <button
                onClick={() => {
                  setShowRemoveAdminModal(false);
                  setAdminToRemove(null);
                }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YÊU CẦU 2: DOUBLE CONFIRMATION MODAL TỪ CHỨC & NHƯỜNG QUYỀN OWNER */}
      {showTransferOwnerModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-300 text-amber-600 flex items-center justify-center mx-auto mb-3"></div>

            <h3 className="font-bold text-base text-gray-900">
              Nhường quyền đội trưởng
            </h3>

            <p className="text-xs text-rose-600 mt-2 leading-relaxed font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              LƯU Ý QUAN TRỌNG: Bạn sẽ mất toàn quyền kiểm soát đội bóng và tự
              giáng cấp mình xuống làm Cầu thủ (Member)!
            </p>

            <div className="my-4 text-left">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Chọn người tiếp quản vị trí Đội Trưởng:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {subAdmins.map((sa) => (
                  <div
                    key={sa.id}
                    onClick={() => setSelectedNewOwner(sa)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedNewOwner?.id === sa.id
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs tabular-nums font-bold flex items-center justify-center">
                        #{sa.number}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {sa.name}
                        </p>
                        <p className="text-xs text-amber-800 font-semibold">
                          {sa.customTitle}
                        </p>
                      </div>
                    </div>
                    {selectedNewOwner?.id === sa.id && (
                      <Check className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedNewOwner && (
              <p className="text-xs text-gray-700 font-semibold mb-3">
                Bạn có chắc chắn muốn nhường quyền Đội trưởng cho{" "}
                <strong>{selectedNewOwner.name}</strong>?
              </p>
            )}

            <div className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={!selectedNewOwner}
                onClick={handleConfirmTransferOwner}
                className={`w-full py-3.5 rounded-full font-bold text-xs shadow-md transition-all whitespace-nowrap flex items-center justify-center ${
                  selectedNewOwner
                    ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/25 cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Xác Nhận Nhường Quyền Đội Trưởng
              </motion.button>

              <button
                onClick={() => {
                  setShowTransferOwnerModal(false);
                  setSelectedNewOwner(null);
                }}
                className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
