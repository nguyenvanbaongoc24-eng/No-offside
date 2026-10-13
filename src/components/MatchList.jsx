import React, { useRef, useState } from 'react';
import { CalendarDays, Check, Trash2 } from 'lucide-react';

function MatchRow({ match, selected, canDelete, onSelect, onDelete }) {
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const reset = event => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    gesture.current = null;
    setOffset(0);
  };
  const end = event => {
    const drag = gesture.current;
    const shouldDelete = drag?.horizontal && drag.dx <= -80;
    suppressClick.current = Boolean(drag?.horizontal);
    reset(event);
    if (shouldDelete) onDelete(match.id);
  };
  return <li className="match-swipe-row">
    {canDelete && <div className="match-swipe-background" aria-hidden="true"><Trash2 size={20}/><span>Xóa trận</span></div>}
    <div className="match-swipe-content" style={{ transform: `translateX(${offset}px)`, transition: gesture.current?.horizontal ? 'none' : 'transform 180ms ease' }}
      onPointerDown={event => {
        if (!canDelete || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || event.target.closest('[data-delete-match]')) return;
        suppressClick.current = false;
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false };
      }}
      onPointerMove={event => {
        const drag = gesture.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!drag.horizontal) {
          if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { gesture.current = null; return; }
          if (dx >= -10 || Math.abs(dx) <= Math.abs(dy) + 4) return;
          drag.horizontal = true;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        drag.dx = dx;
        setOffset(Math.max(-event.currentTarget.clientWidth, Math.min(0, dx)));
      }}
      onPointerUp={end}
      onPointerCancel={event => { suppressClick.current = Boolean(gesture.current?.horizontal); reset(event); }}
      onLostPointerCapture={() => { gesture.current = null; setOffset(0); }}>
      <button type="button" className="match-select-button" aria-pressed={selected} onClick={event => { if (!suppressClick.current || event.detail === 0) onSelect(match.id); }}>
        <CalendarDays size={20} className="shrink-0 text-emerald-700"/>
        <span className="min-w-0 flex-1"><span className="block font-semibold break-words">{match.title}</span><time dateTime={match.datetime} className="block mt-1 text-xs text-slate-600">{new Date(match.datetime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {match.status === 'completed' ? 'Đã xong' : 'Sắp đá'}</time></span>
        {selected && <Check size={18} className="shrink-0 text-emerald-700"/>}
      </button>
      {canDelete && <button type="button" data-delete-match aria-label={`Xóa trận ${match.title}`} className="match-delete-button" onClick={() => onDelete(match.id)}><Trash2 size={18}/></button>}
    </div>
  </li>;
}

export default function MatchList({ matches, activeMatchId, canDelete, onSelect, onDelete }) {
  return <section aria-label="Danh sách trận đấu" className="mx-4 my-4"><h2 className="text-sm font-semibold">Trận đấu ({matches.length})</h2>{canDelete && <p className="text-xs text-slate-600 mt-1 mb-3">Vuốt trái để xóa · Có thể hoàn tác trong 10 giây</p>}<ul className="space-y-2 mt-3">{matches.map(match => <MatchRow key={match.id} match={match} selected={match.id === activeMatchId} canDelete={canDelete} onSelect={onSelect} onDelete={onDelete}/>)}</ul></section>;
}
