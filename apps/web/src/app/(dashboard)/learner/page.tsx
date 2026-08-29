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
import { Loader2, Play } from 'lucide-react';
import Link from 'next/link';
import { fetchRelevantCourses } from '../../../api/client';

/**
 * Enterprise-grade implementation of LearnerDashboard.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function LearnerDashboard() {
  const [isPivotDrawerOpen, setIsPivotDrawerOpen] = useState(false);
  const [activeAssessmentSkill, setActiveAssessmentSkill] = useState<string | null>(null);
  const [dynamicCourses, setDynamicCourses] = useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const fetchActivePath = usePathStore((state) => state.fetchActivePath);
  const fetchReadiness = usePathStore((state) => state.fetchReadiness);
  const activeMilestone = usePathStore((state) => state.activeMilestone);
  const targetRole = usePathStore((state) => state.targetRole);
  const isLoading = usePathStore((state) => state.isLoading);
  const pathError = usePathStore((state) => state.pathError);
  const nodes = usePathStore((state) => state.nodes);

  const profileId = usePathStore((state) => state.profileId);

  useEffect(() => {
    fetchActivePath();
    fetchReadiness();
  }, [fetchActivePath, fetchReadiness]);

  useEffect(() => {
    const targetProfileId = profileId || 1;
    if (targetProfileId) {
      const loadCourses = async () => {
        setIsLoadingCourses(true);
        try {
          const res = await fetchRelevantCourses(targetProfileId, (activeMilestone as any)?.data?.label || (activeMilestone as any)?.label || activeMilestone?.id);
          if (res && res.courses) {
            setDynamicCourses(res.courses);
          }
        } catch (e) {
          console.error("Failed to load dynamic courses", e);
        } finally {
          setIsLoadingCourses(false);
        }
      };
      loadCourses();
    }
  }, [profileId, activeMilestone]);

  return (
    <div className="text-aven-text min-h-[calc(100vh-4rem)] -m-6 md:-m-8 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header */}
        <div className="border-b border-aven-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Compass size={16} weight="bold" className="text-aven-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-aven-text-subtle">Target Role</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-medium text-aven-text tracking-tight">
              {targetRole}
            </h1>
          </div>
        </div>

        {/* Error Recovery Banner */}
        {pathError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-xs text-rose-400 font-bold">
              <Warning size={16} weight="bold" />
              <span>{pathError}</span>
            </div>
            <button
              onClick={() => fetchActivePath()}
              className="text-xs font-bold text-aven-text bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors shadow-glow-rose"
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
              <div className="bg-aven-surface border border-aven-border backdrop-blur-md rounded-2xl p-8 space-y-6 animate-pulse">
                <div className="h-4 bg-aven-base border border-aven-border rounded-md w-1/4" />
                <div className="h-10 bg-aven-base border border-aven-border rounded-lg w-2/3" />
                <div className="h-20 bg-aven-base border border-aven-border rounded-xl w-full" />
                <div className="flex gap-4 pt-4">
                  <div className="h-10 bg-aven-base border border-aven-border rounded-xl w-32" />
                  <div className="h-10 bg-aven-base border border-aven-border rounded-xl w-32" />
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
                  <div className="flex items-center justify-between pb-2 border-b border-aven-border">
                    <h3 className="text-sm font-bold text-aven-text flex items-center gap-2">
                      <Sparkle size={16} weight="bold" className="text-aven-primary" />
                      <span>Your Learning Path</span>
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-aven-text-subtle uppercase tracking-wider">
                        {completedNodes.length}/{nodes.length} Mastered
                      </span>
                      <Link
                        href="/learner/graph"
                        className="text-[10px] font-bold uppercase tracking-wider text-aven-primary hover:text-aven-primary flex items-center gap-1 transition-colors"
                      >
                        <span>Explore Full DAG</span>
                        <ArrowRight size={12} weight="bold" />
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-aven-surface border border-aven-border rounded-xl overflow-hidden shadow-glass">
                    {displayNodes.map((node, idx) => {
                      const isCompleted = node.data?.status === 'completed';
                      const isActive = node.data?.status === 'active';
                      return (
                        <div
                          key={node.id}
                          className={`p-4 flex items-center justify-between backdrop-blur-md ${isActive ? 'bg-aven-primary/10 text-aven-primary border-[0.5px] border-aven-primary/20' : 'bg-aven-surface text-aven-text-subtle'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-aven-primary/20 text-aven-primary' : isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-aven-base border border-aven-border text-aven-text-muted'
                              }`}>
                              {idx + 1}
                            </span>
                            <span className={`text-xs font-black uppercase tracking-tight ${isCompleted ? 'text-aven-text' : isActive ? 'text-aven-primary' : 'text-aven-text-muted'}`}>
                              {node.data?.label as string || node.id}
                            </span>
                          </div>
                          <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-1 rounded ${isActive ? 'bg-aven-primary/20 text-aven-primary border border-aven-primary/30' : isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-aven-base border border-aven-border text-aven-text-muted border border-aven-border'
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
            <div className="bg-aven-surface border border-aven-border backdrop-blur-md rounded-2xl p-6 flex flex-col items-start text-left shadow-glass relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-aven-primary/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-aven-primary/20" />
              <div className="w-8 h-8 rounded-lg bg-aven-primary/20 text-aven-primary border border-aven-primary/30 flex items-center justify-center mb-4 z-10">
                <ArrowsClockwise size={16} weight="bold" />
              </div>
              <h3 className="text-sm font-bold text-aven-text mb-2 z-10">Considering a Career Pivot?</h3>
              <p className="text-xs text-aven-text-subtle mb-6 leading-relaxed z-10">
                Salvage your mastered skills across adjacent high-demand tech roles.
              </p>
              <button
                onClick={() => setIsPivotDrawerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-aven-base border border-aven-border hover:bg-aven-primary/20 hover:text-aven-primary text-aven-text-subtle font-black uppercase tracking-widest text-[10px] transition-colors border border-aven-border hover:border-aven-primary/30 z-10"
              >
                <span>Explore Alternatives</span>
              </button>
            </div>

          </div>
        </div>

        {/* Relevant Courses Space (Horizontal Layout) */}
        <div className="space-y-6 pt-4 relative z-10">
          <div className="flex items-center gap-2 pb-2 border-b border-aven-border">
            <BookOpenText size={20} className="text-aven-text-subtle" />
            <h3 className="text-lg font-bold text-aven-text tracking-tight">Relevant Courses</h3>
          </div>

          {isLoadingCourses ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-aven-primary" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicCourses.map((course, i) => (
                <div key={i} className="bg-aven-surface backdrop-blur-md rounded-2xl p-6 flex flex-col border border-aven-border hover:border-aven-border transition-colors shadow-glass group">
                  <div
                    className="aspect-video bg-aven-base border border-aven-border rounded-xl overflow-hidden mb-5 shrink-0 relative cursor-pointer border border-aven-border"
                    onClick={() => setActiveVideoId(course.videoId)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${course.videoId}/maxresdefault.jpg`}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback to hqdefault if maxresdefault is not available
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${course.videoId}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center text-aven-text backdrop-blur-sm group-hover:bg-black/80 group-hover:scale-110 transition-all">
                        <Play size={24} className="ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-black text-aven-text mb-2 line-clamp-2 group-hover:text-aven-primary transition-colors" title={course.title}>{course.title}</h4>
                  <p className="text-xs text-aven-text-subtle leading-relaxed mb-4 line-clamp-3 font-medium">{course.description}</p>

                  <div className="border-t border-aven-border pt-4 mt-auto flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-aven-text-muted tracking-widest uppercase text-[9px]">Provider</span>
                      <span className="text-aven-text-subtle font-bold truncate max-w-[120px]">{course.provider}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-aven-text-muted tracking-widest uppercase text-[9px]">Duration</span>
                      <span className="text-aven-text-subtle font-bold">{course.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Modal */}
        {activeVideoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-aven-base/90 backdrop-blur-md p-4 md:p-8" onClick={() => setActiveVideoId(null)}>
            <div className="w-full max-w-5xl aspect-video bg-aven-base rounded-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.25)] border border-aven-border relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setActiveVideoId(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 text-aven-text rounded-full hover:bg-black transition-colors"
              >
                ✕
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                title="Course Video"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

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
