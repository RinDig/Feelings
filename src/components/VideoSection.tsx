import { useInView } from "../hooks/useInView";

export function VideoSection() {
  const { ref, isVisible } = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`video-section${isVisible ? " visible" : ""}`}
    >
      <div className="video-section-header">
        <h2>Watch Them Come to Life</h2>
        <p>See all six emotion characters animated together</p>
      </div>
      <div className="video-wrapper">
        <video
          controls
          playsInline
          preload="metadata"
          poster=""
          className="video-player"
        >
          <source src={import.meta.env.BASE_URL + "Emotions.mp4"} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </section>
  );
}
