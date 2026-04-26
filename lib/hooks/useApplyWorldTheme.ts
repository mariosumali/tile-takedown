'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function useApplyWorldTheme() {
  const worldTheme = useSettingsStore((s) => s.worldTheme);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (worldTheme && worldTheme !== 'none') {
      html.setAttribute('data-world-theme', worldTheme);
    } else {
      html.removeAttribute('data-world-theme');
    }
    return () => {
      html.removeAttribute('data-world-theme');
    };
  }, [worldTheme]);
}
