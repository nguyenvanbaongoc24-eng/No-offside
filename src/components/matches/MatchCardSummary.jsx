import React, {useEffect, useState} from 'react';
import {Calendar, MapPin, Clock, Shield, ChevronRight} from '../icons';
import Avatar from '../Avatar';
import {matchTimeLabel} from '../../lib/matchTime';
import {formatCurrency} from '../../lib/formatCurrency';
import {deadlineState, finePolicy} from '../../lib/matchCard';

export function DeadlineStatus({match, timeZone}) {
  const [now, setNow] = useState(Date.now);
  const state = deadlineState(match);
  useEffect(() => {
    const current = deadlineState(match);
    if (!current.running) return;
    const timer = setTimeout(() => setNow(Date.now()), current.nextUpdate);
    return () => clearTimeout(timer);
  }, [now, match.deadline, match.status, match.archivedAt]);
  const valid = Number.isFinite(Date.parse(match.deadline));
  return <div className="match-summary-deadline">
    <Clock size={22}/>
    <div className="match-summary-copy">
      <span className="match-summary-label">Hạn điểm danh</span>
      <div className="match-summary-deadline-values">
        {valid && <strong>{matchTimeLabel(match.deadline, timeZone).replace(' - ', ' · ')}</strong>}
        <span className="match-summary-secondary">{state.text}</span>
      </div>
    </div>
  </div>;
}

export default function MatchCardSummary({match, timeZone = 'Asia/Ho_Chi_Minh', menu, onOpenRules}) {
  const fine = finePolicy(match.penaltyEnabled, match.penaltyAmount);
  const cancelled = Boolean(match.archivedAt) || ['cancelled', 'canceled', 'archived'].includes(match.status);
  const status = cancelled ? 'Đã hủy' : match.status === 'completed' ? 'Đã kết thúc' : 'Sắp diễn ra';
  const validDeadline = Number.isFinite(Date.parse(match.deadline));
  return <>
    <header className="match-card-header match-summary-header">
      <div className="match-summary-top">
        <div className="match-summary-tags"><span>{status}</span>{match.category?.trim() && <span>{match.category.trim()}</span>}</div>
        {menu}
      </div>
      <div className="match-summary-title">
        {match.opponentLogo && <Avatar src={match.opponentLogo} name={match.opponent || match.title} className="match-summary-logo"/>}
        <h2>{match.title}</h2>
      </div>
      <div className="match-summary-meta match-summary-kickoff"><Calendar size={22}/><span>{matchTimeLabel(match.datetime, timeZone).replace(' - ', ' · ')}</span></div>
      <div className="match-summary-meta"><MapPin size={22}/><span>{match.venue?.trim() || 'Chưa có địa điểm'}</span></div>
    </header>
    <div className="match-summary-details">
      <DeadlineStatus match={match} timeZone={timeZone}/>
      <div className="match-summary-policy">
        <Shield size={22}/>
        <div className="match-summary-policy-values">
          <span>{fine.kind === 'configured' ? 'Phạt không điểm danh' : fine.kind === 'off' ? 'Không áp dụng phạt' : 'Chưa có cấu hình phạt'}</span>
          {fine.kind === 'configured' && <strong className={fine.amount > 0 ? 'match-summary-amount' : ''}>{formatCurrency(fine.amount)}/người</strong>}
        </div>
      </div>
      {fine.kind === 'configured' && fine.amount > 0 && <div className="match-summary-example">
        <p>{validDeadline ? `Ví dụ: Quá ${matchTimeLabel(match.deadline, timeZone).replace(' - ', ' · ')} chưa điểm danh.` : 'Chưa đặt hạn điểm danh cho mức phạt này.'}</p>
        {validDeadline && <p>Có thể bị phạt {formatCurrency(fine.amount)} vào quỹ đội, theo quy định và xác nhận của đội.</p>}
        {onOpenRules && <button type="button" onClick={onOpenRules}>Xem quy định<ChevronRight size={20}/></button>}
      </div>}
    </div>
  </>;
}
