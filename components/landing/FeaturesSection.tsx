import { ACHIEVEMENTS } from '@/lib/achievements/definitions';

type Feature = {
  icon: string;
  iconClass: string;
  title: string;
  desc: string;
};

const features: Feature[] = [
  {
    icon: '×',
    iconClass: 'fi-t',
    title: 'Combo chains',
    desc:
      'Consecutive-turn clears stack a multiplier up to ×4.00, with hotter effects as the board catches fire.',
  },
  {
    icon: '↶',
    iconClass: 'fi-m',
    title: 'Three undos',
    desc:
      'Non-refilling, per run. Reverses the placement and any clears it triggered. Combo restored too.',
  },
  {
    icon: '?',
    iconClass: 'fi-o',
    title: 'Next-tray peek',
    desc:
      'Silhouettes of the upcoming three pieces. A gentle hint, not a solved puzzle.',
  },
  {
    icon: 'T',
    iconClass: 'fi-s',
    title: 'Four themes',
    desc:
      'Paper, Linen, Noir, High Contrast. Instant swap, and your pick sticks between sessions.',
  },
  {
    icon: '★',
    iconClass: 'fi-p',
    title: `${ACHIEVEMENTS.length} achievements`,
    desc:
      'Classic milestones, level mastery, Gimmicks feats, night owl runs, and tiny paper trophies.',
  },
  {
    icon: '█',
    iconClass: 'fi-c',
    title: 'Piece sets',
    desc:
      'Curated classic, tetrominoes only, Crazy, or small pieces only. Your call.',
  },
  {
    icon: '📅',
    iconClass: 'fi-t',
    title: 'Daily streak',
    desc:
      'Play daily, build a streak, and watch your 90-day activity heatmap fill in. No push notifications.',
  },
  {
    icon: '♪',
    iconClass: 'fi-m',
    title: 'Haptics + SFX',
    desc:
      'Gentle vibration on mobile for drops, clears, achievements. All optional. Master mute in HUD.',
  },
  {
    icon: '💾',
    iconClass: 'fi-o',
    title: 'Save anywhere',
    desc:
      'Export your save file whenever you want. Bring your runs, settings, and achievements along.',
  },
  {
    icon: '!',
    iconClass: 'fi-s',
    title: 'Gimmicks mode',
    desc:
      'Lives, obstacles, powerups, and a pressure cooker version of the classic board.',
  },
  {
    icon: '#',
    iconClass: 'fi-c',
    title: '100 levels',
    desc:
      'Hand-tuned score puzzles with shaped boards, stars, badges, and a daily featured level.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            What&rsquo;s in the box
          </div>
          <h2>Every feature, small and good.</h2>
        </div>
      </div>

      <div className="features">
        {features.map((f) => (
          <div key={f.title} className="feature">
            <div className={`feature-icon ${f.iconClass}`} aria-hidden="true">
              {f.icon}
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
