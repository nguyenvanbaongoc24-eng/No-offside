import { useEffect, useRef, useState } from "react";
import { scrollNavigation } from "../lib/navigationScroll";
export function useScrollNavigation(route) {
  const [visible, setVisible] = useState(true);
  const reveal = useRef(() => setVisible(true));
  useEffect(() => {
    let state = { last: Math.max(0, window.scrollY), travel: 0, visible: true };
    let frame = 0,
      dragging = false, keyboardWasOpen = false;
    reveal.current = () => {
      state = { ...state, visible: true, travel: 0 };
      setVisible(true);
    };
    setVisible(true);
    // Chat owns its stream and keyboard navigation; document scroll must not drive it.
    if (route === "chat") return;
    const update = () => {
      frame = 0;
      const keyboard =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--keyboard-inset",
          ),
        ) > 80;
      if (keyboard) {
        keyboardWasOpen = true;
        setVisible(false);
        return;
      }
      if (keyboardWasOpen) {
        keyboardWasOpen = false;
        state = {...state, last:Math.max(0,window.scrollY),travel:0,visible:true};
        setVisible(true);
      }
      state = scrollNavigation(
        state,
        window.scrollY,
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        dragging ||
          keyboard ||
          Boolean(document.activeElement?.matches(':focus-visible') && document.activeElement?.closest('.bottom-navigation')) ||
          Boolean(document.querySelector('[role="dialog"]')),
      );
      setVisible(previous => previous === state.visible ? previous : state.visible);
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const drag = (e) => {
      dragging = e.detail.active;
      state = { ...state, last: Math.max(0, window.scrollY), travel: 0 };
    };
    const key = (e) => {
      if (e.key === "Tab" && !keyboardWasOpen) {
        state = { ...state, visible: true, travel: 0 };
        setVisible(true);
      }
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.visualViewport?.addEventListener("resize", scroll);
    window.addEventListener("resize", scroll);
    window.addEventListener("lineup-drag", drag);
    window.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.visualViewport?.removeEventListener("resize", scroll);
      window.removeEventListener("resize", scroll);
      window.removeEventListener("lineup-drag", drag);
      window.removeEventListener("keydown", key, true);
    };
  }, [route]);
  return [visible, () => reveal.current()];
}
