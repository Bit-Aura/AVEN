'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowLeft } from 'lucide-react';

/**
 * Enterprise-grade implementation of NotFound.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function NotFound() {
  const [scaleY, setScaleY] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (textRef.current) {
        const height = textRef.current.offsetHeight || 1;
        setScaleY(window.innerHeight / height);
      }
    };
    setTimeout(updateScale, 50);
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-gradient-to-b from-[#FF8233] to-[#FDAC55] relative">
      
      {/* BACKGROUND "404" TEXT EFFECT */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-80"
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)' 
        }}
      >
        <div 
          ref={textRef}
          className="text-[#FFFFFF] font-black leading-none tracking-tighter whitespace-nowrap"
          style={{ 
            fontSize: 'clamp(100px, 30vw, 400px)',
            transform: `scale(1.15, ${scaleY * 0.8})`,
            transformOrigin: 'center'
          }}
        >
          404
        </div>
        <div 
          className="absolute rounded-full bg-[#FFFFFF]"
          style={{
            height: 'clamp(22vh, 26vh, 50vh)',
            width: 'clamp(120px, 20vw, 400px)',
            transform: `scale(1, ${scaleY * 1.4})`,
            transformOrigin: 'center'
          }}
        />
      </div>

      {/* NAVIGATION BAR */}
      <nav className="relative z-20 flex flex-row items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        <div className="flex items-center">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-white font-bold text-lg sm:text-xl ml-2">TinyTrails</span>
        </div>

        <div className="hidden md:flex flex-row gap-1">
          {["About Us", "Programs", "Reviews", "FAQ", "Contacts"].map((item) => (
            <a key={item} href="#" className="px-4 py-1.5 text-sm font-medium rounded-full bg-white text-[#F16524] hover:opacity-90 transition-colors">
              {item}
            </a>
          ))}
        </div>

        <button 
          onClick={() => setMenuOpen(true)}
          className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-white bg-[#F16524] hover:opacity-90 transition-colors flex items-center gap-2"
        >
          <Menu className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Menu</span>
        </button>
      </nav>

      {/* CENTER VIDEO */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ marginTop: 'calc(-6vh - 40px)' }}
      >
        <div className="w-[120vw] h-[85vh] sm:w-[70vw] sm:h-[70vh] md:w-[62vw] md:h-[78vh]">
          <video 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260713_234424_b1332b69-2e69-4302-8dbc-40f86846afbd.mp4"
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-contain pointer-events-none mix-blend-darken"
          />
        </div>
      </div>

      {/* BOTTOM CONTENT */}
      <div className="relative z-30 mt-auto pb-8 sm:pb-16 flex flex-col items-center text-center px-4">
        <h1 className="text-white text-lg sm:text-xl md:text-2xl font-medium mb-3 sm:mb-4">
          Oops, something went wrong!
        </h1>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-full text-white font-semibold text-sm sm:text-base bg-[#F16524] hover:scale-105 hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Home
        </a>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />
        
        {/* Panel */}
        <div 
          className={`absolute top-0 right-0 h-full w-full sm:w-[380px] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF9642 100%)' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full"></div>
              </div>
              <span className="text-white font-bold text-lg sm:text-xl ml-2">TinyTrails</span>
            </div>
            <button 
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu items */}
          <div className="px-6 flex flex-col gap-3 mt-4">
            {["About Us", "Programs", "Reviews", "FAQ", "Contacts"].map((item, i) => (
              <a 
                key={item} 
                href="#"
                className={`px-6 py-4 text-lg font-semibold text-white rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-300`}
                style={{ 
                  opacity: menuOpen ? 1 : 0, 
                  transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: menuOpen ? `${150 + i * 60}ms` : '0ms'
                }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <a 
              href="/"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-white font-semibold text-base text-[#F16524] hover:scale-[1.02] transition-all duration-300"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: menuOpen ? '450ms' : '0ms'
              }}
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
