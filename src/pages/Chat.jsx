import { readStored, writeStored } from "../lib/storage";
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Send, MessageSquare, PartyPopper, ArrowDown } from "lucide-react";
import { usePersistentState } from "../hooks/usePersistentState";
import { uid } from "../lib/teamModel";
import { chatScope, dayLabel, messageGroup } from "../lib/chatPresentation";
import { personalText } from "../lib/personalCopy";
import Avatar from "../components/Avatar";
const useChatLayoutEffect = typeof document !== "undefined" && typeof document.createElement === "function" ? useLayoutEffect : useEffect;
export default function Chat(props) {
  return <ScopedChat key={chatScope(props.accountId, props.teamId)} {...props} />;
}
function ScopedChat({ user, members = [], teamId, accountId, birthdayEnabled = true, language = "vi", teamName, teamLogo, onKeyboardChange }) {
  const t = text => personalText(text, language);
  const [messages, setMessages] = usePersistentState(
    "no_offside_messages_" + accountId + "::" + teamId,
    () =>
      readStored(
        "no_offside_messages_" + accountId + "::" + teamId,
        accountId === "demo"
          ? readStored(
              "no_offside_messages_" + teamId,
              teamId === "fc-no-offside-99"
                ? readStored(
                    "no_offside_messages_demo::undefined",
                    readStored("no_offside_messages_undefined", []),
                  )
                : [],
            )
          : [],
      ),
  );

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [viewport, setViewport] = useState({ height: null, top: 0, keyboard: false });
  const stream = useRef(null), textarea = useRef(null), nearEnd = useRef(true), previousCount = useRef(0), sending = useRef(false);
  const visibleMessages = messages.filter(m => m && typeof m.text === "string");
  const birthdays = useMemo(() => members.filter(m => {
    const today = new Date(), parts = (m.birthday || "").split("-");
    return Number(parts[1]) === today.getMonth() + 1 && Number(parts[2]) === today.getDate();
  }), [members]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    const vv = window.visualViewport;
    let baseline = window.innerHeight, width = window.innerWidth;
    const update = () => {
      const focused = document.activeElement === textarea.current;
      if (!focused || window.innerWidth !== width) { baseline = window.innerHeight; width = window.innerWidth; }
      const height = vv?.height || window.innerHeight;
      const keyboard = focused && Math.max(baseline - height, window.innerHeight - height - (vv?.offsetTop || 0)) > 80;
      setViewport({ height, top: vv?.offsetTop || 0, keyboard });
      onKeyboardChange?.(keyboard);
    };
    vv?.addEventListener("resize", update); vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update); window.addEventListener("orientationchange", update);
    document.addEventListener("focusin", update); document.addEventListener("focusout", update);
    update();
    return () => {
      vv?.removeEventListener("resize", update); vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", update); document.removeEventListener("focusout", update);
      onKeyboardChange?.(false);
    };
  }, [onKeyboardChange]);
  useChatLayoutEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height = Math.min(124, textarea.current.scrollHeight) + "px";
  }, [input]);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !stream.current) return;
    const list = stream.current;
    const observer = new ResizeObserver(() => {
      if (nearEnd.current) list.scrollTop = list.scrollHeight;
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  useChatLayoutEffect(() => {
    const list = stream.current;
    if (!list) return;
    if (nearEnd.current) { list.scrollTop = list.scrollHeight; setUnread(0); }
    else if (messages.length > previousCount.current) {
      const added = messages.length - previousCount.current;
      setUnread(n => n + added);
    }
    previousCount.current = messages.length;
  }, [messages.length]);
  const scrollBottom = () => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
    nearEnd.current = true; setUnread(0);
  };
  const send = (text, clearDraft = true) => {
    if (!text.trim() || sending.current) return;
    sending.current = true;
    const next = [...messages, { id: uid(), senderId: user.id, sender: user.name, avatar: user.avatar, text: text.trim().slice(0, 2000), createdAt: new Date().toISOString() }];
    if (!writeStored("no_offside_messages_" + chatScope(accountId, teamId), next)) {
      setError("Không lưu được tin nhắn trên thiết bị. Nội dung vẫn được giữ để thử lại."); sending.current = false; return;
    }
    nearEnd.current = true; setMessages(next); setError("");
    if (clearDraft) setInput("");
    queueMicrotask(() => { sending.current = false; });
  };
  return (
    <section lang={language} className={"chat-page conversation-page" + (viewport.keyboard ? " chat-keyboard-open" : "")} aria-label={t("Tin nhắn đội")} style={{ ...(viewport.height ? { "--chat-viewport-height": viewport.height + "px" } : {}), "--chat-viewport-top": viewport.top + "px" }}>
      <header className="conversation-header">
        <Avatar src={teamLogo} name={teamName || user.teamName} className="chat-team-avatar" />
        <div className="min-w-0"><p className="chat-eyebrow">{t("Tin nhắn đội")}</p><h1>{teamName || user.teamName || "Đội bóng"}</h1><p>{members.filter(m => m.membershipStatus !== "removed").length} {language === "en" ? "members" : "thành viên"}</p></div>
      </header>
      <p className="chat-local-notice">{t("Hội thoại lưu trên thiết bị này · chưa đồng bộ với đồng đội.")}</p>
      <div className="conversation-stream" ref={stream} role="log" aria-live="off" tabIndex={0} aria-label={t("Lịch sử hội thoại")} onScroll={() => {
        const list = stream.current;
        nearEnd.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
        if (nearEnd.current) setUnread(0);
      }}>
        {birthdayEnabled && birthdays.map(m => <div key={m.id} className="chat-system-event"><PartyPopper size={18} aria-hidden="true" /><span>{language === "en" ? "Today is " : "Hôm nay là sinh nhật "}{m.name}{language === "en" ? "’s birthday." : "."}</span><button type="button" onClick={() => send((language === "en" ? "Happy birthday " : "Chúc mừng sinh nhật ") + m.name + "!", false)}>{t("Gửi lời chúc")}</button></div>)}
        {!visibleMessages.length && <div className="chat-empty"><MessageSquare size={28} aria-hidden="true" /><p>{t("Chưa có tin nhắn. Bắt đầu trò chuyện với đội.")}</p></div>}
        {visibleMessages.map((m, index) => {
          const own = m.senderId === user.id, group = messageGroup(visibleMessages, index), sender = members.find(member => member.id === m.senderId);
          const date = new Date(m.createdAt), validDate = !Number.isNaN(date.getTime());
          return <React.Fragment key={m.id || index}>
            {group.newDay && <div className="chat-date"><span>{t(dayLabel(m.createdAt))}</span></div>}
            <article className={"chat-message-row " + (own ? "is-own" : "is-received") + (group.showSender ? " group-start" : "")}>
              {!own && <div className={group.showSender ? "chat-avatar-slot" : "chat-avatar-slot avatar-spacer"}><Avatar src={m.avatar || sender?.avatar} name={m.sender || sender?.name || "Thành viên"} /></div>}
              <div className={"chat-bubble " + (own ? "chat-bubble-own" : "chat-bubble-received")}>
                {!own && group.showSender && <p className="chat-sender">{m.sender || sender?.name || "Thành viên"}</p>}
                <p className="chat-message-text">{m.text}</p>
                <time dateTime={validDate ? date.toISOString() : undefined}>{validDate ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—"}</time>
              </div>
            </article>
          </React.Fragment>;
        })}
      </div>
      {unread > 0 && <button type="button" className="chat-new-messages" onClick={scrollBottom}><ArrowDown size={18} />{t("Tin nhắn mới")} ({unread})</button>}
      <div className="chat-composer-area">
        {error && <p role="alert" className="form-error">{t(error)}</p>}
        <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(input); }}>
          <label className="sr-only" htmlFor="chat-input">{t("Tin nhắn")}</label>
          <textarea ref={textarea} id="chat-input" rows={1} placeholder={t("Nhắn tin với đồng đội…")} value={input} maxLength={2000} onChange={e => setInput(e.target.value)} />
          <button type="submit" aria-label={t("Gửi tin nhắn")} disabled={!input.trim()} className="primary-button chat-send"><Send size={20} strokeWidth={1.75} aria-hidden="true" /></button>
        </form>
      </div>
    </section>
  );
}
