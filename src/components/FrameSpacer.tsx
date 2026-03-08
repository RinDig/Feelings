import { useInView } from "../hooks/useInView";

export function FrameSpacer({ color }: { color: string }) {
  const { ref, isVisible } = useInView({ threshold: 0.3 });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`frame-spacer${isVisible ? " visible" : ""}`}
    >
      <div
        className="frame-spacer-line"
        style={{
          background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
        }}
      />
    </div>
  );
}
