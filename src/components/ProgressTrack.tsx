import { useScrollProgress } from "../hooks/useScrollProgress";

const COLORS = [
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a",
];

export function ProgressTrack() {
  const { progress } = useScrollProgress();
  const pct = progress * 100;
  const idx = Math.min(Math.floor(progress * COLORS.length), COLORS.length - 1);
  const color = COLORS[idx] || COLORS[0];

  return (
    <div className="progress-track" aria-hidden="true">
      <div
        className="progress-fill"
        style={{ height: pct + "%", background: color }}
      />
      <div
        className="progress-glow"
        style={{ top: pct + "%", background: color }}
      />
    </div>
  );
}
