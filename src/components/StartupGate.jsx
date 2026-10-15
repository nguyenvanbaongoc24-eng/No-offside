import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "./SplashScreen";
export default function StartupGate({
  pending = false,
  error = "",
  onRetry,
  onExit,
  children,
  timeoutMs = 15000,
}) {
  const [finished, setFinished] = useState(!pending && !error);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (finished) return;
    if (!pending && !error && !timedOut) {
      setFinished(true);
      return;
    }
    if (error || timedOut) return;
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [pending, error, finished, timedOut, timeoutMs]);
  const canAnimate =
    typeof document !== "undefined" &&
    typeof document.createElement === "function";
  const Layer = canAnimate ? motion.div : "div";
  const Presence = canAnimate ? AnimatePresence : React.Fragment;
  // Once boot completes, tab and modal updates never replay the splash.
  return (
    <>
      {finished && (
        <Layer
          className="startup-destination"
          {...(canAnimate
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.22 },
              }
            : {})}
        >
          {children}
        </Layer>
      )}
      <Presence>
        {!finished && (
          <Layer
            key="startup"
            className="startup-overlay"
            {...(canAnimate
              ? {
                  initial: false,
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: { duration: 0.22 },
                }
              : {})}
          >
            <SplashScreen
              error={
                error ||
                (timedOut
                  ? "Khởi động mất nhiều thời gian hơn dự kiến. Kiểm tra kết nối rồi thử lại."
                  : "")
              }
              onRetry={onRetry}
              onExit={onExit}
            />
          </Layer>
        )}
      </Presence>
    </>
  );
}
