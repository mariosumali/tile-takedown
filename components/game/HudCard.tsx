type Variant = 'score' | 'high' | 'combo';

type Props = {
  variant: Variant;
  label: string;
  value: string;
  sub?: string;
  comboOn?: number;
  comboTotal?: number;
};

export default function HudCard({
  variant,
  label,
  value,
  sub,
  comboOn = 0,
  comboTotal = 4,
}: Props) {
  return (
    <div className={`card ${variant}`}>
      <div className="eyebrow">{label}</div>
      <div className="big">{value}</div>
      {sub && <div className="sub">{sub}</div>}
      {variant === 'combo' && (
        <div className="combo-bars" aria-hidden="true">
          {Array.from({ length: comboTotal }).map((_, i) => (
            <span key={i} className={i < comboOn ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}
