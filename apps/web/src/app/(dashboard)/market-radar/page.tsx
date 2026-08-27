'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, 
  Search, 
  Target, 
  Zap, 
  Globe,
  LineChart,
  BrainCircuit,
  TrendingUp,
  Crosshair,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { scrapeJobs, ScrapeResult } from '../../../api/client';

const SOURCE_PRESETS = [
  { source: 'greenhouse', token: 'stripe', company: 'Stripe', domain: 'stripe.com', tag: 'FinTech Ecosystem', span: 'md:col-span-2 md:row-span-2' },
  { source: 'ashby', token: 'openai', company: 'OpenAI', domain: 'openai.com', tag: 'Frontier AI Research', span: 'md:col-span-2' },
  { source: 'greenhouse', token: 'cloudflare', company: 'Cloudflare', domain: 'cloudflare.com', tag: 'Global Security', span: 'md:col-span-1' },
  { source: 'greenhouse', token: 'figma', company: 'Figma', domain: 'figma.com', tag: 'Design Systems', span: 'md:col-span-1' },
  { source: 'ashby', token: 'linear', company: 'Linear', domain: 'linear.app', tag: 'Productivity Tech', span: 'md:col-span-2' },
  { source: 'lever', token: 'palantir', company: 'Palantir', domain: 'palantir.com', tag: 'Enterprise Data', span: 'md:col-span-1' },
  { source: 'amazon', token: 'software-development', company: 'Amazon', domain: 'amazon.com', tag: 'AWS Cloud', span: 'md:col-span-1' },
];

const SOURCE_GUIDANCE: Record<string, {
  name: string;
  inputLabel: string;
  placeholder: string;
  helper: string;
  defaultCompany?: string;
}> = {
  greenhouse: { name: 'Greenhouse API', inputLabel: 'Board Token', placeholder: 'e.g. stripe', helper: 'Enter token from boards.greenhouse.io/{token}' },
  lever: { name: 'Lever API', inputLabel: 'Site Slug', placeholder: 'e.g. palantir', helper: 'Enter slug from jobs.lever.co/{slug}' },
  ashby: { name: 'Ashby API', inputLabel: 'Board Identifier', placeholder: 'e.g. linear', helper: 'Enter ID from jobs.ashbyhq.com/{id}' },
  amazon: { name: 'Amazon Jobs', inputLabel: 'Category', placeholder: 'e.g. software-development', helper: 'Category slug or keyword', defaultCompany: 'Amazon' },
  google: { name: 'Google Careers', inputLabel: 'Role Title', placeholder: 'e.g. software engineer', helper: 'Search query for Google Careers', defaultCompany: 'Google' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

// --- Intelligence Engine Simulators ---

function computeMatchScore(jobTitle: string = '') {
  const title = jobTitle.toLowerCase();
  let baseScore = 55;
  if (title.includes('backend') || title.includes('software') || title.includes('engineer')) baseScore += 25;
  if (title.includes('senior') || title.includes('staff')) baseScore -= 10;
  if (title.includes('sales') || title.includes('marketing') || title.includes('executive')) baseScore -= 35;
  if (title.includes('data') || title.includes('machine learning')) baseScore += 15;
  const noise = (jobTitle.length % 15) - 7;
  return Math.min(99, Math.max(12, baseScore + noise));
}

const TECH_KEYWORDS = ['Python', 'Go', 'AWS', 'React', 'Node', 'SQL', 'Docker', 'Kubernetes', 'TypeScript', 'Machine Learning', 'Rust', 'C++', 'Java'];
function extractTrendingSkills(jobs: any[]) {
  const counts: Record<string, number> = {};
  jobs.forEach(job => {
    const text = (job.title + " " + (job.description || '')).toLowerCase();
    TECH_KEYWORDS.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        counts[kw] = (counts[kw] || 0) + 1;
      }
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([skill]) => skill);
}

function MatchScorePill({ score }: { score: number }) {
  const isHigh = score >= 80;
  const isMed = score >= 60 && score < 80;
  
  const bgClass = isHigh ? 'bg-[#141413] text-[#faf9f5]' 
                : isMed ? 'bg-[#e8e6dc] border border-[#141413]/10 text-[#141413]' 
                : 'bg-[#faf9f5] border border-[#141413]/10 text-[#3d3d3a]';
                
  const dotClass = isHigh ? 'bg-emerald-400' 
                 : isMed ? 'bg-amber-400' 
                 : 'bg-rose-400';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bgClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="text-[10px] font-black tracking-widest">{score}%</span>
    </div>
  );
}

function CustomPlatformSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { value: 'greenhouse', label: 'Greenhouse' },
    { value: 'lever', label: 'Lever' },
    { value: 'ashby', label: 'Ashby' },
    { value: 'amazon', label: 'Amazon Jobs' },
    { value: 'google', label: 'Google Careers' }
  ];
  const activeLabel = options.find(o => o.value === value)?.label || 'Select Platform';

  return (
    <div className="relative w-full">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-transparent border-b border-[#faf9f5]/20 py-2 text-xs font-bold text-[#faf9f5] focus:outline-none focus:border-[#faf9f5] flex items-center justify-between text-left"
      >
        {activeLabel}
        <ChevronDown size={14} className={`transition-transform text-[#faf9f5]/70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-2 w-full bg-[#e8e6dc] border border-[#141413]/10 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                  value === opt.value 
                    ? 'bg-[#141413] text-[#faf9f5]' 
                    : 'text-[#141413] hover:bg-[#d6d3c4]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MarketRadarPage() {
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState('greenhouse');
  const [boardToken, setBoardToken] = useState('stripe');
  const [companyName, setCompanyName] = useState('Stripe');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const activeGuidance = SOURCE_GUIDANCE[selectedSource] || SOURCE_GUIDANCE['greenhouse'];
  const isDashboardMode = hasSearched || isLoading;

  const handleSourceChange = (newSource: string) => {
    setSelectedSource(newSource);
    const guidance = SOURCE_GUIDANCE[newSource];
    if (guidance?.defaultCompany) setCompanyName(guidance.defaultCompany);
  };

  const handleScrape = async (src?: string, token?: string, comp?: string) => {
    const activeSource = src || selectedSource;
    const activeToken = (token !== undefined ? token : boardToken).trim();
    const activeCompany = (comp !== undefined ? comp : companyName).trim();

    if (!activeToken) return setError('Please provide a valid identifier.');

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchQuery('');
    setJobTypeFilter('all');

    try {
      const result = await scrapeJobs({ source: activeSource, board_token: activeToken, company_name: activeCompany || undefined, limit: 40 });
      setScrapeResult(result);
      if (result.errors && result.errors.length > 0) setError(result.errors.join(' | '));
    } catch (e: any) {
      setError(e?.message || 'Failed to execute job scrape request.');
      setScrapeResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (preset: typeof SOURCE_PRESETS[0]) => {
    setSelectedSource(preset.source);
    setBoardToken(preset.token);
    setCompanyName(preset.company);
    handleScrape(preset.source, preset.token, preset.company);
  };

  const { filteredJobs, trendingSkills, avgScore } = useMemo(() => {
    const rawJobs = scrapeResult?.jobs || [];
    const jobsWithScores = rawJobs.map(job => ({ ...job, matchScore: computeMatchScore(job.title) }));
    
    const filtered = jobsWithScores.filter((job) => {
      const matchesSearch = !searchQuery || job.title.toLowerCase().includes(searchQuery.toLowerCase()) || (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = jobTypeFilter === 'all' || (job.job_type && job.job_type.toLowerCase().includes(jobTypeFilter.toLowerCase()));
      return matchesSearch && matchesType;
    }).sort((a, b) => b.matchScore - a.matchScore);

    const trends = extractTrendingSkills(rawJobs);
    const avg = rawJobs.length > 0 ? Math.round(jobsWithScores.reduce((acc, j) => acc + j.matchScore, 0) / rawJobs.length) : 0;
    
    return { filteredJobs: filtered, trendingSkills: trends, avgScore: avg };
  }, [scrapeResult, searchQuery, jobTypeFilter]);


  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 relative min-h-[80vh] text-[#141413]">
      
      <div className="relative z-10">
        
        {/* Animated Header */}
        <motion.div 
          layout
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 transition-all duration-700 ${!isDashboardMode ? 'pt-10' : 'pb-6 border-b border-[#141413]/10'}`}
        >
          <div className={`space-y-2 ${!isDashboardMode ? 'text-center md:text-left mx-auto md:mx-0 w-full' : ''}`}>
            <div className={`flex items-center gap-2 ${!isDashboardMode ? 'justify-center md:justify-start' : ''}`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3d3d3a]">Market Intelligence</span>
            </div>
            <h1 className={`font-black text-[#141413] tracking-tight transition-all duration-700 ${!isDashboardMode ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>
              Job Market Radar
            </h1>
            <p className={`text-[#3d3d3a] transition-all duration-700 ${!isDashboardMode ? 'text-base max-w-2xl mx-auto md:mx-0' : 'text-sm max-w-2xl'}`}>
              Live ATS extraction mapped to your Target Role profile. Find hidden opportunities and analyze skill gaps instantly.
            </p>
          </div>

          {scrapeResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 text-xs bg-[#faf9f5] border border-[#141413]/10 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex flex-col">
                <span className="text-[#3d3d3a] text-[10px] font-black uppercase tracking-wider mb-0.5">Source</span>
                <span className="font-black text-[#141413] uppercase flex items-center gap-1.5"><Globe size={12} className="text-[#141413]" /> {scrapeResult.source}</span>
              </div>
              <div className="w-px h-8 bg-[#141413]/20" />
              <div className="flex flex-col">
                <span className="text-[#3d3d3a] text-[10px] font-black uppercase tracking-wider mb-0.5">Found</span>
                <span className="font-black text-[#141413]">{scrapeResult.total_fetched}</span>
              </div>
              <div className="w-px h-8 bg-[#141413]/20" />
              <div className="flex flex-col">
                <span className="text-[#3d3d3a] text-[10px] font-black uppercase tracking-wider mb-0.5">Unique</span>
                <span className="font-black text-[#141413]">{scrapeResult.total_deduplicated}</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* HERO MODE GRID OR DASHBOARD PANEL */}
        <AnimatePresence mode="wait">
          {!isDashboardMode ? (
            <motion.div 
              key="hero-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className="pt-16 pb-32 flex flex-col items-center justify-center min-h-[50vh]"
            >
              <div className="flex items-center gap-3 mb-8">
                <Crosshair size={24} className="text-[#3d3d3a]" />
                <h2 className="text-2xl font-black text-[#141413]">Target Acquisition</h2>
              </div>
              
              {/* Ultra-Premium Dense Target List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-5xl">
                {SOURCE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.company}
                    layoutId={`preset-${preset.company}`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePresetSelect(preset)}
                    className="group p-5 rounded-[1.5rem] flex items-center gap-4 text-left bg-[#faf9f5] border border-[#141413]/10 hover:border-[#141413]/20 shadow-sm hover:shadow-md transition-all duration-300 w-full"
                  >
                    {/* Real Favicon */}
                    <div className="w-12 h-12 rounded-xl bg-[#e8e6dc] border border-[#141413]/10 flex shrink-0 items-center justify-center p-2.5 transition-all duration-300">
                      <img src={`https://www.google.com/s2/favicons?domain=${preset.domain}&sz=64`} alt={preset.company} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    
                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[17px] font-black text-[#141413] tracking-tight truncate">{preset.company}</h3>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#3d3d3a] truncate block">{preset.tag}</span>
                    </div>

                    {/* Action Arrow */}
                    <div className="w-8 h-8 rounded-full bg-[#141413] flex items-center justify-center shrink-0 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <ArrowRight size={14} className="text-[#faf9f5]" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center w-full max-w-3xl">
                <p className="text-[10px] text-[#3d3d3a] uppercase tracking-widest font-black mb-4">Or Use Custom Target</p>
                <div className="w-full bg-[#3d3d3a] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center shadow-lg">
                    <div className="flex flex-col md:flex-row gap-4 w-full px-4">
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">Platform</label>
                        <CustomPlatformSelect value={selectedSource} onChange={handleSourceChange} />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">{activeGuidance.inputLabel}</label>
                        <input type="text" value={boardToken} onChange={(e) => setBoardToken(e.target.value)} placeholder={activeGuidance.placeholder} className="w-full bg-transparent border-b border-[#faf9f5]/20 py-2 text-xs font-bold text-[#faf9f5] placeholder:text-[#faf9f5]/30 focus:outline-none focus:border-[#faf9f5]" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">Company Name</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Stripe" className="w-full bg-transparent border-b border-[#faf9f5]/20 py-2 text-xs font-bold text-[#faf9f5] placeholder:text-[#faf9f5]/30 focus:outline-none focus:border-[#faf9f5]" />
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleScrape()} disabled={isLoading || !boardToken.trim()} className="shrink-0 h-full flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-[#5A59E8] hover:bg-[#4948d3] text-white font-black text-xs transition-all duration-300 disabled:opacity-50">
                      <Radar size={14} /> Extract
                    </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 space-y-6"
            >
              {/* Condensed Control Panel */}
              <div className="p-4 rounded-3xl bg-[#faf9f5] border border-[#141413]/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap flex-1">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-[#141413]" />
                    <span className="text-[10px] font-black text-[#3d3d3a] uppercase tracking-widest">Targets</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_PRESETS.map((preset) => {
                      const isActive = boardToken.toLowerCase() === preset.token.toLowerCase() && selectedSource === preset.source;
                      return (
                        <motion.button 
                          key={preset.company} 
                          layoutId={`preset-${preset.company}`}
                          whileHover={{ scale: 1.05 }} 
                          whileTap={{ scale: 0.95 }} 
                          onClick={() => handlePresetSelect(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-300 border ${
                            isActive ? 'bg-[#e8e6dc] border-[#141413]/20 text-[#141413]'
                                     : 'bg-[#faf9f5] border-[#141413]/10 hover:border-[#141413]/20 text-[#3d3d3a] hover:text-[#141413]'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-[#faf9f5] flex items-center justify-center overflow-hidden shrink-0 border border-[#141413]/10">
                            <img src={`https://www.google.com/s2/favicons?domain=${preset.domain}&sz=64`} alt="" className="w-full h-full object-cover mix-blend-multiply" />
                          </div>
                          {preset.company}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="shrink-0 p-2 rounded-xl bg-[#e8e6dc] border border-[#141413]/10 hover:border-[#141413]/20 text-[#141413] transition-colors">
                  <Filter size={16} />
                </button>
              </div>

              {/* Advanced Query Dropdown in Dashboard Mode */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div className="w-full bg-[#3d3d3a] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center shadow-md">
                        <div className="flex flex-col md:flex-row gap-4 w-full px-4">
                          <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">Platform</label>
                            <CustomPlatformSelect value={selectedSource} onChange={handleSourceChange} />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">{activeGuidance.inputLabel}</label>
                            <input type="text" value={boardToken} onChange={(e) => setBoardToken(e.target.value)} placeholder={activeGuidance.placeholder} className="w-full bg-transparent border-b border-[#faf9f5]/20 py-2 text-xs font-bold text-[#faf9f5] placeholder:text-[#faf9f5]/30 focus:outline-none focus:border-[#faf9f5]" />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-[#faf9f5]/70 uppercase tracking-wider">Company Name</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Stripe" className="w-full bg-transparent border-b border-[#faf9f5]/20 py-2 text-xs font-bold text-[#faf9f5] placeholder:text-[#faf9f5]/30 focus:outline-none focus:border-[#faf9f5]" />
                          </div>
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleScrape()} disabled={isLoading || !boardToken.trim()} className="shrink-0 h-full flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-[#5A59E8] hover:bg-[#4948d3] text-white font-black text-xs transition-all duration-300 disabled:opacity-50">
                          <Radar size={14} /> Run Extraction
                        </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Market Pulse Dashboard */}
              <AnimatePresence>
                {scrapeResult && !isLoading && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-3 p-6 bg-[#faf9f5] border border-[#141413]/10 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#e8e6dc] rounded-xl border border-[#141413]/10"><LineChart className="text-[#141413]" size={24} /></div>
                        <div>
                          <h3 className="text-sm font-black text-[#141413] flex items-center gap-2">Market Pulse <span className="text-[10px] font-bold text-[#3d3d3a]">| {scrapeResult.board_identifier}</span></h3>
                          <p className="text-xs text-[#3d3d3a] mt-1 font-semibold">Scanned {scrapeResult.total_fetched} active postings. {scrapeResult.total_deduplicated} unique roles extracted.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase text-[#3d3d3a] tracking-wider">Avg Profile Match</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Target size={14} className="text-[#141413]" />
                            <span className="text-xl font-black text-[#141413]">{avgScore}%</span>
                          </div>
                        </div>
                        <div className="w-px h-10 bg-[#141413]/20 hidden sm:block" />
                        <div className="flex flex-col items-end hidden sm:flex">
                          <span className="text-[10px] font-black uppercase text-[#3d3d3a] tracking-wider mb-1.5">Trending Tech</span>
                          <div className="flex gap-1.5">
                            {trendingSkills.length > 0 ? trendingSkills.map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-[#e8e6dc] border border-[#141413]/10 text-[#141413] text-[10px] font-black rounded">{skill}</span>
                            )) : <span className="text-xs font-bold text-[#3d3d3a]">Not enough data</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Data Display */}
              <div className="space-y-6 pt-4">
                <AnimatePresence>
                  {scrapeResult && scrapeResult.jobs.length > 0 && !isLoading && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#faf9f5] p-4 rounded-3xl border border-[#141413]/10 shadow-sm">
                      <div className="relative flex-1 max-w-md">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#141413]" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by role, tech, or location..." className="w-full bg-[#e8e6dc] border border-[#141413]/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#141413] placeholder:text-[#3d3d3a] focus:outline-none focus:border-[#141413]/20 transition-all duration-300" />
                      </div>
                      <div className="flex items-center gap-1.5 p-1 bg-[#e8e6dc] rounded-xl border border-[#141413]/10">
                        {['all', 'full_time', 'internship', 'contract'].map((t) => (
                          <button key={t} onClick={() => setJobTypeFilter(t)} className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${jobTypeFilter === t ? 'bg-[#141413] text-[#faf9f5]' : 'text-[#3d3d3a] hover:text-[#141413] hover:bg-[#d6d3c4]'}`}>
                            {t.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isLoading ? (
                  <div className="py-32 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-24 h-24 rounded-full border-2 border-[#141413]/10 border-t-[#141413]" />
                      <div className="absolute inset-0 flex items-center justify-center"><Radar className="text-[#141413] animate-pulse" size={32} /></div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-[#141413] mb-2">Synthesizing Market Data</h3>
                      <p className="text-sm font-bold text-[#3d3d3a] flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin text-[#141413]" /> Parsing job descriptions & calculating match scores...
                      </p>
                    </div>
                  </div>
                ) : filteredJobs.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {filteredJobs.map((job, idx) => {
                        const pseudoReqs = TECH_KEYWORDS.filter(k => (job.title + " " + job.description).toLowerCase().includes(k.toLowerCase())).slice(0, 2);
                        return (
                          <motion.div key={job.external_id || `${job.title}-${idx}`} layout variants={itemVariants} whileHover={{ scale: 1.02, y: -4 }} className="p-6 rounded-[2rem] bg-[#faf9f5] border border-[#141413]/10 hover:border-[#141413]/20 shadow-md flex flex-col justify-between group transition-all duration-300 relative overflow-hidden">
                            <div className="space-y-4 relative z-10">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                  <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-6 h-6 rounded-md overflow-hidden bg-[#e8e6dc] border border-[#141413]/10 shrink-0 p-0.5">
                                      <img src={`https://www.google.com/s2/favicons?domain=${(job.company || companyName || '').replace(/\s+/g, '').toLowerCase()}.com&sz=64`} alt="" className="w-full h-full object-cover rounded-sm mix-blend-multiply" />
                                    </div>
                                    <span className="font-black text-[#3d3d3a] text-[10px] uppercase tracking-widest">
                                      {job.company || companyName || 'Company'}
                                    </span>
                                  </div>
                                  <h3 className="text-[17px] font-black text-[#141413] transition-colors line-clamp-2 leading-tight pr-2">{job.title}</h3>
                                </div>
                                <div className="shrink-0 pt-1"><MatchScorePill score={job.matchScore} /></div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-[#3d3d3a] bg-[#e8e6dc] border border-[#141413]/10 px-2 py-1 rounded-md">
                                  <span className="truncate max-w-[120px]">{job.location || 'Remote'}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${job.job_type === 'internship' ? 'bg-[#141413] text-[#faf9f5]' : 'bg-[#e8e6dc] border border-[#141413]/10 text-[#141413]'}`}>
                                  {job.job_type || 'full_time'}
                                </span>
                              </div>
                              {pseudoReqs.length > 0 && (
                                <div className="flex items-center gap-2 pt-3 border-t border-[#141413]/10">
                                  <BrainCircuit size={12} className="text-[#141413]" />
                                  <div className="flex gap-1.5">{pseudoReqs.map(req => <span key={req} className="text-[10px] font-black text-[#141413] bg-[#e8e6dc] border border-[#141413]/10 px-1.5 py-0.5 rounded">{req}</span>)}</div>
                                </div>
                              )}
                            </div>
                            <div className="pt-4 mt-auto flex flex-col gap-3 relative z-10">
                              <div className="flex items-center gap-3 w-full">
                                <button 
                                  onClick={() => router.push(`/war-room?target=${encodeURIComponent(job.company || companyName || 'Company')}&role=${encodeURIComponent(job.title)}`)}
                                  className="flex-1 group flex items-center justify-center gap-2 py-3 rounded-xl bg-[#e8e6dc] hover:bg-[#d6d3c4] border border-[#141413]/10 hover:border-[#141413]/20 shadow-sm transition-all duration-300"
                                >
                                  <span className="text-[10px] font-black text-[#141413] uppercase tracking-widest flex items-center gap-1.5">
                                    Deploy War Room <Zap size={14} className="text-[#141413]" />
                                  </span>
                                </button>
                                {job.url && (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#faf9f5] hover:bg-[#e8e6dc] border border-[#141413]/10 hover:border-[#141413]/20 text-[10px] font-black uppercase tracking-widest text-[#141413] transition-all duration-300 group">
                                    <span className="flex items-center gap-1.5">Apply <ExternalLink size={12} className="text-[#3d3d3a] group-hover:text-[#141413] transition-colors" /></span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                ) : hasSearched && scrapeResult && !isLoading ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-[#faf9f5] border border-[#141413]/10 rounded-3xl shadow-sm">
                    <TrendingUp className="text-[#3d3d3a] mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-black text-[#141413] mb-2">No High-Match Roles Found</h3>
                    <p className="text-sm font-bold text-[#3d3d3a] max-w-md mx-auto mb-6">The market pulse indicates 0 active postings aligning with your criteria.</p>
                    <button onClick={() => { setSearchQuery(''); setJobTypeFilter('all'); }} className="px-6 py-2.5 bg-[#141413] hover:bg-[#3d3d3a] text-[#faf9f5] font-black text-xs uppercase tracking-widest rounded-xl transition-colors">Clear Filters</button>
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
