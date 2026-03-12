"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface TorchBackgroundProps {
  isTorchOff: boolean;
  onMouseMove?: (x: number, y: number) => void;
}

export function TorchBackground({ isTorchOff }: TorchBackgroundProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* Dynamic Background Torch Layer */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, 
            ${isTorchOff ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.08)"}, 
            transparent 80%)`,
        }}
      />

      {/* Animated Spotlight Cursor */}
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

      {/* Grain/Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />
    </>
  );
}
