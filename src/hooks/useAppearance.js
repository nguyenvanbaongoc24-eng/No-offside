import { useEffect } from 'react';
export function useAppearance(appearance = {}) {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = appearance.theme === 'dark' || (appearance.theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.font = appearance.fontFamily === 'Be Vietnam Pro' ? 'vietnam' : 'system';
      document.documentElement.lang = 'vi';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance.theme, appearance.fontFamily]);
}
