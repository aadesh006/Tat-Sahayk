import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchHazardZones, fetchRelocationSites, fetchHabitations, 
  fetchSDMAStats, fetchSDMASummary,
  createHazardZone, createRelocationSite, createHabitation,
  updateHazardZone, updateRelocationSite, updateHabitation,
  deleteHazardZone, deleteRelocationSite, deleteHabitation,
  assessHabitation, bulkAssessDistrict
} from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { 
  ShieldAlert, MapPin, Home, Users, TrendingUp, 
  AlertCircle, CheckCircle, Clock, Loader2, Plus, 
  X, Zap, Activity, Building2, FileText, Printer,
  Trash2, Edit2, Filter, Search, ChevronDown, Shield
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import SDMAReportTab from '../components/SDMAReport.jsx';

// Match AdminDashboard color scheme - subdued badges
const PRIORITY_CONFIG = {
  IMMEDIATE: {
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    label: 'Immediate'
  },
  SHORT_TERM: {
    badge: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    label: 'Short Term'
  },
  MEDIUM_TERM: {
    badge: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    label: 'Medium Term'
  },
  SAFE: {
    badge: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
    label: 'Safe'
  }
};

const INTENSITY_CONFIG = {
  critical: { 
    badge: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    label: 'Critical' 
  },
  high: { 
    badge: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    label: 'High' 
  },
  medium: { 
    badge: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    label: 'Medium' 
  },
  low: { 
    badge: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
    label: 'Low' 
  }
};

export default function RedZoneManagement() {
  const { t } = useTranslation();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddHabitationModal, setShowAddHabitationModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [editingHabitation, setEditingHabitation] = useState(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sdma-stats'],
    queryFn: fetchSDMAStats,
    enabled: authUser?.role === 'admin'
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['hazard-zones'],
    queryFn: fetchHazardZones
  });

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['relocation-sites'],
    queryFn: fetchRelocationSites
  });

  const { data: habitations = [], isLoading: habitationsLoading } = useQuery({
    queryKey: ['vulnerable-habitations'],
    queryFn: fetchHabitations
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['sdma-summary'],
    queryFn: fetchSDMASummary,
    enabled: activeTab === 'report'
  });

  // Bulk assess mutation
  const bulkAssessMutation = useMutation({
    mutationFn: bulkAssessDistrict,
    onSuccess: () => {
      toast.success('Bulk assessment completed');
      queryClient.invalidateQueries(['vulnerable-habitations']);
    },
    onError: () => toast.error('Bulk assessment failed')
  });

  if (authUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-500/20">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Access Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Red Zone Management is only accessible to admin users
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'zones', label: 'Hazard Zones', icon: ShieldAlert },
    { id: 'sites', label: 'Relocation Sites', icon: Building2 },
    { id: 'habitations', label: 'Vulnerable Habitations', icon: Home },
    { id: 'report', label: 'SDMA Report', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Toaster position="top-right" />
      
      {/* Header - Match AdminDashboard style */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={18} className="text-red-500" />
              Red Zone Management — {authUser?.district || 'National'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Proactive disaster relocation planning and risk assessment
            </p>
          </div>
        </div>

        {/* Stats Cards - Clean AdminDashboard style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Active Red Zones</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats?.active_red_zones || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">People at Risk</p>
            <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">{(stats?.total_population_at_risk || 0).toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Relocation Sites</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.total_relocation_sites || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Immediate Priority</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats?.immediate_priority_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Tab Bar - Match AdminDashboard */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(22,22,22)] px-4 md:px-6 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 md:px-5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab stats={stats} statsLoading={statsLoading} onBulkAssess={() => bulkAssessMutation.mutate()} />
        )}
        {activeTab === 'zones' && (
          <HazardZonesTab 
            zones={zones} 
            loading={zonesLoading} 
            onAdd={() => setShowAddZoneModal(true)}
            onEdit={(zone) => { setEditingZone(zone); setShowAddZoneModal(true); }}
            onDelete={(zoneId) => {
              if (confirm('Delete this hazard zone?')) {
                deleteHazardZone(zoneId).then(() => {
                  toast.success('Hazard zone deleted');
                  queryClient.invalidateQueries(['hazard-zones']);
                }).catch(() => toast.error('Failed to delete zone'));
              }
            }}
          />
        )}
        {activeTab === 'sites' && (
          <RelocationSitesTab 
            sites={sites} 
            loading={sitesLoading} 
            onAdd={() => setShowAddSiteModal(true)}
            onEdit={(site) => { setEditingSite(site); setShowAddSiteModal(true); }}
            onDelete={(siteId) => {
              if (confirm('Delete this relocation site?')) {
                deleteRelocationSite(siteId).then(() => {
                  toast.success('Site deleted');
                  queryClient.invalidateQueries(['relocation-sites']);
                }).catch(() => toast.error('Failed to delete site'));
              }
            }}
          />
        )}
        {activeTab === 'habitations' && (
          <VulnerableHabitationsTab 
            habitations={habitations} 
            loading={habitationsLoading} 
            onAdd={() => setShowAddHabitationModal(true)}
            onBulkAssess={() => bulkAssessMutation.mutate()}
            onEdit={(hab) => { setEditingHabitation(hab); setShowAddHabitationModal(true); }}
            onDelete={(habId) => {
              if (confirm('Delete this habitation?')) {
                deleteHabitation(habId).then(() => {
                  toast.success('Habitation deleted');
                  queryClient.invalidateQueries(['vulnerable-habitations']);
                }).catch(() => toast.error('Failed to delete habitation'));
              }
            }}
          />
        )}
        {activeTab === 'report' && (
          <SDMAReportTab summary={summary} loading={summaryLoading} stats={stats} />
        )}
      </div>

      {/* Modals */}
      {showAddZoneModal && <AddHazardZoneModal editingZone={editingZone} onClose={() => { setShowAddZoneModal(false); setEditingZone(null); }} />}
      {showAddSiteModal && <AddRelocationSiteModal editingSite={editingSite} onClose={() => { setShowAddSiteModal(false); setEditingSite(null); }} />}
      {showAddHabitationModal && <AddHabitationModal editingHabitation={editingHabitation} onClose={() => { setShowAddHabitationModal(false); setEditingHabitation(null); }} />}
    </div>
  );
}

// ==================== TAB 1: OVERVIEW ====================
function OverviewTab({ stats, statsLoading, onBulkAssess }) {
  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const totalHabitations = stats?.total_habitations || 1;
  const immediate = stats?.immediate_priority_count || 0;
  const shortTerm = stats?.short_term_priority_count || 0;
  const mediumTerm = stats?.medium_term_priority_count || 0;
  const safe = stats?.safe_count || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Priority Visualization - Pie Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6">Priority Distribution</h3>
        
        <div className="flex items-center justify-center gap-12">
          {/* Simple Donut Chart using CSS */}
          <div className="relative w-56 h-56">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                className="text-gray-100 dark:text-[rgb(38,38,38)]"
              />
              
              {/* Data segments */}
              {(() => {
                const total = immediate + shortTerm + mediumTerm + safe;
                if (total === 0) return null;
                
                let offset = 0;
                const segments = [
                  { count: immediate, color: 'rgb(239, 68, 68)', label: 'Immediate' },
                  { count: shortTerm, color: 'rgb(249, 115, 22)', label: 'Short Term' },
                  { count: mediumTerm, color: 'rgb(234, 179, 8)', label: 'Medium Term' },
                  { count: safe, color: 'rgb(34, 197, 94)', label: 'Safe' }
                ];
                
                return segments.map((seg, idx) => {
                  const percentage = (seg.count / total) * 100;
                  const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
                  const strokeDashoffset = -offset * 2.51;
                  offset += percentage;
                  
                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  );
                });
              })()}
            </svg>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalHabitations}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <LegendItem color="rgb(239, 68, 68)" label="Immediate" count={immediate} />
            <LegendItem color="rgb(249, 115, 22)" label="Short Term" count={shortTerm} />
            <LegendItem color="rgb(234, 179, 8)" label="Medium Term" count={mediumTerm} />
            <LegendItem color="rgb(34, 197, 94)" label="Safe" count={safe} />
          </div>
        </div>

        {/* Action Button - Elegant single button */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
          <button
            onClick={onBulkAssess}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Zap size={16} />
            Run AI Assessment
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Risk Coverage</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {Math.round(((stats?.total_population_at_risk || 0) / ((stats?.total_population_at_risk || 0) + 1000000)) * 100)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {(stats?.total_population_at_risk || 0).toLocaleString()} people monitored
          </div>
        </div>

        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Relocation Capacity</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats?.total_relocation_capacity || 0}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Across {stats?.total_relocation_sites || 0} sites
          </div>
        </div>

        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-6">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Coverage Ratio</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {Math.round(((stats?.total_relocation_capacity || 0) / ((stats?.total_population_at_risk || 0) / 4 + 1)) * 100)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Capacity vs at-risk households
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{count} settlements</div>
      </div>
    </div>
  );
}


// ==================== TAB 2: HAZARD ZONES ====================
function HazardZonesTab({ zones, loading, onAdd, onEdit, onDelete }) {
  const [intensityFilter, setIntensityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredZones = zones.filter(zone => {
    const matchesIntensity = intensityFilter === 'all' || zone.intensity === intensityFilter;
    const matchesSearch = zone.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         zone.district?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesIntensity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Hazard Zones ({filteredZones.length})
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search zones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Intensity Filter */}
          <div className="relative">
            <select
              value={intensityFilter}
              onChange={(e) => setIntensityFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Add Button */}
          <button
            onClick={onAdd}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} />
            Add Zone
          </button>
        </div>
      </div>

      {/* Zones Table */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[rgb(38,38,38)] border-b border-gray-200 dark:border-[rgb(47,51,54)]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">District</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Intensity</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Population</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">AI Score</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[rgb(47,51,54)]">
              {filteredZones.map(zone => (
                <tr key={zone.id} className="hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{zone.name}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {zone.hazard_types?.slice(0, 2).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{zone.district}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${INTENSITY_CONFIG[zone.intensity]?.badge || INTENSITY_CONFIG.medium.badge}`}>
                      {INTENSITY_CONFIG[zone.intensity]?.label || zone.intensity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">
                    {zone.population_at_risk?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                    {Math.round((zone.ai_confidence || 0) * 100)}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => onEdit(zone)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDelete(zone.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredZones.length === 0 && (
          <div className="text-center py-12">
            <ShieldAlert size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No hazard zones found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== TAB 3: RELOCATION SITES ====================
function RelocationSitesTab({ sites, loading, onAdd, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSites = sites.filter(site =>
    site.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.district?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Relocation Sites ({filteredSites.length})
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={onAdd}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} />
            Add Site
          </button>
        </div>
      </div>

      {/* Sites List */}
      <div className="space-y-3">
        {filteredSites.map(site => (
          <div key={site.id} className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{site.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} />
                  {site.district}, {site.state}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => onEdit(site)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete(site.id)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Capacity Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 dark:text-gray-400">Capacity</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {site.current_occupancy || 0} / {site.carrying_capacity || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-[rgb(38,38,38)] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    ((site.current_occupancy || 0) / (site.carrying_capacity || 1)) < 0.7 ? 'bg-green-500' :
                    ((site.current_occupancy || 0) / (site.carrying_capacity || 1)) < 0.9 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(((site.current_occupancy || 0) / (site.carrying_capacity || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Facilities */}
            {site.facilities && site.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {site.facilities.slice(0, 5).map((facility, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-md">
                    {facility}
                  </span>
                ))}
                {site.facilities.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-md">
                    +{site.facilities.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl text-center py-12">
          <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No relocation sites found</p>
        </div>
      )}
    </div>
  );
}

// ==================== TAB 4: VULNERABLE HABITATIONS ====================
function VulnerableHabitationsTab({ habitations, loading, onAdd, onBulkAssess, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const filteredHabitations = habitations.filter(hab => {
    const matchesPriority = priorityFilter === 'all' || hab.priority === priorityFilter;
    const matchesSearch = hab.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hab.district?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const assessMutation = useMutation({
    mutationFn: assessHabitation,
    onSuccess: () => {
      toast.success('AI assessment completed');
      queryClient.invalidateQueries(['vulnerable-habitations']);
    },
    onError: () => toast.error('Assessment failed')
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Vulnerable Habitations ({filteredHabitations.length})
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search habitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
            >
              <option value="all">All Priority</option>
              <option value="IMMEDIATE">Immediate</option>
              <option value="SHORT_TERM">Short Term</option>
              <option value="MEDIUM_TERM">Medium Term</option>
              <option value="SAFE">Safe</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Bulk Assess */}
          <button
            onClick={onBulkAssess}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Zap size={16} />
            Bulk Assess
          </button>

          {/* Add Button */}
          <button
            onClick={onAdd}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={16} />
            Register
          </button>
        </div>
      </div>

      {/* Habitations List */}
      <div className="space-y-2">
        {filteredHabitations.map(hab => (
          <div key={hab.id} className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl overflow-hidden">
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-colors"
              onClick={() => setExpandedId(expandedId === hab.id ? null : hab.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold border ${PRIORITY_CONFIG[hab.priority]?.badge || PRIORITY_CONFIG.MEDIUM_TERM.badge}`}>
                    {PRIORITY_CONFIG[hab.priority]?.label || hab.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{hab.name}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin size={10} />
                      {hab.district}, {hab.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{hab.population?.toLocaleString() || 0}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Population</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        assessMutation.mutate(hab.id);
                      }}
                      disabled={assessMutation.isPending}
                      className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs transition-all"
                    >
                      {assessMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(hab); }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(hab.id); }}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {expandedId === hab.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Priority Reason</p>
                    <p className="text-gray-900 dark:text-white">{hab.priority_reason || 'Not assessed'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Hazard Types</p>
                    <div className="flex flex-wrap gap-1">
                      {hab.hazard_types?.map((type, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-md">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredHabitations.length === 0 && (
        <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl text-center py-12">
          <Home size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No vulnerable habitations found</p>
        </div>
      )}
    </div>
  );
}

// ==================== MODALS WITH PROPER FORMS ====================
function AddHazardZoneModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    district: '',
    state: '',
    center_lat: '',
    center_lon: '',
    intensity: 'medium',
    hazard_types: [],
    population_at_risk: 0
  });

  const mutation = useMutation({
    mutationFn: createHazardZone,
    onSuccess: () => {
      toast.success('Hazard zone created');
      queryClient.invalidateQueries(['hazard-zones']);
      onClose();
    },
    onError: () => toast.error('Failed to create zone')
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-100 dark:border-red-800">
              <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">Add Hazard Zone</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Mark a new permanently unsafe area</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Zone Name
            </label>
            <input
              type="text"
              placeholder="e.g. Chamoli Glacier Risk Zone"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                District
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.center_lat}
                onChange={(e) => setForm({ ...form, center_lat: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.center_lon}
                onChange={(e) => setForm({ ...form, center_lon: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Intensity
            </label>
            <select
              value={form.intensity}
              onChange={(e) => setForm({ ...form, intensity: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Population at Risk
            </label>
            <input
              type="number"
              value={form.population_at_risk}
              onChange={(e) => setForm({ ...form, population_at_risk: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.name || !form.district}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Zone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddRelocationSiteModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    carrying_capacity: 0,
    current_occupancy: 0,
    facilities: [],
    land_area_sqkm: 0
  });

  const mutation = useMutation({
    mutationFn: createRelocationSite,
    onSuccess: () => {
      toast.success('Relocation site created');
      queryClient.invalidateQueries(['relocation-sites']);
      onClose();
    },
    onError: () => toast.error('Failed to create site')
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center border border-green-100 dark:border-green-800">
              <Building2 size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">Add Relocation Site</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Register a safe relocation area</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Site Name
            </label>
            <input
              type="text"
              placeholder="e.g. Kalpetta Resettlement Colony"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                District
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Land Area (sq km)
            </label>
            <input
              type="number"
              step="0.001"
              value={form.land_area_sqkm}
              onChange={(e) => setForm({ ...form, land_area_sqkm: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            {form.land_area_sqkm && (
              <p className="text-xs text-sky-500 mt-1">
                💡 Auto-calculated capacity: ~{Math.floor(form.land_area_sqkm * 1000000 / 75).toLocaleString()} households
                (NDMA standard: 75 sqm/household)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Carrying Capacity (Households)
            </label>
            <input
              type="number"
              value={form.carrying_capacity}
              onChange={(e) => setForm({ ...form, carrying_capacity: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Leave empty to auto-calculate from land area"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.name || !form.district}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddHabitationModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    population: 0,
    households: 0,
    hazard_types: []
  });

  const mutation = useMutation({
    mutationFn: createHabitation,
    onSuccess: () => {
      toast.success('Habitation registered');
      queryClient.invalidateQueries(['vulnerable-habitations']);
      onClose();
    },
    onError: () => toast.error('Failed to register habitation')
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100 dark:border-orange-800">
              <Home size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">Register Vulnerable Habitation</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Add a settlement requiring assessment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Settlement Name
            </label>
            <input
              type="text"
              placeholder="e.g. Mundakkai Village"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                District
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Population
              </label>
              <input
                type="number"
                value={form.population}
                onChange={(e) => setForm({ ...form, population: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Households
              </label>
              <input
                type="number"
                value={form.households}
                onChange={(e) => setForm({ ...form, households: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.name || !form.district}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
