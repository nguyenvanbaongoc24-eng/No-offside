import { useLayoutEffect } from 'react';
export function useAppearance(appearance = {}) {
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = appearance.theme === 'dark' || (appearance.theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.documentElement.dataset.font = appearance.fontFamily === 'Be Vietnam Pro' ? 'vietnam' : 'system';
      document.documentElement.dataset.fontSize = appearance.fontSize || 'medium';
      document.documentElement.lang = 'vi';
      const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance.theme, appearance.fontFamily, appearance.fontSize]);
}
