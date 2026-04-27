import Link from 'next/link';

export default function ModesSection() {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Four ways to play
          </div>
          <h2>Pick your board.</h2>
        </div>
      </div>

      <div className="modes">
        <Link href="/play" className="mode-card a">
          <div className="mc-eyebrow">8 &times; 8 &middot; 3-piece tray</div>
          <h3>Classic</h3>
          <p>
            Score, combo, survive. Fill rows or columns to clear. No take-backs:
            the run ends when nothing in the tray fits.
          </p>
          <div className="tags">
            <span className="tag-chip">combos</span>
            <span className="tag-chip">no undos</span>
            <span className="tag-chip">next-tray</span>
            <span className="tag-chip">high score</span>
          </div>
          <div className="go" aria-hidden="true" />
        </Link>

        <Link href="/levels" className="mode-card c">
          <div className="mc-eyebrow">100 handcrafted runs</div>
          <h3>Levels</h3>
          <p>
            Five tiers, shaped boards, curated pieces. Hit the target to unlock
            the next, earn three stars if you&rsquo;re feeling ambitious. One
            free reshuffle on deadlock.
          </p>
          <div className="tags">
            <span className="tag-chip">100 levels</span>
            <span className="tag-chip">shaped boards</span>
            <span className="tag-chip">star ratings</span>
            <span className="tag-chip">progression</span>
          </div>
          <div className="go" aria-hidden="true" />
        </Link>

        <Link href="/gimmicks" className="mode-card d">
          <div className="mc-eyebrow">powerups &middot; obstacles</div>
          <h3>Gimmicks</h3>
          <p>
            Clears earn powerups. The board fights back with locked tiles,
            melting ice, and ticking bombs. Three lives, one power meter, as
            much chaos as you can take.
          </p>
          <div className="tags">
            <span className="tag-chip">bombs</span>
            <span className="tag-chip">row nukes</span>
            <span className="tag-chip">3 lives</span>
            <span className="tag-chip">power meter</span>
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
