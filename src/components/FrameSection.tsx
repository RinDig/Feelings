import React, { useRef } from "react";
import { useInView } from "../hooks/useInView";

interface FrameSectionProps {
  index: number;
  color: string;
  children?: React.ReactNode;
}

export function FrameSection({ index, color, children }: FrameSectionProps) {
  const { ref, isVisible } = useInView();
  const cardRef = useRef<HTMLDivElement>(null);
  const num = String(index + 1).padStart(2, "0");

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${y * -4}deg) rotateY(${x * 4}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = "rotateX(0) rotateY(0)";
    }
  };

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={`frame-${index}`}
      className={`frame-section${isVisible ? " visible" : ""}`}
      data-index={index}
    >
      <div className="frame-tilt" style={{ perspective: 1200 }}>
        <div
          ref={cardRef}
          className="frame-card"
          style={{ "--frame-accent": color } as React.CSSProperties}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="frame-badge">
            <span className="frame-badge-dot" style={{ background: color }} />
            {index + 1}
          </div>
          <img
            src={`${import.meta.env.BASE_URL}slides/slide-${num}.svg`}
            alt={`Storyboard frame ${index + 1}`}
            className="frame-img"
            draggable={false}
            loading={index < 3 ? "eager" : "lazy"}
          />
          <div className="frame-overlay" id={`overlay-${index}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
