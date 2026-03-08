import { useScrollProgress } from "../hooks/useScrollProgress";

const DOTS = [
  "var(--c-joy)", "var(--c-anger)", "var(--c-sadness)",
  "var(--c-fear)", "var(--c-anxiety)", "var(--c-surprised)",
];

interface Props {
  currentFrame: number;
  total: number;
}

export function ChapterNav({ currentFrame, total }: Props) {
  const { scrollY } = useScrollProgress();
  const heroEl = typeof document !== "undefined" ? document.getElementById("hero") : null;
  const heroH = heroEl?.offsetHeight ?? 800;
  const show = scrollY > heroH * 0.55;

  return (
    <nav
      className={`chapter-nav${show ? " show" : ""}`}
      aria-label="Chapter navigation"
    >
      <div className="chapter-nav-inner">
        <div className="chapter-nav-dots">
          {DOTS.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
        <span className="chapter-nav-count">
          {currentFrame + 1} / {total}
        </span>
      </div>
    </nav>
  );
}
