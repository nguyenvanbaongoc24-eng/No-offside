import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
export default function WelcomeAnnouncementModal() {
  const [open,setOpen]=useState(()=>sessionStorage.getItem('hideWelcomePopup') !== 'true');
  const close=()=>{sessionStorage.setItem('hideWelcomePopup','true');setOpen(false);};
  if(!open)return null;
  return <div role="dialog" aria-modal="true" aria-label="Chào mừng" className="fixed inset-0 z-[150] p-4 bg-slate-900/60 backdrop-blur-sm grid place-items-center"><section className="bg-white rounded-3xl max-w-sm w-full p-6"><div className="flex items-center justify-between"><Bell className="text-emerald-600"/><button aria-label="Đóng" onClick={close}><X size={20}/></button></div><h2 className="text-xl font-semibold mt-4">Chào mừng trở lại</h2><p className="text-slate-600 leading-relaxed mt-3">Kiểm tra lịch thi đấu, điểm danh và trạng thái quỹ trước khi ra sân. Thông báo mới nằm ở biểu tượng chuông trên trang chủ.</p><button className="primary-button w-full mt-5" onClick={close}>Bắt đầu</button></section></div>;
}