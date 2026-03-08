import { useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { Footer } from "./components/Footer";
import { ProgressTrack } from "./components/ProgressTrack";
import { ChapterNav } from "./components/ChapterNav";
import { ParticleCanvas } from "./components/ParticleCanvas";
import { FrameSection } from "./components/FrameSection";
import { FrameSpacer } from "./components/FrameSpacer";
import { CharacterSpot } from "./components/CharacterSpot";
import { CharacterScene } from "./components/CharacterSpot";
import { IfsBlurb } from "./components/IfsBlurb";
import { VideoSection } from "./components/VideoSection";
import { useCursorGlow } from "./hooks/useCursorGlow";
import "./styles.css";

const TOTAL = 20;

const COLORS = [
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a", "#fa807d", "#a6d9f2", "#e3c9ff", "#ffd9bd",
  "#e8e343", "#a5e59a",
];

export default function App() {
  const glowRef = useRef<HTMLDivElement>(null);
  useCursorGlow(glowRef);
  const [currentFrame] = useState(0);

  // Build frames with character spots and scenes interspersed
  const frames: React.ReactNode[] = [];

  for (let i = 0; i < TOTAL; i++) {
    // Invisible spacer between frames
    if (i > 0) {
      frames.push(<FrameSpacer key={`spacer-${i}`} />);
    }

    // Character scenes at specific story beats
    if (i === 4) {
      frames.push(
        <CharacterScene
          key="scene-joy"
          mood="hopeful"
          characters={[
            { emotion: "joy", x: 400, y: 280, scale: 0.9 },
          ]}
        >
          <h2>Meet Your Emotions</h2>
          <p>Each one has a purpose. Each one deserves to be heard.</p>
        </CharacterScene>
      );
    }

    if (i === 17) {
      frames.push(
        <CharacterScene
          key="scene-fear-joy"
          mood="warm"
          characters={[
            { emotion: "fear", x: 260, y: 280, scale: 0.75 },
            { emotion: "joy", x: 540, y: 280, scale: 0.85, flipX: true },
          ]}
        >
          <h2>It's OK to Feel Afraid</h2>
          <p>The scared part just needs to know you won't leave.</p>
        </CharacterScene>
      );
    }

    if (i === 15) {
      frames.push(
        <CharacterScene
          key="scene-anger-sadness"
          mood="somber"
          characters={[
            { emotion: "anger", x: 280, y: 280, scale: 0.8 },
            { emotion: "sadness", x: 520, y: 280, scale: 0.75, flipX: true },
          ]}
        >
          <h2>Behind Every Protector</h2>
          <p>...is a part that just needed to be held.</p>
        </CharacterScene>
      );
    }

    // The slide frame
    frames.push(
      <FrameSection key={`frame-${i}`} index={i} color={COLORS[i]}>
        {i === 0 && (
          <CharacterSpot
            emotion="joy"
            right="-80px"
            bottom="10%"
            scale={0.6}
            width="160px"
          />
        )}
        {i === 13 && (
          <CharacterSpot
            emotion="anxiety"
            right="-60px"
            top="15%"
            scale={0.5}
            width="130px"
          />
        )}
        {i === 19 && (
          <CharacterSpot
            emotion="surprised"
            left="-70px"
            bottom="15%"
            scale={0.55}
            width="150px"
          />
        )}
      </FrameSection>
    );
  }

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <ParticleCanvas />
      <div className="grain" aria-hidden="true" />
      <div className="atmosphere" aria-hidden="true">
        <div className="atmo-blob atmo-blob-1" />
        <div className="atmo-blob atmo-blob-2" />
        <div className="atmo-blob atmo-blob-3" />
      </div>
      <ProgressTrack />
      <ChapterNav currentFrame={currentFrame} total={TOTAL} />
      <Hero />
      <IfsBlurb />
      <main id="frames">{frames}</main>
      <VideoSection />
      <Footer />
    </>
  );
}
