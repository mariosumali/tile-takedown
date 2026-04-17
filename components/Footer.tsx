export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div
          style={{
            width: 24,
            height: 24,
            background: 'var(--tomato)',
            border: '2px solid var(--ink)',
            borderRadius: 6,
          }}
          aria-hidden="true"
        />
        <span className="footer-text">
          tile takedown &middot; v0.1.0 &middot; made with warmth
        </span>
      </div>
      <div className="footer-links">
        <a className="footer-link" href="#">
          Github
        </a>
        <a className="footer-link" href="#">
          Readme
        </a>
        <a className="footer-link" href="#">
          Export data
        </a>
        <a className="footer-link" href="#">
          About
        </a>
      </div>
    </footer>
  );
}
