import { useEffect, useState } from 'react';

/**
 * Synchronous check for the same "touch-like" / mobile layout conditions as
 * `useTouchLike` (narrow viewport or coarse pointer). For use in stores and
 * game logic. Returns false on the server.
 */
export function isTouchLikeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 760px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * True when the rotation *setting* is on and the player can actually rotate
 * in the UI (desktop / non–touch-like). Matches keyboard + tray behavior.
 */
export function effectiveRotationEnabled(rotationSetting: boolean): boolean {
  if (!rotationSetting) return false;
  return !isTouchLikeEnvironment();
}

/**
 * Returns true when the current environment looks like a touch/mobile device:
 * either the viewport is narrow (≤760px) or the primary pointer is coarse.
 * Matches the detection used by the R-to-rotate keyboard handler so UI hints
 * stay in sync with where the shortcut is actually wired up.
 */
export function useTouchLike(): boolean {
  const [isTouchLike, setIsTouchLike] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const narrow = window.matchMedia('(max-width: 760px)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const sync = () => setIsTouchLike(narrow.matches || coarse.matches);
    sync();
    narrow.addEventListener('change', sync);
    coarse.addEventListener('change', sync);
    return () => {
      narrow.removeEventListener('change', sync);
      coarse.removeEventListener('change', sync);
    };
  }, []);

  return isTouchLike;
}
