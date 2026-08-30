'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const text = "Our Process";
const scatterData = [
  { x: -150, y: -100, rot: -25 },
  { x: 100, y: -150, rot: 15 },
  { x: -50, y: 150, rot: -10 },
  { x: 200, y: 100, rot: 30 },
  { x: -180, y: 50, rot: -20 },
  { x: 0, y: -200, rot: 45 },
  { x: 150, y: -50, rot: -15 },
  { x: -100, y: 200, rot: 25 },
  { x: 80, y: 120, rot: -35 },
  { x: -220, y: -80, rot: 10 },
  { x: 180, y: -120, rot: -40 },
];

const cards = [
  {
    id: 1,
    title: "Project request",
    description: "We begin by carefully reviewing your project requirements. This initial assessment helps us determine if AVEN is the ideal partner to bring your vision to life. Successful projects start with a clear understanding of your goals.",
    color: "bg-[#f2fbf5]", // light green
  },
  {
    id: 2,
    title: "First meeting",
    description: "We believe strong relationships lead to exceptional results. During our initial meeting, we'll take the time to understand your business goals, target audience, and desired outcomes. This helps us create a tailored strategy.",
    color: "bg-[#fdf9f1]", // light orange/yellow
  },
  {
    id: 3,
    title: "Proposal",
    description: "Based on our in-depth understanding of your project, we create a custom proposal outlining the scope of work, project timeline, and transparent pricing structure. Our fixed-fee approach eliminates the uncertainty often associated with hourly billing.",
    color: "bg-[#fcf5f5]", // light rose/pink
  },
  {
    id: 4,
    title: "Design and development",
    description: "Once we have everything we need, we'll kick-off your project. We maintain open communication throughout the process by providing regular updates through communications channels like Slack, Discord, or email.",
    color: "bg-[#f0fbf9]", // light teal
  },
  {
    id: 5,
    title: "Launch and Beyond",
    description: "Upon completion, your website undergoes rigorous quality assurance testing to guarantee optimal performance and user experience before launching. We'll also stay on for 30-days post launch - no strings (or bills) attached to ensure everything runs smoothly.",
    color: "bg-[#f4f7fe]", // light blue
  }
];

function ProcessCard({ card, index, progress, totalCards }: { card: any, index: number, progress: any, totalCards: number }) {
  // progress goes from 0 to 1 over the entire container
  const targetScale = 1 - ((totalCards - index) * 0.04); 
  const scale = useTransform(
    progress,
    [index / totalCards, 1], 
    [1, targetScale]
  );

  // Reduced upward translation to prevent cards from creeping into the title
  const y = useTransform(
    progress,
    [index / totalCards, 1],
    [0, - (totalCards - index) * 8] 
  );

  return (
    <div className="h-screen w-full flex flex-col items-center justify-start sticky top-0 pt-[35vh] md:pt-[38vh]">
      <motion.div
        style={{ scale, y }}
        className={`relative w-[90%] max-w-3xl mx-auto h-[400px] md:h-[480px] ${card.color} rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-black/[0.03] flex flex-col items-center text-center p-8 md:p-12 overflow-hidden origin-top`}
      >
        <div className="text-[100px] md:text-[130px] font-display text-[#2d3a43] leading-none mb-3 tracking-tighter opacity-90">
          {card.id}
        </div>
        <h3 className="text-2xl md:text-3xl font-sans font-medium text-[#111] tracking-tight mb-4">
          {card.title}
        </h3>
        <p className="text-[#555] text-sm md:text-base leading-relaxed max-w-xl font-medium">
          {card.description}
        </p>
      </motion.div>
    </div>
  );
}

export function OurProcessCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div ref={containerRef} className="relative w-full z-20 pb-[10vh]">
      
      {/* The Sticky Title locked to the top. h-screen ensures it gets pushed up perfectly with the last card. */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-start z-30 pointer-events-none pt-12 md:pt-20">
        <div className="flex items-center justify-center space-x-1 sm:space-x-3 w-full">
          {text.split('').map((char, i) => {
            if (char === ' ') return <div key={i} className="w-4 sm:w-6 md:w-10" />;
            
            const data = scatterData[i];
            
            // Converges very quickly (0 to 0.05) since the whole container is 500vh+
            const x = useTransform(scrollYProgress, [0, 0.05], [data.x, 0]);
            const y = useTransform(scrollYProgress, [0, 0.05], [data.y, 0]);
            const rotate = useTransform(scrollYProgress, [0, 0.05], [data.rot, 0]);
            const blurVal = useTransform(scrollYProgress, [0, 0.04], [24, 0]);
            const filter = useTransform(blurVal, (v) => `blur(${v}px)`);
            const opacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);
            const scale = useTransform(scrollYProgress, [0, 0.05], [1.8, 1]);

            return (
              <motion.span
                key={i}
                style={{ x, y, rotate, filter, opacity, scale }}
                className="inline-block font-sans text-5xl md:text-7xl lg:text-[100px] text-[#4d4d4d] font-medium tracking-tight"
              >
                {char}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Cards track scrolling. mt-[-100vh] aligns them precisely with the title's h-screen block. */}
      <div className="relative mt-[-100vh]" style={{ height: `${cards.length * 100}vh` }}>
        {cards.map((card, index) => (
          <ProcessCard 
            key={card.id} 
            card={card} 
            index={index} 
            progress={scrollYProgress} 
            totalCards={cards.length} 
          />
        ))}
      </div>
    </div>
  );
}
