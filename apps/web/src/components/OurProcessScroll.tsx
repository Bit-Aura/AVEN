'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const text = "Our Process";

// Pre-calculated scatter positions to mimic the organic spread in the reference frames
const scatterData = [
  { x: -400, y: -200, rot: -85 }, // O
  { x: 350, y: -300, rot: 55 },   // u
  { x: -250, y: 200, rot: -120 }, // r
  { x: 0, y: 0, rot: 0 },         // space
  { x: 150, y: -400, rot: 145 },  // P
  { x: -450, y: 150, rot: -50 },  // r
  { x: 400, y: 250, rot: 110 },   // o
  { x: -250, y: -200, rot: -85 }, // c
  { x: 200, y: 400, rot: 65 },    // e
  { x: -150, y: 350, rot: -150 }, // s
  { x: 450, y: -150, rot: 125 },  // s
];

export function OurProcessScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Start animation when top of section hits bottom of viewport
    // End animation exactly when the section is perfectly centered in the viewport
    offset: ["start end", "center center"] 
  });

  return (
    <div ref={containerRef} className="relative h-[30vh] md:h-[40vh] w-full bg-white z-20 flex flex-col items-center justify-end pb-12 overflow-hidden">
      {/* Exact dot grid background from the reference */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15]" 
        style={{ 
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="flex items-center justify-center space-x-1 sm:space-x-3 z-10 w-full relative">
        {text.split('').map((char, i) => {
          if (char === ' ') return <div key={i} className="w-4 sm:w-6 md:w-10" />;
          
          const data = scatterData[i];
          
          // The letters will converge exactly as the section reaches the center of the screen
          const x = useTransform(scrollYProgress, [0, 1], [data.x, 0]);
          const y = useTransform(scrollYProgress, [0, 1], [data.y, 0]);
          const rotate = useTransform(scrollYProgress, [0, 1], [data.rot, 0]);
          
          // Blur drops to 0 just before it perfectly centers
          const blurVal = useTransform(scrollYProgress, [0, 0.9], [24, 0]);
          const filter = useTransform(blurVal, (v) => `blur(${v}px)`);
          
          // Fades in quickly as it enters the screen
          const opacity = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
          
          // Scales down to normal size as it centers
          const scale = useTransform(scrollYProgress, [0, 1], [1.8, 1]);

          return (
            <motion.span
              key={i}
              style={{
                x,
                y,
                rotate,
                filter,
                opacity,
                scale
              }}
              className="inline-block font-sans text-5xl md:text-7xl lg:text-[100px] text-[#4d4d4d] font-medium tracking-tight"
            >
              {char}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
