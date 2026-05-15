'use client';

import { useEffect } from 'react';

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('theme', t);
  } catch {
    /* ignore */
  }
}

export default function ThemeInit() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('theme');
      applyTheme(raw === 'dark' ? 'dark' : 'light');
    } catch {
      applyTheme('light');
    }
  }, []);
  return null;
}
