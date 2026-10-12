import React, { useState } from 'react';
import { ArrowLeft, Users, MapPin } from 'lucide-react';

export default function InviteLanding({ teamData, authenticated, onJoinSuccess, onBackToApp }) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ name: '', number: '', birthday: '', role: 'Tiền đạo (ST)' });
  const update = (key, value) => setProfile(prev => ({ ...prev, [key]: value }));
  const submit = event => {
    event.preventDefault(); setError('');
    if (!authenticated) { setError('Bạn cần đăng nhập trước khi tham gia.'); return; }
    const number = Number(profile.number);
    if (!profile.name.trim() || !Number.isInteger(number) || number < 1 || number > 99) { setError('Nhập họ tên và số áo từ 1 đến 99.'); return; }
    try { onJoinSuccess({ ...profile, name: profile.name.trim(), number, teamName: teamData.name, teamCategory: teamData.category }); } catch (err) { setError(err.message); }
  };
  return <div className="min-h-screen bg-slate-50"><header className="bg-slate-900 text-white p-5 pt-safe-hero rounded-b-3xl"><button onClick={onBackToApp} className="flex items-center gap-2 text-sm"><ArrowLeft size={18}/>Quay lại</button><img src={teamData.logo} alt="Logo đội" className="w-20 h-20 rounded-3xl object-cover mt-6"/><h1 className="text-2xl font-bold mt-4">{teamData.name}</h1><p className="text-slate-300 mt-2">Đội trưởng: {teamData.captain}</p><p className="flex gap-2 items-center text-sm mt-4"><Users size={18}/>{teamData.membersCount} thành viên · {teamData.category}</p><p className="flex gap-2 items-center text-sm mt-2"><MapPin size={18}/>{teamData.venue}</p></header><section className="p-5 space-y-5"><p className="text-sm text-slate-600">Đội này hiện được lưu trên thiết bị. Tham gia ở đây chưa đồng bộ dữ liệu sang thiết bị khác.</p>{!joining ? <button className="primary-button w-full" onClick={() => setJoining(true)}>Điền hồ sơ tham gia</button> : <form onSubmit={submit} className="settings-card space-y-4"><label className="block text-sm font-medium">Họ và tên<input required autoComplete="name" value={profile.name} onChange={e => update('name', e.target.value)} className="w-full p-3 mt-2 rounded-xl border border-slate-200 bg-slate-50"/></label><label className="block text-sm font-medium">Số áo<input required type="number" min="1" max="99" value={profile.number} onChange={e => update('number', e.target.value)} className="w-full p-3 mt-2 rounded-xl border border-slate-200 bg-slate-50"/></label><label className="block text-sm font-medium">Sinh nhật (không bắt buộc)<input type="date" max={new Date().toISOString().slice(0,10)} value={profile.birthday} onChange={e => update('birthday', e.target.value)} className="w-full p-3 mt-2 rounded-xl border border-slate-200 bg-slate-50"/></label><label className="block text-sm font-medium">Vị trí sở trường<select value={profile.role} onChange={e => update('role', e.target.value)} className="w-full p-3 mt-2 rounded-xl border border-slate-200 bg-slate-50">{['Tiền đạo (ST)', 'Tiền vệ (MF)', 'Hậu vệ (DF)', 'Thủ môn (GK)'].map(role => <option key={role}>{role}</option>)}</select></label>{error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}<button className="primary-button w-full">Tham gia đội trên thiết bị này</button></form>}</section></div>;
}
