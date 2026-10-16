import { Beer, Bell } from "./icons";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarPlus,
  Wallet,
  Network,
  UserPlus,
  Settings2,
  X,
  Swords,
  Trophy,
  Clapperboard,
} from "./icons";
import Pressable from "./Pressable";

export const quickActionItems = [
  { id: "match", label: "Tạo trận đấu mới", Icon: CalendarPlus },
  { id: "transaction", label: "Tạo khoản thu/chi", Icon: Wallet },
  { id: "formation", label: "Tạo chiến thuật mới", Icon: Network },
  { id: "invite", label: "Mời thành viên", Icon: UserPlus },
  { id: "board", label: "Tìm Đối", Icon: Swords },
  { id: "stars", label: "Ngôi sao & MOTM", Icon: Trophy },
  { id: "finance", label: "Sinh Tố Lúa Mạch", Icon: Beer },
  { id: "media", label: "Poster & khoảnh khắc", Icon: Clapperboard },
  { id: "settings", label: "Cài đặt đội bóng", Icon: Settings2 },
];
export function roleQuickActions(role, fundManager, treasurer) {
  const extra = [
    { id: "fund", label: "Quỹ đội", Icon: Wallet },
    { id: "reminder", label: "Nhắc thu quỹ", Icon: Bell },
  ];
  const base = ["owner", "admin"].includes(role)
    ? [...quickActionItems, ...(fundManager ? [extra[1]] : [])]
    : fundManager
      ? [extra[1], quickActionItems.find((x) => x.id === "finance")]
      : [];
  return treasurer ? [extra[0], ...base.filter((x) => x.id !== "fund")] : base;
}
export default function QuickActions({
  open,
  onClose,
  onAction,
  role,
  fundManager = false,
  treasurer = false,
}) {
  const reduced = useReducedMotion(),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const back = () => close.current();
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [open]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="quick-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Thao tác nhanh"
            className="quick-sheet"
            initial={reduced ? { opacity: 0 } : { y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 32, opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 0.22,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="quick-sheet-handle"
              aria-hidden="true"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 45 || info.velocity.y > 450) onClose();
              }}
            >
              <span />
            </motion.div>
            <header>
              <div>
                <p>NO OFFSIDE</p>
                <h2>Thao tác nhanh</h2>
              </div>
              <Pressable type="button" aria-label="Đóng" onClick={onClose}>
                <X size={22} />
              </Pressable>
            </header>
            <div className="quick-sheet-grid">
              {roleQuickActions(role, fundManager, treasurer).map(
                ({ id, label, Icon }) => {
                  const disabled = id === "settings" && role !== "owner";
                  return (
                    <Pressable
                      key={id}
                      type="button"
                      disabled={disabled}
                      className={
                        "quick-sheet-action" +
                        (id === "fund" && treasurer ? " fund-priority" : "")
                      }
                      onClick={() => onAction(id)}
                    >
                      <span className="quick-action-icon">
                        <Icon size={23} />
                      </span>
                      <strong>{label}</strong>
                      {disabled && <small>Chỉ chủ đội</small>}
                    </Pressable>
                  );
                },
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
