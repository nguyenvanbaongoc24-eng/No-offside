import { readStored, writeStored } from "../lib/storage";
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { Send, MessageSquare, PartyPopper, ArrowDown, AlertCircle, RefreshCw } from "lucide-react";
import { usePersistentState } from "../hooks/usePersistentState";
import { uid } from "../lib/teamModel";
import { chatScope, dayLabel, messageGroup } from "../lib/chatPresentation";
import { personalText } from "../lib/personalCopy";
import Avatar from "../components/Avatar";
import { supabase } from "../lib/supabase";

const useChatLayoutEffect =
  typeof document !== "undefined" && typeof document.createElement === "function"
    ? useLayoutEffect
    : useEffect;

export default function Chat(props) {
  return <ScopedChat key={chatScope(props.accountId, props.teamId)} {...props} />;
}

function ScopedChat({
  user,
  members = [],
  teamId,
  accountId,
  accessToken,
  birthdayEnabled = true,
  language = "vi",
  teamName,
  teamLogo,
  onKeyboardChange,
}) {
  const t = (text) => personalText(text, language);
  const scopeKey = chatScope(accountId, teamId);
  const storageKey = "no_offside_messages_" + scopeKey;
  const draftKey = "no_offside_draft_" + scopeKey;

  const [messages, setMessages] = usePersistentState(
    storageKey,
    () =>
      readStored(
        storageKey,
        accountId === "demo"
          ? readStored(
              "no_offside_messages_" + teamId,
              teamId === "fc-no-offside-99"
                ? readStored(
                    "no_offside_messages_demo::undefined",
                    readStored("no_offside_messages_undefined", [])
                  )
                : []
            )
          : []
      )
  );

  const [input, setInput] = useState(() => readStored(draftKey, ""));
  const inputRef = useRef(input);
  inputRef.current = input;

  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [viewport, setViewport] = useState({ height: null, top: 0, keyboard: false });
  const stream = useRef(null);
  const textarea = useRef(null);
  const nearEnd = useRef(true);
  const previousCount = useRef(0);
  const sending = useRef(false);

  // Sync draft to local storage on change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    writeStored(draftKey, val);
  };

  // Listen for save-active-drafts event (triggered on auto-update)
  useEffect(() => {
    const onSaveDrafts = () => {
      if (inputRef.current) {
        writeStored(draftKey, inputRef.current);
      }
    };
    window.addEventListener("save-active-drafts", onSaveDrafts);
    return () => {
      window.removeEventListener("save-active-drafts", onSaveDrafts);
    };
  }, [draftKey]);

  // Fetch remote messages from Supabase API when logged in
  const fetchRemoteMessages = useCallback(async () => {
    if (!accessToken || accountId === "demo" || !teamId || typeof fetch === "undefined") {
      return;
    }
    try {
      const res = await fetch(`/api/chat?teamId=${encodeURIComponent(teamId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages((local) => {
          const remoteMap = new Map(
            data.messages.map((m) => [m.clientMsgId || m.id, m])
          );
          const merged = [...data.messages];

          // Preserve any local messages that failed or are currently sending
          for (const lm of local) {
            const key = lm.clientMsgId || lm.id;
            if (!remoteMap.has(key) && (lm.status === "failed" || lm.status === "sending")) {
              merged.push(lm);
            }
          }

          merged.sort((a, b) => {
            const tDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (tDiff !== 0) return tDiff;
            return String(a.id).localeCompare(String(b.id));
          });

          writeStored(storageKey, merged);
          return merged;
        });
      }
    } catch {}
  }, [accessToken, accountId, teamId, setMessages, storageKey]);

  // Initial fetch and reconnect listeners
  useEffect(() => {
    fetchRemoteMessages();

    const onOnlineOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchRemoteMessages();
      }
    };

    window.addEventListener("online", onOnlineOrFocus);
    window.addEventListener("focus", onOnlineOrFocus);
    document.addEventListener("visibilitychange", onOnlineOrFocus);

    return () => {
      window.removeEventListener("online", onOnlineOrFocus);
      window.removeEventListener("focus", onOnlineOrFocus);
      document.removeEventListener("visibilitychange", onOnlineOrFocus);
    };
  }, [fetchRemoteMessages]);

  // Subscribe to Realtime messages via Supabase
  useEffect(() => {
    if (!supabase || !teamId || accountId === "demo") return;

    let channel = null;
    try {
      channel = supabase.channel(`team-chat:${teamId}`);
      channel
        .on("broadcast", { event: "new-message" }, ({ payload }) => {
          if (!payload) return;
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) =>
                (payload.clientMsgId && m.clientMsgId === payload.clientMsgId) ||
                m.id === payload.id
            );
            let updated;
            if (idx >= 0) {
              updated = [...prev];
              updated[idx] = { ...updated[idx], ...payload, status: "sent" };
            } else {
              updated = [...prev, { ...payload, status: "sent" }];
            }

            updated.sort((a, b) => {
              const tDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              if (tDiff !== 0) return tDiff;
              return String(a.id).localeCompare(String(b.id));
            });

            writeStored(storageKey, updated);
            return updated;
          });
        })
        .subscribe();
    } catch {}

    return () => {
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [teamId, accountId, setMessages, storageKey]);

  const visibleMessages = messages.filter((m) => m && typeof m.text === "string");
  const birthdays = useMemo(
    () =>
      members.filter((m) => {
        const today = new Date();
        const parts = (m.birthday || "").split("-");
        return (
          Number(parts[1]) === today.getMonth() + 1 &&
          Number(parts[2]) === today.getDate()
        );
      }),
    [members]
  );

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    let baseline = window.innerHeight;
    let width = window.innerWidth;
    const update = () => {
      const focused = document.activeElement === textarea.current;
      if (!focused || window.innerWidth !== width) {
        baseline = window.innerHeight;
        width = window.innerWidth;
      }
      const height = vv?.height || window.innerHeight;
      const keyboard =
        focused &&
        Math.max(
          baseline - height,
          window.innerHeight - height - (vv?.offsetTop || 0)
        ) > 80;
      setViewport({ height, top: vv?.offsetTop || 0, keyboard });
      onKeyboardChange?.(keyboard);
    };
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      onKeyboardChange?.(false);
    };
  }, [onKeyboardChange]);

  useChatLayoutEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height =
      Math.min(124, textarea.current.scrollHeight) + "px";
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
    if (nearEnd.current) {
      list.scrollTop = list.scrollHeight;
      setUnread(0);
    } else if (messages.length > previousCount.current) {
      const added = messages.length - previousCount.current;
      setUnread((n) => n + added);
    }
    previousCount.current = messages.length;
  }, [messages.length]);

  const scrollBottom = () => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
    nearEnd.current = true;
    setUnread(0);
  };

  const send = (text, clearDraft = true) => {
    if (!text.trim() || sending.current) return;
    sending.current = true;

    const clientMsgId = uid();
    const newMsg = {
      id: clientMsgId,
      clientMsgId,
      senderId: user.id,
      sender: user.name,
      avatar: user.avatar,
      text: text.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
      status: accessToken ? "sending" : "sent",
    };

    const next = [...messages, newMsg];

    if (!writeStored("no_offside_messages_" + scopeKey, next)) {
      setError(
        "Không lưu được tin nhắn trên thiết bị. Nội dung vẫn được giữ để thử lại."
      );
      sending.current = false;
      return;
    }

    nearEnd.current = true;
    setMessages(next);
    setError("");

    if (clearDraft) {
      setInput("");
      writeStored(draftKey, "");
    }

    // If online with accessToken, send to server
    if (accessToken && typeof fetch !== "undefined") {
      if (typeof window !== "undefined") {
        window.__no_offside_busy_saving = true;
      }
      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teamId,
          text: newMsg.text,
          clientMsgId,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Gửi tin nhắn thất bại");
          const data = await res.json();
          if (data.success && data.message) {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.clientMsgId === clientMsgId
                  ? { ...m, ...data.message, status: "sent" }
                  : m
              );
              writeStored(storageKey, updated);
              return updated;
            });
          }
        })
        .catch(() => {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.clientMsgId === clientMsgId ? { ...m, status: "failed" } : m
            );
            writeStored(storageKey, updated);
            return updated;
          });
          setError(
            "Tin nhắn chưa thể gửi đến đồng đội. Bấm vào biểu tượng để thử lại."
          );
        })
        .finally(() => {
          if (typeof window !== "undefined") {
            window.__no_offside_busy_saving = false;
          }
          sending.current = false;
        });
    } else {
      queueMicrotask(() => {
        sending.current = false;
      });
    }
  };

  const retrySend = (failedMsg) => {
    if (!accessToken || !failedMsg) return;
    setError("");
    setMessages((prev) =>
      prev.map((m) =>
        m.clientMsgId === failedMsg.clientMsgId ? { ...m, status: "sending" } : m
      )
    );

    if (typeof window !== "undefined") {
      window.__no_offside_busy_saving = true;
    }

    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        teamId,
        text: failedMsg.text,
        clientMsgId: failedMsg.clientMsgId,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Thử lại thất bại");
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.clientMsgId === failedMsg.clientMsgId
                ? { ...m, ...data.message, status: "sent" }
                : m
            );
            writeStored(storageKey, updated);
            return updated;
          });
        }
      })
      .catch(() => {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.clientMsgId === failedMsg.clientMsgId
              ? { ...m, status: "failed" }
              : m
          );
          writeStored(storageKey, updated);
          return updated;
        });
        setError("Gửi lại thất bại. Vui lòng kiểm tra kết nối mạng.");
      })
      .finally(() => {
        if (typeof window !== "undefined") {
          window.__no_offside_busy_saving = false;
        }
      });
  };

  return (
    <section
      lang={language}
      className={
        "chat-page conversation-page" +
        (viewport.keyboard ? " chat-keyboard-open" : "")
      }
      aria-label={t("Tin nhắn đội")}
      style={{
        ...(viewport.height ? { "--chat-viewport-height": viewport.height + "px" } : {}),
        "--chat-viewport-top": viewport.top + "px",
      }}
    >
      <header className="conversation-header">
        <Avatar src={teamLogo} name={teamName || user.teamName} className="chat-team-avatar" />
        <div className="min-w-0">
          <p className="chat-eyebrow">{t("Tin nhắn đội")}</p>
          <h1>{teamName || user.teamName || "Đội bóng"}</h1>
          <p>
            {members.filter((m) => m.membershipStatus !== "removed").length}{" "}
            {language === "en" ? "members" : "thành viên"}
          </p>
        </div>
      </header>

      <p className="chat-local-notice">
        {accessToken
          ? t("Hội thoại đồng bộ trên đám mây · Cập nhật theo thời gian thực.")
          : t("Hội thoại lưu trên thiết bị này · chưa đồng bộ với đồng đội.")}
      </p>

      <div
        className="conversation-stream"
        ref={stream}
        role="log"
        aria-live="off"
        tabIndex={0}
        aria-label={t("Lịch sử hội thoại")}
        onScroll={() => {
          const list = stream.current;
          nearEnd.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
          if (nearEnd.current) setUnread(0);
        }}
      >
        {birthdayEnabled &&
          birthdays.map((m) => (
            <div key={m.id} className="chat-system-event">
              <PartyPopper size={18} aria-hidden="true" />
              <span>
                {language === "en" ? "Today is " : "Hôm nay là sinh nhật "}
                {m.name}
                {language === "en" ? "’s birthday." : "."}
              </span>
              <button
                type="button"
                onClick={() =>
                  send(
                    (language === "en" ? "Happy birthday " : "Chúc mừng sinh nhật ") +
                      m.name +
                      "!",
                    false
                  )
                }
              >
                {t("Gửi lời chúc")}
              </button>
            </div>
          ))}

        {!visibleMessages.length && (
          <div className="chat-empty">
            <MessageSquare size={28} aria-hidden="true" />
            <p>{t("Chưa có tin nhắn. Bắt đầu trò chuyện với đội.")}</p>
          </div>
        )}

        {visibleMessages.map((m, index) => {
          const own = m.senderId === user.id;
          const group = messageGroup(visibleMessages, index);
          const sender = members.find((member) => member.id === m.senderId);
          // Look up current avatar dynamically from profile/member list to avoid stale copies
          const currentAvatar = (own ? user.avatar : sender?.avatar) || m.avatar;
          const date = new Date(m.createdAt);
          const validDate = !Number.isNaN(date.getTime());

          return (
            <React.Fragment key={m.clientMsgId || m.id || index}>
              {group.newDay && (
                <div className="chat-date">
                  <span>{t(dayLabel(m.createdAt))}</span>
                </div>
              )}
              <article
                className={
                  "chat-message-row " +
                  (own ? "is-own" : "is-received") +
                  (group.showSender ? " group-start" : "")
                }
              >
                {!own && (
                  <div
                    className={
                      group.showSender
                        ? "chat-avatar-slot"
                        : "chat-avatar-slot avatar-spacer"
                    }
                  >
                    <Avatar
                      src={currentAvatar}
                      name={m.sender || sender?.name || "Thành viên"}
                    />
                  </div>
                )}
                <div
                  className={
                    "chat-bubble " +
                    (own ? "chat-bubble-own" : "chat-bubble-received") +
                    (m.status === "failed" ? " is-failed" : "")
                  }
                >
                  {!own && group.showSender && (
                    <p className="chat-sender">{m.sender || sender?.name || "Thành viên"}</p>
                  )}
                  <p className="chat-message-text">{m.text}</p>
                  <div className="chat-meta flex items-center justify-end gap-1 mt-0.5">
                    <time dateTime={validDate ? date.toISOString() : undefined}>
                      {validDate
                        ? date.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </time>
                    {own && m.status === "failed" && (
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 p-0.5 inline-flex items-center gap-0.5 text-[10px]"
                        onClick={() => retrySend(m)}
                        title={t("Gửi lại")}
                        aria-label={t("Gửi lại tin nhắn")}
                      >
                        <RefreshCw size={12} className="text-red-500" />
                        <span>Thử lại</span>
                      </button>
                    )}
                    {own && m.status === "sending" && (
                      <span className="text-[10px] text-gray-400">...</span>
                    )}
                  </div>
                </div>
              </article>
            </React.Fragment>
          );
        })}
      </div>

      {unread > 0 && (
        <button type="button" className="chat-new-messages" onClick={scrollBottom}>
          <ArrowDown size={18} />
          {t("Tin nhắn mới")} ({unread})
        </button>
      )}

      <div className="chat-composer-area">
        {error && (
          <p role="alert" className="form-error">
            {t(error)}
          </p>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            {t("Tin nhắn")}
          </label>
          <textarea
            ref={textarea}
            id="chat-input"
            rows={1}
            placeholder={t("Nhắn tin với đồng đội…")}
            value={input}
            maxLength={2000}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            aria-label={t("Gửi tin nhắn")}
            disabled={!input.trim()}
            className="primary-button chat-send"
          >
            <Send size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
