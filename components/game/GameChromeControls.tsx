'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

const MOBILE_CHROME_QUERY = '(max-width: 760px)';

export function useGameChromeVisibility() {
  const showTrayChromeSetting = useSettingsStore((s) => s.showTrayChrome);
  const showRunStatsSetting = useSettingsStore((s) => s.showRunStats);
  const [mobileDefaultHidden, setMobileDefaultHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia(MOBILE_CHROME_QUERY);
    const syncDefaults = () => setMobileDefaultHidden(query.matches);

    syncDefaults();
    query.addEventListener('change', syncDefaults);
    return () => query.removeEventListener('change', syncDefaults);
  }, []);

  const defaultVisible = !mobileDefaultHidden;

  return {
    showTrayChrome: showTrayChromeSetting ?? false,
    showRunStats: showRunStatsSetting ?? defaultVisible,
  };
}
