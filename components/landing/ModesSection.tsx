import Link from 'next/link';

export default function ModesSection() {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Two ways to play
          </div>
          <h2>Pick your board.</h2>
        </div>
      </div>

      <div className="modes">
        <Link href="/play" className="mode-card a">
          <div className="mc-eyebrow">8 &times; 8 &middot; 3-piece tray</div>
          <h3>Classic</h3>
          <p>
            Score, combo, survive. Fill rows or columns to clear. Three undos
            per run &mdash; spend them wisely. Game ends when nothing in the
            tray fits.
          </p>
          <div className="tags">
            <span className="tag-chip">combos</span>
            <span className="tag-chip">3 undos</span>
            <span className="tag-chip">next-tray</span>
            <span className="tag-chip">high score</span>
          </div>
          <div className="go" aria-hidden="true" />
        </Link>

        <Link href="/sandbox" className="mode-card b">
          <div className="mc-eyebrow">8 &times; 8 &middot; infinite tray</div>
          <h3>Sandbox</h3>
          <p>
            Empty grid. Infinite tray. No score, no pressure. Clears still go
            off because satisfaction is the whole point. Save snapshots, come
            back to them.
          </p>
          <div className="tags">
            <span className="tag-chip">no game-over</span>
            <span className="tag-chip">unlimited undo</span>
            <span className="tag-chip">snapshots</span>
            <span className="tag-chip">piece palette</span>
          </div>
          <div className="go" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
