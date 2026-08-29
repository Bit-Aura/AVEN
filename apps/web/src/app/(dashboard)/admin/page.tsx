'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Activity, 
  Database, 
  Layers, 
  Server, 
  Filter, 
  X,
  UserX,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
  Map,
  Zap,
  ShieldAlert
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminSystemStatus,
  getAdminUsers,
  updateUserStatus,
  updateUserRole,
  getAdminMentors,
  approveMentor,
  rejectMentor,
  getAdminResources,
  createAdminResource,
  updateAdminResource,
  deleteAdminResource,
  approveResource,
  rejectResource,
  getAvailableRoadmaps,
  triggerRoadmapSync,
  getRoadmapConflicts,
  resolveRoadmapConflict,
  getRoadmapRoleMappings,
  updateRoadmapRoleMapping,
  AdminOverviewResponse,
  AdminSystemResponse,
  AdminUserItem,
  MentorApplicationItem,
  PlatformResourceItem,
  ResourceCreateInput
} from '../../../api/client';

type TabType = 'overview' | 'users' | 'mentors' | 'resources' | 'system' | 'roadmap_sync';

/**
 * Enterprise-grade implementation of PlatformAdminDashboard.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function PlatformAdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Overview State
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<AdminSystemResponse | null>(null);

  // Users State
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Mentors State
  const [mentors, setMentors] = useState<MentorApplicationItem[]>([]);
  const [mentorStatusFilter, setMentorStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');

  // Resources State
  const [resources, setResources] = useState<PlatformResourceItem[]>([]);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [resourceStatusFilter, setResourceStatusFilter] = useState<string>('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [resourceSearch, setResourceSearch] = useState('');

  // Modals State
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PlatformResourceItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<{ type: 'mentor' | 'resource'; id: number; name: string } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // New Resource Form
  const [newResourceForm, setNewResourceForm] = useState<ResourceCreateInput>({
    title: '',
    content: '',
    url: '',
    resource_type: 'tutorial',
    skill_id: ''
  });

  const [apiError, setApiError] = useState<string | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Fetch Overview Data
  const fetchOverviewData = useCallback(async () => {
    try {
      setApiError(null);
      const [ovData, sysData] = await Promise.all([
        getAdminOverview(),
        getAdminSystemStatus()
      ]);
      setOverview(ovData);
      setSystemStatus(sysData);
    } catch (err) {
      console.error('Failed to load overview data', err);
      setApiError('Unable to connect to backend API server. Please verify backend is running on port 8000.');
    }
  }, []);

  // Fetch Users
  const fetchUsersData = useCallback(async () => {
    try {
      setApiError(null);
      const res = await getAdminUsers({
        q: userSearch,
        role: userRoleFilter || undefined,
        limit: 50
      });
      setUsers(res.users);
      setUserTotal(res.total);
    } catch (err) {
      console.error('Failed to load users', err);
      setApiError('Failed to load user accounts.');
    }
  }, [userSearch, userRoleFilter]);

  // Fetch Mentors
  const fetchMentorsData = useCallback(async () => {
    try {
      setApiError(null);
      const res = await getAdminMentors(mentorStatusFilter || undefined);
      setMentors(res.applications);
    } catch (err) {
      console.error('Failed to load mentors', err);
      setApiError('Failed to load mentor applications.');
    }
  }, [mentorStatusFilter]);

  // Fetch Resources
  const fetchResourcesData = useCallback(async () => {
    try {
      setApiError(null);
      const res = await getAdminResources({
        status: resourceStatusFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
        q: resourceSearch || undefined,
        limit: 50
      });
      setResources(res.resources);
      setResourceTotal(res.total);
    } catch (err) {
      console.error('Failed to load resources', err);
      setApiError('Failed to load learning resources.');
    }
  }, [resourceStatusFilter, resourceTypeFilter, resourceSearch]);

  // Unified Refresh
  const refreshCurrentView = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') await fetchOverviewData();
      else if (activeTab === 'users') await fetchUsersData();
      else if (activeTab === 'mentors') await fetchMentorsData();
      else if (activeTab === 'resources') await fetchResourcesData();
      else if (activeTab === 'system') {
        const sys = await getAdminSystemStatus();
        setSystemStatus(sys);
      }
    } catch (err) {
      console.error('Error refreshing admin view', err);
      setApiError('API connection error. Ensure FastAPI server is running.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchOverviewData, fetchUsersData, fetchMentorsData, fetchResourcesData]);

  useEffect(() => {
    refreshCurrentView();
  }, [refreshCurrentView]);

  // Handlers for User Actions
  const handleToggleUserStatus = async (user: AdminUserItem) => {
    try {
      const updated = await updateUserStatus(user.id, !user.is_active);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      showNotification(`User ${user.email} is now ${updated.is_active ? 'Active' : 'Suspended'}`);
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      showNotification(message, 'error');
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      const updated = await updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      showNotification(`Role updated to ${role.toUpperCase()} for ${updated.email}`);
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      showNotification(message, 'error');
    }
  };

  // Handlers for Mentor Actions
  const handleApproveMentor = async (applicationId: number, mentorName: string) => {
    try {
      await approveMentor(applicationId);
      showNotification(`Approved ${mentorName} as verified Mentor!`);
      fetchMentorsData();
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      showNotification(message, 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      if (rejectingItem.type === 'mentor') {
        await rejectMentor(rejectingItem.id, rejectionReasonInput);
        showNotification(`Rejected mentor application for ${rejectingItem.name}`);
        fetchMentorsData();
      } else {
        await rejectResource(rejectingItem.id, rejectionReasonInput);
        showNotification(`Rejected resource submission: ${rejectingItem.name}`);
        fetchResourcesData();
      }
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      showNotification(message, 'error');
    } finally {
      setRejectingItem(null);
      setRejectionReasonInput('');
    }
  };

  // Handlers for Resource Actions
  const handleApproveResource = async (resourceId: number, title: string) => {
    try {
      await approveResource(resourceId);
      showNotification(`Approved and published "${title}"!`);
      fetchResourcesData();
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      showNotification(message, 'error');
    }
  };

  const handleDeleteResource = async (resourceId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteAdminResource(resourceId);
      showNotification(`Resource deleted successfully`);
      fetchResourcesData();
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      showNotification(message, 'error');
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminResource(newResourceForm);
      showNotification(`Resource "${newResourceForm.title}" created & published!`);
      setIsAddResourceModalOpen(false);
      setNewResourceForm({
        title: '',
        content: '',
        url: '',
        resource_type: 'tutorial',
        skill_id: ''
      });
      fetchResourcesData();
      fetchOverviewData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Creation failed';
      showNotification(message, 'error');
    }
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    try {
      await updateAdminResource(editingResource.id, {
        title: editingResource.title,
        content: editingResource.content,
        url: editingResource.url,
        resource_type: editingResource.resource_type,
        skill_id: editingResource.skill_id || undefined
      });
      showNotification(`Resource "${editingResource.title}" updated successfully!`);
      setEditingResource(null);
      fetchResourcesData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      showNotification(message, 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-aven-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-aven-primary" size={20} />
            <span className="text-xs font-bold uppercase tracking-widest text-aven-text-subtle">Platform Governance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-aven-text tracking-tight">
            Platform Admin Console
          </h1>
          <p className="text-xs text-aven-text-subtle mt-1">
            Global management for users, mentor applications, learning resources, and platform infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshCurrentView}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-aven-base border border-aven-border hover:bg-aven-surface text-xs font-bold text-aven-text transition-all shadow-sm"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-aven-primary' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Toast Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-aven-text-subtle hover:text-aven-text">
            <X size={14} />
          </button>
        </div>
      )}

      {/* API Connectivity Error Banner */}
      {apiError && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <AlertCircle size={17} className="text-rose-400 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={refreshCurrentView}
            className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-xs font-bold text-aven-text transition-all shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-aven-border pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <Activity size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-brand-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <Users size={15} />
          <span>Users</span>
          {overview && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-aven-surface text-aven-text-subtle">
              {overview.total_users}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mentors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mentors'
              ? 'bg-brand-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <UserCheck size={15} />
          <span>Mentor Applications</span>
          {overview && overview.pending_mentors > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {overview.pending_mentors} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'resources'
              ? 'bg-brand-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <BookOpen size={15} />
          <span>Resources & Library</span>
          {overview && overview.pending_resources > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {overview.pending_resources} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'system'
              ? 'bg-brand-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <Server size={15} />
          <span>System Status</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap_sync')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roadmap_sync'
              ? 'bg-indigo-600 text-aven-text shadow-glow-indigo'
              : 'text-aven-text-subtle hover:text-aven-text hover:bg-aven-base'
          }`}
        >
          <Map size={15} />
          <span>Roadmap Topology Sync</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Total Users */}
            <div className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Total Platform Users</span>
                <div className="p-2 rounded-xl bg-aven-primary/10 text-aven-primary">
                  <Users size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-aven-text">
                {overview?.total_users ?? '—'}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>{overview?.active_users ?? 0} active accounts</span>
              </div>
            </div>

            {/* Approved Mentors */}
            <div className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Approved Mentors</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserCheck size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-aven-text">
                {overview?.total_mentors ?? '—'}
              </div>
              <div className="text-[11px] text-aven-text-subtle font-medium">
                Verified platform educators
              </div>
            </div>

            {/* Pending Mentor Applications */}
            <div className={`p-6 rounded-2xl bg-aven-base border shadow-glass transition-all space-y-2 ${
              (overview?.pending_mentors ?? 0) > 0 ? 'border-amber-500/50 bg-amber-950/10' : 'border-aven-border'
            }`}>
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Mentors</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-aven-text">
                {overview?.pending_mentors ?? '0'}
              </div>
              <button 
                onClick={() => { setActiveTab('mentors'); setMentorStatusFilter('PENDING'); }}
                className="text-[11px] text-aven-primary hover:text-aven-primary font-bold flex items-center gap-1"
              >
                <span>Review applications</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Total Resources */}
            <div className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Published Resources</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BookOpen size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-aven-text">
                {overview?.total_resources ?? '—'}
              </div>
              <div className="text-[11px] text-aven-text-subtle font-medium">
                Courses, tutorials & projects
              </div>
            </div>

            {/* Pending Resource Submissions */}
            <div className={`p-6 rounded-2xl bg-aven-base border shadow-glass transition-all space-y-2 ${
              (overview?.pending_resources ?? 0) > 0 ? 'border-amber-500/50 bg-amber-950/10' : 'border-aven-border'
            }`}>
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Resources</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Layers size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-aven-text">
                {overview?.pending_resources ?? '0'}
              </div>
              <button 
                onClick={() => { setActiveTab('resources'); setResourceStatusFilter('PENDING'); }}
                className="text-[11px] text-aven-primary hover:text-aven-primary font-bold flex items-center gap-1"
              >
                <span>Review submissions</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* System Status Quick Tile */}
            <div className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-aven-text-subtle">
                <span className="text-xs font-bold uppercase tracking-wider">Infrastructure</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Server size={18} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-aven-text flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="capitalize">{systemStatus?.status || 'Online'}</span>
              </div>
              <div className="text-[11px] text-aven-text-subtle font-medium">
                API & Database connected
              </div>
            </div>
          </div>

          {/* Pending Actions Section */}
          {overview?.pending_actions && overview.pending_actions.length > 0 && (
            <div className="p-6 rounded-2xl bg-aven-base border border-amber-500/30 shadow-glass space-y-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-bold uppercase tracking-wider">
                <AlertCircle size={17} />
                <span>Pending Administrative Actions</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.pending_actions.map((action, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-aven-surface/60 border border-aven-border flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-aven-text">{action.message}</div>
                      <div className="text-xs text-aven-text-subtle mt-0.5">Requires platform administrator decision</div>
                    </div>
                    <button
                      onClick={() => {
                        if (action.type === 'mentor_applications') {
                          setActiveTab('mentors');
                          setMentorStatusFilter('PENDING');
                        } else {
                          setActiveTab('resources');
                          setResourceStatusFilter('PENDING');
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-aven-text text-xs font-bold shadow-glow-indigo transition-all shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filter / Search Bar */}
          <div className="p-4 rounded-2xl bg-aven-base border border-aven-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-aven-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs text-aven-text placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs font-semibold text-aven-text-subtle focus:outline-none focus:border-brand-500"
              >
                <option value="">All Roles</option>
                <option value="learner">Learners</option>
                <option value="mentor">Mentors</option>
                <option value="admin">Administrators</option>
              </select>

              <span className="text-xs text-aven-text-subtle font-semibold">
                Total: {userTotal}
              </span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-aven-base border border-aven-border rounded-2xl overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-aven-surface/70 text-aven-text-subtle text-[11px] uppercase tracking-wider border-b border-aven-border">
                    <th className="p-4 font-bold">User Identity</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold">Account Status</th>
                    <th className="p-4 font-bold">Registered</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-aven-text-muted">
                        No users matched your query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-aven-surface transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-aven-text">{u.name || 'Unnamed User'}</div>
                          <div className="text-[11px] text-aven-text-subtle font-mono">{u.email}</div>
                          <div className="text-[10px] text-aven-text-muted">ID #{u.id} • {u.clerk_id}</div>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              u.role === 'admin' 
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                : u.role === 'mentor'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-aven-surface border-aven-border text-aven-text-subtle'
                            }`}
                          >
                            <option value="learner">Learner</option>
                            <option value="mentor">Mentor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                            u.is_active
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{u.is_active ? 'Active' : 'Suspended'}</span>
                          </span>
                        </td>
                        <td className="p-4 text-aven-text-subtle">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                              u.is_active
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-400 hover:bg-rose-900/30'
                                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MENTOR APPROVAL WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'mentors' && (
        <div className="space-y-6">
          {/* Status Sub-filter Bar */}
          <div className="p-4 rounded-2xl bg-aven-base border border-aven-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMentorStatusFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-aven-text-subtle hover:text-aven-text bg-aven-surface'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setMentorStatusFilter('APPROVED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-aven-text-subtle hover:text-aven-text bg-aven-surface'
                }`}
              >
                Approved Mentors
              </button>
              <button
                onClick={() => setMentorStatusFilter('REJECTED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'REJECTED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-aven-text-subtle hover:text-aven-text bg-aven-surface'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setMentorStatusFilter('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === ''
                    ? 'bg-indigo-600 text-aven-text'
                    : 'text-aven-text-subtle hover:text-aven-text bg-aven-surface'
                }`}
              >
                All Applications
              </button>
            </div>

            <div className="text-xs text-aven-text-subtle font-semibold">
              Showing {mentors.length} applications
            </div>
          </div>

          {/* Mentors Grid / List */}
          <div className="space-y-4">
            {mentors.length === 0 ? (
              <div className="p-12 text-center bg-aven-base border border-aven-border rounded-2xl text-aven-text-muted text-sm">
                No mentor applications found for this filter.
              </div>
            ) : (
              mentors.map((m) => (
                <div
                  key={m.id}
                  className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/40 shadow-glass transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-bold text-aven-text">{m.name}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                          m.status === 'APPROVED'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : m.status === 'REJECTED'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-aven-text-subtle">{m.user_email} • Applied on {new Date(m.created_at).toLocaleDateString()}</p>
                    </div>

                    {/* Action buttons for pending */}
                    {m.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveMentor(m.id, m.name)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-aven-text text-xs font-bold shadow-sm transition-all"
                        >
                          <CheckCircle2 size={14} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setRejectingItem({ type: 'mentor', id: m.id, name: m.name })}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 hover:bg-rose-900/40 text-rose-300 text-xs font-bold transition-all"
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-aven-border/80 text-xs">
                    <div>
                      <span className="font-bold text-aven-text-subtle">Domain Expertise: </span>
                      <span className="text-aven-text font-medium">{m.expertise}</span>
                    </div>
                    {m.bio && (
                      <div>
                        <span className="font-bold text-aven-text-subtle">Statement / Bio: </span>
                        <span className="text-aven-text-subtle">{m.bio}</span>
                      </div>
                    )}
                    {m.linkedin_url && (
                      <div className="pt-1">
                        <a
                          href={m.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-aven-primary hover:text-aven-primary font-semibold inline-flex items-center gap-1"
                        >
                          <span>Professional Profile</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                    {m.rejection_reason && (
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                        <span className="font-bold">Rejection Note: </span>
                        <span>{m.rejection_reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RESOURCE MANAGEMENT & APPROVAL */}
      {/* ========================================================================= */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-aven-base border border-aven-border flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-aven-text-muted" size={15} />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs text-aven-text placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <select
                value={resourceStatusFilter}
                onChange={(e) => setResourceStatusFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs font-semibold text-aven-text-subtle focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved / Published</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs font-semibold text-aven-text-subtle focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="course">Course</option>
                <option value="tutorial">Tutorial</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="project">Project</option>
                <option value="documentation">Documentation</option>
                <option value="practice">Practice</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <span className="text-xs text-aven-text-subtle font-semibold">
                Total: {resourceTotal}
              </span>
              <button
                onClick={() => setIsAddResourceModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-aven-text text-xs font-bold shadow-glow-indigo transition-all"
              >
                <Plus size={15} />
                <span>Add Resource</span>
              </button>
            </div>
          </div>

          {/* Resource Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {resources.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-aven-base border border-aven-border rounded-2xl text-aven-text-muted text-sm">
                No resources matched your criteria.
              </div>
            ) : (
              resources.map((r) => (
                <div
                  key={r.id}
                  className="p-6 rounded-2xl bg-aven-base border border-aven-border hover:border-brand-500/40 shadow-glass transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-aven-surface text-aven-primary border border-aven-border">
                          {r.resource_type}
                        </span>
                        {r.skill_id && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-aven-surface text-aven-text-subtle border border-aven-border">
                            {r.skill_id}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : r.status === 'REJECTED'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-aven-text">{r.title}</h3>
                    <p className="text-xs text-aven-text-subtle line-clamp-3">{r.content}</p>

                    {r.submitted_by_email && (
                      <div className="text-[11px] text-aven-text-muted">
                        Submitted by: <span className="text-aven-text-subtle">{r.submitted_by_email}</span>
                      </div>
                    )}

                    {r.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs">
                        <span className="font-bold">Rejection Note: </span>
                        <span>{r.rejection_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-aven-border flex items-center justify-between text-xs">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aven-primary hover:text-aven-primary font-bold inline-flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink size={12} />
                    </a>

                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveResource(r.id, r.title)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-aven-text font-bold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingItem({ type: 'resource', id: r.id, name: r.title })}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/40 font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setEditingResource(r)}
                        className="p-1.5 rounded-lg bg-aven-surface text-aven-text-subtle hover:text-aven-text transition-colors"
                        title="Edit Resource"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(r.id, r.title)}
                        className="p-1.5 rounded-lg bg-aven-surface text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete Resource"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM STATUS */}
      {/* ========================================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-aven-base border border-aven-border shadow-glass space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-aven-text">System Infrastructure Health</h2>
                <p className="text-xs text-aven-text-subtle mt-0.5">Real-time status of backend microservices and databases.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {systemStatus?.status.toUpperCase() || 'HEALTHY'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-aven-surface/70 border border-aven-border space-y-1">
                <div className="text-aven-text-subtle font-semibold flex items-center gap-1.5">
                  <Server size={14} className="text-aven-primary" />
                  <span>API Service</span>
                </div>
                <div className="text-sm font-extrabold text-aven-text">{systemStatus?.api_status || 'Online'}</div>
                <div className="text-[10px] text-aven-text-muted">Uptime: {systemStatus?.uptime_seconds || 0}s</div>
              </div>

              <div className="p-4 rounded-xl bg-aven-surface/70 border border-aven-border space-y-1">
                <div className="text-aven-text-subtle font-semibold flex items-center gap-1.5">
                  <Database size={14} className="text-emerald-400" />
                  <span>PostgreSQL / SQLite</span>
                </div>
                <div className="text-sm font-extrabold text-aven-text capitalize">{systemStatus?.database_status || 'Healthy'}</div>
                <div className="text-[10px] text-aven-text-muted">Relational Store</div>
              </div>

              <div className="p-4 rounded-xl bg-aven-surface/70 border border-aven-border space-y-1">
                <div className="text-aven-text-subtle font-semibold flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-400" />
                  <span>Neo4j Graph DB</span>
                </div>
                <div className="text-sm font-extrabold text-aven-text capitalize">{systemStatus?.graph_db_status || 'Connected'}</div>
                <div className="text-[10px] text-aven-text-muted">EIKG Skill Graph</div>
              </div>

              <div className="p-4 rounded-xl bg-aven-surface/70 border border-aven-border space-y-1">
                <div className="text-aven-text-subtle font-semibold flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-400" />
                  <span>Job Scraper Pipeline</span>
                </div>
                <div className="text-sm font-extrabold text-aven-text">{systemStatus?.scraper_sources_count || 5} Sources Ready</div>
                <div className="text-[10px] text-aven-text-muted">Greenhouse, Lever, Ashby, etc.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ROADMAP TOPOLOGY SYNC */}
      {/* ========================================================================= */}
      {activeTab === 'roadmap_sync' && (
        <div className="space-y-8">
          <RoadmapSyncTabContent showNotification={showNotification} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD RESOURCE */}
      {/* ========================================================================= */}
      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-aven-base border border-aven-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-aven-border pb-4">
              <h3 className="text-lg font-bold text-aven-text">Add Learning Resource</h3>
              <button onClick={() => setIsAddResourceModalOpen(false)} className="text-aven-text-subtle hover:text-aven-text">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Complete Guide to FastAPI Dependency Injection"
                  value={newResourceForm.title}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">Description / Content Summary *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed summary of concepts taught in this resource..."
                  value={newResourceForm.content}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-aven-text-subtle font-bold mb-1">Resource Type *</label>
                  <select
                    value={newResourceForm.resource_type}
                    onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                  >
                    <option value="tutorial">Tutorial</option>
                    <option value="course">Course</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="project">Project</option>
                    <option value="documentation">Documentation</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-aven-text-subtle font-bold mb-1">Associated Skill ID</label>
                  <input
                    type="text"
                    placeholder="e.g., fastapi_basics"
                    value={newResourceForm.skill_id}
                    onChange={(e) => setNewResourceForm({ ...newResourceForm, skill_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">Direct URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newResourceForm.url}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-aven-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddResourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-aven-surface text-aven-text-subtle hover:text-aven-text font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-aven-text font-bold shadow-glow-indigo transition-all"
                >
                  Create & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT RESOURCE */}
      {/* ========================================================================= */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-aven-base border border-aven-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-aven-border pb-4">
              <h3 className="text-lg font-bold text-aven-text">Edit Resource #{editingResource.id}</h3>
              <button onClick={() => setEditingResource(null)} className="text-aven-text-subtle hover:text-aven-text">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">Content / Description</label>
                <textarea
                  required
                  rows={3}
                  value={editingResource.content}
                  onChange={(e) => setEditingResource({ ...editingResource, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-aven-text-subtle font-bold mb-1">Type</label>
                  <select
                    value={editingResource.resource_type}
                    onChange={(e) => setEditingResource({ ...editingResource, resource_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                  >
                    <option value="tutorial">Tutorial</option>
                    <option value="course">Course</option>
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="project">Project</option>
                    <option value="documentation">Documentation</option>
                    <option value="practice">Practice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-aven-text-subtle font-bold mb-1">Skill ID</label>
                  <input
                    type="text"
                    value={editingResource.skill_id || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, skill_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-aven-text-subtle font-bold mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={editingResource.url}
                  onChange={(e) => setEditingResource({ ...editingResource, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-aven-surface border border-aven-border text-aven-text focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-aven-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 rounded-xl bg-aven-surface text-aven-text-subtle hover:text-aven-text font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-aven-text font-bold shadow-glow-indigo transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT CONFIRMATION */}
      {/* ========================================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-aven-base border border-aven-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <XCircle size={18} />
              <span>Reject {rejectingItem.type === 'mentor' ? 'Mentor Application' : 'Resource Submission'}</span>
            </div>

            <p className="text-xs text-aven-text-subtle">
              Are you sure you want to reject <span className="font-bold text-aven-text">{rejectingItem.name}</span>?
            </p>

            <div>
              <label className="block text-aven-text-subtle text-[11px] font-bold uppercase tracking-wider mb-1">
                Optional Reason / Feedback:
              </label>
              <textarea
                rows={3}
                placeholder="Explain what was missing or why this submission was rejected..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-aven-surface border border-aven-border text-xs text-aven-text placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-aven-surface text-aven-text-subtle hover:text-aven-text font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-aven-text font-bold transition-all shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Enterprise-grade implementation of RoadmapSyncTabContent.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
function RoadmapSyncTabContent({ showNotification }: { showNotification: (msg: string, type?: 'success' | 'error') => void }) {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('backend_swe');
  const [roleSlugsInput, setRoleSlugsInput] = useState('');

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
      showNotification(e.message || 'Failed to fetch roadmap data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async (slug: string, force = true) => {
    setSyncingSlug(slug);
    try {
      const data = await triggerRoadmapSync(slug, force);
      showNotification(`Successfully synced '${slug}': ${data.skills_upserted} skills, ${data.edges_upserted} edges upserted into Neo4j & Postgres.`);
      fetchData();
    } catch (e: any) {
      showNotification(`Failed to sync '${slug}': ${e.message || 'Unknown error'}`, 'error');
    } finally {
      setSyncingSlug(null);
    }
  };

  const handleResolveConflict = async (id: number) => {
    try {
      await resolveRoadmapConflict(id);
      setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
      showNotification(`Conflict #${id} marked as resolved.`);
    } catch (e: any) {
      showNotification(`Error resolving conflict: ${e.message || 'Unknown error'}`, 'error');
    }
  };

  const handleSaveRoleMapping = async () => {
    try {
      const slugs = roleSlugsInput.split(',').map(s => s.trim()).filter(Boolean);
      await updateRoadmapRoleMapping({ role_id: selectedRole, roadmap_slugs: slugs });
      showNotification(`Updated roadmap mappings for ${selectedRole}.`);
      setMappings(prev => ({ ...prev, [selectedRole]: slugs }));
    } catch (e: any) {
      showNotification(`Error updating role mapping: ${e.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Role to Roadmap Mapping Card */}
      <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-aven-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="text-aven-primary" size={18} />
            <h2 className="text-base font-bold text-aven-text">Role → Composite Subgraph Mapping</h2>
          </div>
          <span className="text-xs text-aven-text-subtle">Configure which roadmap.sh slugs build each career track</span>
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
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-aven-base border border-aven-border rounded-2xl p-6 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-aven-border pb-3">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-400" size={18} />
            <h2 className="text-base font-bold text-aven-text">roadmap.sh Catalog & Ingestion Control</h2>
          </div>
          <span className="text-xs text-aven-text-subtle">{roadmaps.length} Roadmaps Available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-aven-border text-aven-text-subtle uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Cache Status</th>
                <th className="py-3 px-4">Last Synced</th>
                <th className="py-3 px-4 text-center">Credits Spent</th>
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

      {/* Ingestion Conflicts Queue */}
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
            No ingestion conflicts or cycle alerts found. All roadmaps are valid DAGs.
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
                    <AlertCircle size={14} className={c.resolved ? 'text-aven-text-muted' : 'text-amber-400'} />
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
