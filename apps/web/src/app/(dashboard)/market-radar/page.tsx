'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, 
  Search, 
  Building2, 
  MapPin, 
  ExternalLink, 
  Filter, 
  Loader2, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Briefcase,
  Zap,
  Globe,
  ChevronDown,
  LineChart,
  Target,
  Swords,
  BrainCircuit,
  TrendingUp,
  Crosshair
} from 'lucide-react';
import { scrapeJobs, ScrapeResult } from '../../../api/client';

const SOURCE_PRESETS = [
  { source: 'greenhouse', token: 'stripe', company: 'Stripe', domain: 'stripe.com', tag: 'FinTech Ecosystem', span: 'md:col-span-2 md:row-span-2', glow: 'bg-indigo-500' },
  { source: 'ashby', token: 'openai', company: 'OpenAI', domain: 'openai.com', tag: 'Frontier AI Research', span: 'md:col-span-2', glow: 'bg-emerald-500' },
  { source: 'greenhouse', token: 'cloudflare', company: 'Cloudflare', domain: 'cloudflare.com', tag: 'Global Security', span: 'md:col-span-1', glow: 'bg-amber-500' },
  { source: 'greenhouse', token: 'figma', company: 'Figma', domain: 'figma.com', tag: 'Design Systems', span: 'md:col-span-1', glow: 'bg-rose-500' },
  { source: 'ashby', token: 'linear', company: 'Linear', domain: 'linear.app', tag: 'Productivity Tech', span: 'md:col-span-2', glow: 'bg-purple-500' },
  { source: 'lever', token: 'palantir', company: 'Palantir', domain: 'palantir.com', tag: 'Enterprise Data', span: 'md:col-span-1', glow: 'bg-slate-400' },
  { source: 'amazon', token: 'software-development', company: 'Amazon', domain: 'amazon.com', tag: 'AWS Cloud', span: 'md:col-span-1', glow: 'bg-amber-600' },
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
  
  const bgClass = isHigh ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : isMed ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                
  const dotClass = isHigh ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                 : isMed ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' 
                 : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bgClass} backdrop-blur-sm`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="text-[10px] font-black tracking-widest">{score}%</span>
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12 relative min-h-[80vh]">
      
      {/* Immersive Background Visuals (Only visible in Hero Mode) */}
      <AnimatePresence>
        {!isDashboardMode && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* Dark Grid Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
            
            {/* Conic Radar Sweep */}
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-[800px] h-[800px] rounded-full opacity-30"
              style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(99, 102, 241, 0.4) 100%)' }}
            />
            
            {/* Core Glow */}
            <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px]" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        
        {/* Animated Header (Slides up slightly in Dashboard mode) */}
        <motion.div 
          layout
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className={`flex flex-col md:flex-row md:items-end justify-between gap-6 transition-all duration-700 ${!isDashboardMode ? 'pt-10' : 'pb-6 border-b border-border/50'}`}
        >
          <div className={`space-y-2 ${!isDashboardMode ? 'text-center md:text-left mx-auto md:mx-0 w-full' : ''}`}>
            <div className={`flex items-center gap-2 ${!isDashboardMode ? 'justify-center md:justify-start' : ''}`}>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Radar className="text-indigo-400" size={16} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Market Intelligence</span>
            </div>
            <h1 className={`font-extrabold text-white tracking-tight transition-all duration-700 ${!isDashboardMode ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>
              Job Market Radar
            </h1>
            <p className={`text-slate-400 transition-all duration-700 ${!isDashboardMode ? 'text-base max-w-2xl mx-auto md:mx-0' : 'text-sm max-w-2xl'}`}>
              Live ATS extraction mapped to your Target Role profile. Find hidden opportunities and analyze skill gaps instantly.
            </p>
          </div>

          {scrapeResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 text-xs bg-surface border border-border px-4 py-3 rounded-2xl shadow-glass">
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Source</span>
                <span className="font-bold text-white uppercase flex items-center gap-1.5"><Globe size={12} className="text-indigo-400" /> {scrapeResult.source}</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Found</span>
                <span className="font-bold text-white">{scrapeResult.total_fetched}</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Unique</span>
                <span className="font-bold text-emerald-400">{scrapeResult.total_deduplicated}</span>
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
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className="pt-16 pb-32 flex flex-col items-center justify-center min-h-[50vh]"
            >
              <div className="flex items-center gap-3 mb-8">
                <Crosshair size={24} className="text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Target Acquisition</h2>
              </div>
              
              {/* Ultra-Premium Bento Box Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-5xl">
                {SOURCE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.company}
                    layoutId={`preset-${preset.company}`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePresetSelect(preset)}
                    className={`relative overflow-hidden group p-6 rounded-[2rem] flex flex-col justify-end items-start text-left bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.15] shadow-2xl transition-all ${preset.span} min-h-[160px]`}
                  >
                    {/* The Glowing Orb */}
                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full ${preset.glow} blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-700`} />
                    
                    {/* The Massive Watermark */}
                    <div className="absolute -bottom-10 -right-10 w-64 h-64 opacity-[0.02] grayscale pointer-events-none group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700">
                      <img src={`https://www.google.com/s2/favicons?domain=${preset.domain}&sz=256`} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Real Favicon & Text */}
                    <div className="flex flex-col gap-4 relative z-10 w-full">
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shadow-lg p-2.5 backdrop-blur-md group-hover:bg-black/60 group-hover:border-white/20 transition-all">
                        <img src={`https://www.google.com/s2/favicons?domain=${preset.domain}&sz=64`} alt={preset.company} className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                      
                      <div className="mt-auto">
                        <h3 className="text-xl font-bold text-white tracking-tight">{preset.company}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{preset.tag}</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Or Use Custom Target</p>
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)} 
                  className="px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-sm font-bold text-slate-400 hover:text-white hover:border-white/[0.1] transition-all shadow-glass flex items-center gap-2"
                >
                  <Filter size={16} /> Enter ATS Coordinates
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 16 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} className="w-full max-w-2xl overflow-hidden">
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-[2rem] bg-surface/80 backdrop-blur-xl border border-border shadow-2xl">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</label>
                          <select value={selectedSource} onChange={(e) => handleSourceChange(e.target.value)} className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 appearance-none">
                            <option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="amazon">Amazon Jobs</option><option value="google">Google Careers</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeGuidance.inputLabel}</label>
                          <input type="text" value={boardToken} onChange={(e) => setBoardToken(e.target.value)} placeholder={activeGuidance.placeholder} className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Stripe" className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex items-end">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleScrape()} disabled={isLoading || !boardToken.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50">
                            <Radar size={14} /> Extract
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <div className="p-4 rounded-3xl bg-surface/50 backdrop-blur-xl border border-border shadow-glass flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap flex-1">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Targets</span>
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                            isActive ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                     : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.15] text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
                            <img src={`https://www.google.com/s2/favicons?domain=${preset.domain}&sz=64`} alt="" className="w-full h-full object-cover" />
                          </div>
                          {preset.company}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="shrink-0 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors">
                  <Filter size={16} />
                </button>
              </div>

              {/* Advanced Query Dropdown in Dashboard Mode */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-3xl bg-surface-secondary/50 border border-border shadow-glass">
                        {/* Same inputs as hero mode, condensed */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</label>
                          <select value={selectedSource} onChange={(e) => handleSourceChange(e.target.value)} className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 appearance-none">
                            <option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="amazon">Amazon Jobs</option><option value="google">Google Careers</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeGuidance.inputLabel}</label>
                          <input type="text" value={boardToken} onChange={(e) => setBoardToken(e.target.value)} placeholder={activeGuidance.placeholder} className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Stripe" className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div className="flex items-end">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleScrape()} disabled={isLoading || !boardToken.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50">
                            <Radar size={14} /> Run Extraction
                          </motion.button>
                        </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Market Pulse Dashboard */}
              <AnimatePresence>
                {scrapeResult && !isLoading && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-3 p-6 bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glass">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><LineChart className="text-indigo-400" size={24} /></div>
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">Market Pulse <span className="text-xs font-normal text-slate-400">| {scrapeResult.board_identifier}</span></h3>
                          <p className="text-xs text-slate-400 mt-1">Scanned {scrapeResult.total_fetched} active postings. {scrapeResult.total_deduplicated} unique roles extracted.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Avg Profile Match</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Target size={14} className={avgScore > 60 ? 'text-emerald-400' : 'text-amber-400'} />
                            <span className="text-xl font-black text-white">{avgScore}%</span>
                          </div>
                        </div>
                        <div className="w-px h-10 bg-border hidden sm:block" />
                        <div className="flex flex-col items-end hidden sm:flex">
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Trending Tech</span>
                          <div className="flex gap-1.5">
                            {trendingSkills.length > 0 ? trendingSkills.map((skill, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.05] text-slate-300 text-[10px] font-bold rounded shadow-sm">{skill}</span>
                            )) : <span className="text-xs text-slate-500">Not enough data</span>}
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
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05] shadow-glass">
                      <div className="relative flex-1 max-w-md">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by role, tech, or location..." className="w-full bg-surface-secondary border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all" />
                      </div>
                      <div className="flex items-center gap-1.5 p-1 bg-surface-secondary rounded-xl border border-white/[0.05]">
                        {['all', 'full_time', 'internship', 'contract'].map((t) => (
                          <button key={t} onClick={() => setJobTypeFilter(t)} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${jobTypeFilter === t ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}>
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
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-24 h-24 rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
                      <div className="absolute inset-0 flex items-center justify-center"><Radar className="text-indigo-400 animate-pulse" size={32} /></div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white mb-2">Synthesizing Market Data</h3>
                      <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin text-indigo-400" /> Parsing job descriptions & calculating match scores...
                      </p>
                    </div>
                  </div>
                ) : filteredJobs.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {filteredJobs.map((job, idx) => {
                        const pseudoReqs = TECH_KEYWORDS.filter(k => (job.title + " " + job.description).toLowerCase().includes(k.toLowerCase())).slice(0, 2);
                        return (
                          <motion.div key={job.external_id || `${job.title}-${idx}`} layout variants={itemVariants} whileHover={{ scale: 1.02, y: -4 }} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.15] shadow-2xl flex flex-col justify-between group transition-all relative overflow-hidden">
                            {job.matchScore > 85 && <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />}
                            <div className="space-y-4 relative z-10">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col gap-2 flex-1">
                                  <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-6 h-6 rounded-md overflow-hidden bg-black/60 border border-white/10 shrink-0 p-0.5 shadow-lg">
                                      <img src={`https://www.google.com/s2/favicons?domain=${(job.company || companyName || '').replace(/\s+/g, '').toLowerCase()}.com&sz=64`} alt="" className="w-full h-full object-cover rounded-sm" />
                                    </div>
                                    <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 text-xs uppercase tracking-widest drop-shadow-sm">
                                      {job.company || companyName || 'Company'}
                                    </span>
                                  </div>
                                  <h3 className="text-[17px] font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight pr-2 drop-shadow-sm">{job.title}</h3>
                                </div>
                                <div className="shrink-0 pt-1"><MatchScorePill score={job.matchScore} /></div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-md">
                                  <span className="truncate max-w-[120px]">{job.location || 'Remote'}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${job.job_type === 'internship' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.03] border border-white/[0.05] text-slate-400'}`}>
                                  {job.job_type || 'full_time'}
                                </span>
                              </div>
                              {pseudoReqs.length > 0 && (
                                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                  <BrainCircuit size={12} className="text-indigo-400" />
                                  <div className="flex gap-1.5">{pseudoReqs.map(req => <span key={req} className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">{req}</span>)}</div>
                                </div>
                              )}
                            </div>
                            <div className="pt-4 mt-auto flex flex-col gap-3 relative z-10">
                              <div className="flex items-center gap-3 w-full">
                                <button 
                                  onClick={() => router.push(`/war-room?target=${encodeURIComponent(job.company || companyName || 'Company')}&role=${encodeURIComponent(job.title)}`)}
                                  className="flex-1 relative overflow-hidden group flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-400/30 hover:border-indigo-300/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300"
                                >
                                  {/* Light sweep animation on hover */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30" />
                                  <span className="text-xs font-extrabold text-white uppercase tracking-wider relative z-10 flex items-center gap-1.5 drop-shadow-md">
                                    Deploy War Room <Zap size={14} className="text-indigo-200 fill-indigo-200/50" />
                                  </span>
                                </button>
                                {job.url && (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 text-xs font-bold text-slate-300 hover:text-white transition-all duration-300 relative group">
                                    <span className="relative z-10 flex items-center gap-1.5">Apply <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 transition-colors" /></span>
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
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] rounded-3xl shadow-2xl">
                    <TrendingUp className="text-slate-600 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-bold text-white mb-2">No High-Match Roles Found</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">The market pulse indicates 0 active postings aligning with your criteria.</p>
                    <button onClick={() => { setSearchQuery(''); setJobTypeFilter('all'); }} className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-xs rounded-xl transition-colors border border-white/[0.05]">Clear Filters</button>
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
