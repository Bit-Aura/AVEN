'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    id: 1,
    question: "Why wouldn't I just hire a full-time designer?",
    answer: "To replace our services, you will need to hire a full-time designer and a full-time developer. A senior-level one for each will easily cost you $130k+ annually, benefits, vacation days, training, etc.\n\nBy working with us, not only will you save thousands of dollars, you will get back countless hours as well."
  },
  {
    id: 2,
    question: "How do I get started with AVEN?",
    answer: "Simply reach out through our contact form to schedule an initial discovery call. We'll discuss your goals, scope the project, and determine if we're a good fit before moving forward with a formal proposal."
  },
  {
    id: 3,
    question: "How do we communicate or share feedback?",
    answer: "We set up a dedicated Slack or Discord channel for direct, asynchronous communication. For design feedback, we use Figma comments, and for development progress, we provide regular staging links."
  },
  {
    id: 4,
    question: "What size budgets do you typically work with?",
    answer: "Most of our projects range between $15,000 and $50,000. Our minimum engagement fee is $10,000."
  },
  {
    id: 5,
    question: "How long does a typical project take?",
    answer: "Depending on the complexity and scope, a standard project typically takes between 4 to 8 weeks from kickoff to final launch."
  },
  {
    id: 6,
    question: "What happens after our new product is launched?",
    answer: "We include a 30-day post-launch warranty period to fix any bugs and ensure a smooth transition. After that, we offer monthly retainers for ongoing support and feature development."
  },
  {
    id: 7,
    question: "What are the payment terms for a project?",
    answer: "We typically structure payments in three milestones: 40% upfront to secure your spot, 30% at the midpoint deliverable, and the final 30% right before launch."
  },
  {
    id: 8,
    question: "Does AVEN take on small hourly work?",
    answer: "No, we only take on fixed-fee projects. However, we do offer retainers to our clients after their project is finished for ongoing iterative work."
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
    <section className="relative w-full bg-white z-20 py-32">
      {/* Exact dot grid background from the reference */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.15]" 
        style={{ 
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      
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
