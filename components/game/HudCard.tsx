import { COMBO_TIERS, comboTier, type ComboTier } from '@/lib/engine/scoring';

type Variant = 'score' | 'high' | 'combo';

type Props = {
  variant: Variant;
  label: string;
  value: string;
  sub?: string;
  /** Current combo count (number of consecutive clears). Used to derive tier visuals. */
  combo?: number;
  /** Legacy: number of meter segments currently lit. Falls back to min(combo, comboTotal). */
  comboOn?: number;
  comboTotal?: number;
};

const TIER_LABEL: Record<ComboTier, string | null> = {
  none: null,
  spark: null,
  hot: 'HOT',
  fire: 'FIRE',
  inferno: 'INFERNO',
};

function segmentTier(index: number): ComboTier {
  // Each segment corresponds to a combo count of (index + 1). Map that count
  // through the same thresholds as `comboTier` so colors line up with tier zones.
  const count = index + 1;
  if (count >= COMBO_TIERS.inferno) return 'inferno';
  if (count >= COMBO_TIERS.fire) return 'fire';
  if (count >= COMBO_TIERS.hot) return 'hot';
  if (count >= COMBO_TIERS.spark) return 'spark';
  return 'none';
}

export default function HudCard({
  variant,
  label,
  value,
  sub,
  combo,
  comboOn,
  comboTotal = 8,
}: Props) {
  const activeCount = combo ?? comboOn ?? 0;
  const tier = variant === 'combo' ? comboTier(activeCount) : 'none';
  const tierLabel = TIER_LABEL[tier];
  const lit = Math.min(comboTotal, Math.max(0, comboOn ?? activeCount));

  return (
    <div
      className={`card ${variant}`}
      data-combo-tier={variant === 'combo' ? tier : undefined}
    >
      <div className="eyebrow">{label}</div>
      <div className="big">{value}</div>
      {sub && <div className="sub">{sub}</div>}
      {variant === 'combo' && (
        <>
          <div className="combo-bars" aria-hidden="true">
            {Array.from({ length: comboTotal }).map((_, i) => (
              <span
                key={i}
                className={i < lit ? 'on' : ''}
                data-tier={segmentTier(i)}
              />
            ))}
          </div>
          {tierLabel && (
            <div className="combo-tier-label" aria-hidden="true">
              {tierLabel}
            </div>
          )}
        </>
      )}
    </div>
  );
}
