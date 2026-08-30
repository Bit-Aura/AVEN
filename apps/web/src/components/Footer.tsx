'use client';

import React, { useState } from "react";
import Link from "next/link";

export function Footer() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <>
    <footer className="relative w-full bg-[#0f0f0f] pt-2 md:pt-4 pb-5 md:pb-0 flex flex-col justify-between overflow-hidden z-20 mt-32">
      {/* Background radial gradient from tensorik */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(37, 99, 235, 0.15) 0%, transparent 50%)' }} 
      />
      
      <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-[10rem] px-6 md:px-[5%] relative z-10 mb-10 md:mb-0 max-w-[1400px] mx-auto w-full">
        
        {/* Empty left side to maintain layout if needed, or just let justify-end align the right column */}
        <div className="hidden md:block w-full"></div>

        <div className="grid grid-cols-1 sm:grid-cols-1 gap-10 md:gap-[10rem] w-full md:w-auto">
          
          <div className="flex flex-col gap-4 md:gap-[1.5rem] mt-8 md:mt-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 w-full">
              <button 
                onClick={() => setIsContactOpen(true)}
                className="inline-flex items-center justify-center bg-white text-[#111] hover:bg-gray-200 transition-all duration-300 w-[240px] md:w-[320px] py-4 md:py-6 rounded-full font-bold text-base md:text-xl cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-white/5"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Massive bottom text from tensorik */}
      <div className="w-full overflow-hidden flex justify-center items-end px-2 md:px-[1vw] mt-16 md:mt-0 relative z-10 pointer-events-none">
        <h1 
          className="font-serif font-medium text-[30vw] md:text-[32vw] leading-none tracking-[-0.01em] text-[rgba(228,233,235,0.05)] whitespace-nowrap lowercase pb-4 md:pb-8" 
          style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.03)', fontVariant: 'small-caps' }}
        >
          aven
        </h1>
      </div>
    </footer>

    {/* Contact Modal */}
    {isContactOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsContactOpen(false)}
        />
        
        {/* Modal Content */}
        <div className="relative bg-[#111] border border-white/10 rounded-3xl p-8 md:px-20 md:py-16 w-full max-w-4xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => setIsContactOpen(false)}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>

          <h3 className="font-display text-3xl text-white mb-8">Get in touch with us</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <Link href="mailto:sriram.m2024aids@sece.ac.in" className="flex items-center gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#ccc] hover:text-white font-medium text-[0.95rem] group">
              <svg className="shrink-0 w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              sriram.m2024aids@sece.ac.in
            </Link>
            <Link href="mailto:sreejesh.s2024csecs@sece.ac.in" className="flex items-center gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#ccc] hover:text-white font-medium text-[0.95rem] group">
              <svg className="shrink-0 w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              sreejesh.s2024csecs@sece.ac.in
            </Link>
            <Link href="mailto:tarun.v2024aids@sece.ac.in" className="flex items-center gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#ccc] hover:text-white font-medium text-[0.95rem] group">
              <svg className="shrink-0 w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              tarun.v2024aids@sece.ac.in
            </Link>
            <Link href="mailto:surya.pr2024aids@sece.ac.in" className="flex items-center gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#ccc] hover:text-white font-medium text-[0.95rem] group">
              <svg className="shrink-0 w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              surya.pr2024aids@sece.ac.in
            </Link>
            <Link href="mailto:shankar.v2024cse@sece.ac.in" className="flex items-center gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#ccc] hover:text-white font-medium text-[0.95rem] sm:col-span-2 md:col-span-1 group">
              <svg className="shrink-0 w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              shankar.v2024cse@sece.ac.in
            </Link>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
