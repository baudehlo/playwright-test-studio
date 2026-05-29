import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeProviderContext = createContext({});

export function ThemeProvider({ children }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    // Apply initially
    applyTheme(mediaQuery);

    // Listen for OS theme changes
    const listener = (e) => applyTheme(e);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return (
    <ThemeProviderContext.Provider value={{}}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
