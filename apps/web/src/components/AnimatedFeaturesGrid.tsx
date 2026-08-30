'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const defaultCards = [
  {
    id: 'illusion-competence',
    title: 'Illusion of Competence',
    desc: 'Most platforms reward passive video watching with 100% completion. You think you\'re learning, but without verified assessments, actual skill mastery remains an illusion.',
    slideFrom: 'bottom',
    colSpan: 'md:col-span-2'
  },
  {
    id: 'dependency-trap',
    title: 'The Dependency Trap',
    desc: 'Skip a fundamental concept, and you\'ll eventually hit a brick wall. Without a clear knowledge graph, learners get stuck on downstream topics and quit.',
    slideFrom: 'top',
    colSpan: 'md:col-span-2'
  },
  {
    id: 'worthless-credentials',
    title: 'Worthless Credentials',
    desc: 'Generic certificates are ignored by modern ATS systems and employers. Spending months on a course without verifiable proof leaves your resume looking empty.',
    slideFrom: 'bottom',
    colSpan: 'md:col-span-2'
  },
  {
    id: 'one-size-fits-all',
    title: 'The One-Size-Fits-All Curse',
    desc: 'Pre-recorded courses assume everyone learns the same way. If you already know a topic, you waste time. If you struggle, you get left behind.',
    slideFrom: 'bottom',
    colSpan: 'md:col-span-3'
  },
  {
    id: 'memory-decay',
    title: 'The Forgetting Curve',
    desc: 'You master a skill today but forget it a month later. Traditional platforms don\'t track memory decay, leaving you unprepared for actual technical interviews.',
    slideFrom: 'bottom',
    colSpan: 'md:col-span-3'
  }
];

export function AnimatedFeaturesGrid() {
  const [cards, setCards] = useState(defaultCards);

  // Shuffling effect has been disabled per user request
  // useEffect(() => { ... }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-[1200px] mx-auto">
      <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-12 text-center tracking-tight">
        What people face ?
      </h2>
      <section className="grid grid-cols-1 md:grid-cols-6 gap-6 w-full">
      <AnimatePresence mode="popLayout">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className={`group relative w-full rounded-[28px] bg-[radial-gradient(circle_at_center,_#333_0%,_#18181b_100%)] border border-white/10 overflow-hidden cursor-default select-none hover:border-white/25 hover:shadow-[0_20px_60px_rgba(0,0,0,0.85)] hover:-translate-y-1 min-h-[300px] flex flex-col p-7 sm:p-8 justify-end ${card.colSpan}`}
          >
            {/* Ambient White Glow (Resting State) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/[0.06] rounded-full blur-[70px] pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-500"></div>

            {/* Layer 1 (Static) */}
            <div className="relative z-10 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-0 group-hover:scale-95 group-hover:translate-y-6 pointer-events-auto group-hover:pointer-events-none">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {card.title}
              </h3>
              <p className="mt-3 text-[15px] text-[#aaaaaa] font-normal leading-relaxed">
                {card.desc}
              </p>
            </div>
            
            {/* Layer 2 (Curtain Hover Effect) */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-end p-7 sm:p-8 bg-[radial-gradient(circle_at_center,_#333_0%,_#18181b_100%)] rounded-[28px] opacity-0 ${card.slideFrom === 'top' ? 'translate-y-[-100%]' : 'translate-y-[100%]'} group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none group-hover:pointer-events-auto overflow-hidden`}>
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-90" />
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.09] to-transparent pointer-events-none" />
              <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-30 flex flex-col translate-y-6 group-hover:translate-y-0 transition-transform duration-500 delay-[50ms] ease-[cubic-bezier(0.16,1,0.3,1)]">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm sm:text-[15px] text-[#cccccc] font-normal leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      </section>
    </div>
  );
}
