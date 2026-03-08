const COLORS = [
  "var(--c-joy)", "var(--c-anger)", "var(--c-sadness)",
  "var(--c-fear)", "var(--c-anxiety)", "var(--c-surprised)",
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-rule" aria-hidden="true" />
      <p className="footer-ifs">Internal Family Systems</p>
      <p className="footer-tagline">every part has a story</p>
      <div className="footer-orbs" aria-hidden="true">
        {COLORS.map((c, i) => (
          <span key={i} style={{ background: c }} />
        ))}
      </div>
    </footer>
  );
}
