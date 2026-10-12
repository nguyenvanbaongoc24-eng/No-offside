import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Mail, Phone, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login({ onLoginSuccess }) {
  const [channel, setChannel] = useState('email');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const controller = new AbortController();
    fetch(url + '/auth/v1/settings', { headers: { apikey: key }, signal: controller.signal })
      .then(r => r.json()).then(settings => setPhoneEnabled(settings.external?.phone === true)).catch(() => {});
    return () => controller.abort();
  }, []);
  const normalized = channel === 'phone' ? contact.trim().replace(/^0/, '+84').replace(/\s/g, '') : contact.trim().toLowerCase();
  const requestOtp = async () => {
    if (!supabase) throw new Error('Đăng nhập trực tuyến chưa được cấu hình. Bạn có thể dùng bản trải nghiệm bên dưới.');
    if (Date.now() < retryAt) throw new Error('Vui lòng chờ 60 giây trước khi gửi lại mã.');
    if (channel === 'phone' && !/^\+\d{9,15}$/.test(normalized)) throw new Error('Nhập số điện thoại hợp lệ, ví dụ 0912345678.');
    const { error } = await supabase.auth.signInWithOtp(channel === 'phone' ? { phone: normalized } : { email: normalized, options: { emailRedirectTo: window.location.href } });
    if (error) throw new Error(error.message);
    setSent(true); setRetryAt(Date.now()+60000);
  };
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!sent) { await requestOtp(); return; }
      if (!/^\d{6,8}$/.test(code)) throw new Error('Nhập mã xác thực gồm 6–8 chữ số.');
      const { data, error } = await supabase.auth.verifyOtp(channel === 'phone' ? { phone: normalized, token: code, type: 'sms' } : { email: normalized, token: code, type: 'email' });
      if (error || !data.session) throw new Error(error?.message || 'Mã chưa hợp lệ.');
      onLoginSuccess();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-slate-50 px-5 py-12 flex flex-col justify-center">
    <div className="max-w-sm w-full mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white grid place-items-center text-3xl mb-7 shadow-lg">⚽</div>
      <p className="text-emerald-700 font-semibold mb-2">NO OFFSIDE</p>
      <h1 className="text-3xl font-bold text-slate-900">Hẹn nhau ra sân.</h1>
      <p className="text-slate-600 mt-3 mb-7 leading-relaxed">Lịch thi đấu, đồng đội và quỹ đội — trong một ứng dụng.</p>
      <form onSubmit={submit} className="rounded-3xl bg-white border border-slate-200 p-5 space-y-5 shadow-soft">
        <div className="grid grid-cols-2 gap-2" aria-label="Phương thức đăng nhập">
          {[['email','Email',Mail],['phone','Điện thoại',Phone]].map(([value,label,Icon]) => <button type="button" key={value} aria-pressed={channel === value} disabled={busy || (value === 'phone' && !phoneEnabled)} title={value === 'phone' && !phoneEnabled ? 'SMS chưa được bật trên Supabase' : undefined} onClick={() => { setChannel(value); setSent(false); setContact(''); setCode(''); setError(''); }} className="choice-button"><Icon size={18}/>{label}</button>)}
        </div>
        <label className="block text-sm font-medium">{channel === 'email' ? 'Địa chỉ email' : 'Số điện thoại'}
          <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50" type={channel === 'email' ? 'email' : 'tel'} required value={contact} readOnly={sent} onChange={e=>setContact(e.target.value)} autoComplete={channel === 'email' ? 'email' : 'tel'} placeholder={channel === 'email' ? 'ban@example.com' : '0912345678'}/>
        </label>
        {sent && <label className="block text-sm font-medium">Mã xác thực
          <input className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 tracking-[0.25em]" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,8}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} maxLength={8}/>
          <span className="block mt-2 text-sm text-slate-500">Kiểm tra tin nhắn hoặc email. Nếu nhận được đường dẫn đăng nhập, mở đường dẫn đó để xác thực.</span>
        </label>}
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 rounded-xl p-3">{error}</p>}
        <button disabled={busy} className="primary-button w-full">{busy ? <Loader2 className="animate-spin" size={18}/> : sent ? <ShieldCheck size={18}/> : <ArrowRight size={18}/>} {sent ? 'Xác thực và đăng nhập' : 'Gửi mã đăng nhập'}</button>
        {sent && <div className="flex gap-2"><button type="button" className="text-sm text-emerald-700" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await requestOtp();}catch(err){setError(err.message);}finally{setBusy(false);}}}>Gửi lại mã</button><button type="button" className="text-sm text-slate-600 ml-auto" onClick={()=>{setSent(false);setCode('');}}>Đổi thông tin</button></div>}
      </form>
      <button className="w-full mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 py-3 font-semibold" onClick={()=>onLoginSuccess({demo:true})}>Trải nghiệm với dữ liệu mẫu</button>
      <p className="text-sm text-slate-500 mt-3 text-center leading-relaxed">Bản trải nghiệm lưu trên thiết bị này.</p>
    </div>
  </div>;
}
