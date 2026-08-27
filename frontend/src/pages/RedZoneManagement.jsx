import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  MapPin, AlertTriangle, Home, Users, TrendingUp, 
  Plus, Edit, Trash2, CheckCircle, Clock, Target,
  BarChart3, RefreshCw
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const RedZoneManagement = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showHabitationModal, setShowHabitationModal] = useState(false);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["redZoneStats"],
    queryFn: async () => {
      const res = await axiosInstance.get("/red-zone/dashboard/statistics");
      return res.data;
    },
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ["relocationRecommendations"],
    queryFn: async () => {
      const res = await axiosInstance.get("/red-zone/prioritization/recommendations");
      return res.data;
    },
  });

  // Fetch hazard zones
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ["hazardZones"],
    queryFn: async () => {
      const res = await axiosInstance.get("/red-zone/hazard-zones");
      return res.data;
    },
  });

  // Fetch relocation sites
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["relocationSites"],
    queryFn: async () => {
      const res = await axiosInstance.get("/red-zone/relocation-sites");
      return res.data;
    },
  });

  // Fetch vulnerable habitations
  const { data: habitations, isLoading: habitationsLoading } = useQuery({
    queryKey: ["vulnerableHabitations"],
    queryFn: async () => {
      const res = await axiosInstance.get("/red-zone/vulnerable-habitations");
      return res.data;
    },
  });

  // Recalculate scores mutation
  const { mutate: recalculateScores, isPending: recalculating } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/red-zone/prioritization/calculate-scores");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated_habitations} habitations`);
      queryClient.invalidateQueries({ queryKey: ["vulnerableHabitations"] });
      queryClient.invalidateQueries({ queryKey: ["redZoneStats"] });
    },
    onError: () => toast.error("Failed to recalculate scores"),
  });

  // Auto-match sites mutation
  const { mutate: autoMatch, isPending: matching } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/red-zone/prioritization/match-sites");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Matched ${data.matched_count} habitations to sites`);
      queryClient.invalidateQueries({ queryKey: ["vulnerableHabitations"] });
      queryClient.invalidateQueries({ queryKey: ["relocationSites"] });
      queryClient.invalidateQueries({ queryKey: ["redZoneStats"] });
    },
    onError: () => toast.error("Failed to auto-match sites"),
  });

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "zones", label: "Hazard Zones", icon: AlertTriangle },
    { id: "sites", label: "Relocation Sites", icon: Home },
    { id: "habitations", label: "Vulnerable Areas", icon: Users },
    { id: "recommendations", label: "Recommendations", icon: Target },
  ];

  const priorityColors = {
    immediate: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800",
    short_term: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-800",
    medium_term: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800",
    long_term: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-800",
  };

  const urgencyColors = {
    CRITICAL: "bg-red-600 text-white",
    HIGH: "bg-orange-500 text-white",
    MEDIUM: "bg-yellow-500 text-white",
    LOW: "bg-green-500 text-white",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Red Zone Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Proactive Disaster Relocation System
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => recalculateScores()}
              disabled={recalculating}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw size={16} className={recalculating ? "animate-spin" : ""} />
              Recalculate Scores
            </button>
            <button
              onClick={() => autoMatch()}
              disabled={matching}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
              <Target size={16} />
              Auto-Match Sites
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="px-4 lg:px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {activeTab === "dashboard" && (
          <DashboardTab stats={stats} loading={statsLoading} />
        )}
        {activeTab === "zones" && (
          <HazardZonesTab 
            zones={zones} 
            loading={zonesLoading} 
            onAddClick={() => setShowZoneModal(true)}
            onEditClick={(zone) => { setEditingItem(zone); setShowZoneModal(true); }}
          />
        )}
        {activeTab === "sites" && (
          <RelocationSitesTab 
            sites={sites} 
            loading={sitesLoading} 
            onAddClick={() => setShowSiteModal(true)}
            onEditClick={(site) => { setEditingItem(site); setShowSiteModal(true); }}
          />
        )}
        {activeTab === "habitations" && (
          <VulnerableHabitationsTab 
            habitations={habitations} 
            loading={habitationsLoading} 
            priorityColors={priorityColors}
            onAddClick={() => setShowHabitationModal(true)}
            onEditClick={(hab) => { setEditingItem(hab); setShowHabitationModal(true); }}
          />
        )}
        {activeTab === "recommendations" && (
          <RecommendationsTab 
            recommendations={recommendations} 
            urgencyColors={urgencyColors}
            priorityColors={priorityColors}
          />
        )}
      </div>

      {/* Modals */}
      {showZoneModal && (
        <ZoneModal 
          onClose={() => { setShowZoneModal(false); setEditingItem(null); }}
          editingZone={editingItem}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["hazardZones"] });
            queryClient.invalidateQueries({ queryKey: ["redZoneStats"] });
          }}
        />
      )}
      
      {showSiteModal && (
        <SiteModal 
          onClose={() => { setShowSiteModal(false); setEditingItem(null); }}
          editingSite={editingItem}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["relocationSites"] });
            queryClient.invalidateQueries({ queryKey: ["redZoneStats"] });
          }}
        />
      )}
      
      {showHabitationModal && (
        <HabitationModal 
          onClose={() => { setShowHabitationModal(false); setEditingItem(null); }}
          editingHabitation={editingItem}
          zones={zones}
          sites={sites}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["vulnerableHabitations"] });
            queryClient.invalidateQueries({ queryKey: ["redZoneStats"] });
          }}
        />
      )}
      
      {showRecommendationModal && selectedRecommendation && (
        <RecommendationDetailModal 
          recommendation={selectedRecommendation}
          onClose={() => { setShowRecommendationModal(false); setSelectedRecommendation(null); }}
        />
      )}
    </div>
  );
};

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────

const DashboardTab = ({ stats, loading }) => {
  if (loading) {
    return <div className="text-center py-12">Loading statistics...</div>;
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Hazard Zones"
          value={stats?.hazard_zones?.active || 0}
          subtitle={`${stats?.hazard_zones?.high_risk || 0} high-risk zones`}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          title="Affected Population"
          value={(stats?.hazard_zones?.affected_population || 0).toLocaleString()}
          subtitle="In red zones"
          icon={Users}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          title="Relocation Sites"
          value={stats?.relocation_sites?.available || 0}
          subtitle={`${stats?.relocation_sites?.total || 0} total sites`}
          icon={Home}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Available Capacity"
          value={(stats?.relocation_sites?.available_capacity || 0).toLocaleString()}
          subtitle={`${stats?.relocation_sites?.capacity_utilization_percent || 0}% utilized`}
          icon={TrendingUp}
          color="text-sky-600 dark:text-sky-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Relocation Priority
          </h3>
          <div className="space-y-3">
            <PriorityBar
              label="Immediate"
              count={stats?.vulnerable_habitations?.immediate_priority || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-red-500"
            />
            <PriorityBar
              label="Short-term"
              count={stats?.vulnerable_habitations?.short_term_priority || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-orange-500"
            />
            <PriorityBar
              label="Medium-term"
              count={stats?.vulnerable_habitations?.medium_term_priority || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-yellow-500"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Relocation Progress
          </h3>
          <div className="space-y-3">
            <ProgressBar
              label="Not Started"
              count={stats?.relocation_progress?.not_started || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-gray-400"
            />
            <ProgressBar
              label="In Progress"
              count={stats?.relocation_progress?.in_progress || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-sky-500"
            />
            <ProgressBar
              label="Completed"
              count={stats?.relocation_progress?.completed || 0}
              total={stats?.vulnerable_habitations?.total || 1}
              color="bg-emerald-500"
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Completion Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {stats?.relocation_progress?.completion_rate_percent || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PriorityBar = ({ label, count, total, color }) => {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-[rgb(38,38,38)] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const ProgressBar = ({ label, count, total, color }) => {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-[rgb(38,38,38)] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

// ─── HAZARD ZONES TAB ─────────────────────────────────────────────────────────

const HazardZonesTab = ({ zones, loading, onAddClick, onEditClick }) => {
  if (loading) {
    return <div className="text-center py-12">Loading hazard zones...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Hazard Zones ({zones?.length || 0})
        </h2>
        <button 
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Zone
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones?.map((zone) => (
          <div
            key={zone.id}
            className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{zone.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {zone.district}, {zone.state}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                zone.status === "active" 
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              }`}>
                {zone.status}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex flex-wrap gap-1">
                {zone.hazard_types?.map((hazard, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs"
                  >
                    {hazard}
                  </span>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Risk Level</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {zone.risk_level}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Population</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {zone.population_estimate?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
              <button 
                onClick={() => onEditClick(zone)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded text-sm font-medium"
              >
                <Edit size={14} />
                Edit
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm font-medium">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── RELOCATION SITES TAB ─────────────────────────────────────────────────────

const RelocationSitesTab = ({ sites, loading, onAddClick, onEditClick }) => {
  if (loading) {
    return <div className="text-center py-12">Loading relocation sites...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Relocation Sites ({sites?.length || 0})
        </h2>
        <button 
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Site
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites?.map((site) => {
          const utilizationPercent = ((site.current_households / site.max_households) * 100).toFixed(0);
          
          return (
            <div
              key={site.id}
              className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{site.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {site.district}, {site.state}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  site.status === "available" 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                }`}>
                  {site.status}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Capacity</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {site.current_households} / {site.max_households}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-[rgb(38,38,38)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${utilizationPercent}%` }} 
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Suitability</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {(site.suitability_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
                <button 
                  onClick={() => onEditClick(site)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded text-sm font-medium"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm font-medium">
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── VULNERABLE HABITATIONS TAB ───────────────────────────────────────────────

const VulnerableHabitationsTab = ({ habitations, loading, priorityColors, onAddClick, onEditClick }) => {
  if (loading) {
    return <div className="text-center py-12">Loading vulnerable habitations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Vulnerable Habitations ({habitations?.length || 0})
        </h2>
        <button 
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Habitation
        </button>
      </div>

      <div className="space-y-3">
        {habitations?.map((hab) => (
          <div
            key={hab.id}
            className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {hab.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    priorityColors[hab.relocation_priority] || priorityColors.medium_term
                  }`}>
                    {hab.relocation_priority?.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {hab.district}, {hab.state}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Population</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {hab.population_count?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Households</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {hab.household_count?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Risk Score</span>
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {(hab.vulnerability_score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                      {hab.relocation_status?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button 
                  onClick={() => onEditClick(hab)}
                  className="p-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded"
                >
                  <Edit size={16} />
                </button>
                <button className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── RECOMMENDATIONS TAB ──────────────────────────────────────────────────────

const RecommendationsTab = ({ recommendations, urgencyColors, priorityColors }) => {
  if (!recommendations) {
    return <div className="text-center py-12">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
        <h3 className="font-semibold text-sky-900 dark:text-sky-400 mb-1">
          AI-Powered Recommendations
        </h3>
        <p className="text-sm text-sky-700 dark:text-sky-500">
          {recommendations.total_recommendations} habitations prioritized for relocation based on
          vulnerability score, population, and hazard exposure.
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.recommendations?.map((rec) => (
          <div
            key={rec.habitation_id}
            className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {rec.habitation_name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    urgencyColors[rec.urgency_level]
                  }`}>
                    {rec.urgency_level}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    priorityColors[rec.priority]
                  }`}>
                    {rec.priority?.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rec.district} • {rec.population?.toLocaleString()} people • 
                  Risk: {(rec.vulnerability_score * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {rec.hazard_zone && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm font-medium text-red-900 dark:text-red-400 mb-1">
                  Located in: {rec.hazard_zone.zone_name}
                </p>
                <div className="flex flex-wrap gap-1">
                  {rec.hazard_zone.hazard_types?.map((hazard, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs"
                    >
                      {hazard}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rec.recommended_sites?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Recommended Relocation Sites:
                </p>
                <div className="space-y-2">
                  {rec.recommended_sites.map((site, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-400">
                          {idx + 1}. {site.site_name}
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-500">
                          Capacity: {site.remaining_capacity?.toLocaleString()} • 
                          Suitability: {(site.suitability_score * 100).toFixed(0)}% • 
                          {site.distance_to_town_km} km from town
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[rgb(47,51,54)] flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Est. Time: {rec.estimated_relocation_time_months} months</span>
              <button 
                onClick={() => { setSelectedRecommendation(rec); setShowRecommendationModal(true); }}
                className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
              >
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ZONE MODAL ───────────────────────────────────────────────────────────────

const ZoneModal = ({ onClose, editingZone, onSuccess }) => {
  const [formData, setFormData] = useState({
    zone_name: editingZone?.name || "",  // DB field is 'name'
    district: editingZone?.district || "",
    state: editingZone?.state || "Bihar",
    hazard_types: editingZone?.hazard_types || [],
    intensity_level: editingZone?.risk_level || "medium",  // DB field is 'risk_level'
    risk_score: 0.5,  // Not used anymore, but kept for form compatibility
    affected_population: editingZone?.population_estimate || 0,  // DB field is 'population_estimate'
    geometry: editingZone?.geometry || { type: "Polygon", coordinates: [] },
    status: editingZone?.status || "active",
    notes: editingZone?.description || "",  // DB field is 'description'
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data) => {
      if (editingZone) {
        return await axiosInstance.patch(`/red-zone/hazard-zones/${editingZone.id}`, data);
      }
      return await axiosInstance.post("/red-zone/hazard-zones", data);
    },
    onSuccess: () => {
      toast.success(editingZone ? "Zone updated" : "Zone created");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Operation failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse geometry if it's a string
    let geometry = formData.geometry;
    if (typeof geometry === "string") {
      try {
        geometry = JSON.parse(geometry);
      } catch (err) {
        toast.error("Invalid GeoJSON geometry");
        return;
      }
    }
    
    mutate({ ...formData, geometry });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{editingZone ? "Edit" : "Add"} Hazard Zone</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={formData.zone_name}
                  onChange={(e) => setFormData({...formData, zone_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Intensity Level</label>
                <select
                  value={formData.intensity_level}
                  onChange={(e) => setFormData({...formData, intensity_level: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Risk Score (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.risk_score}
                  onChange={(e) => setFormData({...formData, risk_score: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Affected Population</label>
                <input
                  type="number"
                  value={formData.affected_population}
                  onChange={(e) => setFormData({...formData, affected_population: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hazard Types (comma-separated)</label>
              <input
                type="text"
                value={formData.hazard_types.join(", ")}
                onChange={(e) => setFormData({...formData, hazard_types: e.target.value.split(",").map(h => h.trim())})}
                placeholder="flood, landslide, earthquake"
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Geometry (GeoJSON) *</label>
              <textarea
                required
                rows={3}
                value={typeof formData.geometry === "string" ? formData.geometry : JSON.stringify(formData.geometry, null, 2)}
                onChange={(e) => setFormData({...formData, geometry: e.target.value})}
                placeholder='{"type": "Polygon", "coordinates": [[[lng, lat], ...]]}'
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── SITE MODAL ───────────────────────────────────────────────────────────────

const SiteModal = ({ onClose, editingSite, onSuccess }) => {
  const [formData, setFormData] = useState({
    site_name: editingSite?.name || "",  // DB field is 'name'
    district: editingSite?.district || "",
    state: editingSite?.state || "Bihar",
    carrying_capacity: editingSite?.max_households || 0,  // DB field is 'max_households'
    current_occupancy: editingSite?.current_households || 0,  // DB field is 'current_households'
    suitability_score: editingSite?.suitability_score || 0.5,
    infrastructure_available: [
      ...(editingSite?.has_electricity ? ["electricity"] : []),
      ...(editingSite?.has_water_supply ? ["water_supply"] : []),
      ...(editingSite?.has_drainage ? ["drainage"] : []),
    ],
    water_availability: editingSite?.road_connectivity || "adequate",
    accessibility_score: 0.5,
    distance_to_town_km: 0,
    land_area_hectares: 0,
    geometry: editingSite?.geometry || { type: "Point", coordinates: [] },
    status: editingSite?.status || "available",
    notes: editingSite?.description || "",  // DB field is 'description'
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data) => {
      if (editingSite) {
        return await axiosInstance.patch(`/red-zone/relocation-sites/${editingSite.id}`, data);
      }
      return await axiosInstance.post("/red-zone/relocation-sites", data);
    },
    onSuccess: () => {
      toast.success(editingSite ? "Site updated" : "Site created");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Operation failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let geometry = formData.geometry;
    if (typeof geometry === "string") {
      try {
        geometry = JSON.parse(geometry);
      } catch (err) {
        toast.error("Invalid GeoJSON geometry");
        return;
      }
    }
    
    mutate({ ...formData, geometry });
  };

  const toggleInfrastructure = (item) => {
    const current = formData.infrastructure_available;
    if (current.includes(item)) {
      setFormData({...formData, infrastructure_available: current.filter(i => i !== item)});
    } else {
      setFormData({...formData, infrastructure_available: [...current, item]});
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{editingSite ? "Edit" : "Add"} Relocation Site</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site Name *</label>
                <input
                  type="text"
                  required
                  value={formData.site_name}
                  onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  value={formData.carrying_capacity}
                  onChange={(e) => setFormData({...formData, carrying_capacity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Suitability (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.suitability_score}
                  onChange={(e) => setFormData({...formData, suitability_score: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Distance (km)</label>
                <input
                  type="number"
                  value={formData.distance_to_town_km}
                  onChange={(e) => setFormData({...formData, distance_to_town_km: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Infrastructure</label>
              <div className="flex flex-wrap gap-2">
                {["electricity", "water_supply", "roads", "drainage", "healthcare", "schools"].map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInfrastructure(item)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      formData.infrastructure_available.includes(item)
                        ? "bg-sky-600 text-white"
                        : "bg-gray-200 dark:bg-[rgb(38,38,38)] text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {item.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Geometry (GeoJSON Point) *</label>
              <textarea
                required
                rows={2}
                value={typeof formData.geometry === "string" ? formData.geometry : JSON.stringify(formData.geometry, null, 2)}
                onChange={(e) => setFormData({...formData, geometry: e.target.value})}
                placeholder='{"type": "Point", "coordinates": [lng, lat]}'
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── HABITATION MODAL ─────────────────────────────────────────────────────────

const HabitationModal = ({ onClose, editingHabitation, zones, sites, onSuccess }) => {
  const [formData, setFormData] = useState({
    habitation_name: editingHabitation?.name || "",  // DB field is 'name'
    district: editingHabitation?.district || "",
    state: editingHabitation?.state || "Bihar",
    population_count: editingHabitation?.population_count || 0,
    households: editingHabitation?.household_count || 0,  // DB field is 'household_count'
    vulnerability_score: editingHabitation?.vulnerability_score || 0.5,
    relocation_priority: editingHabitation?.relocation_priority || "medium_term",
    hazard_zone_id: editingHabitation?.hazard_zone_id || null,
    assigned_relocation_site_id: editingHabitation?.assigned_relocation_site_id || null,
    relocation_status: editingHabitation?.relocation_status || "not_started",
    geometry: editingHabitation?.geometry || { type: "Point", coordinates: [] },
    notes: editingHabitation?.notes || "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data) => {
      if (editingHabitation) {
        return await axiosInstance.patch(`/red-zone/vulnerable-habitations/${editingHabitation.id}`, data);
      }
      return await axiosInstance.post("/red-zone/vulnerable-habitations", data);
    },
    onSuccess: () => {
      toast.success(editingHabitation ? "Habitation updated" : "Habitation created");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Operation failed");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let geometry = formData.geometry;
    if (typeof geometry === "string") {
      try {
        geometry = JSON.parse(geometry);
      } catch (err) {
        toast.error("Invalid GeoJSON geometry");
        return;
      }
    }
    
    mutate({ ...formData, geometry });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{editingHabitation ? "Edit" : "Add"} Vulnerable Habitation</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Habitation Name *</label>
                <input
                  type="text"
                  required
                  value={formData.habitation_name}
                  onChange={(e) => setFormData({...formData, habitation_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">District *</label>
                <input
                  type="text"
                  required
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Population</label>
                <input
                  type="number"
                  value={formData.population_count}
                  onChange={(e) => setFormData({...formData, population_count: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Households</label>
                <input
                  type="number"
                  value={formData.households}
                  onChange={(e) => setFormData({...formData, households: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vulnerability (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.vulnerability_score}
                  onChange={(e) => setFormData({...formData, vulnerability_score: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.relocation_priority}
                  onChange={(e) => setFormData({...formData, relocation_priority: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                >
                  <option value="immediate">Immediate</option>
                  <option value="short_term">Short Term</option>
                  <option value="medium_term">Medium Term</option>
                  <option value="long_term">Long Term</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.relocation_status}
                  onChange={(e) => setFormData({...formData, relocation_status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Geometry (GeoJSON Point) *</label>
              <textarea
                required
                rows={2}
                value={typeof formData.geometry === "string" ? formData.geometry : JSON.stringify(formData.geometry, null, 2)}
                onChange={(e) => setFormData({...formData, geometry: e.target.value})}
                placeholder='{"type": "Point", "coordinates": [lng, lat]}'
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)] font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── RECOMMENDATION DETAIL MODAL ──────────────────────────────────────────────

const RecommendationDetailModal = ({ recommendation, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{recommendation.habitation_name}</h2>
              <p className="text-gray-500 dark:text-gray-400">{recommendation.district}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* AI Recommendation Basis */}
          <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
            <h3 className="font-bold text-sky-900 dark:text-sky-100 mb-3">🤖 AI Recommendation Basis</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Vulnerability Score:</strong> {(recommendation.vulnerability_score * 100).toFixed(0)}% - Calculated from:</p>
              <ul className="ml-6 space-y-1 list-disc text-gray-700 dark:text-gray-300">
                <li><strong>Hazard Risk (50%):</strong> {recommendation.hazard_zone ? `${recommendation.hazard_zone.risk_level} risk zone` : 'No zone assigned'}</li>
                <li><strong>Population Size (30%):</strong> {recommendation.population?.toLocaleString()} people</li>
                <li><strong>Structural Safety (10%):</strong> Building safety rating</li>
                <li><strong>Relocation Status (10%):</strong> Current progress</li>
              </ul>
              <p className="mt-3"><strong>Priority Level:</strong> Based on score and urgency - Higher scores = Higher priority</p>
            </div>
          </div>

          {/* Population Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Population</div>
              <div className="text-2xl font-bold">{recommendation.population?.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Households</div>
              <div className="text-2xl font-bold">{recommendation.households?.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Vulnerability Score</div>
              <div className="text-2xl font-bold text-red-600">{(recommendation.vulnerability_score * 100).toFixed(0)}%</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Priority</div>
              <div className="text-xl font-bold capitalize">{recommendation.priority?.replace("_", " ")}</div>
            </div>
          </div>

          {/* Hazard Zone Info */}
          {recommendation.hazard_zone && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-bold mb-2">⚠️ Hazard Zone</h3>
              <p className="font-semibold">{recommendation.hazard_zone.zone_name}</p>
              <p className="text-sm">Risk Level: <span className="font-bold text-red-600">{recommendation.hazard_zone.risk_level}</span></p>
              <div className="flex flex-wrap gap-1 mt-2">
                {recommendation.hazard_zone.hazard_types?.map((hazard, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                    {hazard}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Timeline */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold mb-3">📅 Estimated Relocation Timeline</h3>
            <div className="text-sm space-y-2">
              <p><strong>Total Time:</strong> {recommendation.estimated_relocation_time_months} months</p>
              <p className="text-gray-600 dark:text-gray-400">Calculation based on:</p>
              <ul className="ml-6 space-y-1 list-disc text-gray-700 dark:text-gray-300">
                <li><strong>Base Planning:</strong> 6 months (surveys, approvals, logistics)</li>
                <li><strong>Population Factor:</strong> +{recommendation.population > 500 ? '6' : recommendation.population > 200 ? '3' : '0'} months (larger populations need more time)</li>
                <li><strong>Risk Urgency:</strong> {recommendation.hazard_zone?.risk_level === 'critical' ? '-3 months (expedited)' : recommendation.hazard_zone?.risk_level === 'high' ? '-1 month' : 'Normal timeline'}</li>
              </ul>
            </div>
          </div>

          {/* Recommended Sites */}
          <div className="mb-4">
            <h3 className="font-bold mb-3">🏘️ Recommended Relocation Sites (Top 3)</h3>
            {recommendation.recommended_sites && recommendation.recommended_sites.length > 0 ? (
              <div className="space-y-3">
                {recommendation.recommended_sites.map((site, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{idx + 1}. {site.site_name}</div>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                        {(site.suitability_score * 100).toFixed(0)}% Suitable
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Capacity: {site.remaining_capacity} households available</p>
                      <p>Why recommended: {
                        site.suitability_score > 0.8 ? 'High suitability with excellent infrastructure' :
                        site.suitability_score > 0.6 ? 'Good suitability and adequate facilities' :
                        'Acceptable option with basic amenities'
                      }</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No suitable sites available. Please create relocation sites first.</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-[rgb(38,38,38)] rounded-lg hover:bg-gray-300 dark:hover:bg-[rgb(47,51,54)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedZoneManagement;
