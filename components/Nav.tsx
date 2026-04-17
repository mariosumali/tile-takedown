import Link from 'next/link';
import BrandMark from './BrandMark';

type NavItem = { label: string; href: string; id: string };

const items: NavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'classic', label: 'Classic', href: '/play' },
  { id: 'sandbox', label: 'Sandbox', href: '/sandbox' },
  { id: 'stats', label: 'Stats', href: '/stats' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

export default function Nav({ active = 'home' }: { active?: string }) {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <BrandMark size="lg" />
        <span className="brand-name">tile takedown</span>
      </Link>
      <div className="nav-links">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`nav-link ${active === item.id ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
