/**
 * Remotion API compatibility layer for standalone React.
 *
 * Provides useCurrentFrame(), useVideoConfig(), spring(), and interpolate()
 * so that Character.tsx and SpeechBubble.tsx work unmodified.
 *
 * Instead of video frames, we use requestAnimationFrame with a frame counter.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// ---------- Frame context ----------
const FrameContext = createContext<number>(0);

/**
 * Wrap your app (or a section) in <AnimationProvider> to drive all
 * useCurrentFrame() calls with a shared requestAnimationFrame loop.
 */
export const AnimationProvider: React.FC<{ fps?: number; children: React.ReactNode }> = ({
  fps = 30,
  children,
}) => {
  const [frame, setFrame] = useState(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const elapsed = performance.now() - startTime.current;
      setFrame(Math.floor((elapsed / 1000) * fps));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps]);

  return <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>;
};

// ---------- Remotion drop-in replacements ----------

export function useCurrentFrame(): number {
  return useContext(FrameContext);
}

export function useVideoConfig() {
  return { fps: 30, width: 1280, height: 720, durationInFrames: Infinity };
}

/**
 * Attempt at a physics spring matching Remotion's spring().
 * Good enough for entrance animations and bounce effects.
 */
export function spring(opts: {
  frame: number;
  fps: number;
  from?: number;
  to?: number;
  config?: { damping?: number; stiffness?: number; mass?: number };
  delay?: number;
}): number {
  const { frame, fps, from = 0, to = 1, config = {}, delay = 0 } = opts;
  const { damping = 10, stiffness = 100, mass = 1 } = config;

  const elapsed = (frame - delay) / fps;
  if (elapsed <= 0) return from;

  // Critically-damped-ish spring approximation
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const range = to - from;

  let value: number;
  if (zeta >= 1) {
    // Overdamped
    value = to - range * Math.exp(-omega * elapsed) * (1 + omega * elapsed);
  } else {
    // Underdamped
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    value =
      to -
      range *
        Math.exp(-zeta * omega * elapsed) *
        (Math.cos(wd * elapsed) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * elapsed));
  }

  // Clamp to final value when settled
  if (Math.abs(value - to) < 0.001) return to;
  return value;
}

/**
 * Linear interpolation matching Remotion's interpolate().
 */
export function interpolate(
  input: number,
  inputRange: number[],
  outputRange: number[],
  options?: {
    extrapolateLeft?: "clamp" | "extend";
    extrapolateRight?: "clamp" | "extend";
  }
): number {
  const { extrapolateLeft = "extend", extrapolateRight = "extend" } = options || {};

  if (inputRange.length !== outputRange.length || inputRange.length < 2) {
    return outputRange[0] ?? 0;
  }

  // Clamp
  if (input <= inputRange[0]) {
    if (extrapolateLeft === "clamp") return outputRange[0];
  }
  if (input >= inputRange[inputRange.length - 1]) {
    if (extrapolateRight === "clamp") return outputRange[outputRange.length - 1];
  }

  // Find segment
  let i = 0;
  for (i = 0; i < inputRange.length - 1; i++) {
    if (input <= inputRange[i + 1]) break;
  }
  i = Math.min(i, inputRange.length - 2);

  const t = (input - inputRange[i]) / (inputRange[i + 1] - inputRange[i]);
  return outputRange[i] + t * (outputRange[i + 1] - outputRange[i]);
}
