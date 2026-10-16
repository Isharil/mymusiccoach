import { useEffect } from 'react';

// Applique le thème clair/sombre/auto et renvoie une fonction indiquant si le mode sombre est actif
export const useTheme = (theme) => {
  // Helper pour savoir si le mode sombre est actif (résolu)
  const isDarkMode = () => {
    if (theme === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return theme === 'dark';
  };

  // Appliquer le thème sombre
  useEffect(() => {
    const applyTheme = (isDark) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#7c3aed');
      }
    };

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const handler = (e) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      localStorage.setItem('mmc_theme', mediaQuery.matches ? 'dark' : 'light');
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
      localStorage.setItem('mmc_theme', theme);
    }
  }, [theme]);

  return isDarkMode;
};
