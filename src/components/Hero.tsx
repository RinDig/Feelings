import React from "react";

const ORBS = [
  { color: "var(--c-joy)", delay: "0s", title: "Joy" },
  { color: "var(--c-anger)", delay: ".12s", title: "Anger" },
  { color: "var(--c-sadness)", delay: ".24s", title: "Sadness" },
  { color: "var(--c-fear)", delay: ".36s", title: "Fear" },
  { color: "var(--c-anxiety)", delay: ".48s", title: "Anxiety" },
  { color: "var(--c-surprised)", delay: ".6s", title: "Surprised" },
];

export function Hero() {
  return (
    <header className="hero" id="hero">
      <div className="hero-wash hero-wash-1" aria-hidden="true" />
      <div className="hero-wash hero-wash-2" aria-hidden="true" />
      <div className="hero-wash hero-wash-3" aria-hidden="true" />
      <div className="hero-content">
        <p className="hero-eyebrow">A Visual Story</p>
        <h1 className="hero-title">
          <span className="hero-word">Internal</span>
          <span className="hero-word">Family</span>
          <span className="hero-word hero-word-accent">Systems</span>
        </h1>
        <p className="hero-body">
          Six emotion characters live inside all of us.
          <br />
          This is the story of how they learn to listen to each other.
        </p>
        <div className="hero-orbs" aria-hidden="true">
          {ORBS.map((o) => (
            <span
              key={o.title}
              className="orb"
              title={o.title}
              style={{ "--orb-color": o.color, "--delay": o.delay } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
      <div className="hero-scroll-cue" aria-hidden="true">
        <div className="cue-mouse">
          <div className="cue-wheel" />
        </div>
        <span className="cue-text">Scroll to explore</span>
      </div>
    </header>
  );
}
