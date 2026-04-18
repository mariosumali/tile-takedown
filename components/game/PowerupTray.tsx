'use client';

import type { PowerUpId, PowerUpInventory } from '@/lib/types';
import { POWERUPS, POWERUP_ORDER } from '@/lib/engine/powerups';

type Props = {
  inventory: PowerUpInventory;
  pendingId: PowerUpId | null;
  onActivate: (id: PowerUpId) => void;
  onCancel: () => void;
};

export default function PowerupTray({
  inventory,
  pendingId,
  onActivate,
  onCancel,
}: Props) {
  return (
    <div className="undo-card" style={{ padding: '16px 18px' }}>
      <div
        className="eyebrow"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span>powerups</span>
        {pendingId && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              font: 'inherit',
              color: 'var(--tomato, #c8412c)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
              padding: 0,
            }}
            className="eyebrow"
          >
            cancel
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {POWERUP_ORDER.map((id) => {
          const def = POWERUPS[id];
          const count = inventory[id] ?? 0;
          const armed = pendingId === id;
          const disabled = count <= 0;
          return (
            <button
              key={id}
              type="button"
              className="btn btn-secondary"
              disabled={disabled}
              onClick={() => onActivate(id)}
              title={`${def.name} — ${def.blurb}`}
              aria-label={`${def.name}, ${count} available`}
              style={{
                padding: '10px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                outline: armed ? '2px solid var(--mustard, #e0aa3e)' : 'none',
                outlineOffset: armed ? 2 : 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                {def.glyph}
              </span>
              <span
                className="eyebrow"
                style={{ fontSize: 10, margin: 0, textAlign: 'center' }}
              >
                {def.name.split(' ')[0]}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  opacity: 0.75,
                }}
              >
                ×{count}
              </span>
            </button>
          );
        })}
      </div>

      {pendingId && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            marginTop: 10,
            opacity: 0.8,
          }}
        >
          Tap a {POWERUPS[pendingId].kind === 'target' ? 'cell' : 'target'} to
          trigger {POWERUPS[pendingId].name}.
        </p>
      )}
    </div>
  );
}
