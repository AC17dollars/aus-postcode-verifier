"use client";

import { useState, useEffect, useRef, useId } from "react";
import { motion } from "framer-motion";

const MOBILE_BREAKPOINT_PX = 768;

interface TorchBackgroundProps {
  readonly isTorchOff: boolean;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const mql = globalThis.matchMedia?.(
      `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`,
    );
    if (!mql) {
      const id = setTimeout(() => setIsMobile(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setIsMobile(mql.matches), 0);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => {
      clearTimeout(id);
      mql.removeEventListener("change", handler);
    };
  }, []);
  return isMobile;
}

export function TorchBackground({
  isTorchOff,
}: Readonly<TorchBackgroundProps>) {
  const isMobile = useIsMobile();
  const noiseId = useId();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    globalThis.addEventListener("mousemove", handleMouseMove);
    return () => globalThis.removeEventListener("mousemove", handleMouseMove);
  }, [isMobile]);

  return (
    <>
      {!isMobile && (
        <>
          <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, 
                ${isTorchOff ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.08)"}, 
                transparent 80%)`,
            }}
          />

          <motion.div
            animate={{
              x: mousePos.x - 150,
              y: mousePos.y - 150,
              scale: isTorchOff ? 0 : 1,
              opacity: isTorchOff ? 0 : 1,
            }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 250,
              mass: 0.5,
              opacity: { duration: 0.15 },
            }}
            className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-10"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </>
      )}

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        aria-hidden
      >
        <svg
          className="absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id={noiseId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
        </svg>
      </div>
    </>
  );
}
