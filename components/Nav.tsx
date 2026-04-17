'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav className="nav">
      <Link href="/" className="brand" onClick={() => setOpen(false)}>
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

      <button
        type="button"
        className={`nav-toggle ${open ? 'open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-sheet"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {mounted && open &&
        createPortal(
          <>
            <div
              className="nav-sheet-backdrop"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              id="mobile-nav-sheet"
              className="nav-sheet"
              role="dialog"
              aria-label="Navigation"
            >
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`nav-sheet-link ${active === item.id ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </>,
          document.body
        )}
    </nav>
  );
}
