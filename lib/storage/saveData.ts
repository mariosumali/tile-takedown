import { K } from './keys';

const SAVE_KEYS = Object.values(K);

export type SaveBundle = {
  app: 'tile-takedown';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown | null>;
};

export type ImportResult =
  | { ok: true; imported: number }
  | { ok: false; message: string };

export function collectSaveBundle(): SaveBundle | null {
  if (typeof window === 'undefined') return null;

  const data: SaveBundle['data'] = {};
  for (const key of SAVE_KEYS) {
    const raw = window.localStorage.getItem(key);
    data[key] = raw ? JSON.parse(raw) : null;
  }

  return {
    app: 'tile-takedown',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadSaveBundle(): ImportResult {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Save export is only available in the browser.' };
  }

  try {
    const bundle = collectSaveBundle();
    if (!bundle) return { ok: false, message: 'Could not read local save data.' };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tile-takedown-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, imported: SAVE_KEYS.length };
  } catch {
    return { ok: false, message: 'Could not export save data.' };
  }
}

export function importSaveBundle(raw: string): ImportResult {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Save import is only available in the browser.' };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveBundle>;
    if (parsed.app !== 'tile-takedown' || parsed.version !== 1 || !parsed.data) {
      return { ok: false, message: 'That does not look like a Tile Takedown save file.' };
    }

    let imported = 0;
    for (const key of SAVE_KEYS) {
      if (!(key in parsed.data)) continue;
      const value = parsed.data[key];
      if (value === null || value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
      imported += 1;
    }

    return { ok: true, imported };
  } catch {
    return { ok: false, message: 'Could not read that save file.' };
  }
}
