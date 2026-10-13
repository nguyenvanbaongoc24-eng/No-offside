import { useEffect, useRef, useState } from "react";
import { scrollNavigation } from "../lib/navigationScroll";
export function useScrollNavigation(route) {
  const [visible, setVisible] = useState(true);
  const reveal = useRef(() => setVisible(true));
  useEffect(() => {
    let state = { last: Math.max(0, window.scrollY), travel: 0, visible: true };
    let frame = 0,
      dragging = false;
    reveal.current = () => {
      state = { ...state, visible: true, travel: 0 };
      setVisible(true);
    };
    setVisible(true);
    const update = () => {
      frame = 0;
      const keyboard =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--keyboard-inset",
          ),
        ) > 80;
      state = scrollNavigation(
        state,
        window.scrollY,
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        dragging ||
          keyboard ||
          Boolean(document.activeElement?.matches(':focus-visible') && document.activeElement?.closest('.bottom-navigation')) ||
          Boolean(document.querySelector('[role="dialog"]')),
      );
      setVisible(state.visible);
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const drag = (e) => {
      dragging = e.detail.active;
      state = { ...state, last: Math.max(0, window.scrollY), travel: 0 };
    };
    const key = (e) => {
      if (e.key === "Tab") {
        state = { ...state, visible: true, travel: 0 };
        setVisible(true);
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("lineup-drag", drag);
    window.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("lineup-drag", drag);
      window.removeEventListener("keydown", key, true);
    };
  }, [route]);
  return [visible, () => reveal.current()];
}
