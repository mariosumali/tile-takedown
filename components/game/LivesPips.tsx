'use client';

type Props = {
  lives: number;
  max?: number;
  powerMeter: number;
  powerMeterMax?: number;
};

export default function LivesPips({
  lives,
  max = 3,
  powerMeter,
  powerMeterMax = 100,
}: Props) {
  const meterPct = Math.max(0, Math.min(100, (powerMeter / powerMeterMax) * 100));
  return (
    <div className="hud-card" style={{ padding: '16px 18px' }}>
      <div
        className="eyebrow"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>lives</span>
        <span aria-label={`${lives} of ${max} lives remaining`}>
          {Array.from({ length: max }, (_, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 6,
                margin: '0 2px',
                background:
                  i < lives ? 'var(--tomato, #c8412c)' : 'var(--ink-20, #0000001a)',
                border: '1.5px solid var(--ink, #111)',
              }}
            />
          ))}
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          className="eyebrow"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span>power</span>
          <span>{Math.round(meterPct)}%</span>
        </div>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 10,
            border: '1.5px solid var(--ink, #111)',
            borderRadius: 6,
            background: 'var(--ink-05, #00000008)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${meterPct}%`,
              height: '100%',
              background: 'var(--mustard, #e0aa3e)',
              transition: 'width 260ms ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}
