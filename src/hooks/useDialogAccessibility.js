import { useEffect } from 'react';
import { acquireScrollLock } from '../lib/scrollLock';
export function useDialogAccessibility() {
  useEffect(() => {
    let dialog = null, restoreFocus = null, releaseScroll = null;
    const controls = element => [...element.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);
    const update = () => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const top = dialogs.at(-1) || null;
      if (top === dialog) return;
      if (!dialog && top) { restoreFocus = document.activeElement; releaseScroll = acquireScrollLock(); }
      dialog = top;
      document.querySelector('nav')?.toggleAttribute('inert', Boolean(top));
      if (top) {
        top.setAttribute('aria-modal', 'true');
        const heading = top.querySelector('h1,h2,h3');
        top.setAttribute('aria-label', heading?.textContent || 'Hộp thoại');
        (controls(top)[0] || top).focus();
      } else {
        releaseScroll?.(); releaseScroll = null;
        if (restoreFocus?.isConnected) restoreFocus.focus();
      }
    };
    const onKey = event => {
      if (!dialog) return;
      if (event.key === 'Escape') {
        const close = dialog.querySelector('button[aria-label="Đóng"],button[title="Đóng"]') || [...dialog.querySelectorAll('button')].find(b => /^Đóng|Hủy|Quay lại/.test(b.textContent.trim()));
        if (close) { event.preventDefault(); close.click(); }
      }
      if (event.key === 'Tab') {
        const items = controls(dialog), first = items[0], last = items.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const observer = new MutationObserver(update); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKey); update();
    return () => { observer.disconnect(); document.removeEventListener('keydown',onKey); releaseScroll?.(); document.querySelector('nav')?.removeAttribute('inert'); };
  }, []);
}
