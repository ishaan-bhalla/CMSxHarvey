import { useEffect, useRef } from "react";
import gavelUrl from "../assets/magnifier-cursor.png";

export function Cursor() {
  const gavel = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, rx: 0, ry: 0, rot: 0, tRot: 0 });

  useEffect(() => {
    let lastX = 0;
    let lastT = performance.now();

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const vx = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      pos.current.tRot = Math.max(-12, Math.min(12, vx * 4));
    };
    const onDown = () => { pos.current.tRot = -18; };
    const onUp = () => { pos.current.tRot = 0; };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-hover], input, select, textarea, label")) {
        document.body.classList.add("cursor-hover");
      } else {
        document.body.classList.remove("cursor-hover");
      }
    };
    let raf = 0;
    const loop = () => {
      pos.current.rx += (pos.current.x - pos.current.rx) * 0.28;
      pos.current.ry += (pos.current.y - pos.current.ry) * 0.28;
      pos.current.rot += (pos.current.tRot - pos.current.rot) * 0.2;
      if (gavel.current) {
        gavel.current.style.transform = `translate(${pos.current.rx}px, ${pos.current.ry}px) translate(-60%,-35%) rotate(${pos.current.rot}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={gavel}
      className="cursor-gavel"
      style={{ backgroundImage: `url(${gavelUrl})` }}
    />
  );
}
