'use client';

import { useState, useEffect } from 'react';
import { usePathStore } from '../../../store/usePathStore';
import CurrentNodeCard from '../../../components/learner/CurrentNodeCard';
import CareerAlternativesDrawer from '../../../components/learner/CareerAlternativesDrawer';
import MicroAssessmentModal from '../../../components/assessment/MicroAssessmentModal';
import { 
  ArrowsClockwise, 
  Compass, 
  Sparkle, 
  Warning, 
  ArrowRight,
  BookOpenText,
  CaretRight
} from '@phosphor-icons/react';
import Link from 'next/link';

export default function LearnerDashboard() {
  const [isPivotDrawerOpen, setIsPivotDrawerOpen] = useState(false);
  const [activeAssessmentSkill, setActiveAssessmentSkill] = useState<string | null>(null);

  const fetchActivePath = usePathStore((state) => state.fetchActivePath);
  const fetchReadiness = usePathStore((state) => state.fetchReadiness);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const targetRole = usePathStore((state) => state.targetRole);
  const isLoading = usePathStore((state) => state.isLoading);
  const pathError = usePathStore((state) => state.pathError);
  const nodes = usePathStore((state) => state.nodes);

  useEffect(() => {
    fetchActivePath();
    fetchReadiness();
  }, [fetchActivePath, fetchReadiness]);

  return (
    <div className="bg-[#faf9f5] text-[#141413] min-h-[calc(100vh-4rem)] -m-6 md:-m-8 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="border-b border-[#d6d3c4] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Compass size={16} weight="bold" className="text-[#141413]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#87867f]">Target Role</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium text-[#141413] tracking-tight">
              {targetRole}
            </h1>
          </div>
        </div>

        {/* Error Recovery Banner */}
        {pathError && (
          <div className="p-4 rounded-xl bg-white border border-[#141413] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-[#141413] font-bold">
              <Warning size={16} weight="bold" />
              <span>{pathError}</span>
            </div>
            <button
              onClick={() => fetchActivePath()}
              className="text-xs font-bold text-white bg-[#3d3d3a] hover:opacity-90 px-4 py-2 rounded-lg transition-opacity"
            >
              Retry Fetch
            </button>
          </div>
        )}

        {/* Main Grid: 2/3 and 1/3 split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Core Curriculum (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Active Learning Milestone */}
            {isLoading && !activeMilestone ? (
              <div className="bg-[#e8e6dc] border border-[#d6d3c4] rounded-2xl p-8 space-y-6 animate-pulse">
                <div className="h-4 bg-[#d6d3c4] rounded-md w-1/4" />
                <div className="h-10 bg-[#d6d3c4] rounded-lg w-2/3" />
                <div className="h-20 bg-[#d6d3c4] rounded-xl w-full" />
                <div className="flex gap-4 pt-4">
                  <div className="h-10 bg-[#d6d3c4] rounded-xl w-32" />
                  <div className="h-10 bg-[#d6d3c4] rounded-xl w-32" />
                </div>
              </div>
            ) : (
              <CurrentNodeCard 
                onStartAssessment={(skillId) => setActiveAssessmentSkill(skillId)}
              />
            )}

            {/* Quick Progress Summary (Flattened & Monochromed) */}
            {nodes.length > 0 && (() => {
              const completedNodes = nodes.filter(n => n.data?.status === 'completed');
              const activeNode = nodes.find(n => n.data?.status === 'active');
              const lockedNodes = nodes.filter(n => n.data?.status === 'locked');
              const displayNodes = [
                ...completedNodes,
                ...(activeNode ? [activeNode] : []),
                ...lockedNodes.slice(0, 3),
              ];
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#d6d3c4]">
                    <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
                      <Sparkle size={16} weight="bold" className="text-[#141413]" />
                      <span>Your Learning Path</span>
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-[#87867f] uppercase tracking-wider">
                        {completedNodes.length}/{nodes.length} Mastered
                      </span>
                      <Link
                        href="/learner/graph"
                        className="text-[10px] font-bold uppercase tracking-wider text-[#141413] hover:text-[#87867f] flex items-center gap-1 transition-colors"
                      >
                        <span>Explore Full DAG</span>
                        <ArrowRight size={12} weight="bold" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#d6d3c4] border border-[#d6d3c4] rounded-xl overflow-hidden">
                    {displayNodes.map((node, idx) => {
                      const isCompleted = node.data?.status === 'completed';
                      const isActive = node.data?.status === 'active';
                      return (
                        <div 
                          key={node.id} 
                          className={`p-4 flex items-center justify-between ${
                            isActive ? 'bg-[#3d3d3a] text-white' : 'bg-white text-[#141413]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isActive ? 'bg-white text-[#3d3d3a]' : 'bg-[#e8e6dc] text-[#87867f]'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xs font-medium">
                              {node.data?.label as string || node.id}
                            </span>
                          </div>
                          <span className={`text-[9px] uppercase font-bold tracking-widest ${
                            isActive ? 'text-white' : isCompleted ? 'text-[#141413]' : 'text-[#87867f]'
                          }`}>
                            {isCompleted ? 'Mastered' : isActive ? 'Active' : 'Locked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column: Sidebar (Courses & Career Pivot) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Pivot to Career Alternatives */}
            <div className="bg-[#e8e6dc] border border-[#d6d3c4] rounded-2xl p-6 flex flex-col items-start text-left">
              <div className="w-8 h-8 rounded-lg bg-[#3d3d3a] text-white flex items-center justify-center mb-4">
                <ArrowsClockwise size={16} weight="bold" />
              </div>
              <h3 className="text-sm font-bold text-[#141413] mb-2">Considering a Career Pivot?</h3>
              <p className="text-xs text-[#87867f] mb-6 leading-relaxed">
                Salvage your mastered skills across adjacent high-demand tech roles.
              </p>
              <button
                onClick={() => setIsPivotDrawerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#3d3d3a] hover:opacity-90 text-white font-bold text-xs transition-opacity"
              >
                <span>Explore Alternatives</span>
              </button>
            </div>

          </div>
        </div>

        {/* Relevant Courses Space (Horizontal Layout) */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#d6d3c4]">
            <BookOpenText size={20} weight="bold" className="text-[#141413]" />
            <h3 className="text-lg font-bold text-[#141413] tracking-tight">Relevant Courses</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Advanced Next.js Architecture",
                description: "Deep dive into React Server Components, streaming, and advanced routing patterns.",
                provider: "Frontend Masters",
                duration: "4h 30m"
              },
              {
                title: "RESTful API Design",
                description: "Master the principles of designing robust, scalable, and maintainable REST APIs.",
                provider: "Coursera",
                duration: "6h 15m"
              }
            ].map((course, i) => (
              <div key={i} className="bg-[#e8e6dc] rounded-2xl p-6 flex flex-col">
                <h4 className="text-xl font-bold text-[#141413] mb-2">{course.title}</h4>
                <p className="text-sm text-[#3d3d3a] leading-relaxed mb-4">{course.description}</p>
                
                <button className="flex items-center gap-1 text-xs font-bold text-[#141413] hover:text-[#87867f] transition-colors self-start mb-8">
                  <span>Course syllabus</span>
                  <ArrowRight size={12} weight="bold" />
                </button>

                <div className="border-t border-[#d6d3c4] pt-4 mb-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#87867f] tracking-widest uppercase text-[10px]">Provider</span>
                    <span className="text-[#141413]">{course.provider}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#87867f] tracking-widest uppercase text-[10px]">Duration</span>
                    <span className="text-[#141413]">{course.duration}</span>
                  </div>
                </div>

                <button className="w-fit flex items-center justify-center gap-2 py-2.5 px-5 rounded-full bg-[#3d3d3a] hover:opacity-90 text-white font-bold text-xs transition-opacity mt-auto">
                  <span>Start course</span>
                  <ArrowRight size={14} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modals & Drawers */}
        <CareerAlternativesDrawer 
          isOpen={isPivotDrawerOpen} 
          onClose={() => setIsPivotDrawerOpen(false)} 
        />

        {activeAssessmentSkill && (
          <MicroAssessmentModal 
            skillId={activeAssessmentSkill} 
            onClose={() => setActiveAssessmentSkill(null)} 
          />
        )}
      </div>
    </div>
  );
}
