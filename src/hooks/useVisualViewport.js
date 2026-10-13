import { useEffect } from "react";
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${viewport?.height || window.innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${Math.max(0, window.innerHeight - (viewport?.height || window.innerHeight) - (viewport?.offsetTop || 0))}px`,
      );
    };
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--visual-viewport-height");
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);
}
