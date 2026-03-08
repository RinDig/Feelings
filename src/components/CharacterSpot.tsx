/**
 * CharacterSpot — places an animated character on the page.
 *
 * Can be used:
 *  - Inside a FrameSection (as overlay on a slide)
 *  - Between frames (standalone character scene)
 *  - In the sidebar/margin of the page
 *
 * Wraps the Remotion-adapted Character component with positioning.
 */

import React from "react";
import { Character, type EmotionName } from "./Character";
import { AnimationProvider } from "../lib/remotion";
import { useInView } from "../hooks/useInView";

interface CharacterSpotProps {
  emotion: EmotionName;
  /** CSS position within parent: e.g. "20%" */
  left?: string;
  top?: string;
  right?: string;
  bottom?: string;
  /** Character scale (default 1) */
  scale?: number;
  /** Flip horizontally */
  flipX?: boolean;
  /** CSS width of the character container */
  width?: string;
  /** Position type */
  position?: "absolute" | "relative" | "fixed";
  /** z-index */
  zIndex?: number;
}

export function CharacterSpot({
  emotion,
  left,
  top,
  right,
  bottom,
  scale = 1,
  flipX: _flipX = false,
  width = "200px",
  position = "absolute",
  zIndex = 10,
}: CharacterSpotProps) {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{
        position,
        left, top, right, bottom,
        width,
        zIndex,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
        pointerEvents: "none",
      }}
    >
      {isVisible && (
        <AnimationProvider fps={30}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
            <Character
              emotion={emotion}
              x={160}
              y={280}
              scale={scale}
              enterDelay={0}
            />
          </div>
        </AnimationProvider>
      )}
    </div>
  );
}

/**
 * CharacterScene — a full-width section between frames
 * showing one or more animated characters with optional text.
 */
interface CharacterSceneProps {
  characters: Array<{
    emotion: EmotionName;
    x: number;
    y: number;
    scale?: number;
    flipX?: boolean;
  }>;
  children?: React.ReactNode;
  mood?: "hopeful" | "tense" | "somber" | "anxious" | "warm";
}

const MOOD_BG: Record<string, string> = {
  hopeful: "rgba(165,229,154,.04)",
  tense: "rgba(250,128,125,.04)",
  somber: "rgba(166,217,242,.04)",
  anxious: "rgba(255,217,189,.04)",
  warm: "rgba(232,227,67,.04)",
};

export function CharacterScene({ characters, children, mood }: CharacterSceneProps) {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`character-stage${isVisible ? " visible" : ""}`}
      style={{ background: mood ? MOOD_BG[mood] : undefined }}
    >
      {isVisible && (
        <AnimationProvider fps={30}>
          <div style={{ position: "relative", width: "100%", height: 350, maxWidth: 800, margin: "0 auto" }}>
            {characters.map((c, i) => (
              <Character
                key={i}
                emotion={c.emotion}
                x={c.x}
                y={c.y}
                scale={c.scale ?? 0.85}
                flipX={c.flipX}
                enterDelay={i * 10}
              />
            ))}
          </div>
        </AnimationProvider>
      )}
      {children && <div className="character-stage-content">{children}</div>}
    </section>
  );
}
