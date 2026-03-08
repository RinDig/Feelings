import { useInView } from "../hooks/useInView";

export function IfsBlurb() {
  const { ref, isVisible } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`ifs-blurb${isVisible ? " visible" : ""}`}
    >
      <div className="ifs-blurb-bubble">
        <div className="ifs-blurb-tail" />
        <h2 className="ifs-blurb-title">What is IFS?</h2>
        <p>
          Inside every person lives a whole family of emotions — not just one "you,"
          but many <em>parts</em>, each with their own feelings and memories.
        </p>
        <p>
          Some parts protect us (like <span className="ifs-highlight anger">Anger</span>),
          some carry old pain (like <span className="ifs-highlight sadness">Sadness</span> and{" "}
          <span className="ifs-highlight fear">Fear</span>), and some just want to be
          noticed (like <span className="ifs-highlight anxiety">Anxiety</span>).
        </p>
        <p>
          <strong>Internal Family Systems</strong> is a way of getting to know
          these inner parts — not to fix them, but to <em>listen</em> to them.
          When every part feels heard, something beautiful happens: they stop
          fighting and start working together.
        </p>
        <div className="ifs-blurb-orbs" aria-hidden="true">
          <span style={{ background: "var(--c-joy)" }} />
          <span style={{ background: "var(--c-anger)" }} />
          <span style={{ background: "var(--c-sadness)" }} />
          <span style={{ background: "var(--c-fear)" }} />
          <span style={{ background: "var(--c-anxiety)" }} />
          <span style={{ background: "var(--c-surprised)" }} />
        </div>
      </div>
    </section>
  );
}
