import {birthdaysToday} from '../lib/announcements';
import {BASIC_EMOJI,mentionAt,mentionCandidates,mentionLabel,insertComposerText,messageParts} from '../lib/chatComposer';
import Pressable from '../components/Pressable';
import { acquireScrollLock } from '../lib/scrollLock';
import {useViewedMessages} from '../hooks/useViewedMessages';
import { serverRequest } from "../lib/serverRequest";
import { beginPendingWrite } from "../lib/pendingWrites";
import { readStored, writeStored } from "../lib/storage";
import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Send,
  MessageSquare,
  PartyPopper,
  Trophy,
  ArrowDown,
  AlertCircle,
  RefreshCw,
  Smile,
  X,
} from "../components/icons";
import { usePersistentState } from "../hooks/usePersistentState";
import { uid } from "../lib/teamModel";
import { chatScope, dayLabel, messageGroup } from "../lib/chatPresentation";
import { personalText } from "../lib/personalCopy";
import Avatar from "../components/Avatar";
import { supabase } from "../lib/supabase";

const useChatLayoutEffect =
  typeof document !== "undefined" &&
  typeof document.createElement === "function"
    ? useLayoutEffect
    : useEffect;

export default function Chat(props) {
  return (
    <ScopedChat key={chatScope(props.accountId, props.teamId)} {...props} />
  );
}

function ScopedChat({
  user,
  members = [],
  teamId,
  accountId,
  accessToken,
  birthdayEnabled = true,
  timeZone = "Asia/Ho_Chi_Minh",
  language = "vi",
  teamName,
  teamLogo,
  onKeyboardChange,
  onMarkViewed,
  onPresence,
}) {
  const t = (text) => personalText(text, language);
  const scopeKey = chatScope(accountId, teamId);
  const storageKey = "no_offside_messages_" + scopeKey;
  const draftKey = "no_offside_draft_" + scopeKey;

  const [messages, setMessages] = usePersistentState(storageKey, () =>
    readStored(
      storageKey,
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

  const [input, setInput] = useState(() => readStored(draftKey, ""));
  const [caret,setCaret]=useState(null),[emojiOpen,setEmojiOpen]=useState(false),[mentionClosed,setMentionClosed]=useState(false),[mentionIndex,setMentionIndex]=useState(0);
  const pendingCaret=useRef(null);
  const mention=mentionClosed?null:mentionAt(input,caret ?? input.length);
  const candidates=mention?mentionCandidates(members,mention.query):[];
  const activeMention=Math.min(mentionIndex,Math.max(0,candidates.length-1));

  const inputRef = useRef(input);
  inputRef.current = input;

  const [error, setError] = useState("");
  const [preservedCount, setPreservedCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(
    Boolean(accessToken && accountId !== "demo"),
  );
  const [historyCursor, setHistoryCursor] = useState(null),
    [hasMore, setHasMore] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false);
  const historyLoaded = useRef(false),
    prependScroll = useRef(null),
    requestController = useRef(null);
  useEffect(() => () => requestController.current?.abort(), []);
  const identity = (m) => m.id || [m.senderId, m.clientMsgId].join(":");
  const mergeMessages = (current, incoming) => {
    const merged = new Map(current.map((m) => [identity(m), m]));
    for (const message of incoming) {
      for (const [key, previous] of merged) {
        if (
          previous.senderId === message.senderId &&
          previous.clientMsgId &&
          previous.clientMsgId === message.clientMsgId
        )
          merged.delete(key);
      }
      merged.set(identity(message), message);
    }
    return [...merged.values()].sort(
      (a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt) ||
        String(a.id).localeCompare(String(b.id)),
    );
  };
  const [unread, setUnread] = useState(0);
  const [viewport, setViewport] = useState({
    height: null,
    top: 0,
    keyboard: false,
  });
  const stream = useRef(null);
  const textarea = useRef(null);
  const nearEnd = useRef(true);
  useViewedMessages({stream, teamId, messages, ready: Boolean(accessToken && !initialLoading && !error && historyLoaded.current), onMarkViewed, onPresence});
  const previousCount = useRef(0);
  const sending = useRef(false);

  // Sync draft to local storage on change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setCaret(e.target.selectionStart ?? val.length);setMentionClosed(false);setMentionIndex(0);
    writeStored(draftKey, val);
  };

  const insertText=(addition,from=textarea.current?.selectionStart ?? input.length,to=textarea.current?.selectionEnd ?? from)=>{
    const next=insertComposerText(input,from,to,addition);if(!next){setError('Tin nhắn tối đa 2000 ký tự.');return;}
    setInput(next.text);writeStored(draftKey,next.text);setCaret(next.caret);pendingCaret.current=next.caret;setMentionClosed(true);setEmojiOpen(false);
  };
  const chooseMention=member=>{if(mention)insertText('@'+mentionLabel(member)+' ',mention.start,mention.end);};
  useChatLayoutEffect(()=>{if(pendingCaret.current===null)return;const cursor=pendingCaret.current;pendingCaret.current=null;textarea.current?.focus?.();textarea.current?.setSelectionRange?.(cursor,cursor);},[input]);

  // Listen for save-active-drafts event (triggered on auto-update)
  useEffect(() => {
    const onSaveDrafts = (event) => {
      if (!writeStored(draftKey, inputRef.current)) event.preventDefault();
    };
    window.addEventListener("save-active-drafts", onSaveDrafts);
    return () => {
      window.removeEventListener("save-active-drafts", onSaveDrafts);
    };
  }, [draftKey]);

  // Fetch remote messages from Supabase API when logged in
  const fetchRemoteMessages = useCallback(async () => {
    if (
      !accessToken ||
      accountId === "demo" ||
      !teamId ||
      typeof fetch === "undefined"
    ) {
      return;
    }
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    if (!historyLoaded.current) setInitialLoading(true);
    try {
      const { response: res, data } = await serverRequest(
        `/api/chat?teamId=${encodeURIComponent(teamId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!res.ok) throw Error("Không tải được lịch sử tin nhắn từ server.");
      if (controller.signal.aborted) return;
      if (!data.success || !Array.isArray(data.messages))
        throw Error("Server chưa trả lịch sử tin nhắn.");
      const alreadyLoaded = historyLoaded.current;
      if (!alreadyLoaded) {
        setHistoryCursor(data.cursor);
        setHasMore(Boolean(data.hasMore));
      }
      historyLoaded.current = true;
      setPreservedCount(data.preservedUnparsedMessages || 0);
      setMessages((local) =>
        mergeMessages(
          alreadyLoaded
            ? local
            : local.filter(
                (m) => m.status === "failed" || m.status === "sending",
              ),
          data.messages,
        ),
      );
      setError("");
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error.message ||
            "Không tải được tin nhắn. Kiểm tra kết nối rồi thử lại.",
        );
    } finally {
      if (requestController.current === controller) setInitialLoading(false);
    }
  }, [accessToken, accountId, teamId, setMessages, storageKey]);
  const loadOlder = async () => {
    if (historyLoading || !historyCursor || !accessToken) return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ teamId, ...historyCursor });
      const { response: res, data } = await serverRequest(
        `/api/chat?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      if (!res.ok || !data.success) throw Error("Không tải được tin nhắn cũ.");
      if (stream.current)
        prependScroll.current = {
          top: stream.current.scrollTop,
          height: stream.current.scrollHeight,
        };
      setMessages((prev) => mergeMessages(prev, data.messages));
      setHistoryCursor(data.cursor);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      setError(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial fetch and reconnect listeners
  useEffect(() => {
    fetchRemoteMessages();

    const onOnlineOrFocus = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
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

    let channel = null, reconnectPoll = null, disposed=false;
    const stopPoll=()=>{if(reconnectPoll){clearInterval(reconnectPoll);reconnectPoll=null;}};
    try {
      channel = supabase
        .channel(`team-chat:${teamId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "no_team_messages",
            filter: `team_id=eq.${teamId}`,
          },
          () => fetchRemoteMessages(),
        )
        .subscribe((status) => {
          if(disposed)return;
          if (status === "SUBSCRIBED") {stopPoll();fetchRemoteMessages();}
          else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status) && !reconnectPoll) reconnectPoll=setInterval(()=>{if(document.visibilityState!=='hidden')fetchRemoteMessages();},8000);
        });
    } catch {}

    return () => {
      disposed=true;
      stopPoll();
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [teamId, accountId, fetchRemoteMessages]);

  const visibleMessages = messages.filter(
    (m) => m && typeof m.text === "string",
  );
  const birthdays = useMemo(()=>birthdaysToday(members,timeZone),[members,timeZone]);

  useEffect(() => {
    return acquireScrollLock();
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
          window.innerHeight - height - (vv?.offsetTop || 0),
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
      Math.min(124, textarea.current.scrollHeight + 2) + "px";
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
    if (prependScroll.current) {
      list.scrollTop =
        prependScroll.current.top +
        list.scrollHeight -
        prependScroll.current.height;
      prependScroll.current = null;
      previousCount.current = messages.length;
      return;
    }
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
        "Không lưu được tin nhắn trên thiết bị. Nội dung vẫn được giữ để thử lại.",
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
      const finishWrite = beginPendingWrite();
      serverRequest("/api/chat", {
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
        .then(async ({ response: res, data }) => {
          if (!res.ok) throw new Error("Gửi tin nhắn thất bại");
          if (!data.success || !data.message?.id)
            throw Error("Server chưa xác nhận tin nhắn.");
          if (data.success && data.message) {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.senderId === user.id && m.clientMsgId === clientMsgId
                  ? { ...m, ...data.message, status: "sent" }
                  : m,
              );
              writeStored(storageKey, updated);
              return updated;
            });
          }
        })
        .catch(() => {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.clientMsgId === clientMsgId ? { ...m, status: "failed" } : m,
            );
            writeStored(storageKey, updated);
            return updated;
          });
          setError(
            "Tin nhắn chưa thể gửi đến đồng đội. Bấm vào biểu tượng để thử lại.",
          );
        })
        .finally(() => {
          finishWrite();
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
        m.clientMsgId === failedMsg.clientMsgId
          ? { ...m, status: "sending" }
          : m,
      ),
    );

    const finishWrite = beginPendingWrite();

    serverRequest("/api/chat", {
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
      .then(async ({ response: res, data }) => {
        if (!res.ok) throw new Error("Thử lại thất bại");
        if (!data.success || !data.message?.id)
          throw Error("Server chưa xác nhận tin nhắn.");
        if (data.success && data.message) {
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.senderId === user.id && m.clientMsgId === failedMsg.clientMsgId
                ? { ...m, ...data.message, status: "sent" }
                : m,
            );
            writeStored(storageKey, updated);
            return updated;
          });
        }
      })
      .catch(() => {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.senderId === user.id && m.clientMsgId === failedMsg.clientMsgId
              ? { ...m, status: "failed" }
              : m,
          );
          writeStored(storageKey, updated);
          return updated;
        });
        setError("Gửi lại thất bại. Vui lòng kiểm tra kết nối mạng.");
      })
      .finally(() => {
        finishWrite();
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
        ...(viewport.height
          ? { "--chat-viewport-height": viewport.height + "px" }
          : {}),
        "--chat-viewport-top": viewport.top + "px",
      }}
    >
      <header className="conversation-header">
        <Avatar
          src={teamLogo}
          name={teamName || user.teamName}
          className="chat-team-avatar"
        />
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
          nearEnd.current =
            list.scrollHeight - list.scrollTop - list.clientHeight < 80;
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
              <Pressable
                type="button"
                onClick={() =>
                  send(
                    (language === "en"
                      ? "Happy birthday "
                      : "Chúc mừng sinh nhật ") +
                      m.name +
                      "!",
                    false,
                  )
                }
              >
                {t("Gửi lời chúc")}
              </Pressable>
            </div>
          ))}

        {hasMore && (
          <Pressable
            type="button"
            className="chat-history-button"
            onClick={loadOlder}
            disabled={historyLoading}
          >
            {historyLoading ? "Đang tải…" : "Xem tin nhắn cũ hơn"}
          </Pressable>
        )}
        {preservedCount > 0 && (
          <p className="field-hint" role="status">
            Có {preservedCount} tin cũ thiếu thông tin cần thiết để hiển thị.
            Bản gốc đã được giữ trong kho lưu trữ để đối chiếu.
          </p>
        )}
        {initialLoading && (
          <p role="status" className="field-hint">
            Đang tải lịch sử tin nhắn…
          </p>
        )}
        {!initialLoading && !visibleMessages.length && (
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
          const currentAvatar =
            (own ? user.avatar : sender?.avatar) || m.avatar;
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
                data-message-id={m.sequence && m.status === "sent" ? m.id : undefined}
                data-message-sequence={m.sequence && m.status === "sent" ? m.sequence : undefined}
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
                    <p className="chat-sender">
                      {m.sender || sender?.name || "Thành viên"}{sender?.motm&&<Trophy size={14} aria-label="MOTM trong tuần"/>}
                    </p>
                  )}
                  <p className="chat-message-text">{messageParts(m.text,members).map((part,index)=>part.mention?<mark className="chat-mention" key={index}>{part.text}</mark>:part.text)}</p>
                  {m.legacyUnverified && (
                    <span className="chat-legacy-label">
                      Lịch sử cũ · tác giả chưa xác minh
                    </span>
                  )}
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
                      <Pressable
                        type="button"
                        className="text-red-500 hover:text-red-700 p-0.5 inline-flex items-center gap-0.5 text-[10px]"
                        onClick={() => retrySend(m)}
                        title={t("Gửi lại")}
                        aria-label={t("Gửi lại tin nhắn")}
                      >
                        <RefreshCw size={12} className="text-red-500" />
                        <span>Thử lại</span>
                      </Pressable>
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
        <Pressable
          type="button"
          className="chat-new-messages"
          onClick={scrollBottom}
        >
          <ArrowDown size={18} />
          {t("Tin nhắn mới")} ({unread})
        </Pressable>
      )}

      <div className="chat-composer-area">
        {error && (
          <p role="alert" className="form-error">
            {t(error)}
          </p>
        )}
        {candidates.length>0 && <div className="chat-mention-menu" role="listbox" id="chat-mentions" aria-label="Gắn tên thành viên">{candidates.map((member,index)=><Pressable type="button" role="option" aria-selected={index===activeMention} id={'chat-mention-'+index} key={member.id} onPointerDown={e=>e.preventDefault()} onClick={()=>chooseMention(member)}><Avatar src={member.avatar} name={member.name}/><span><strong>{member.name}</strong><small>@{mentionLabel(member)}{member.number?' · #'+member.number:''}</small></span></Pressable>)}</div>}
        {emojiOpen && <div className="chat-emoji-tray" role="group" aria-label="Biểu cảm"><header><strong>Biểu cảm</strong><Pressable type="button" aria-label="Đóng biểu cảm" onClick={()=>setEmojiOpen(false)}><X size={18}/></Pressable></header><div>{BASIC_EMOJI.map(emoji=><Pressable type="button" aria-label={'Chèn '+emoji} key={emoji} onPointerDown={e=>e.preventDefault()} onClick={()=>insertText(emoji)}>{emoji}</Pressable>)}</div></div>}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Pressable type="button" className="chat-emoji-toggle" aria-label="Mở biểu cảm" aria-expanded={emojiOpen} onPointerDown={e=>e.preventDefault()} onClick={()=>{setEmojiOpen(v=>!v);setMentionClosed(true);}}><Smile size={22}/></Pressable>
          <label className="sr-only" htmlFor="chat-input">
            {t("Tin nhắn")}
          </label>
          <textarea
            data-persisted-draft="true"
            ref={textarea}
            id="chat-input"
            rows={1}
            placeholder={t("Nhắn tin với đồng đội…")}
            value={input}
            maxLength={2000}
            onChange={handleInputChange}
            onSelect={e=>setCaret(e.target.selectionStart)}
            aria-autocomplete="list"
            aria-controls={candidates.length?'chat-mentions':undefined}
            aria-activedescendant={candidates.length?'chat-mention-'+activeMention:undefined}
            onKeyDown={e=>{if(e.nativeEvent?.isComposing || e.isComposing || !candidates.length)return;if(e.key==='Escape'){e.preventDefault();setMentionClosed(true);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setMentionIndex((activeMention+(e.key==='ArrowDown'?1:candidates.length-1))%candidates.length);}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();chooseMention(candidates[activeMention]);}}}
          />
          <Pressable
            type="submit"
            aria-label={t("Gửi tin nhắn")}
            disabled={!input.trim()}
            className="primary-button chat-send"
          >
            <Send size={20}  aria-hidden="true" />
          </Pressable>
        </form>
      </div>
    </section>
  );
}
