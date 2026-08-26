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
  HelpCircle
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
  AdminOverviewResponse,
  AdminSystemResponse,
  AdminUserItem,
  MentorApplicationItem,
  PlatformResourceItem,
  ResourceCreateInput
} from '../../../api/client';

type TabType = 'overview' | 'users' | 'mentors' | 'resources' | 'system';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-brand-400" size={20} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Platform Governance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Platform Admin Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global management for users, mentor applications, learning resources, and platform infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshCurrentView}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border hover:bg-surface-secondary text-xs font-bold text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-indigo-400' : ''} />
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
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
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
            className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-xs font-bold text-white transition-all shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Activity size={15} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Users size={15} />
          <span>Users</span>
          {overview && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-secondary text-slate-300">
              {overview.total_users}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mentors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mentors'
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white hover:bg-surface'
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
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white hover:bg-surface'
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
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Server size={15} />
          <span>System Status</span>
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
            <div className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Platform Users</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Users size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">
                {overview?.total_users ?? '—'}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>{overview?.active_users ?? 0} active accounts</span>
              </div>
            </div>

            {/* Approved Mentors */}
            <div className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Approved Mentors</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserCheck size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">
                {overview?.total_mentors ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Verified platform educators
              </div>
            </div>

            {/* Pending Mentor Applications */}
            <div className={`p-6 rounded-2xl bg-surface border shadow-glass transition-all space-y-2 ${
              (overview?.pending_mentors ?? 0) > 0 ? 'border-amber-500/50 bg-amber-950/10' : 'border-border'
            }`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Mentors</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">
                {overview?.pending_mentors ?? '0'}
              </div>
              <button 
                onClick={() => { setActiveTab('mentors'); setMentorStatusFilter('PENDING'); }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <span>Review applications</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Total Resources */}
            <div className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Published Resources</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BookOpen size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">
                {overview?.total_resources ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Courses, tutorials & projects
              </div>
            </div>

            {/* Pending Resource Submissions */}
            <div className={`p-6 rounded-2xl bg-surface border shadow-glass transition-all space-y-2 ${
              (overview?.pending_resources ?? 0) > 0 ? 'border-amber-500/50 bg-amber-950/10' : 'border-border'
            }`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Resources</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Layers size={18} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white">
                {overview?.pending_resources ?? '0'}
              </div>
              <button 
                onClick={() => { setActiveTab('resources'); setResourceStatusFilter('PENDING'); }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <span>Review submissions</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* System Status Quick Tile */}
            <div className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/50 shadow-glass transition-all space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Infrastructure</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Server size={18} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="capitalize">{systemStatus?.status || 'Online'}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                API & Database connected
              </div>
            </div>
          </div>

          {/* Pending Actions Section */}
          {overview?.pending_actions && overview.pending_actions.length > 0 && (
            <div className="p-6 rounded-2xl bg-surface border border-amber-500/30 shadow-glass space-y-4">
              <div className="flex items-center gap-2 text-amber-300 text-sm font-bold uppercase tracking-wider">
                <AlertCircle size={17} />
                <span>Pending Administrative Actions</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overview.pending_actions.map((action, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-surface-secondary/60 border border-border flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{action.message}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Requires platform administrator decision</div>
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
                      className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow-indigo transition-all shrink-0"
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
          <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-semibold text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="">All Roles</option>
                <option value="learner">Learners</option>
                <option value="mentor">Mentors</option>
                <option value="admin">Administrators</option>
              </select>

              <span className="text-xs text-slate-400 font-semibold">
                Total: {userTotal}
              </span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-glass">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-secondary/70 text-slate-400 text-[11px] uppercase tracking-wider border-b border-border">
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
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        No users matched your query.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{u.name || 'Unnamed User'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-500">ID #{u.id} • {u.clerk_id}</div>
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
                                : 'bg-surface-secondary border-border text-slate-300'
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
                        <td className="p-4 text-slate-400">
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
          <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMentorStatusFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white bg-surface-secondary'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setMentorStatusFilter('APPROVED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white bg-surface-secondary'
                }`}
              >
                Approved Mentors
              </button>
              <button
                onClick={() => setMentorStatusFilter('REJECTED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === 'REJECTED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white bg-surface-secondary'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setMentorStatusFilter('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mentorStatusFilter === ''
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white bg-surface-secondary'
                }`}
              >
                All Applications
              </button>
            </div>

            <div className="text-xs text-slate-400 font-semibold">
              Showing {mentors.length} applications
            </div>
          </div>

          {/* Mentors Grid / List */}
          <div className="space-y-4">
            {mentors.length === 0 ? (
              <div className="p-12 text-center bg-surface border border-border rounded-2xl text-slate-500 text-sm">
                No mentor applications found for this filter.
              </div>
            ) : (
              mentors.map((m) => (
                <div
                  key={m.id}
                  className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/40 shadow-glass transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-bold text-white">{m.name}</h3>
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
                      <p className="text-xs text-slate-400">{m.user_email} • Applied on {new Date(m.created_at).toLocaleDateString()}</p>
                    </div>

                    {/* Action buttons for pending */}
                    {m.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveMentor(m.id, m.name)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
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

                  <div className="space-y-2 pt-2 border-t border-border/80 text-xs">
                    <div>
                      <span className="font-bold text-slate-400">Domain Expertise: </span>
                      <span className="text-white font-medium">{m.expertise}</span>
                    </div>
                    {m.bio && (
                      <div>
                        <span className="font-bold text-slate-400">Statement / Bio: </span>
                        <span className="text-slate-300">{m.bio}</span>
                      </div>
                    )}
                    {m.linkedin_url && (
                      <div className="pt-1">
                        <a
                          href={m.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
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
          <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <select
                value={resourceStatusFilter}
                onChange={(e) => setResourceStatusFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-semibold text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved / Published</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-semibold text-slate-300 focus:outline-none"
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
              <span className="text-xs text-slate-400 font-semibold">
                Total: {resourceTotal}
              </span>
              <button
                onClick={() => setIsAddResourceModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow-indigo transition-all"
              >
                <Plus size={15} />
                <span>Add Resource</span>
              </button>
            </div>
          </div>

          {/* Resource Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {resources.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-surface border border-border rounded-2xl text-slate-500 text-sm">
                No resources matched your criteria.
              </div>
            ) : (
              resources.map((r) => (
                <div
                  key={r.id}
                  className="p-6 rounded-2xl bg-surface border border-border hover:border-brand-500/40 shadow-glass transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface-secondary text-indigo-400 border border-border">
                          {r.resource_type}
                        </span>
                        {r.skill_id && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-secondary text-slate-300 border border-border">
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

                    <h3 className="text-base font-bold text-white">{r.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3">{r.content}</p>

                    {r.submitted_by_email && (
                      <div className="text-[11px] text-slate-500">
                        Submitted by: <span className="text-slate-300">{r.submitted_by_email}</span>
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
                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink size={12} />
                    </a>

                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveResource(r.id, r.title)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
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
                        className="p-1.5 rounded-lg bg-surface-secondary text-slate-400 hover:text-white transition-colors"
                        title="Edit Resource"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(r.id, r.title)}
                        className="p-1.5 rounded-lg bg-surface-secondary text-rose-400 hover:text-rose-300 transition-colors"
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
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-glass space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">System Infrastructure Health</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time status of backend microservices and databases.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {systemStatus?.status.toUpperCase() || 'HEALTHY'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Server size={14} className="text-indigo-400" />
                  <span>API Service</span>
                </div>
                <div className="text-sm font-extrabold text-white">{systemStatus?.api_status || 'Online'}</div>
                <div className="text-[10px] text-slate-500">Uptime: {systemStatus?.uptime_seconds || 0}s</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Database size={14} className="text-emerald-400" />
                  <span>PostgreSQL / SQLite</span>
                </div>
                <div className="text-sm font-extrabold text-white capitalize">{systemStatus?.database_status || 'Healthy'}</div>
                <div className="text-[10px] text-slate-500">Relational Store</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-400" />
                  <span>Neo4j Graph DB</span>
                </div>
                <div className="text-sm font-extrabold text-white capitalize">{systemStatus?.graph_db_status || 'Connected'}</div>
                <div className="text-[10px] text-slate-500">EIKG Skill Graph</div>
              </div>

              <div className="p-4 rounded-xl bg-surface-secondary/70 border border-border space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-400" />
                  <span>Job Scraper Pipeline</span>
                </div>
                <div className="text-sm font-extrabold text-white">{systemStatus?.scraper_sources_count || 5} Sources Ready</div>
                <div className="text-[10px] text-slate-500">Greenhouse, Lever, Ashby, etc.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD RESOURCE */}
      {/* ========================================================================= */}
      {isAddResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">Add Learning Resource</h3>
              <button onClick={() => setIsAddResourceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Complete Guide to FastAPI Dependency Injection"
                  value={newResourceForm.title}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description / Content Summary *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed summary of concepts taught in this resource..."
                  value={newResourceForm.content}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Resource Type *</label>
                  <select
                    value={newResourceForm.resource_type}
                    onChange={(e) => setNewResourceForm({ ...newResourceForm, resource_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
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
                  <label className="block text-slate-300 font-bold mb-1">Associated Skill ID</label>
                  <input
                    type="text"
                    placeholder="e.g., fastapi_basics"
                    value={newResourceForm.skill_id}
                    onChange={(e) => setNewResourceForm({ ...newResourceForm, skill_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Direct URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newResourceForm.url}
                  onChange={(e) => setNewResourceForm({ ...newResourceForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddResourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-secondary text-slate-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all"
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
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-white">Edit Resource #{editingResource.id}</h3>
              <button onClick={() => setEditingResource(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Content / Description</label>
                <textarea
                  required
                  rows={3}
                  value={editingResource.content}
                  onChange={(e) => setEditingResource({ ...editingResource, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Type</label>
                  <select
                    value={editingResource.resource_type}
                    onChange={(e) => setEditingResource({ ...editingResource, resource_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
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
                  <label className="block text-slate-300 font-bold mb-1">Skill ID</label>
                  <input
                    type="text"
                    value={editingResource.skill_id || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, skill_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">URL</label>
                <input
                  type="url"
                  required
                  value={editingResource.url}
                  onChange={(e) => setEditingResource({ ...editingResource, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-4 py-2 rounded-xl bg-surface-secondary text-slate-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all"
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
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <XCircle size={18} />
              <span>Reject {rejectingItem.type === 'mentor' ? 'Mentor Application' : 'Resource Submission'}</span>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to reject <span className="font-bold text-white">{rejectingItem.name}</span>?
            </p>

            <div>
              <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                Optional Reason / Feedback:
              </label>
              <textarea
                rows={3}
                placeholder="Explain what was missing or why this submission was rejected..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-surface-secondary text-slate-300 hover:text-white font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-sm"
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
