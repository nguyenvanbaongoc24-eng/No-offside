import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useLayerBack } from "../../hooks/useLayerBack";
import Pressable from "../Pressable";
export default function ProModal({
  open,
  title,
  onClose,
  children,
  busy = false,
}) {
  const reduced = useReducedMotion();
  useLayerBack(open, () => {
    if (!busy) onClose();
  });
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="pro-overlay backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={() => {
            if (!busy) onClose();
          }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="pro-sheet"
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 24 }}
            transition={{ duration: reduced ? 0 : 0.24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>{title}</h2>
              <Pressable
                type="button"
                aria-label="Đóng"
                disabled={busy}
                onClick={onClose}
              >
                <X size={22} />
              </Pressable>
            </header>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
