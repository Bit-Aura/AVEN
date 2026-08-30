'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    id: 1,
    question: "How does the RAG-Enriched AI Coach work?",
    answer: "Our AI coach uses Retrieval-Augmented Generation (RAG) to pull your exact learning context - including your current readiness scores, mastered skills, and position in the curriculum. This allows it to provide highly specific, personalized guidance rather than generic answers."
  },
  {
    id: 2,
    question: "What is Bayesian Knowledge Tracing (BKT)?",
    answer: "BKT is a mathematical model we use to estimate your actual probability of mastering a skill. Instead of just marking a video as 'watched', we analyze your performance on micro-assessments over time to calculate true posterior mastery."
  },
  {
    id: 3,
    question: "What happens if I skip a fundamental concept?",
    answer: "Our Date-Delta Engine simulates the downstream effects. If you skip a prerequisite, our Neo4j knowledge graph calculates the exact friction days and blocked dependent nodes you'll face later, so you understand the cost of skipping."
  },
  {
    id: 4,
    question: "Are the Proof Cards recognized by employers?",
    answer: "Yes. Once you reach the required mastery threshold, we issue cryptographically signed Proof Cards. These are tamper-evident credentials that prove verified technical competence, making them far more valuable to ATS systems than standard completion certificates."
  },
  {
    id: 5,
    question: "How is my personalized learning path generated?",
    answer: "When you set a career goal, our LLM parses your intent and cross-references it with our topological DAG planner. It creates a custom roadmap that eliminates redundancies and maps the most efficient sequence of skills needed for your specific target."
  },
  {
    id: 6,
    question: "What happens when I fail a checkpoint?",
    answer: "Our system runs a root-cause backtrace. If you fail, we recursively check your prerequisites to find the foundational gap. We then decay that specific skill score and dynamically replan your path to include necessary refreshers."
  },
  {
    id: 7,
    question: "How does the platform handle memory decay?",
    answer: "We model the Ebbinghaus forgetting curve. Over time, your mastery probability for inactive skills slowly decays. If a score drops below the threshold, our active decay worker will automatically queue a quick refresher assessment into your path."
  },
  {
    id: 8,
    question: "Can I adjust the speed or depth of my learning?",
    answer: "Absolutely. We use a steerable weights system where you can adjust sliders for Speed, Depth, and Cost. Our Path Planner will instantly re-rank the resources and regenerate a path tailored to your precise preferences."
  }
];

function FAQItem({ faq, isOpen, toggleOpen }: { faq: typeof faqs[0], isOpen: boolean, toggleOpen: () => void }) {
  return (
    <div 
      className="bg-[#f7f7f7] rounded-[24px] overflow-hidden cursor-pointer transition-colors duration-300 hover:bg-[#f0f0f0]"
      onClick={toggleOpen}
    >
      <div className="p-6 md:p-8 flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-medium text-[#111] pr-4">
          {faq.question}
        </h3>
        <div className="flex-shrink-0 text-[#222]">
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          )}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 md:px-8 pb-8 pt-2 text-[#555] text-base leading-relaxed whitespace-pre-wrap font-medium border-t border-black/5 mt-2">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null);

  // Split FAQs into two columns
  const leftFaqs = faqs.filter((_, i) => i % 2 === 0);
  const rightFaqs = faqs.filter((_, i) => i % 2 !== 0);

  return (
    <section className="relative w-full z-20 py-32">
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-sans font-medium text-[#4d4d4d] max-w-2xl tracking-tight leading-[1.1]">
            Questions you probably wonder about
          </h2>
          <p className="text-[#111] font-medium text-lg md:mb-4">
            More commonly known as FAQs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex flex-col gap-4 md:gap-6">
            {leftFaqs.map(faq => (
              <FAQItem 
                key={faq.id} 
                faq={faq} 
                isOpen={openId === faq.id} 
                toggleOpen={() => setOpenId(openId === faq.id ? null : faq.id)} 
              />
            ))}
          </div>
          <div className="flex flex-col gap-4 md:gap-6">
            {rightFaqs.map(faq => (
              <FAQItem 
                key={faq.id} 
                faq={faq} 
                isOpen={openId === faq.id} 
                toggleOpen={() => setOpenId(openId === faq.id ? null : faq.id)} 
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
