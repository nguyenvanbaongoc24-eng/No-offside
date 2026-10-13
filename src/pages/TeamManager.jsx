import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  X,
  Crown,
  Shield,
  Cake,
  Phone,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function TeamManager({
  isOpen,
  onClose,
  members = [],
  currentUserRole = 'owner',
  onRemoveMember,
  onOpenInvite
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'leaders' | 'members'
  const [memberToDelete, setMemberToDelete] = useState(null);

  const isOwner = currentUserRole === 'owner';

  // Lọc thành viên theo từ khóa tìm kiếm và tab
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(m.number).includes(searchQuery) ||
        (m.role && m.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.customTitle && m.customTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterRole === 'leaders') {
        return m.roleType === 'owner' || m.roleType === 'admin';
      }
      if (filterRole === 'members') {
        return m.roleType === 'member';
      }
      return true;
    });
  }, [members, searchQuery, filterRole]);

  // Kiểm tra ngày sinh hôm nay & tháng này
  const getBirthdayBadge = (birthdayStr) => {
    if (!birthdayStr) return null;
    const bday = new Date(birthdayStr);
    const today = new Date();
    const isToday = bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
    const isThisMonth = bday.getMonth() === today.getMonth();

    if (isToday) {
      return (
        <span className="text-xs font-bold bg-pink-100 text-pink-700 border border-pink-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
           Hôm nay!
        </span>
      );
    }
    if (isThisMonth) {
      return (
        <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
           Tháng này
        </span>
      );
    }
    return null;
  };

  const handleConfirmDelete = () => {
    if (memberToDelete && onRemoveMember) {
      onRemoveMember(memberToDelete.id);
      alert(`Đã xóa ${memberToDelete.name} (#${memberToDelete.number}) khỏi đội bóng!`);
    }
    setMemberToDelete(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/70 backdrop-blur-sm">

        {/* Backdrop Click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden text-gray-900 z-10 border border-gray-100"
        >
          {/* Top Handle bar (Mobile bottom sheet indicator) */}
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Header Bar */}
          <div className="p-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <span>Quản Lý Nhân Sự & Đội Hình</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold tabular-nums">
                    {members.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">Danh sách toàn bộ thành viên đang sinh hoạt trong đội</p>
              </div>
            </div>

            <button aria-label="Đóng"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar & Action Buttons */}
          <div className="p-4 pb-2 space-y-3 bg-slate-50/70 border-b border-gray-100">
            {/* Search Input Bar (Bo góc tròn rounded-full) */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, số áo (#9, #10) hoặc vị trí..."
                className="w-full bg-white border border-gray-200 rounded-full pl-9 pr-9 py-2.5 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills & Add Member Button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-200/80 p-0.5 rounded-full text-xs font-bold">
                <button
                  onClick={() => setFilterRole('all')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tất cả ({members.length})
                </button>
                <button
                  onClick={() => setFilterRole('leaders')}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === 'leaders' ? 'bg-white text-amber-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  BQL ({members.filter(m => m.roleType === 'owner' || m.roleType === 'admin').length})
                </button>
                <button
                  onClick={() => setFilterRole('members')}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterRole === 'members' ? 'bg-white text-emerald-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cầu thủ ({members.filter(m => m.roleType === 'member').length})
                </button>
              </div>

              {/* NÚT [THÊM THÀNH VIÊN] (MỞ POPUP CHIA SẺ QR/LINK) */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (onOpenInvite) onOpenInvite();
                }}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-green-500/25 cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Thêm Thành Viên</span>
              </motion.button>
            </div>
          </div>

          {/* Members List Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                Không tìm thấy thành viên nào phù hợp với "{searchQuery}"
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isMemberOwner = member.roleType === 'owner';
                const isMemberAdmin = member.roleType === 'admin';
                const canDelete =
                  (!isMemberOwner) &&
                  (isOwner || member.roleType === 'member'); // Chỉ Owner mới có quyền xóa Admin khác

                return (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 bg-white hover:bg-slate-50/80 rounded-2xl border border-gray-100 flex items-center justify-between transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with Shirt number badge */}
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80'}
                          alt={member.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 tabular-nums font-bold text-xs px-1.5 py-0.2 rounded-full border border-white shadow-xs">
                          #{member.number}
                        </span>
                      </div>

                      {/* Info: Name, Role, Birthday */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {member.name}
                          </p>

                          {/* Role Badge */}
                          {isMemberOwner ? (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-0.5 shadow-xs whitespace-nowrap">

                              <span>Đội Trưởng</span>
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs inline-flex items-center gap-0.5 shadow-xs whitespace-nowrap">
                              <Shield className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{member.customTitle || 'Admin Phụ'}</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-500 font-semibold text-xs whitespace-nowrap">
                              Cầu thủ
                            </span>
                          )}

                          {/* Birthday status badge */}
                          {getBirthdayBadge(member.birthday)}
                        </div>

                        {/* Sub info: Position & Birthday date */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium flex-wrap">
                          <span>{member.role || 'Cầu thủ'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-gray-600 tabular-nums">
                            <Cake className="w-3 h-3 text-pink-500" />
                            {member.birthday ? new Date(member.birthday).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Delete from team */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {canDelete ? (
                        <button
                          onClick={() => setMemberToDelete(member)}
                          className="px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="Xóa cầu thủ này khỏi đội"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      ) : (
                        isMemberOwner && (
                          <span className="text-xs text-gray-400 font-bold px-2 py-1">
                            Chủ đội
                          </span>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
             Gợi ý: Chia sẻ mã QR hoặc link tham gia để mời thêm bạn bè vào đội
          </div>

          {/* Modal xác nhận xóa thành viên */}
          {memberToDelete && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-gray-100 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <h3 className="font-bold text-base text-gray-900">Xóa thành viên khỏi đội</h3>

                <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
                  Bạn có chắc chắn muốn xóa <strong>{memberToDelete.name} (#{memberToDelete.number})</strong> khỏi danh sách đội bóng?
                </p>

                <div className="mt-5 space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmDelete}
                    className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 cursor-pointer whitespace-nowrap"
                  >
                    Xác Nhận Xóa
                  </motion.button>

                  <button
                    onClick={() => setMemberToDelete(null)}
                    className="w-full py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Hủy Bỏ
                  </button>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
