import React from 'react';
import {Plus} from "./icons";
import Pressable from './Pressable';
export default function FloatingBottomNavigation({tabs,activeTab,visible=true,onNavigate,onReveal,onQuickActions,canManage=false,quickActionsOpen=false}){
  const selected=['fund','personal-fund','governance','appearance','team-settings','pro'].includes(activeTab)?'profile':activeTab;
  return <nav className={'bottom-navigation split-navigation'+(visible?'':' nav-hidden')+(canManage?' has-fab':'')} aria-label="Điều hướng chính" aria-hidden={!visible} inert={visible?undefined:''} onFocusCapture={onReveal}>
    <div className="nav-items">{tabs.map(({id,label,Icon,unreadCount=0})=>{
      const active=selected===id;
      return <Pressable type="button" key={id} data-target={id} aria-label={label+(unreadCount>0?`, ${unreadCount} tin chưa đọc`:'')} title={label} aria-current={active?'page':undefined} tabIndex={visible?0:-1} className={'nav-item'+(active?' is-active':'')} onClick={()=>onNavigate(id)}>
        <span className="nav-icon-wrap"><Icon size={24} filled={active} aria-hidden="true"/>{unreadCount>0 && <span className="chat-unread-badge" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>}</span>
        {active && <span className="nav-label">{label}</span>}
      </Pressable>;
    })}</div>
    {canManage && <Pressable type="button" className="navigation-fab" aria-label="Mở thao tác nhanh" aria-haspopup="dialog" aria-expanded={quickActionsOpen} tabIndex={visible?0:-1} onClick={onQuickActions} whileTap={{scale:0.97}}><Plus size={28}  aria-hidden="true"/></Pressable>}
  </nav>;
}
