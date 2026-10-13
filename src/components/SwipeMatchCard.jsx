import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, MoreHorizontal, X } from "lucide-react";
export default function SwipeMatchCard({
  match,
  canDelete,
  onDelete,
  children,
}) {
  const [offset, setOffset] = useState(0),
    [confirm, setConfirm] = useState(false),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const gesture = useRef(null),
    suppress = useRef(false);
  useEffect(() => {
    gesture.current = null;
    setOffset(0);
    setMenu(false);
    setConfirm(false);
  }, [match.id]);
  const closeConfirm = () => {
    setConfirm(false);
    setOffset(0);
    gesture.current = null;
  };
  const end = (e) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    setOffset(
      g.horizontal && e.type !== "pointercancel" && g.origin + g.dx < -40
        ? -88
        : 0,
    );
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const requestDelete = () => {
    if (canDelete) {
      setMenu(false);
      setConfirm(true);
    }
  };
  return (
    <div className="large-match-swipe">
      <div className="large-match-gesture">
        {canDelete && (
          <button
            className="large-match-delete"
            aria-label={"Xóa trận " + match.title}
            tabIndex={offset < 0 ? 0 : -1}
            aria-hidden={offset === 0}
            onClick={requestDelete}
          >
            <Trash2 size={22} />
            Xóa
          </button>
        )}
        <div
          className="large-match-content"
          style={{
            transform: `translateX(${offset}px)`,
            transition: gesture.current?.horizontal ? "none" : undefined,
          }}
          onClickCapture={(e) => {
            if (suppress.current && e.detail !== 0) {
              e.preventDefault();
              e.stopPropagation();
              suppress.current = false;
            }
          }}
          onPointerDown={(e) => {
            suppress.current = false;
            if (
              !canDelete ||
              !e.isPrimary ||
              e.button !== 0 ||
              e.target.closest("button,input,textarea,select,a")
            )
              return;
            suppress.current = false;
            gesture.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              dx: 0,
              origin: offset,
              horizontal: false,
            };
          }}
          onPointerMove={(e) => {
            const g = gesture.current;
            if (!g || g.id !== e.pointerId) return;
            const dx = e.clientX - g.x,
              dy = e.clientY - g.y;
            if (!g.horizontal) {
              if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
                gesture.current = null;
                return;
              }
              if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) + 6) return;
              g.horizontal = true;
              suppress.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            g.dx = dx;
            setOffset(Math.max(-88, Math.min(0, g.origin + dx)));
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={(e) => {
            if (gesture.current?.id === e.pointerId) {
              gesture.current = null;
              setOffset(0);
            }
          }}
        >
          {canDelete && (
            <div className="match-card-menu">
              <button
                aria-label="Thao tác trận đấu"
                aria-expanded={menu}
                onClick={() => setMenu((v) => !v)}
              >
                <MoreHorizontal size={20} />
              </button>
              {menu && (
                <button className="text-rose-700" onClick={requestDelete}>
                  <Trash2 size={18} />
                  Xóa trận
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
      {confirm &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-match-title"
            className="simple-overlay"
          >
            <section className="simple-sheet">
              <button
                className="sheet-close"
                aria-label="Đóng"
                onClick={closeConfirm}
              >
                <X size={20} />
              </button>
              <h2 id="archive-match-title" className="text-xl font-semibold">
                Xóa trận khỏi lịch?
              </h2>
              <p className="mt-3 font-medium break-words">{match.title}</p>
              <p className="mt-3 text-sm text-slate-600">
                Trận sẽ được lưu trữ. Điểm danh, báo cáo và khoản phạt được giữ
                nguyên; có thể hoàn tác trong 10 giây.
              </p>
              {error && (
                <p role="alert" className="text-rose-700 mt-3">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="choice-button" onClick={closeConfirm}>
                  Giữ trận
                </button>
                <button
                  className="primary-button bg-rose-700"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      if (canDelete) await onDelete(match.id);
                      setConfirm(false);
                      setOffset(0);
                    } catch {
                      setError(
                        "Không thể lưu trữ. Kiểm tra quyền và kết nối rồi thử lại.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Xóa và lưu trữ
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
