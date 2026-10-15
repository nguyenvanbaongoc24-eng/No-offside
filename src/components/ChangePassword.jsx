import {beginPendingWrite} from '../lib/pendingWrites';
import React, {useState, useRef} from 'react';
import {serverRequest} from '../lib/serverRequest';
import {notify} from '../lib/feedback';
import Pressable from './Pressable';
export default function ChangePassword({token, demo=false}) {
  const [oldPassword,setOld] = useState(''), [password,setPassword] = useState(''), [confirmation,setConfirmation] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const lock = useRef(false);
  const submit = async event => {
    event.preventDefault(); if (lock.current) return;
    if (password !== confirmation) {setError('Mật khẩu xác nhận chưa khớp.');notify('Mật khẩu xác nhận chưa khớp.', 'error');return;}
    lock.current=true;setBusy(true);setError('');const finish=beginPendingWrite();
    try {
      const {response,data} = await serverRequest('/api/account', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'password',oldPassword,password})});
      if (!response.ok || !data.success) throw Error(data.error || 'Không đổi được mật khẩu.');
      setOld('');setPassword('');setConfirmation('');notify('Đổi mật khẩu thành công');
    } catch (e) {setError(e.message);notify(e.message || 'Có lỗi xảy ra, thử lại sau','error');}
    finally {finish();lock.current=false;setBusy(false);}
  };
  return <section className="settings-card m-4"><h2>Đổi mật khẩu</h2><p className="field-hint">Xác minh mật khẩu hiện tại trước khi đổi. Mật khẩu mới giữ chính sách đúng 6 chữ số của tài khoản.</p><form className="security-form" onSubmit={submit} onInvalid={()=>notify("Nhập đủ thông tin; mật khẩu mới gồm đúng 6 chữ số.","error")}>
    <label className="form-field">Mật khẩu hiện tại<input type="password" autoComplete="current-password" maxLength={256} required value={oldPassword} onChange={e=>setOld(e.target.value)}/></label>
    <label className="form-field">Mật khẩu mới<input type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <label className="form-field">Xác nhận mật khẩu mới<input type="password" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{6}" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
    {demo && <p className="field-hint">Bản trải nghiệm không thay đổi mật khẩu.</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <Pressable className="primary-button" disabled={busy || !token || demo}>{busy?'Đang cập nhật…':'Đổi mật khẩu'}</Pressable>
  </form></section>;
}
