'use client';

import React from "react";

const techStack = [
  { name: "Next.js", icon: "https://cdn.simpleicons.org/nextdotjs/000000" },
  { name: "React", icon: "https://cdn.simpleicons.org/react/61DAFB" },
  { name: "TypeScript", icon: "https://cdn.simpleicons.org/typescript/3178C6" },
  { name: "Tailwind CSS", icon: "https://cdn.simpleicons.org/tailwindcss/06B6D4" },
  { name: "Framer Motion", icon: "https://cdn.simpleicons.org/framer/0055FF" },
  { name: "Python", icon: "https://cdn.simpleicons.org/python/3776AB" },
  { name: "FastAPI", icon: "https://cdn.simpleicons.org/fastapi/009688" },
  { name: "PostgreSQL", icon: "https://cdn.simpleicons.org/postgresql/4169E1" },
  { name: "Neo4j", icon: "https://cdn.simpleicons.org/neo4j/4581C3" },
  { name: "Clerk", icon: "https://cdn.simpleicons.org/clerk/6C47FF" },
  { name: "SQLAlchemy", icon: "https://cdn.simpleicons.org/sqlalchemy/D71F00" },
  { name: "Anthropic", icon: "https://cdn.simpleicons.org/anthropic/D97757" },
  { name: "Pydantic", icon: "https://cdn.simpleicons.org/pydantic/E92063" },
  { name: "Docker", icon: "https://cdn.simpleicons.org/docker/2496ED" },
  { name: "Vercel", icon: "https://cdn.simpleicons.org/vercel/000000" },
  { name: "Stripe", icon: "https://cdn.simpleicons.org/stripe/008CDD" },
  { name: "Figma", icon: "https://cdn.simpleicons.org/figma/F24E1E" },
  { name: "GitHub", icon: "https://cdn.simpleicons.org/github/181717" },
];

const cardColors = [
  'bg-[#f2fbf5]', // light green
  'bg-[#fdf9f1]', // light orange
  'bg-[#fcf5f5]', // light pink
  'bg-[#f0fbf9]', // light teal
  'bg-[#f4f7fe]', // light blue
];

export function TechStack() {
  return (
    <section className="relative w-full z-20 py-32 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl mb-4 font-medium tracking-tight text-[#111]">
          A professional technology foundation
        </h2>
        <p className="text-lg md:text-xl text-[#555] mb-20 max-w-3xl leading-relaxed">
          Our stack is selected to balance product polish, engineering stability, system performance,
          <br className="hidden md:block" />
          and long-term scalability across web, AI, data, and operational platforms.
        </p>

        {/* The solid border grid */}
        <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 border-t border-l border-solid border-black/10">
          {techStack.map((tech, i) => (
            <div 
              key={i} 
              className={`aspect-square ${cardColors[i % cardColors.length]} border-r border-b border-solid border-black/10 flex justify-center items-center relative group cursor-pointer`}
            >
              <div className="relative w-[55px] h-[55px] md:w-[75px] md:h-[75px] flex justify-center items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                
                {/* Tooltip */}
                <span className="absolute -top-12 bg-[#111] text-white px-3 py-1.5 rounded-full text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-lg pointer-events-none z-50">
                  {tech.name}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[5px] border-solid border-transparent border-t-[#111]" />
                </span>

                <img 
                  src={tech.icon} 
                  alt={tech.name} 
                  className="w-8 h-8 md:w-11 md:h-11 transition-all duration-300 opacity-70 group-hover:opacity-100" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
