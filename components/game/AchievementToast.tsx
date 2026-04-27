type Props = {
  name: string;
  desc: string;
  icon?: string;
  eyebrow?: string;
};

export default function AchievementToast({
  name,
  desc,
  icon = '★',
  eyebrow = 'achievement',
}: Props) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toast-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 2, color: 'var(--ink-2)' }}>
          {eyebrow}
        </div>
        <div className="toast-name">{name}</div>
        <div className="toast-desc">{desc}</div>
      </div>
    </div>
  );
}
