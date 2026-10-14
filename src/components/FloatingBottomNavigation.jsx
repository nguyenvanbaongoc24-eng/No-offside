import React from "react";

export default function FloatingBottomNavigation({ tabs, activeTab, avatar, visible = true, onNavigate, onReveal }) {
  return (
    <nav className={"bottom-navigation" + (visible ? "" : " nav-hidden")} aria-label="Điều hướng chính" aria-hidden={!visible} inert={visible ? undefined : ""} onFocusCapture={onReveal}>
      <div className="nav-items">
        {tabs.map(({ id, label, Icon }) => (
          <button type="button" key={id} data-target={id} aria-label={label} title={label} aria-current={activeTab === id ? "page" : undefined} tabIndex={visible ? 0 : -1} onClick={() => onNavigate(id)} className="nav-item">
            {id === "profile" && avatar ? <img src={avatar} alt="" className="nav-avatar" /> : <Icon size={23} strokeWidth={1.75} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
