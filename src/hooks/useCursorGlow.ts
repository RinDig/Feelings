import { useEffect, useRef } from "react";

export function useCursorGlow(glowRef: React.RefObject<HTMLDivElement | null>) {
  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const glow = useRef({ x: mouse.current.x, y: mouse.current.y });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };
    document.addEventListener("mousemove", onMove);

    let raf: number;
    const tick = () => {
      glow.current.x += (mouse.current.x - glow.current.x) * 0.12;
      glow.current.y += (mouse.current.y - glow.current.y) * 0.12;
      if (glowRef.current) {
        glowRef.current.style.left = glow.current.x + "px";
        glowRef.current.style.top = glow.current.y + "px";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [glowRef]);
}
