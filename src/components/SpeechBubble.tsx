import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "../lib/remotion";

export const SpeechBubble: React.FC<{
  text: string;
  x: number;
  y: number;
  delay: number;
  direction?: "left" | "right";
  color?: string;
  textColor?: string;
  maxWidth?: number;
  fontSize?: number;
}> = ({
  text,
  x,
  y,
  delay,
  direction = "left",
  color = "#ffffff",
  textColor = "#333333",
  maxWidth = 280,
  fontSize = 18,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleUp = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 120 },
    delay,
  });

  const fadeOut = interpolate(frame, [delay + 90, delay + 110], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(scaleUp, fadeOut);
  const floatY = Math.sin((frame - delay) * 0.06) * 3;

  if (opacity <= 0) return null;

  const bubbleHeight = 56;
  const tailX = direction === "left" ? 30 : maxWidth - 30;
  const tailPoints =
    direction === "left"
      ? `${tailX},${bubbleHeight} ${tailX - 12},${bubbleHeight + 20} ${tailX + 18},${bubbleHeight}`
      : `${tailX},${bubbleHeight} ${tailX + 12},${bubbleHeight + 20} ${tailX - 18},${bubbleHeight}`;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + floatY,
        opacity,
        transform: `scale(${scaleUp})`,
        transformOrigin: direction === "left" ? "bottom left" : "bottom right",
        pointerEvents: "none",
      }}
    >
      <svg width={maxWidth + 20} height={bubbleHeight + 30} viewBox={`0 0 ${maxWidth + 20} ${bubbleHeight + 30}`}>
        <rect
          x={2}
          y={2}
          width={maxWidth}
          height={bubbleHeight}
          rx={20}
          ry={20}
          fill={color}
          stroke="#e0e0e0"
          strokeWidth={1.5}
          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"
        />
        <polygon points={tailPoints} fill={color} stroke="#e0e0e0" strokeWidth={1} />
        {/* Cover the stroke where tail meets bubble */}
        <rect
          x={tailX - 18}
          y={bubbleHeight - 5}
          width={36}
          height={10}
          fill={color}
        />
        <text
          x={maxWidth / 2 + 2}
          y={bubbleHeight / 2 + 6}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize}
          fontFamily="'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif"
          fontWeight="bold"
        >
          {text}
        </text>
      </svg>
    </div>
  );
};
