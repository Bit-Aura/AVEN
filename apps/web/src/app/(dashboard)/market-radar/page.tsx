'use client';

import { useState } from 'react';
import { 
  Radar, 
  Search, 
  Building2, 
  MapPin, 
  Briefcase, 
  ExternalLink, 
  Filter, 
  Loader2, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Layers,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { scrapeJobs, ScrapedJob, ScrapeResult } from '../../../api/client';

// Optional quick-pick convenience presets (strictly verified active public boards)
const SOURCE_PRESETS = [
  { source: 'greenhouse', token: 'stripe', company: 'Stripe', tag: 'FinTech Infrastructure' },
  { source: 'greenhouse', token: 'cloudflare', company: 'Cloudflare', tag: 'Global Network & Security' },
  { source: 'greenhouse', token: 'figma', company: 'Figma', tag: 'Design Systems' },
  { source: 'greenhouse', token: 'canonical', company: 'Canonical', tag: 'Linux & Cloud' },
  { source: 'greenhouse', token: 'airbnb', company: 'Airbnb', tag: 'Travel Marketplace' },
  { source: 'lever', token: 'palantir', company: 'Palantir', tag: 'Enterprise AI & Data' },
  { source: 'ashby', token: 'linear', company: 'Linear', tag: 'Productivity Tech' },
  { source: 'ashby', token: 'openai', company: 'OpenAI', tag: 'Frontier AI Research' },
  { source: 'ashby', token: 'sentry', company: 'Sentry', tag: 'Developer Tooling' },
  { source: 'ashby', token: 'ramp', company: 'Ramp', tag: 'Finance Automation' },
  { source: 'amazon', token: 'software-development', company: 'Amazon', tag: 'AWS Cloud & Infrastructure' },
  { source: 'google', token: 'software engineer', company: 'Google', tag: 'Distributed Systems & AI' },
];

const SOURCE_GUIDANCE: Record<string, {
  name: string;
  inputLabel: string;
  placeholder: string;
  helper: string;
  defaultCompany?: string;
}> = {
  greenhouse: {
    name: 'Greenhouse REST API',
    inputLabel: 'Board Token / Slug',
    placeholder: 'e.g. stripe, cloudflare, figma, airbnb, canonical (or any Greenhouse board token)',
    helper: 'Enter the public board token (from https://boards.greenhouse.io/{board_token})',
  },
  lever: {
    name: 'Lever Postings API',
    inputLabel: 'Site Slug / Identifier',
    placeholder: 'e.g. palantir (or any valid Lever site slug)',
    helper: 'Enter the company site slug (from https://jobs.lever.co/{site})',
  },
  ashby: {
    name: 'Ashby Board API',
    inputLabel: 'Job Board Identifier',
    placeholder: 'e.g. linear, openai, sentry, ramp (or any Ashby board identifier)',
    helper: 'Enter the job board identifier (from https://jobs.ashbyhq.com/{jobBoardName})',
  },
  amazon: {
    name: 'Amazon Jobs Public API',
    inputLabel: 'Category or Keyword',
    placeholder: 'e.g. software-development, machine-learning',
    helper: 'Enter a category slug (e.g. software-development) or keyword query for Amazon Jobs',
    defaultCompany: 'Amazon',
  },
  google: {
    name: 'Google Careers Search',
    inputLabel: 'Search Query / Role Title',
    placeholder: 'e.g. software engineer, data engineer, distributed systems',
    helper: 'Enter a search query or role title for Google Careers',
    defaultCompany: 'Google',
  },
};

export default function MarketRadarPage() {
  const [selectedSource, setSelectedSource] = useState('greenhouse');
  const [boardToken, setBoardToken] = useState('stripe');
  const [companyName, setCompanyName] = useState('Stripe');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');

  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const activeGuidance = SOURCE_GUIDANCE[selectedSource] || SOURCE_GUIDANCE['greenhouse'];

  const handleSourceChange = (newSource: string) => {
    setSelectedSource(newSource);
    const guidance = SOURCE_GUIDANCE[newSource];
    if (guidance?.defaultCompany) {
      setCompanyName(guidance.defaultCompany);
    }
  };

  const handleScrape = async (src?: string, token?: string, comp?: string) => {
    const activeSource = src || selectedSource;
    const activeToken = (token !== undefined ? token : boardToken).trim();
    const activeCompany = (comp !== undefined ? comp : companyName).trim();

    if (!activeToken) {
      setError('Please provide a valid board token or search identifier.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result = await scrapeJobs({
        source: activeSource,
        board_token: activeToken,
        company_name: activeCompany || undefined,
        limit: 30
      });
      setScrapeResult(result);

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(' | '));
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to execute job scrape request.';
      setError(msg);
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

  // Filter jobs by local search query and job type
  const filteredJobs = (scrapeResult?.jobs || []).filter((job) => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = jobTypeFilter === 'all' || 
      (job.job_type && job.job_type.toLowerCase().includes(jobTypeFilter.toLowerCase()));

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radar className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Market Intelligence</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Live Job Market Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-source ATS scraping & ETL normalization pipeline (Greenhouse, Lever, Ashby, Amazon, Google)
          </p>
        </div>

        {scrapeResult && (
          <div className="flex items-center gap-3 text-xs bg-surface border border-border px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Source:</span>
              <span className="font-bold text-indigo-400 uppercase">{scrapeResult.source}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Fetched:</span>
              <span className="font-bold text-white">{scrapeResult.total_fetched}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Deduplicated:</span>
              <span className="font-bold text-emerald-400">{scrapeResult.total_deduplicated}</span>
            </div>
          </div>
        )}
      </div>

      {/* Scraper Configuration Bar */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-glass space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter size={14} className="text-indigo-400" />
            <span>Target Any Public Career Board / Search Query</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Supports arbitrary companies on Greenhouse, Lever, Ashby, Amazon, Google
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Source Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">Adapter Source</label>
            <select
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-brand-500"
            >
              <option value="greenhouse">Greenhouse REST API</option>
              <option value="lever">Lever Postings API</option>
              <option value="ashby">Ashby Board API</option>
              <option value="amazon">Amazon Jobs Public API</option>
              <option value="google">Google Careers Search</option>
            </select>
          </div>

          {/* Board Token / Identifier Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">{activeGuidance.inputLabel}</label>
            <input
              type="text"
              value={boardToken}
              onChange={(e) => setBoardToken(e.target.value)}
              placeholder={activeGuidance.placeholder}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Company Display Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">Company Name (Optional)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stripe, Cloudflare, Linear"
              className="w-full bg-surface-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Trigger Button */}
          <div className="flex items-end">
            <button
              onClick={() => handleScrape()}
              disabled={isLoading || !boardToken.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-surface-tertiary text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Radar size={14} />
                  <span>Run Live Scrape</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Source Helper Guidance */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-surface-secondary/40 px-3 py-2 rounded-lg border border-border/50">
          <HelpCircle size={13} className="text-indigo-400 shrink-0" />
          <span>{activeGuidance.helper}</span>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            Quick Picks:
          </span>
          <div className="flex gap-2">
            {SOURCE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetSelect(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
                  boardToken.toLowerCase() === preset.token.toLowerCase() && selectedSource === preset.source
                    ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                    : 'bg-surface-secondary/50 border-border text-slate-400 hover:text-white'
                }`}
              >
                {preset.company} <span className="text-[10px] text-slate-500">({preset.source})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter / Search within scraped results */}
      {scrapeResult && scrapeResult.jobs.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter extracted jobs by title, city, or keyword..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type:</span>
            {['all', 'full_time', 'internship', 'contract'].map((t) => (
              <button
                key={t}
                onClick={() => setJobTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition-all ${
                  jobTypeFilter === t
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-indigo'
                    : 'bg-surface border-border text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prominent Error Message Display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-bold text-rose-200">Scrape Request Error</p>
            <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Job Results Grid or Empty/State Screens */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-surface border border-border space-y-4 animate-pulse">
              <div className="h-4 bg-surface-secondary rounded w-1/3" />
              <div className="h-6 bg-surface-secondary rounded w-3/4" />
              <div className="h-16 bg-surface-secondary rounded" />
            </div>
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job, idx) => (
            <div 
              key={job.external_id || idx}
              className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass flex flex-col justify-between transition-all duration-200 group"
            >
              <div className="space-y-3">
                {/* Source & Type Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5">
                    <Building2 size={13} className="text-brand-400" />
                    {job.company || companyName || 'Company Board'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    job.job_type === 'internship'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {job.job_type || 'full_time'}
                  </span>
                </div>

                {/* Job Title */}
                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-2">
                  {job.title}
                </h3>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{job.location || 'Remote / Unspecified'}</span>
                </div>

                {/* Description Preview */}
                {job.description && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>
                )}
              </div>

              {/* Footer / Link */}
              <div className="pt-4 mt-4 border-t border-border/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock size={11} />
                  {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : 'Active Posting'}
                </span>

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <span>Apply</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched && scrapeResult && scrapeResult.total_deduplicated > 0 ? (
        /* Case C: Jobs returned by scrape, but filtered out by local search/type filter */
        <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8">
          <Filter className="text-slate-600 mx-auto mb-3" size={38} />
          <h3 className="text-base font-bold text-white mb-1">No Jobs Match Active Local Filters</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
            {scrapeResult.total_deduplicated} jobs were extracted from {scrapeResult.board_identifier}, but none matched your filter &quot;{searchQuery}&quot; (type: {jobTypeFilter}).
          </p>
          <button
            onClick={() => { setSearchQuery(''); setJobTypeFilter('all'); }}
            className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white font-bold text-xs rounded-xl transition-colors border border-border"
          >
            Clear Filters
          </button>
        </div>
      ) : hasSearched && scrapeResult && scrapeResult.total_fetched === 0 && !error ? (
        /* Case B: Scrape completed successfully, but the external board currently has 0 postings */
        <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8">
          <Radar className="text-slate-600 mx-auto mb-3" size={40} />
          <h3 className="text-base font-bold text-white mb-1">No Active Postings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            The board &apos;{boardToken}&apos; was queried successfully, but returned 0 active job postings.
          </p>
        </div>
      ) : (
        /* Case D: Initial landing state before running a scrape */
        <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8">
          <Radar className="text-brand-500/70 mx-auto mb-3 animate-pulse" size={44} />
          <h3 className="text-base font-bold text-white mb-1">Ready to Query Live Job Markets</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Enter any public ATS board identifier (Greenhouse, Lever, Ashby) or query Big Tech portals (Amazon, Google) to extract and normalize live hiring data.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleScrape('greenhouse', 'stripe', 'Stripe')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl transition-colors shadow-glow-indigo"
            >
              Scrape Stripe (Greenhouse)
            </button>
            <button
              onClick={() => handleScrape('ashby', 'linear', 'Linear')}
              className="px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-white font-bold text-xs rounded-xl transition-colors border border-border"
            >
              Scrape Linear (Ashby)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
