import React, { useState } from 'react';

export default function EmptyTeam({ teamSettings, leader, onSaveMatch, onNavigate }) {
  const [form, setForm] = useState({ opponent: '', venue: teamSettings.venue || '', datetime: '', timeoutDatetime: '', penaltyEnabled: false, penaltyFine: 0 });
  const [error, setError] = useState('');
  const field = (key, label, type = 'text') => <label className="block text-sm font-medium">{label}<input required type={type} value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full p-3 mt-2 rounded-xl border border-slate-200 bg-white"/></label>;
  return <section className="p-5 space-y-5"><h1 className="text-2xl font-bold">{teamSettings.teamName}</h1><p className="text-slate-600">Đội chưa có trận đấu. {leader ? 'Tạo lịch đầu tiên để bắt đầu điểm danh.' : 'Chờ đội trưởng tạo lịch đấu.'}</p>{leader && <form className="settings-card space-y-4" onSubmit={e => { e.preventDefault(); try { onSaveMatch(form); } catch (err) { setError(err.message); } }}>{field('opponent', 'Đối thủ')}{field('venue', 'Sân bóng')}{field('datetime', 'Giờ đá', 'datetime-local')}{field('timeoutDatetime', 'Hạn chốt điểm danh', 'datetime-local')}{error && <p role="alert" className="text-rose-600">{error}</p>}<button className="primary-button w-full">Tạo trận đấu</button></form>}<button className="choice-button w-full" onClick={() => onNavigate('profile')}>Quản lý tài khoản và đội bóng</button></section>;
}
