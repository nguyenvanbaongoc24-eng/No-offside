import React from 'react';
import Pressable from './Pressable';
import { Wallet } from './icons';
import { getMonthFundSummary, getMembersMonthStatus } from '../lib/fundCollections';
import { localTransactionTime } from '../lib/transactionTime';
import { formatCurrency } from '../lib/formatCurrency';

export default function DashboardFundSummary({ fund, accountId, members = [], balance = 0, timeZone = 'Asia/Ho_Chi_Minh', onOpen }) {
  const month = localTransactionTime(Date.now(), timeZone).slice(0,7);
  const data = fund.data;
  const summary = getMonthFundSummary(month,data.collections,data.charges,data.pendingRequests);
  const people = getMembersMonthStatus(month,members,summary,data.charges,data.pendingRequests);
  const own = people.find(p=>p.id===accountId);
  const manager = data.canManage;
  const [year,number] = month.split('-');
  return <section className="dashboard-fund-preview">
    <h2><Wallet size={21} aria-hidden="true"/>Quỹ đội · Tháng {Number(number)}/{year}</h2>
    {fund.loading ? <p role="status">Đang lấy tình trạng đóng quỹ…</p> : fund.error ? <><p role="alert">Chưa lấy được số liệu quỹ. {fund.error}</p><Pressable className="choice-button" onClick={fund.refresh}>Thử lại</Pressable></> : <>
      {manager && <p>Số dư thực nhận: <strong>{formatCurrency(balance)}</strong></p>}
      {!summary.hasCollection ? <p>Chưa tạo nghĩa vụ thu quỹ cho tháng này.</p> : manager ? <>
        <p>Đã đóng đủ: <strong>{summary.paidCount}/{summary.totalCount} người</strong> · Còn thiếu: <strong>{formatCurrency(summary.totalRemaining)}</strong></p>
        <p>Đã thu được duyệt: <strong>{formatCurrency(summary.totalPaid)}</strong></p>
      </> : own?.hasObligation ? <>
        <p>{own.remaining===0?'Bạn đã đóng đủ quỹ tháng này.':<>Bạn còn thiếu: <strong>{formatCurrency(own.remaining)}</strong></>}</p>
        {own.pendingRequests?.length>0 && <p>Đang chờ Thủ quỹ duyệt: {formatCurrency(own.pendingRequests.reduce((n,p)=>n+Number(p.amount),0))}. Chưa tính vào tiền đã thu.</p>}
      </> : <p>Bạn không có khoản phải đóng trong kỳ này.</p>}
      <div className="dashboard-fund-actions">
        <Pressable className="choice-button" onClick={()=>onOpen('monthly')}>{!manager&&own?.remaining>0?'Xem khoản cần đóng':'Xem quỹ theo tháng'}</Pressable>
        {manager && data.pendingRequests?.length>0 && <Pressable className="primary-button" onClick={()=>onOpen('approvals')}>Duyệt tiền ({data.pendingRequests.length})</Pressable>}
      </div>
    </>}
  </section>;
}
