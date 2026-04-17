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
    </footer>
  );
}
