'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Database, AlertTriangle, CheckCircle2, Map, ShieldAlert, Zap, Layers, Check } from 'lucide-react';
import {
  getAvailableRoadmaps,
  triggerRoadmapSync,
  getRoadmapConflicts,
  resolveRoadmapConflict,
  getRoadmapRoleMappings,
  updateRoadmapRoleMapping
} from '../../../../api/client';

interface RoadmapItem {
  slug: string;
  title: string;
  updatedAt?: string;
  cached: boolean;
  fetched_at?: string;
  credits_spent: number;
}

interface ConflictItem {
  id: number;
  slug?: string;
  conflict_type: string;
  payload: any;
  resolved: boolean;
  created_at: string;
}

/**
 * Enterprise-grade implementation of RoadmapSyncAdminPage.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function RoadmapSyncAdminPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [mappings, setMappings] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('backend_swe');
  const [roleSlugsInput, setRoleSlugsInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dataAvail, dataConf, dataMap] = await Promise.all([
        getAvailableRoadmaps(),
        getRoadmapConflicts(),
        getRoadmapRoleMappings()
      ]);

      setRoadmaps(dataAvail.roadmaps || []);
      setConflicts(dataConf.conflicts || []);
      setMappings(dataMap.mappings || {});
      if (dataMap.mappings && dataMap.mappings['backend_swe']) {
        setRoleSlugsInput(dataMap.mappings['backend_swe'].join(', '));
      }
    } catch (e: any) {
      console.error('Error loading roadmap admin data:', e);
      setMessage(e.message || 'Error fetching data from API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async (slug: string, force = true) => {
    setSyncingSlug(slug);
    setMessage(null);
    try {
      const data = await triggerRoadmapSync(slug, force);
      setMessage(`Successfully synced '${slug}': ${data.skills_upserted} skills, ${data.edges_upserted} edges upserted into Neo4j & Postgres.`);
      fetchData();
    } catch (e: any) {
      setMessage(`Failed to sync '${slug}': ${e.message || 'Unknown error'}`);
    } finally {
      setSyncingSlug(null);
    }
  };

  const handleResolveConflict = async (id: number) => {
    try {
      await resolveRoadmapConflict(id);
      setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
      setMessage(`Conflict #${id} marked as resolved.`);
    } catch (e: any) {
      console.error('Error resolving conflict:', e);
    }
  };

  const handleSaveRoleMapping = async () => {
    try {
      const slugs = roleSlugsInput.split(',').map(s => s.trim()).filter(Boolean);
      await updateRoadmapRoleMapping({ role_id: selectedRole, roadmap_slugs: slugs });
      setMessage(`Updated roadmap mappings for ${selectedRole}.`);
      setMappings(prev => ({ ...prev, [selectedRole]: slugs }));
    } catch (e: any) {
      setMessage(`Error updating role mapping: ${e.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-aven-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Map className="text-aven-primary" size={20} />
            <span className="text-xs font-bold uppercase tracking-widest text-aven-text-subtle">Platform Admin</span>
          </div>
          <h1 className="text-3xl font-extrabold text-aven-text tracking-tight">
            roadmap.sh Skill Graph Ingestion & Topology Control
          </h1>
          <p className="text-xs text-aven-text-subtle mt-1">
            Manage canonical roadmap.sh subgraphs, monitor credit budget usage, and resolve DAG cycle conflicts.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-aven-primary border border-aven-primary/30 px-4 py-2 rounded-xl text-xs font-bold transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 text-xs font-medium flex items-center gap-2">
          <Zap size={16} className="text-aven-primary shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Role to Roadmap Composite Mapping Configuration */}
      <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-aven-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="text-aven-primary" size={18} />
            <h2 className="text-base font-bold text-aven-text">Role → Composite Subgraph Mapping</h2>
          </div>
          <span className="text-xs text-aven-text-subtle">Configures composite roadmap slugs per career track</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-aven-text-subtle mb-2">Target Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                const role = e.target.value;
                setSelectedRole(role);
                setRoleSlugsInput((mappings[role] || []).join(', '));
              }}
              className="w-full bg-slate-900 border border-aven-border rounded-xl px-3 py-2 text-xs text-aven-text focus:outline-none focus:border-indigo-500"
            >
              <option value="backend_swe">Backend Software Engineer (backend_swe)</option>
              <option value="frontend_swe">Frontend Software Engineer (frontend_swe)</option>
              <option value="devops_platform">DevOps & Platform Engineer (devops_platform)</option>
              <option value="mlops_engineer">MLOps Engineer (mlops_engineer)</option>
              <option value="data_engineer">Data Engineer (data_engineer)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-aven-text-subtle mb-2">Mapped roadmap.sh Slugs (comma separated)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roleSlugsInput}
                onChange={(e) => setRoleSlugsInput(e.target.value)}
                placeholder="backend, python, sql, system-design"
                className="flex-1 bg-slate-900 border border-aven-border rounded-xl px-3.5 py-2 text-xs text-aven-text focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveRoleMapping}
                className="bg-indigo-600 hover:bg-indigo-500 text-aven-text px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <Check size={14} />
                <span>Save Mapping</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Roadmaps & Ingestion Status Table */}
      <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-aven-border pb-3">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-aven-text">roadmap.sh Catalog & Ingestion Status</h2>
          </div>
          <span className="text-xs text-aven-text-subtle">{roadmaps.length} Roadmaps Available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aven-border text-aven-text-subtle uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Roadmap Slug</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Cache Status</th>
                <th className="py-3 px-4">Last Fetched</th>
                <th className="py-3 px-4 text-center">Credits Used</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {roadmaps.map((r) => (
                <tr key={r.slug} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-aven-primary">{r.slug}</td>
                  <td className="py-3.5 px-4 text-aven-text font-medium">{r.title}</td>
                  <td className="py-3.5 px-4">
                    {r.cached ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> Cached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-aven-text-subtle border border-slate-500/20">
                        Uncached
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-aven-text-subtle">
                    {r.fetched_at ? new Date(r.fetched_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-aven-text-subtle">
                    {r.credits_spent}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleSyncNow(r.slug, true)}
                      disabled={syncingSlug === r.slug}
                      className="bg-indigo-600/20 hover:bg-indigo-600 text-aven-primary hover:text-aven-text border border-aven-primary/30 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} className={syncingSlug === r.slug ? 'animate-spin' : ''} />
                      <span>{syncingSlug === r.slug ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion Conflicts Resolution Queue */}
      <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-aven-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-400" size={18} />
            <h2 className="text-base font-bold text-aven-text">Ingestion Conflicts & DAG Verification Queue</h2>
          </div>
          <span className="text-xs text-aven-text-subtle">{conflicts.filter(c => !c.resolved).length} Active Alerts</span>
        </div>

        {conflicts.length === 0 ? (
          <div className="p-6 text-center text-xs text-aven-text-subtle">
            No ingestion conflicts or cycle alerts found. All roadmaps are clean DAGs.
          </div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                  c.resolved
                    ? 'bg-slate-900/40 border-aven-border/40 text-aven-text-subtle'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={14} className={c.resolved ? 'text-aven-text-muted' : 'text-amber-400'} />
                    <span className="uppercase tracking-wider font-mono">{c.conflict_type}</span>
                    {c.slug && <span className="text-aven-primary">({c.slug})</span>}
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-950/80 p-2 rounded border border-aven-border text-aven-text-subtle max-h-24 overflow-y-auto">
                    {JSON.stringify(c.payload, null, 2)}
                  </pre>
                  <div className="text-[10px] text-aven-text-subtle">Logged: {new Date(c.created_at).toLocaleString()}</div>
                </div>

                {!c.resolved && (
                  <button
                    onClick={() => handleResolveConflict(c.id)}
                    className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-lg font-bold transition shrink-0 self-start md:self-center"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
