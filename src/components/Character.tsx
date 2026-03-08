import React, { useMemo } from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "../lib/remotion";
import {
  characters as characterData,
  type PathData,
} from "../data/characterData";

export type EmotionName =
  | "joy"
  | "anger"
  | "sadness"
  | "fear"
  | "anxiety"
  | "surprised";

// Render order for proper z-layering
const RENDER_ORDER = [
  "orb",
  "head",
  "left eye",
  "right eye",
  "left iris",
  "right iris",
  "left eyebrow",
  "right eyebrow",
];

// Head colors for eyelid overlays (matches each character's head fill)
const HEAD_COLORS: Record<EmotionName, string> = {
  joy: "#a5e59a",
  anger: "#fa807d",
  sadness: "#a6d9f2",
  fear: "#e3c9ff",
  anxiety: "#ffd9bd",
  surprised: "#e8e343",
};

// Emotion-specific micro-animation profiles
// Each emotion has a distinct "feel" to how it moves
interface EmotionProfile {
  // Iris: how the eyes move
  irisSpeed: number;       // base speed multiplier
  irisAmplitudeX: number;  // horizontal range (viewBox units)
  irisAmplitudeY: number;  // vertical range
  irisPattern: "smooth" | "darting" | "jittery" | "heavy" | "scanning";
  irisBaseY: number;       // vertical offset (positive = looking down)

  // Blink
  blinkInterval: number;   // frames between blinks
  blinkSpeed: number;      // how fast the blink is (frames for full blink)

  // Eyebrows
  browBaseOffset: number;  // resting position offset (negative = furrowed)
  browAmplitude: number;   // how much they move
  browSpeed: number;       // movement speed

  // Body feel (orb/head micro-movement via <g> translate)
  bodyTrembleX: number;    // horizontal shake amplitude
  bodyTrembleY: number;    // vertical shake amplitude
  bodyTrembleSpeed: number;// shake frequency

  // Outer div personality
  squashAmount: number;    // squash-stretch intensity
  tiltAmount: number;      // how much it tilts side to side
  tiltSpeed: number;       // tilt frequency multiplier
}

const EMOTION_PROFILES: Record<EmotionName, EmotionProfile> = {
  joy: {
    // Warm, flowing, alive — like a deep contented breath
    irisSpeed: 0.025,
    irisAmplitudeX: 3.5,
    irisAmplitudeY: 2.5,
    irisPattern: "smooth",
    irisBaseY: 0,
    blinkInterval: 55,
    blinkSpeed: 12,
    browBaseOffset: -1.2,
    browAmplitude: 1.8,
    browSpeed: 0.025,
    bodyTrembleX: 0,
    bodyTrembleY: 0,
    bodyTrembleSpeed: 0,
    squashAmount: 0.05,
    tiltAmount: 3.5,
    tiltSpeed: 0.35,
  },
  fear: {
    // Hypervigilant, flinchy, can't stop scanning for danger
    irisSpeed: 0.12,
    irisAmplitudeX: 5.0,
    irisAmplitudeY: 3.5,
    irisPattern: "darting",
    irisBaseY: -0.8,
    blinkInterval: 28,
    blinkSpeed: 2,
    browBaseOffset: -2.5,
    browAmplitude: 2.5,
    browSpeed: 0.09,
    bodyTrembleX: 1.5,
    bodyTrembleY: 1.0,
    bodyTrembleSpeed: 0.6,
    squashAmount: 0.02,
    tiltAmount: 1.5,
    tiltSpeed: 1.0,
  },
  anger: {
    // Intense locked stare, slow throb, barely contained energy
    irisSpeed: 0.01,
    irisAmplitudeX: 1.5,
    irisAmplitudeY: 0.8,
    irisPattern: "heavy",
    irisBaseY: 0.8,
    blinkInterval: 150,
    blinkSpeed: 2,
    browBaseOffset: 2.5,
    browAmplitude: 0.8,
    browSpeed: 0.015,
    bodyTrembleX: 0.6,
    bodyTrembleY: 0.3,
    bodyTrembleSpeed: 0.2,
    squashAmount: 0.055,
    tiltAmount: 1.0,
    tiltSpeed: 0.7,
  },
  sadness: {
    // Heavy, drooping, eyes cast down and inward, barely enough energy to move
    irisSpeed: 0.006,
    irisAmplitudeX: 1.0,
    irisAmplitudeY: 0.8,
    irisPattern: "heavy",
    irisBaseY: 3.5,        // pushed DOWN hard — staring at the ground
    blinkInterval: 55,
    blinkSpeed: 8,
    browBaseOffset: -1.8,
    browAmplitude: 0.8,
    browSpeed: 0.01,
    bodyTrembleX: 0,
    bodyTrembleY: 0,
    bodyTrembleSpeed: 0,
    squashAmount: 0.012,
    tiltAmount: 0.6,
    tiltSpeed: 0.2,
  },
  anxiety: {
    // Can't sit still, everything is vibrating, eyes everywhere at once
    irisSpeed: 0.15,
    irisAmplitudeX: 4.5,
    irisAmplitudeY: 3.0,
    irisPattern: "jittery",
    irisBaseY: -0.5,
    blinkInterval: 22,
    blinkSpeed: 2,
    browBaseOffset: -1.5,
    browAmplitude: 3.0,
    browSpeed: 0.12,
    bodyTrembleX: 2.0,
    bodyTrembleY: 1.2,
    bodyTrembleSpeed: 0.7,
    squashAmount: 0.025,
    tiltAmount: 2.2,
    tiltSpeed: 1.5,
  },
  surprised: {
    // Deer in headlights — frozen alert, eyes locked wide, occasional startled flinch
    irisSpeed: 0.03,
    irisAmplitudeX: 2.0,       // tight range — mostly staring, not wandering
    irisAmplitudeY: 1.5,
    irisPattern: "scanning",
    irisBaseY: 0,              // centered — locked forward stare
    blinkInterval: 180,
    blinkSpeed: 2,
    browBaseOffset: -3.0,
    browAmplitude: 1.8,
    browSpeed: 0.05,
    bodyTrembleX: 0.2,
    bodyTrembleY: 0.3,
    bodyTrembleSpeed: 0.15,
    squashAmount: 0.04,        // less wobbly squash
    tiltAmount: 1.0,           // much less tilt — frozen stiff, not goofy
    tiltSpeed: 0.3,
  },
};

// Convert CSS style string to React style object
function parseStyle(styleStr: string): React.CSSProperties {
  const style: Record<string, string> = {};
  styleStr.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camelKey] = value;
    }
  });
  return style as React.CSSProperties;
}

export const Character: React.FC<{
  emotion: EmotionName;
  x: number;
  y: number;
  scale?: number;
  enterDelay?: number;
  bobSpeed?: number;
  bobAmount?: number;
  swayAmount?: number;
  flipX?: boolean;
  isTalking?: boolean;
  talkStart?: number;
  talkDuration?: number;
  sceneFrame?: number;
}> = ({
  emotion,
  x,
  y,
  scale = 1,
  enterDelay = 0,
  bobSpeed = 0.06,
  bobAmount = 8,
  swayAmount = 2,
  flipX = false,
  isTalking = false,
  talkStart = 0,
  talkDuration = 30,
  sceneFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const data = characterData[emotion];
  if (!data) return null;

  const profile = EMOTION_PROFILES[emotion];

  // Sort paths by render order
  const orderedPaths = useMemo(() => {
    const sorted: PathData[] = [];
    for (const label of RENDER_ORDER) {
      const found = data.paths.filter((p) => p.label === label);
      sorted.push(...found);
    }
    for (const p of data.paths) {
      if (!RENDER_ORDER.includes(p.label)) {
        sorted.push(p);
      }
    }
    return sorted;
  }, [data.paths]);

  // Bounce-in entrance
  const enterProgress = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 8 },
    delay: enterDelay,
  });

  const localFrame = Math.max(0, frame - enterDelay);

  // Idle bobbing - emotion shapes the movement
  let bob = Math.sin(localFrame * bobSpeed) * bobAmount;
  let sway = Math.sin(localFrame * bobSpeed * 0.7) * swayAmount;

  if (emotion === "sadness") {
    // Sadness: slow sinking drift + periodic deep SIGH (rise then heavy drop)
    const baseBob = Math.sin(localFrame * bobSpeed * 0.6) * bobAmount * 0.5 + 3;
    // Sigh: slow rise (inhale) then heavy drop (exhale) every ~110 frames
    const sighCycle = localFrame % 110;
    let sighBob = 0;
    if (sighCycle >= 70 && sighCycle < 110) {
      const sighProgress = (sighCycle - 70) / 40;
      if (sighProgress < 0.3) {
        // Slow rise (inhale) — barely has energy
        sighBob = -interpolate(sighProgress, [0, 0.3], [0, 8]);
      } else {
        // Heavy drop (exhale) — gravity wins
        sighBob = -interpolate(sighProgress, [0.3, 0.6, 1.0], [8, -2, 0]);
      }
    }
    bob = baseBob + sighBob;
    sway = Math.sin(localFrame * bobSpeed * 0.4) * swayAmount * 0.4;
  } else if (emotion === "fear") {
    // Fear: hunched small bob + periodic freeze-then-flinch
    const baseBob = Math.sin(localFrame * bobSpeed * 0.8) * bobAmount * 0.6 + 1;
    // Flinch: freeze, compress, then JUMP every ~90 frames
    const flinchCycle = localFrame % 90;
    let flinchBob = 0;
    if (flinchCycle >= 76 && flinchCycle < 88) {
      if (flinchCycle < 80) {
        // Freeze — stop bobbing, compress downward (anticipation)
        flinchBob = interpolate(flinchCycle, [76, 80], [0, 4]);
      } else if (flinchCycle < 83) {
        // JUMP — snap upward
        flinchBob = interpolate(flinchCycle, [80, 81, 83], [4, -12, -8]);
      } else {
        // Settle back trembling
        flinchBob = interpolate(flinchCycle, [83, 88], [-8, 0]);
      }
    }
    bob = baseBob + flinchBob;
    // Retreating sway — drifts backward/away
    sway = Math.sin(localFrame * bobSpeed * 0.9) * swayAmount * 0.7;
  } else if (emotion === "anger") {
    // Anger: slow heavy bob + periodic SWELL (puff up) + forward lunge
    const baseBob = Math.sin(localFrame * bobSpeed * 0.7) * bobAmount * 0.4;
    // Pressure swell: slowly puffs up, releases
    const swellCycle = (localFrame * 0.008) % 1;
    const swell = swellCycle < 0.7 ? swellCycle / 0.7 : 1 - (swellCycle - 0.7) / 0.3;
    // Forward aggressive lunge every ~120 frames
    const lungeCycle = localFrame % 120;
    let lungeBob = 0;
    if (lungeCycle >= 95 && lungeCycle < 108) {
      if (lungeCycle < 98) {
        lungeBob = interpolate(lungeCycle, [95, 98], [0, 3]); // pull back (wind-up)
      } else if (lungeCycle < 101) {
        lungeBob = interpolate(lungeCycle, [98, 100, 101], [3, -6, -4]); // LUNGE forward
      } else {
        lungeBob = interpolate(lungeCycle, [101, 108], [-4, 0]); // settle
      }
    }
    bob = baseBob - swell * 3 + lungeBob; // swell lifts character up
    sway = Math.sin(localFrame * bobSpeed * 0.5) * swayAmount * 0.5;
  } else if (emotion === "surprised") {
    // Surprised: mostly frozen still, tiny float, with sharp startled jump
    const baseBob = Math.sin(localFrame * bobSpeed * 0.4) * bobAmount * 0.3; // very subtle float
    // Startled jump: sharp upward snap every ~60 frames
    const joltCycle = localFrame % 60;
    let joltBob = 0;
    if (joltCycle < 6) {
      if (joltCycle < 1) {
        joltBob = -16; // SNAP up in 1 frame
      } else {
        joltBob = interpolate(joltCycle, [1, 6], [-16, 0]); // settle back
      }
    }
    bob = baseBob + joltBob;
    sway = Math.sin(localFrame * bobSpeed * 0.3) * swayAmount * 0.3; // barely sways
  } else if (emotion === "joy") {
    // Joy: buoyant bouncy bob with extra lift + forward lean
    bob = Math.sin(localFrame * bobSpeed * 1.1) * bobAmount * 1.2 +
      Math.sin(localFrame * bobSpeed * 2.1) * 2;
    // Wide generous sway — joy takes up space
    sway = Math.sin(localFrame * bobSpeed * 0.6) * swayAmount * 1.4 +
      Math.sin(localFrame * bobSpeed * 1.3) * swayAmount * 0.3;
  } else if (emotion === "anxiety") {
    // Anxiety: erratic bob — can't find a comfortable rhythm
    bob = Math.sin(localFrame * bobSpeed * 1.3) * bobAmount * 0.8 +
      Math.sin(localFrame * 0.17) * 3;
    sway = Math.sin(localFrame * bobSpeed * 0.9) * swayAmount +
      Math.sin(localFrame * 0.23) * swayAmount * 0.5;
  }

  // Tilt — each emotion has a distinct posture/lean
  const baseTilt = Math.sin(localFrame * bobSpeed * profile.tiltSpeed) * profile.tiltAmount;
  let emotionLean = 0;
  if (emotion === "joy") {
    // Joy: forward lean — engaged, approaching, warm
    emotionLean = 2.0 + Math.sin(localFrame * 0.02) * 0.8;
  } else if (emotion === "anger") {
    // Anger: head tilted DOWN — menacing "bull" stance, looking up from under brows
    emotionLean = -2.5 + Math.sin(localFrame * 0.015) * 0.5;
    // Extra forward dip during lunge
    const lungeCycle = localFrame % 120;
    if (lungeCycle >= 98 && lungeCycle < 105) {
      emotionLean -= 4;
    }
  } else if (emotion === "sadness") {
    // Sadness: drooping tilt — head hangs to one side, barely holds up
    emotionLean = 3.0 + Math.sin(localFrame * 0.008) * 1.5;
  } else if (emotion === "fear") {
    // Fear: leans AWAY — retreating posture, shrinking back
    emotionLean = -1.5 + Math.sin(localFrame * 0.03) * 0.5;
    // Snaps back during flinch
    const flinchCycle = localFrame % 90;
    if (flinchCycle >= 80 && flinchCycle < 85) {
      emotionLean = -5; // jerk backward
    }
  }
  const tilt = baseTilt + emotionLean;

  // Squash and stretch - emotion-specific intensity and character
  let squash = Math.sin(localFrame * bobSpeed);
  let scaleY = 1 + squash * profile.squashAmount;
  let scaleX = 1 - squash * profile.squashAmount * 0.7;

  if (emotion === "anger") {
    // Anger: slow SWELL — puffs up with pressure, like inflating
    const swellCycle = (localFrame * 0.008) % 1;
    const swell = swellCycle < 0.7 ? swellCycle / 0.7 : 1 - (swellCycle - 0.7) / 0.3;
    scaleX = 1 + swell * 0.06;  // widens when swelling
    scaleY = 1 + swell * 0.04;  // grows taller too
    // Lunge squash
    const lungeCycle = localFrame % 120;
    if (lungeCycle >= 98 && lungeCycle < 103) {
      scaleX = 1 + 0.08; // stretches forward
      scaleY = 1 - 0.04; // compresses vertically
    }
  } else if (emotion === "fear") {
    // Fear: periodic SHRINK — tries to make itself smaller
    const shrinkCycle = localFrame % 90;
    let shrinkAmount = 0;
    if (shrinkCycle >= 76 && shrinkCycle < 88) {
      if (shrinkCycle < 80) {
        // Compress down (anticipation/cowering)
        shrinkAmount = interpolate(shrinkCycle, [76, 80], [0, 0.08]);
      } else if (shrinkCycle < 83) {
        // Stretch up on flinch
        shrinkAmount = interpolate(shrinkCycle, [80, 83], [0.08, -0.06]);
      } else {
        shrinkAmount = interpolate(shrinkCycle, [83, 88], [-0.06, 0]);
      }
    }
    scaleY = 1 + squash * profile.squashAmount - shrinkAmount;
    scaleX = 1 - squash * profile.squashAmount * 0.7 + shrinkAmount * 0.5;
  } else if (emotion === "sadness") {
    // Sadness: compressed/heavy — squashed down like gravity is winning
    const heavySquash = 0.03 + Math.sin(localFrame * 0.01) * 0.01;
    scaleY = 1 - heavySquash; // perpetually slightly squashed
    scaleX = 1 + heavySquash * 0.5; // wider from being squished
    // Sigh stretch: rises during inhale, compresses on exhale
    const sighCycle = localFrame % 110;
    if (sighCycle >= 70 && sighCycle < 110) {
      const sighProgress = (sighCycle - 70) / 40;
      if (sighProgress < 0.3) {
        // Inhale: stretch up slightly
        const stretch = interpolate(sighProgress, [0, 0.3], [0, 0.04]);
        scaleY += stretch;
        scaleX -= stretch * 0.5;
      } else if (sighProgress < 0.6) {
        // Exhale: compress back down heavily
        const compress = interpolate(sighProgress, [0.3, 0.6], [0.04, -0.03]);
        scaleY += compress;
        scaleX -= compress * 0.5;
      }
    }
  } else if (emotion === "surprised") {
    // Surprised: subtle body pulse, eyes do the heavy lifting
    const breathPulse = Math.sin(localFrame * 0.05) * 0.03;
    scaleY = 1 + breathPulse;
    scaleX = 1 - breathPulse * 0.4;
    // Startled jolt stretch
    const joltCycle = localFrame % 60;
    if (joltCycle < 4) {
      if (joltCycle < 1) {
        scaleY += 0.08;
        scaleX -= 0.05;
      } else {
        const settle = interpolate(joltCycle, [1, 4], [0.08, 0]);
        scaleY += settle;
        scaleX -= settle * 0.6;
      }
    }
  }

  // Talking hop — joy gets extra bouncy, more hops, higher energy
  let hopAmount = 0;
  if (isTalking && frame >= talkStart && frame <= talkStart + talkDuration) {
    const talkFrame = frame - talkStart;
    const hopProgress = talkFrame / talkDuration;
    if (emotion === "joy") {
      // More hops (4 vs 3), higher peak, slower decay — can't contain the excitement
      hopAmount =
        Math.abs(Math.sin(hopProgress * Math.PI * 4)) *
        (1 - hopProgress * 0.6) *
        -22;
    } else {
      hopAmount =
        Math.abs(Math.sin(hopProgress * Math.PI * 3)) *
        (1 - hopProgress) *
        -15;
    }
  }

  // === EMOTION-SPECIFIC IRIS MOVEMENT ===
  const eyePhase = localFrame * profile.irisSpeed + (flipX ? Math.PI : 0);
  let irisOffsetX = 0;
  let irisOffsetY = profile.irisBaseY;

  switch (profile.irisPattern) {
    case "smooth":
      // Joy: warm figure-8 wandering with "look at you" eye contact moments
      {
        const fig8X = Math.sin(eyePhase) * profile.irisAmplitudeX;
        const fig8Y = Math.sin(eyePhase * 2) * profile.irisAmplitudeY * 0.5;
        // Occasional upward glance (hopeful/optimistic)
        const hopefulLift = Math.sin(localFrame * 0.008) > 0.85 ? -2.0 : 0;
        // "Look at you" moments — irises center and hold, like making warm eye contact
        // Happens ~every 120 frames, holds for ~20 frames
        const contactCycle = localFrame % 120;
        const isEyeContact = contactCycle >= 50 && contactCycle < 70;
        if (isEyeContact) {
          // Smooth ease to center (not a snap — gentle intention)
          const contactProgress = (contactCycle - 50) / 20;
          const easeIn = contactProgress < 0.2 ? contactProgress / 0.2 : 1;
          const easeOut = contactProgress > 0.8 ? (1 - contactProgress) / 0.2 : 1;
          const contactStrength = Math.min(easeIn, easeOut);
          // Blend from wandering to center (0,0)
          irisOffsetX = fig8X * (1 - contactStrength);
          irisOffsetY += fig8Y * (1 - contactStrength) + hopefulLift;
        } else {
          irisOffsetX = fig8X;
          irisOffsetY += fig8Y + hopefulLift;
        }
      }
      break;
    case "darting":
      // Fear: snaps to a position, HOLDS frozen, then panics to a new spot
      // With occasional full-body flinch (eyes slam shut + snap to corner)
      {
        // Create irregular hold-and-snap pattern using stepped noise
        const holdDuration = 12; // frames to hold one position
        const dartIndex = Math.floor(localFrame / holdDuration);
        // Pseudo-random positions from dart index
        const angles = [0, 2.4, 4.8, 1.2, 3.6, 5.5, 0.8, 4.0];
        const angle = angles[dartIndex % angles.length];
        const targetX = Math.cos(angle) * profile.irisAmplitudeX;
        const targetY = Math.sin(angle) * profile.irisAmplitudeY;
        // Sharp snap transition (first 2 frames of each hold)
        const snapProgress = Math.min((localFrame % holdDuration) / 2, 1);
        const prevAngle = angles[(dartIndex - 1 + angles.length) % angles.length];
        const prevX = Math.cos(prevAngle) * profile.irisAmplitudeX;
        const prevY = Math.sin(prevAngle) * profile.irisAmplitudeY;
        irisOffsetX = prevX + (targetX - prevX) * snapProgress;
        irisOffsetY += prevY + (targetY - prevY) * snapProgress;
        // Flinch moments — eyes slam to bottom-corner
        const flinchCycle = localFrame % 90;
        if (flinchCycle > 82 && flinchCycle < 88) {
          irisOffsetX = (flipX ? 1 : -1) * profile.irisAmplitudeX * 0.8;
          irisOffsetY = profile.irisAmplitudeY * 1.2;
        }
      }
      break;
    case "jittery":
      // Anxiety: three layers — slow nervous scan + medium wobble + fast micro-twitch
      {
        // Layer 1: slow nervous scanning
        const scan = Math.sin(eyePhase * 0.3) * profile.irisAmplitudeX * 0.7;
        // Layer 2: medium irregular wobble
        const wobbleX = Math.sin(localFrame * 0.18 + 2.5) * 1.5;
        const wobbleY = Math.cos(localFrame * 0.22 + 1.3) * 1.2;
        // Layer 3: fast micro-twitch (almost vibrating)
        const twitchX = Math.sin(localFrame * 0.9) * 0.6 + Math.sin(localFrame * 1.3) * 0.4;
        const twitchY = Math.cos(localFrame * 1.1) * 0.5;
        irisOffsetX = scan + wobbleX + twitchX;
        irisOffsetY += Math.cos(eyePhase * 0.2) * profile.irisAmplitudeY * 0.5 + wobbleY + twitchY;
      }
      break;
    case "heavy":
      // Sadness: eyes drift down slowly, occasionally try to look up but fall back
      // Anger: locked forward stare with slow pressure-build side glances
      {
        if (emotion === "sadness") {
          // Gravitational pull downward + inward — avoiding eye contact, staring at ground
          const drift = Math.sin(eyePhase) * profile.irisAmplitudeX * 0.6;
          // Irises pulled harder inward (toward nose) — looking down and in
          const inwardPull = flipX ? -1.8 : 1.8;
          const upAttempt = Math.sin(localFrame * 0.015);
          // Occasionally tries to look up (brief lift) then sinks back heavier
          const liftAttempt = upAttempt > 0.9 ? -2.5 * (upAttempt - 0.9) * 10 : 0;
          irisOffsetX = drift + inwardPull;
          irisOffsetY += profile.irisAmplitudeY * 1.2 + liftAttempt;
        } else {
          // Anger: intense forward stare, slow menacing side-glance
          const stareBreak = Math.sin(localFrame * 0.012);
          // Mostly locked center, occasional slow threatening look to one side
          const sideGlance = stareBreak > 0.8
            ? (stareBreak - 0.8) * 5 * profile.irisAmplitudeX * 2
            : stareBreak < -0.8
              ? (stareBreak + 0.8) * 5 * profile.irisAmplitudeX * 2
              : 0;
          irisOffsetX = sideGlance;
          irisOffsetY += Math.sin(eyePhase * 0.3) * profile.irisAmplitudeY * 0.3;
        }
      }
      break;
    case "scanning":
      // Surprised: BIG dramatic iris snaps — eyes darting around in shock
      {
        // Between snaps: slight nervous drift (not locked still)
        const nervousDrift = Math.sin(eyePhase * 1.5) * 1.0;
        const nervousVert = Math.sin(eyePhase * 0.8 + 1) * 0.8;
        irisOffsetX = nervousDrift;
        irisOffsetY += nervousVert;

        // SNAP to a direction every ~35 frames — frequent and dramatic
        const snapCycle = localFrame % 35;
        const directions = [
          [4.0, -2.0],   // snap upper-right
          [-3.5, -1.5],  // snap upper-left
          [3.0, 2.0],    // snap lower-right
          [-4.0, 0],     // snap hard left
          [0, -3.0],     // snap straight up
          [2.5, 1.5],    // snap lower-right
        ];
        const dir = directions[Math.floor(localFrame / 35) % directions.length];
        if (snapCycle < 10) {
          if (snapCycle < 1) {
            // INSTANT snap
            irisOffsetX = dir[0];
            irisOffsetY = dir[1];
          } else if (snapCycle < 6) {
            // Hold frozen — staring at the thing
            irisOffsetX = dir[0];
            irisOffsetY = dir[1];
          } else {
            // Ease back
            const easeBack = (snapCycle - 6) / 4;
            irisOffsetX = dir[0] * (1 - easeBack) + nervousDrift * easeBack;
            irisOffsetY = dir[1] * (1 - easeBack) + nervousVert * easeBack;
          }
        }
      }
      break;
  }

  // === EMOTION-SPECIFIC BLINK + EYELID ===
  let blinkOpacity = 1;
  let topLidClose = 0;    // 0 = open, 1 = fully closed
  let bottomLidClose = 0; // 0 = open, 1 = fully closed (Joy smile-squint)
  if (emotion === "anxiety") {
    // Anxiety: rapid double-blink + permanent uneven partial squint
    // Always slightly squinting — can't fully relax the eyes
    const baseSquint = 0.12 + Math.sin(localFrame * 0.08) * 0.05;
    topLidClose = baseSquint;
    // Double-blink pattern
    const doubleCycle = localFrame % profile.blinkInterval;
    const b = profile.blinkSpeed;
    if (doubleCycle < b) {
      topLidClose = interpolate(doubleCycle, [0, b / 2, b], [baseSquint, 1, baseSquint]);
    } else if (doubleCycle >= b + 3 && doubleCycle < b * 2 + 3) {
      const t = doubleCycle - b - 3;
      topLidClose = interpolate(t, [0, b / 2, b], [baseSquint, 1, baseSquint]);
    }
    // Occasional stress-squint — eyes tighten like wincing
    const stressCycle = localFrame % 65;
    if (stressCycle >= 50 && stressCycle < 60) {
      const stressAmount = Math.sin(((stressCycle - 50) / 10) * Math.PI);
      topLidClose = Math.max(topLidClose, 0.35 * stressAmount);
      bottomLidClose = 0.25 * stressAmount;
    }
  } else if (emotion === "fear") {
    // Fear: eyes WIDE OPEN (hypervigilant) with terror-squeeze on flinches
    // Default: eyes forced wide — no resting eyelid at all
    topLidClose = 0;
    bottomLidClose = 0;
    // Rapid flutter-blinks (barely closing — fighting to keep eyes open)
    const blinkCycle = localFrame % profile.blinkInterval;
    const b = profile.blinkSpeed;
    if (blinkCycle < b) {
      // Only closes ~60% — can't fully shut, too scared to stop watching
      topLidClose = interpolate(blinkCycle, [0, b / 2, b], [0, 0.6, 0]);
    }
    // Terror squeeze-shut on flinch — eyes slam closed HARD
    const squeezeCycle = localFrame % 90;
    if (squeezeCycle > 80 && squeezeCycle < 88) {
      // Anticipation: freeze at 80, then SLAM at 82
      if (squeezeCycle < 82) {
        topLidClose = 0.1; // slight tense before slam
      } else {
        topLidClose = interpolate(squeezeCycle, [82, 83, 86, 88], [0.1, 1, 1, 0]);
        bottomLidClose = interpolate(squeezeCycle, [82, 83, 86, 88], [0, 0.7, 0.7, 0]);
      }
    }
  } else if (emotion === "sadness") {
    // Sadness: heavy drooping eyelids + bottom lid pushed up (welling up with tears)
    // Top droop = tired/defeated, bottom push = changes eye shape to look sadder
    const topHeaviness = 0.25 + Math.sin(localFrame * 0.01) * 0.05;
    topLidClose = topHeaviness;
    bottomLidClose = 0.15; // bottom lid pushed UP noticeably — narrows eye from below

    // Slow heavy blinks — closes easily, struggles to reopen
    const blinkCycle = localFrame % profile.blinkInterval;
    const b = profile.blinkSpeed;
    if (blinkCycle < b) {
      const blinkProgress = blinkCycle < b * 0.15
        ? interpolate(blinkCycle, [0, b * 0.15], [topHeaviness, 1])
        : interpolate(blinkCycle, [b * 0.15, b], [1, topHeaviness]);
      topLidClose = blinkProgress;
      bottomLidClose = Math.max(0.15, (blinkProgress - topHeaviness) * 0.2);
    }

    // "Welling up" moments — bottom lid pushes up MORE, like tears pooling
    const sighCycle = localFrame % 110;
    if (sighCycle >= 80 && sighCycle < 100) {
      const sighProgress = (sighCycle - 80) / 20;
      const sighWeight = Math.sin(sighProgress * Math.PI);
      topLidClose = Math.max(topLidClose, topHeaviness + sighWeight * 0.25);
      bottomLidClose = Math.max(bottomLidClose, 0.15 + sighWeight * 0.2);
    }

    // Occasional near-shut — eyes almost close, like giving up
    const shutCycle = localFrame % 180;
    if (shutCycle >= 160 && shutCycle < 175) {
      const shutProgress = (shutCycle - 160) / 15;
      const shutAmount = Math.sin(shutProgress * Math.PI);
      topLidClose = Math.max(topLidClose, topHeaviness + shutAmount * 0.55);
      bottomLidClose = Math.max(bottomLidClose, 0.15 + shutAmount * 0.25);
    }
  } else if (emotion === "anger") {
    // Anger: MENACING permanent squint — eyes narrowed, intense, threatening
    const baseSquint = 0.3; // always narrowed
    const pressureBuild = Math.sin(localFrame * 0.015);
    // Squint tightens as pressure builds
    topLidClose = baseSquint + (pressureBuild > 0 ? pressureBuild * 0.15 : 0);
    bottomLidClose = 0.2 + (pressureBuild > 0 ? pressureBuild * 0.1 : 0);
    // Rare hard blinks — like containing rage
    const blinkCycle = localFrame % profile.blinkInterval;
    const b = profile.blinkSpeed;
    if (blinkCycle < b) {
      topLidClose = interpolate(blinkCycle, [0, 1, b], [topLidClose, 1, topLidClose]);
    }
    // Rage flare — eyes suddenly OPEN WIDE (breaking the squint) then snap back
    const flareCycle = localFrame % 120;
    if (flareCycle >= 100 && flareCycle < 106) {
      const flareProgress = (flareCycle - 100) / 6;
      const flare = Math.sin(flareProgress * Math.PI);
      topLidClose = baseSquint * (1 - flare * 0.8); // eyes open up threateningly
      bottomLidClose = 0.2 * (1 - flare * 0.8);
    }
  } else if (emotion === "surprised") {
    // Surprised: eyes wide open, smooth organic blinks, no flashy snaps
    topLidClose = 0;
    bottomLidClose = 0;

    // Smooth blink every ~90 frames once eyes are big
    if (localFrame >= 30) {
      const blinkCycle = (localFrame - 30) % 90;
      if (blinkCycle < 8) {
        if (blinkCycle < 3) {
          topLidClose = interpolate(blinkCycle, [0, 3], [0, 0.85]);
        } else if (blinkCycle < 4) {
          topLidClose = 0.85;
        } else {
          topLidClose = interpolate(blinkCycle, [4, 8], [0.85, 0]);
        }
      }
    }
  } else if (emotion === "joy") {
    // Joy: EYELID-BASED cat-blinks + visible happy squint
    // Cat blink: eyelids close and open slowly — contentment signal
    const blinkCycle = localFrame % profile.blinkInterval;
    const b = profile.blinkSpeed;
    if (blinkCycle < b) {
      // Slow close, linger, slow open
      const blinkProgress = blinkCycle < b * 0.4
        ? interpolate(blinkCycle, [0, b * 0.4], [0, 1])
        : blinkCycle < b * 0.6
          ? 1 // lingering closed — the "I feel safe" hold
          : interpolate(blinkCycle, [b * 0.6, b], [1, 0]);
      topLidClose = blinkProgress;
      bottomLidClose = blinkProgress * 0.5; // bottom lid closes less during blinks
    }
    // "Happy squint" — eyelids physically narrow the eye during bob peaks
    // Slower trigger so it lingers visibly; bottom lid pushes UP more (smile)
    const squintTrigger = Math.sin(localFrame * bobSpeed * 0.7);
    if (squintTrigger > 0.5 && topLidClose < 0.05) {
      const squintAmount = (squintTrigger - 0.5) / 0.5; // 0 to 1, wider range = longer
      topLidClose = squintAmount * 0.35;     // top lid comes down a bit
      bottomLidClose = squintAmount * 0.55;  // bottom lid pushes up MORE (smile!)
    }
    // During "look at you" eye contact moments, warm visible squint (longer hold)
    const contactCycle = localFrame % 120;
    if (contactCycle >= 50 && contactCycle < 72 && topLidClose < 0.05) {
      const contactProgress = (contactCycle - 50) / 22;
      const contactIntensity = Math.sin(contactProgress * Math.PI); // smooth in-out
      topLidClose = 0.3 * contactIntensity;
      bottomLidClose = 0.45 * contactIntensity;
    }
  } else {
    // Standard blink
    const blinkCycle = localFrame % profile.blinkInterval;
    const halfBlink = profile.blinkSpeed / 2;
    blinkOpacity =
      blinkCycle < profile.blinkSpeed
        ? interpolate(blinkCycle, [0, halfBlink, profile.blinkSpeed], [1, 0, 1])
        : 1;
  }

  // Fallback: convert opacity-based blink to eyelid for any emotion still using blinkOpacity
  if (topLidClose === 0 && blinkOpacity < 1) {
    topLidClose = 1 - blinkOpacity;
  }

  // === EMOTION-SPECIFIC EYEBROWS (independent left/right) ===
  // leftBrow/rightBrow: { x, y } offsets — positive x = outward, positive y = down
  let leftBrowX = 0;
  let leftBrowY = profile.browBaseOffset;
  let rightBrowX = 0;
  let rightBrowY = profile.browBaseOffset;

  if (emotion === "anger") {
    // Anger: HARD furrowed V-shape — inner edges pushed DOWN and INWARD
    // Creates that classic angry scowl. Periodic pressure-build that intensifies.
    const pressureCycle = (localFrame * 0.015) % 1;
    const pressureIntensity = pressureCycle < 0.7
      ? pressureCycle / 0.7
      : 1 - (pressureCycle - 0.7) / 0.3;
    // Base furrow: pushed down hard (positive Y) and squeezed inward
    const furrowY = 3.5 + pressureIntensity * 1.5;
    const furrowInward = 2.0 + pressureIntensity * 0.8;
    // Angry twitch — sudden extra clench
    const twitch = Math.sin(localFrame * 0.3) > 0.92 ? 1.5 : 0;
    // Asymmetric micro-twitch: one brow twitches harder during rage spikes
    const ragSpike = Math.sin(localFrame * 0.08) > 0.9;
    leftBrowY = furrowY + twitch + (ragSpike ? 0.8 : 0);
    rightBrowY = furrowY + twitch + (ragSpike ? 0 : 0.3);
    leftBrowX = furrowInward;   // left brow pushes right (inward)
    rightBrowX = -furrowInward; // right brow pushes left (inward)
  } else if (emotion === "fear") {
    // Fear: brows shot UP high and pinched together — classic worried/terrified look
    // Flutter rapidly like they can't decide how scared to be
    const baseRaise = -4.0; // way up
    const flutter = Math.sin(localFrame * 0.15) * 0.8 +
      Math.sin(localFrame * 0.37) * 0.5; // multi-freq flutter
    // Inner edges pinch UP higher than outer (inverted V = worried shape)
    const worriedPinch = Math.sin(localFrame * 0.05) * 0.3;
    leftBrowY = baseRaise + flutter - worriedPinch;
    rightBrowY = baseRaise + flutter + worriedPinch;
    // Slight inward pinch (concerned look)
    leftBrowX = 0.8;
    rightBrowX = -0.8;
    // Flinch moments — brows slam together and up
    const flinchCycle = localFrame % 90;
    if (flinchCycle > 82 && flinchCycle < 88) {
      leftBrowY = -5.5;
      rightBrowY = -5.5;
      leftBrowX = 1.5;
      rightBrowX = -1.5;
    }
  } else if (emotion === "sadness") {
    // Sadness: DRAMATIC bent brows — inner edges angled UP high, pushed hard inward
    // Creates a strong inverted-V "pleading / about to cry" shape
    const heavySway = Math.sin(localFrame * 0.008) * 0.2;
    // Inner lift even stronger — the bent angle is the #1 sad expression cue
    const innerLift = -5.5 + heavySway;
    // Very slow occasional deeper droop, like a sigh
    const sighCycle = Math.sin(localFrame * 0.012);
    const sighDrop = sighCycle > 0.85 ? (sighCycle - 0.85) * 6 : 0;
    leftBrowY = innerLift + sighDrop;
    rightBrowY = innerLift + sighDrop;
    // Pushed HARD inward — creates the steep bent angle
    leftBrowX = 2.5;   // left brow inner edge pushes right (toward center)
    rightBrowX = -2.5;  // right brow inner edge pushes left (toward center)
    // Occasional asymmetric quiver — one side trembles like holding back tears
    const quiverCycle = localFrame % 120;
    if (quiverCycle > 100 && quiverCycle < 115) {
      leftBrowY += Math.sin(quiverCycle * 0.8) * 0.8;
    }
    // Occasional deeper sag — brows fall even more, giving up
    const sagCycle = localFrame % 180;
    if (sagCycle >= 150 && sagCycle < 170) {
      const sagProgress = Math.sin(((sagCycle - 150) / 20) * Math.PI);
      leftBrowY += sagProgress * 1.5;
      rightBrowY += sagProgress * 1.5;
    }
  } else if (emotion === "anxiety") {
    // Anxiety: can't settle — one brow higher than the other, constantly shifting
    // Perpetually uneven, restless, slightly raised overall
    const baseRaise = -1.8;
    // Two different speeds for left/right = they never quite sync
    const leftWave = Math.sin(localFrame * 0.09 + 0.5) * 1.8;
    const rightWave = Math.sin(localFrame * 0.13 + 2.1) * 1.6;
    // Fast micro-twitches layered on top
    const leftTwitch = Math.sin(localFrame * 0.4) * 0.4 + Math.sin(localFrame * 0.7) * 0.3;
    const rightTwitch = Math.sin(localFrame * 0.5 + 1) * 0.4 + Math.sin(localFrame * 0.65) * 0.3;
    leftBrowY = baseRaise + leftWave + leftTwitch;
    rightBrowY = baseRaise + rightWave + rightTwitch;
    // Inward/outward fidgeting
    leftBrowX = Math.sin(localFrame * 0.11) * 0.7;
    rightBrowX = Math.sin(localFrame * 0.14 + 1.5) * -0.7;
  } else if (emotion === "surprised") {
    // Surprised: brows ARCHED high — inner edges raised, creating "oh!" shape
    const baseRaise = -5.5; // way up, locked high
    // Very subtle tension tremor
    const tensionTremor = Math.sin(localFrame * 0.3) * 0.15;
    leftBrowY = baseRaise + tensionTremor;
    rightBrowY = baseRaise + tensionTremor;
    // Inner edges pushed INWARD and UP — creates arched "oh!" shape (not flat spread)
    leftBrowX = 1.0;   // left brow inner edge toward center
    rightBrowX = -1.0;  // right brow inner edge toward center
    // Brows react with the iris snaps — lift on each snap
    const snapBrowCycle = localFrame % 35;
    if (snapBrowCycle < 3) {
      leftBrowY -= 1.5;
      rightBrowY -= 1.5;
    }
    // On startled jolt: brows snap even HIGHER momentarily
    const joltCycle = localFrame % 60;
    if (joltCycle < 5) {
      const joltLift = joltCycle < 1 ? -2.0 : interpolate(joltCycle, [1, 5], [-2.0, 0]);
      leftBrowY += joltLift;
      rightBrowY += joltLift;
    }
  } else if (emotion === "joy") {
    // Joy: BIG expressive brows — high base, dramatic pops, playful wiggles
    const baseRaise = -4.0; // way up — looks bright and eager
    const gentleWave = Math.sin(localFrame * 0.03 + 1) * 0.6;
    leftBrowY = baseRaise + gentleWave;
    rightBrowY = baseRaise + gentleWave;

    // BIG eyebrow "pop" — snaps up HARD then settles, every ~50 frames
    const popCycle = localFrame % 50;
    if (popCycle < 10) {
      const popUp = popCycle < 2
        ? interpolate(popCycle, [0, 2], [0, -5.0])    // SNAP up in 2 frames
        : interpolate(popCycle, [2, 10], [-5.0, 0]);   // ease back down
      leftBrowY += popUp;
      rightBrowY += popUp;
      // Big spread outward during pop
      leftBrowX = -1.5;
      rightBrowX = 1.5;
    }

    // Playful alternating lift — one brow shoots up then the other
    // Bigger, more frequent — every ~65 frames
    const altCycle = localFrame % 65;
    if (altCycle >= 20 && altCycle < 35) {
      const altProgress = (altCycle - 20) / 15;
      const altLift = Math.sin(altProgress * Math.PI) * 4.5;
      leftBrowY -= altLift;  // left shoots up
      leftBrowX = -1.0;
    } else if (altCycle >= 35 && altCycle < 50) {
      const altProgress = (altCycle - 35) / 15;
      const altLift = Math.sin(altProgress * Math.PI) * 4.5;
      rightBrowY -= altLift; // right follows
      rightBrowX = 1.0;
    }

    // Brows ride the bounce — big lifts on bob peaks
    const bobPeak = Math.sin(localFrame * bobSpeed * 1.1);
    if (bobPeak > 0.4) {
      const liftAmount = (bobPeak - 0.4) / 0.6 * 4.0;
      leftBrowY -= liftAmount;
      rightBrowY -= liftAmount;
    }

    // Extra lift during eye contact
    const contactCycle = localFrame % 120;
    if (contactCycle >= 50 && contactCycle < 72) {
      const contactProgress = (contactCycle - 50) / 22;
      const contactLift = Math.sin(contactProgress * Math.PI) * 3.5;
      leftBrowY -= contactLift;
      rightBrowY -= contactLift;
    }

    // Default: spread outward (open, welcoming)
    if (leftBrowX === 0) leftBrowX = -0.8;
    if (rightBrowX === 0) rightBrowX = 0.8;

    // During talk-hop, brows bounce hard with each hop
    if (isTalking && frame >= talkStart && frame <= talkStart + talkDuration) {
      const talkFrame = frame - talkStart;
      const hopBounce = Math.abs(Math.sin((talkFrame / talkDuration) * Math.PI * 4));
      leftBrowY -= hopBounce * 2.5;
      rightBrowY -= hopBounce * 2.5;
    }
  }

  // === BODY MICRO-MOVEMENT — separate orb (body) and head for ALL emotions ===
  // Orb = the body/torso area. Head = the face/head area.
  // Separating these creates "follow-through" — head lags behind body.
  let orbOffsetX = 0;
  let orbOffsetY = 0;
  let headOffsetX = 0;
  let headOffsetY = 0;

  if (emotion === "joy") {
    // Orb: slow breathing pulse — gentle rise and fall
    orbOffsetY = Math.sin(localFrame * 0.03) * 1.2;
    // Head: rhythmic nod — nodding along to internal music
    headOffsetY = Math.sin(localFrame * bobSpeed * 0.8) * 0.8;
    // During eye contact: small warm nod
    const contactCycle = localFrame % 120;
    if (contactCycle >= 52 && contactCycle < 58) {
      headOffsetY += 1.2;
    }
  } else if (emotion === "anger") {
    // Orb: slow pressure throb — swelling with contained rage
    const throbCycle = (localFrame * 0.02) % 1;
    const throbIntensity = throbCycle < 0.7 ? throbCycle / 0.7 : 1 - (throbCycle - 0.7) / 0.3;
    orbOffsetX = Math.sin(localFrame * 0.2) * 0.6 * (1 + throbIntensity);
    orbOffsetY = Math.cos(localFrame * 0.26) * 0.3 * (1 + throbIntensity * 0.5);
    // Head: slow menacing tilt/rock, DIFFERENT rhythm from body (overlapping action)
    headOffsetX = Math.sin(localFrame * 0.05) * 0.4;
    headOffsetY = Math.cos(localFrame * 0.04) * 0.3;
    // Lunge: head leads, snaps forward then body follows
    const lungeCycle = localFrame % 120;
    if (lungeCycle >= 98 && lungeCycle < 105) {
      headOffsetY += 2.0; // head dips forward aggressively
      headOffsetX += (lungeCycle < 101 ? 1 : -1) * 0.5;
    }
  } else if (emotion === "sadness") {
    // Orb: barely moves — too heavy, occasional tiny sway
    orbOffsetX = Math.sin(localFrame * 0.015) * 0.3;
    orbOffsetY = Math.sin(localFrame * 0.01) * 0.2;
    // Head: slow heavy droop, hangs forward — gravity pulling it down
    headOffsetY = 1.5 + Math.sin(localFrame * 0.008) * 0.5;
    headOffsetX = Math.sin(localFrame * 0.006) * 0.4;
    // Sigh: head lifts slightly then drops heavier
    const sighCycle = localFrame % 110;
    if (sighCycle >= 70 && sighCycle < 110) {
      const sighProgress = (sighCycle - 70) / 40;
      if (sighProgress < 0.3) {
        headOffsetY -= interpolate(sighProgress, [0, 0.3], [0, 1.5]); // lifts
      } else {
        headOffsetY += interpolate(sighProgress, [0.3, 0.6, 1], [0, 0.8, 0]); // drops heavier
      }
    }
  } else if (emotion === "fear") {
    // Orb: constant rapid tremor — shallow breathing, everything is shaking
    orbOffsetX = Math.sin(localFrame * 0.6) * 1.5 + Math.sin(localFrame * 1.4) * 0.6;
    orbOffsetY = Math.cos(localFrame * 0.78) * 1.0;
    // Head: independent faster tremor + flinch reactions (head moves MORE than body)
    headOffsetX = Math.sin(localFrame * 0.8) * 1.0 + Math.sin(localFrame * 1.7) * 0.5;
    headOffsetY = Math.cos(localFrame * 0.9) * 0.7;
    // Flinch: head SNAPS to the side, body freezes
    const flinchCycle = localFrame % 90;
    if (flinchCycle >= 80 && flinchCycle < 86) {
      headOffsetX += (flinchCycle < 83 ? -3.0 : interpolate(flinchCycle, [83, 86], [-3.0, 0]));
      headOffsetY += (flinchCycle < 83 ? 2.0 : interpolate(flinchCycle, [83, 86], [2.0, 0])); // ducks
      // Orb freezes during flinch (body goes rigid)
      orbOffsetX = 0;
      orbOffsetY = 0;
    }
  } else if (emotion === "anxiety") {
    // Orb: multi-frequency buzzing — body can't stop vibrating
    orbOffsetX =
      Math.sin(localFrame * 0.7) * 2.0 * 0.6 +
      Math.sin(localFrame * 0.35) * 2.0 * 0.8 +
      Math.sin(localFrame * 1.1) * 2.0 * 0.3;
    orbOffsetY =
      Math.cos(localFrame * 0.5) * 1.2 * 0.7 +
      Math.cos(localFrame * 0.9) * 1.2 * 0.4;
    // Head: slightly different rhythm — creates uncanny unease
    headOffsetX = Math.sin(localFrame * 0.55 + 1.2) * 1.3;
    headOffsetY = Math.cos(localFrame * 0.65 + 0.8) * 0.8;
    // Occasional erratic snap — head twitches to one side
    const twitchCycle = localFrame % 35;
    if (twitchCycle < 2) {
      headOffsetX += (twitchCycle < 1 ? 2.5 : -2.5);
    }
  } else if (emotion === "surprised") {
    // Mostly frozen stiff — barely moving, on high alert
    orbOffsetX = Math.sin(localFrame * 0.15) * 0.15;
    orbOffsetY = Math.cos(localFrame * 0.2) * 0.2;
    headOffsetX = Math.sin(localFrame * 0.04) * 0.3;
    headOffsetY = Math.cos(localFrame * 0.03) * 0.2;
    // Startled jolt: head snaps back (recoil) then freezes again
    const joltCycle = localFrame % 60;
    if (joltCycle < 5) {
      headOffsetY -= joltCycle < 1 ? 2.5 : interpolate(joltCycle, [1, 5], [2.5, 0]);
      headOffsetX += joltCycle < 1 ? 1.0 : interpolate(joltCycle, [1, 5], [1.0, 0]);
      // Body recoils slightly too
      orbOffsetY -= joltCycle < 1 ? 1.0 : interpolate(joltCycle, [1, 5], [1.0, 0]);
    }
  }

  // Eye scale for Surprised — small→big→settle to normal
  // Uses sceneFrame (passed from parent) so it works when mounting mid-timeline
  let eyeScale = 1.0;
  if (emotion === "surprised") {
    const ef = sceneFrame ?? localFrame;
    if (ef < 15) {
      // Character bouncing in — eyes start small
      eyeScale = 0.85;
    } else if (ef < 25) {
      // Grow to big (the gasp moment)
      eyeScale = interpolate(ef, [15, 25], [0.85, 1.3]);
    } else if (ef < 55) {
      // Hold big — peak surprise
      eyeScale = 1.3;
    } else if (ef < 90) {
      // Slowly ease back to normal — surprise wearing off
      eyeScale = interpolate(ef, [55, 90], [1.3, 1.0]);
    } else {
      // Settled at normal size for the rest
      eyeScale = 1.0;
    }
  }

  // Helper: extract tx,ty from a matrix transform string
  const getMatrixOrigin = (transform: string): [number, number] => {
    const match = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,([^,]+),([^)]+)\)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return [0, 0];
  };

  // Per-eye centers: each eye+iris scales around its own eye's center
  // Iris uses the same center as its corresponding eye so they stay aligned
  const eyeCenters = useMemo((): Record<string, [number, number]> => {
    const le = data.paths.find(p => p.label === "left eye");
    const re = data.paths.find(p => p.label === "right eye");
    const lc: [number, number] = le ? getMatrixOrigin(le.transform) : [0, 0];
    const rc: [number, number] = re ? getMatrixOrigin(re.transform) : [0, 0];
    return {
      "left eye": lc,
      "left iris": lc,   // iris scales around its eye's center
      "right eye": rc,
      "right iris": rc,
    };
  }, [data.paths]);

  const characterSize = 320 * scale;

  // Animation per part: wrapper <g> transform (translate ONLY unless eye scaling)
  // SVG translate on <g> is safe - it just shifts the child coordinate space
  const getPartWrapper = (
    label: string
  ): { gTransform?: string; opacity?: number } => {
    switch (label) {
      case "left iris":
      case "right iris":
        return {
          gTransform: `translate(${irisOffsetX}, ${irisOffsetY})`,
        };
      case "left eye":
      case "right eye":
        return {}; // eyelids handle visual closing now
      case "left eyebrow":
        return { gTransform: `translate(${leftBrowX}, ${leftBrowY})` };
      case "right eyebrow":
        return { gTransform: `translate(${rightBrowX}, ${rightBrowY})` };
      case "orb":
        if (orbOffsetX !== 0 || orbOffsetY !== 0) {
          return { gTransform: `translate(${orbOffsetX}, ${orbOffsetY})` };
        }
        return {};
      case "head":
        if (headOffsetX !== 0 || headOffsetY !== 0) {
          return { gTransform: `translate(${headOffsetX}, ${headOffsetY})` };
        }
        return {};
      default:
        return {};
    }
  };

  // Split paths: body+eyes+irises vs eyebrows (eyelids go between them)
  const eyebrowLabels = ["left eyebrow", "right eyebrow"];
  const bodyAndEyePaths = orderedPaths.filter(p => !eyebrowLabels.includes(p.label));
  const eyebrowPaths = orderedPaths.filter(p => eyebrowLabels.includes(p.label));

  // Find eye paths for eyelid clipping
  const leftEyePath = data.paths.find(p => p.label === "left eye");
  const rightEyePath = data.paths.find(p => p.label === "right eye");
  const headColor = HEAD_COLORS[emotion];

  // Unique clip IDs per character instance
  const clipBase = `lid-${emotion}-${Math.round(x)}-${Math.round(y)}`;

  // Render an eyelid pair (top + bottom) clipped to the eye shape
  // Eye local coords: the matrix flips Y, so local +Y = screen top.
  // Each eye roughly spans y: -50 to +65 in local coords (~115 units).
  // We use MASSIVE rects with large translate offsets so the closing edge
  // is always a clean horizontal line across the eye.
  const renderEyelid = (eyePath: PathData, side: string) => {
    const clipId = `${clipBase}-${side}`;

    const topSlide = (1 - topLidClose) * 160;
    const bottomSlide = -(1 - bottomLidClose) * 160;

    // Eye scale transform — eyelids must match the scaled eye size
    const eyeLabel = side === "left" ? "left eye" : "right eye";
    const [cx, cy] = eyeCenters[eyeLabel] || [0, 0];
    const needsScale = eyeScale !== 1.0;
    const scaleTransform = needsScale
      ? `translate(${cx}, ${cy}) scale(${eyeScale}) translate(${-cx}, ${-cy})`
      : undefined;

    return (
      <React.Fragment key={`eyelid-${side}`}>
        <defs>
          <clipPath id={clipId}>
            {/* Clip path must also be scaled to match the scaled eye */}
            {needsScale ? (
              <g transform={scaleTransform}>
                <path d={eyePath.d} transform={eyePath.transform} />
              </g>
            ) : (
              <path d={eyePath.d} transform={eyePath.transform} />
            )}
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {/* Top eyelid — descends from above */}
          {topLidClose > 0.01 && (
            <g transform={scaleTransform}>
              <g transform={eyePath.transform}>
                <g transform={`translate(0, ${topSlide})`}>
                  <rect x="-80" y="-10" width="250" height="200" fill={headColor} />
                </g>
              </g>
            </g>
          )}
          {/* Bottom eyelid — rises from below */}
          {bottomLidClose > 0.01 && (
            <g transform={scaleTransform}>
              <g transform={eyePath.transform}>
                <g transform={`translate(0, ${bottomSlide})`}>
                  <rect x="-80" y="-190" width="250" height="200" fill={headColor} />
                </g>
              </g>
            </g>
          )}
        </g>
      </React.Fragment>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x - characterSize / 2 + sway,
        top: y - characterSize + bob + hopAmount,
        width: characterSize,
        height: characterSize,
        transform: `scale(${enterProgress * scaleX}, ${enterProgress * scaleY}) rotate(${tilt}deg) ${flipX ? "scaleX(-1)" : ""}`,
        transformOrigin: "center bottom",
        filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.15))",
      }}
    >
      <svg
        viewBox={data.viewBox}
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        <g transform={data.layerTransform}>
          {/* Body + eyes + irises */}
          {bodyAndEyePaths.map((p, i) => {
            const wrapper = getPartWrapper(p.label);
            const isEyePart = ["left eye", "right eye", "left iris", "right iris"].includes(p.label);

            // Eye scaling: each eye+iris scales around its own eye center
            if (isEyePart && eyeScale !== 1.0) {
              const [cx, cy] = eyeCenters[p.label] || [0, 0];
              const scaleTransform = `translate(${cx}, ${cy}) scale(${eyeScale}) translate(${-cx}, ${-cy})`;
              return (
                <g
                  key={`${p.label}-${i}`}
                  transform={wrapper.gTransform}
                  opacity={wrapper.opacity}
                >
                  <g transform={scaleTransform}>
                    <path
                      d={p.d}
                      style={parseStyle(p.style)}
                      transform={p.transform}
                    />
                  </g>
                </g>
              );
            }

            return (
              <g
                key={`${p.label}-${i}`}
                transform={wrapper.gTransform}
                opacity={wrapper.opacity}
              >
                <path
                  d={p.d}
                  style={parseStyle(p.style)}
                  transform={p.transform}
                />
              </g>
            );
          })}
          {/* Eyelids: on top of eyes+irises, below eyebrows */}
          {(topLidClose > 0.01 || bottomLidClose > 0.01) && leftEyePath && renderEyelid(leftEyePath, "left")}
          {(topLidClose > 0.01 || bottomLidClose > 0.01) && rightEyePath && renderEyelid(rightEyePath, "right")}
          {/* Eyebrows: highest z-order */}
          {eyebrowPaths.map((p, i) => {
            const wrapper = getPartWrapper(p.label);
            return (
              <g
                key={`${p.label}-${i}`}
                transform={wrapper.gTransform}
                opacity={wrapper.opacity}
              >
                <path
                  d={p.d}
                  style={parseStyle(p.style)}
                  transform={p.transform}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
