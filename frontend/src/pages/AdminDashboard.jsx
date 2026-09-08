import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminReports, fetchReportStats, verifyReport,
  fetchAlerts, createAlert, deactivateAlert
} from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { ClipboardList, CheckCircle, XCircle, MapPin,
  Loader2, AlertTriangle, Bell, BellOff, Plus,
  X, Shield, TrendingUp, Users, Zap, ChevronDown,
  Filter, Brain, MessageSquare, BarChart3, Map, AlertOctagon } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ImageLightbox from '../components/ImageLightbox.jsx';
import ClusterReportsModal from '../components/ClusterReportsModal.jsx';
import MapResourcesAdmin from '../components/MapResourcesAdmin.jsx';
import { fetchAIClusters } from '../lib/api.js';

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-500",    text: "text-red-500",    light: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
  high:     { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
  medium:   { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
  low:      { bg: "bg-green-500",  text: "text-green-500",  light: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
};

const AI_SCORE_COLOR = (score) => {
  if (!score) return "text-gray-400 dark:text-gray-500";
  if (score >= 0.8) return "text-emerald-500";
  if (score >= 0.5) return "text-yellow-500";
  return "text-red-500";
};

// ── Alert Issue Modal ─────────────────────────────────────────────────────────
const IssueAlertModal = ({ adminDistrict, adminState, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    title:       "",
    message:     "",
    hazard_type: "Flood",
    severity:    "medium",
    district:    adminDistrict || "",
    state:       adminState    || "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createAlert,
    onSuccess: () => { toast.success("Alert issued successfully"); onSuccess(); onClose(); },
    onError:   (error) => {
      const msg = error.response?.data?.detail || "Failed to issue alert";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white dark:bg-[rgb(22,22,22)] px-6 py-5 flex items-center justify-between border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-100 dark:border-red-800">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Issue Emergency Alert</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Broadcast to citizens in your jurisdiction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg p-2 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
          {/* Jurisdiction notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-white" />
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">Jurisdiction: {adminDistrict || "All Districts"}, {adminState || "National"}</p>
              <p className="text-blue-600 dark:text-blue-400">This alert will be sent to citizens in your administrative area only.</p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Alert Title
            </label>
            <input
              type="text"
              placeholder="e.g. Cyclone Warning — Coastal Districts"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Advisory Message
            </label>
            <textarea
              rows={4}
              placeholder="Provide detailed instructions to citizens..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none text-sm placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Hazard type */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Hazard Type
              </label>
              <select
                value={form.hazard_type}
                onChange={(e) => setForm({ ...form, hazard_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              >
                {["Flood","Cyclone","Storm","Tsunami","Oil Spill","Earthquake","General"].map(h => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Severity Level
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Target area - read-only display */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Target District
              </label>
              <input
                type="text"
                value={form.district || "All Districts"}
                disabled
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-500 dark:text-gray-400 rounded-xl outline-none text-sm font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                Target State
              </label>
              <input
                type="text"
                value={form.state || "National"}
                disabled
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-500 dark:text-gray-400 rounded-xl outline-none text-sm font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-[rgb(47,51,54)]">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all">
              Cancel
            </button>
            <button
              onClick={() => { 
                if (!form.title || !form.message) return toast.error("Title and message required"); 
                mutate(form); 
              }}
              disabled={isPending}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-[0.98]"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
              Broadcast Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Report Card for Admin ─────────────────────────────────────────────────────
const AdminReportCard = ({ report, onVerify }) => {
  const [lightboxOpen, setLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const sev  = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium;
  const score = report.aiScore;

  const openLightbox = (idx = 0) => { setLightboxIndex(idx); setLightbox(true); };
  const images = report.images?.length > 0 ? report.images : (report.image ? [report.image] : []);

  return (
    <>
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] hover:bg-gray-50 dark:hover:bg-[rgb(10,10,10)] transition-colors">
        <div className="p-4">
          {/* Header with AI Score */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {/* Title only */}
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{report.disasterType}</h3>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={11} /> {report.location}</span>
                <span>{report.date}</span>
                <span className="text-gray-400">#{report.id}</span>
              </div>
            </div>

            {/* AI Score - Compact */}
            {(score !== null && score !== undefined) && (
              <div className="shrink-0">
                <div className={`px-2.5 py-1.5 rounded-lg border text-center ${
                  score >= 0.85 ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10' :
                  score >= 0.65 ? 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10' :
                  'border-red-500/30 bg-red-50 dark:bg-red-500/10'
                }`}>
                  <div className={`text-lg font-black leading-none ${AI_SCORE_COLOR(score)}`}>
                    {Math.round(score * 100)}%
                  </div>
                  <div className="text-[9px] font-semibold text-gray-400 mt-0.5">AI</div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
            "{report.description || "No description provided."}"
          </p>

          {/* AI Analysis - Simplified */}
          {report.aiSummary && (
            <div className="mb-3 p-2.5 bg-gray-50 dark:bg-[rgb(30,30,30)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)]">
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="font-semibold text-gray-700 dark:text-gray-300">AI: </span>
                {report.aiSummary}
              </p>
            </div>
          )}

          {/* Media thumbnails - Larger and better positioned */}
          {images.length > 0 && (
            <div className="flex gap-2.5 mb-4 overflow-x-auto pb-1">
              {images.slice(0, 5).map((media, idx) => {
                const isVideo = typeof media === 'string' && (media.includes('.mp4') || media.includes('.mov') || media.includes('.webm'));
                return (
                  <div key={idx} className="relative shrink-0">
                    {isVideo ? (
                      <video
                        src={media}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)]"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <button onClick={() => openLightbox(idx)}>
                        <img 
                          src={media} 
                          alt={`Media ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:opacity-70 transition-opacity"
                          onError={(e) => { e.target.style.display = "none"; }} 
                        />
                      </button>
                    )}
                  </div>
                );
              })}
              {images.length > 5 && (
                <div className="w-24 h-24 shrink-0 rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-100 dark:bg-[rgb(38,38,38)] flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                  +{images.length - 5}
                </div>
              )}
            </div>
          )}

          {/* Action buttons - Smaller and compact */}
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onVerify(report.id, "verified"); }}
              disabled={report.status === "verified"}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVerify(report.id, "false"); }}
              disabled={report.status === "false"}
              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Fake
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVerify(report.id, "pending"); }}
              disabled={report.status === "pending"}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            
            {/* Status indicator */}
            {report.status !== "pending" && (
              <span className="ml-auto text-xs font-medium">
                {report.status === "verified" ? (
                  <span className="text-emerald-600 dark:text-emerald-400">✓ Verified</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">✗ Marked Fake</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && (report.images || report.image) && (
        <ImageLightbox 
          images={report.images || [report.image]} 
          onClose={() => setLightbox(false)} 
        />
      )}
    </>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const queryClient    = useQueryClient();
  const { authUser }   = useAuthUser();
  const [filter,    setFilter]    = useState("pending");
  const [alertModal, setAlertModal] = useState(false);
  const [activeTab, setActiveTab]  = useState("sos"); // sos | alerts | ai | reports | map
  const [selectedCluster, setSelectedCluster] = useState(null); // For cluster reports modal

  const { data: stats } = useQuery({
    queryKey: ["reportStats"],
    queryFn:  fetchReportStats,
    refetchInterval: 30000,
  });

  const { data: aiClusters } = useQuery({
  queryKey: ["aiClusters"],
  queryFn:  fetchAIClusters,
  refetchInterval: 60000,
});

  const { data: reports, isLoading } = useQuery({
    queryKey: ["adminReports", filter],
    queryFn:  () => fetchAdminReports({ status: filter || undefined }),
    refetchInterval: 30000,
  });

  // Fetch ALL reports for cluster modal (not filtered by status)
  const { data: allReports } = useQuery({
    queryKey: ["allAdminReports"],
    queryFn:  () => fetchAdminReports({}),
    refetchInterval: 30000,
  });

  const { data: myAlerts } = useQuery({
    queryKey: ["myAlerts"],
    queryFn:  () => fetchAlerts({
      district: authUser?.district || undefined,
      state:    authUser?.state    || undefined,
    }),
  });

  const { mutate: doVerify } = useMutation({
    mutationFn: ({ id, status }) => verifyReport(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["adminReports"] });
      await queryClient.cancelQueries({ queryKey: ["allAdminReports"] });
      
      // Snapshot previous values
      const previousReports = queryClient.getQueryData(["adminReports", filter]);
      const previousAllReports = queryClient.getQueryData(["allAdminReports"]);
      
      // Optimistically update
      if (previousReports) {
        queryClient.setQueryData(["adminReports", filter], (old) =>
          old?.map(r => r.id === id ? { ...r, status, is_verified: status === "verified" } : r)
        );
      }
      if (previousAllReports) {
        queryClient.setQueryData(["allAdminReports"], (old) =>
          old?.map(r => r.id === id ? { ...r, status, is_verified: status === "verified" } : r)
        );
      }
      
      return { previousReports, previousAllReports };
    },
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["allAdminReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
      queryClient.invalidateQueries({ queryKey: ["aiClusters"] });
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousReports) {
        queryClient.setQueryData(["adminReports", filter], context.previousReports);
      }
      if (context?.previousAllReports) {
        queryClient.setQueryData(["allAdminReports"], context.previousAllReports);
      }
      toast.error("Action failed");
    },
  });

  const { mutate: doDeactivate } = useMutation({
    mutationFn: deactivateAlert,
    onSuccess: () => {
      toast.success("Alert deactivated");
      queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
    },
  });

  const statCards = [
    { label: "SOS Triggers", value: stats?.total_sos ?? 0 },
    { label: "Active Hazards", value: stats?.total_active ?? 0 },
    { label: "Flood", value: stats?.hazard_breakdown?.Flood ?? 0 },
    { label: "Cyclone", value: stats?.hazard_breakdown?.Cyclone ?? 0 },
  ];

  const FILTERS = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "pending" },
    { label: "Verified", value: "verified" },
    { label: "Fake",     value: "false" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={18} className="text-sky-500" />
              District Command — {authUser?.district || "National"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {authUser?.full_name} · {authUser?.state || "All States"} · Admin
            </p>
          </div>

          {/* Push Alert Button */}
          <button
            onClick={() => setAlertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[rgb(22,22,22)] border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <Bell size={16} />
            Issue Alert
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {statCards.map((s) => {
            // Color coding based on card type and value
            let valueColor = "text-gray-900 dark:text-white"; // default
            
            if (s.label === "SOS Triggers" && s.value > 0) {
              valueColor = "text-red-600 dark:text-red-400";
            } else if (s.label === "Active Hazards" && s.value > 0) {
              valueColor = "text-orange-600 dark:text-orange-400";
            } else if (s.label === "Flood" && s.value > 0) {
              valueColor = "text-blue-600 dark:text-blue-400";
            } else if (s.label === "Cyclone" && s.value > 0) {
              valueColor = "text-red-600 dark:text-red-400";
            }
            
            return (
              <div key={s.label} className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                <p className={`text-2xl font-semibold ${valueColor}`}>{s.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(22,22,22)] px-4 md:px-6 scrollbar-hide">
        {[
          { key: "sos", label: "SOS Triggers" },
          { key: "reports", label: "All Reports" },
          { key: "alerts",  label: "Issued Alerts" },
          { key: "ai", label: "AI Intelligence" },
          { key: "map", label: "Map Resources" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 md:px-5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.key
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.key.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {activeTab === "ai" && (
  <div className="space-y-3 sm:space-y-4">
    {/* Info banner - improved mobile spacing */}
    <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-lg sm:rounded-xl">
      <Brain size={14} className="text-gray-600 dark:text-gray-400 shrink-0 mt-0.5" />
      <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        AI clusters reports by location every 15 minutes. Each card represents multiple reports from the same area.
      </p>
    </div>

    {(() => {
      // Filter out single-report clusters to reduce admin noise
      const meaningfulClusters = aiClusters?.filter(c => c.report_count >= 2) || [];
      
      return !meaningfulClusters.length ? (
        <div className="text-center py-12 sm:py-16 px-4 sm:px-6 bg-white dark:bg-[rgb(22,22,22)] border border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl sm:rounded-2xl">
          <Brain className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">No Clusters Yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Waiting for 2+ reports near each other</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
        {meaningfulClusters.map((cluster) => {
          return (
            <div key={cluster.cluster_id}
              className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] hover:bg-gray-50 dark:hover:bg-[rgb(10,10,10)] transition-colors p-4">

            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {cluster.hazard_type}
                  </h3>
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-md">
                    {cluster.report_count} reports
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cluster.center_lat.toFixed(3)}°N, {cluster.center_lon.toFixed(3)}°E
                </p>
              </div>
              
              {/* AI Score - Compact */}
              <div className="shrink-0">
                <div className={`px-2.5 py-1.5 rounded-lg border text-center ${
                  cluster.authenticity_score >= 0.8 ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10' :
                  cluster.authenticity_score >= 0.5 ? 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10' :
                  'border-red-500/30 bg-red-50 dark:bg-red-500/10'
                }`}>
                  <div className={`text-lg font-black leading-none ${
                    cluster.authenticity_score >= 0.8 ? "text-emerald-500" :
                    cluster.authenticity_score >= 0.5 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {Math.round(cluster.authenticity_score * 100)}%
                  </div>
                  <div className="text-[9px] font-semibold text-gray-400 mt-0.5">AI</div>
                </div>
              </div>
            </div>

            {/* AI Summary - Simplified */}
            <div className="bg-gray-50 dark:bg-[rgb(30,30,30)] rounded-lg p-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] mb-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="font-semibold text-gray-700 dark:text-gray-300">AI: </span>
                {cluster.ai_summary}
              </p>
            </div>

            {/* Cyclone Classification - if applicable */}
            {cluster.cyclone_classification && (
              <div className={`rounded-lg border-l-4 p-3 mb-3 ${
                cluster.cyclone_classification.color === 'red' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-500' :
                cluster.cyclone_classification.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-500' :
                cluster.cyclone_classification.color === 'yellow' ? 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-500' :
                'bg-green-50/50 dark:bg-green-950/20 border-green-500'
              }`}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  IMD Cyclone Classification
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className={`inline-block px-2.5 py-1 rounded text-sm font-semibold ${
                      cluster.cyclone_classification.color === 'red' ? 'bg-red-500 text-white' :
                      cluster.cyclone_classification.color === 'orange' ? 'bg-orange-500 text-white' :
                      cluster.cyclone_classification.color === 'yellow' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {cluster.cyclone_classification.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {cluster.cyclone_classification.wind_speed}
                    </span>
                    <span className={`font-semibold ${
                      cluster.cyclone_classification.color === 'red' ? 'text-red-600 dark:text-red-400' :
                      cluster.cyclone_classification.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                      cluster.cyclone_classification.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {cluster.cyclone_classification.severity} Risk
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons - Smaller and cleaner */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setAlertModal(true)}
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 transition-colors"
              >
                Alert
              </button>
              <button
                onClick={() => {
                  cluster.report_ids.forEach(id => doVerify({ id, status: "verified" }));
                  toast.success(`Verified ${cluster.report_count} reports`);
                }}
                className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-md hover:bg-emerald-600 transition-colors"
              >
                Verify
              </button>
              <button
                onClick={() => {
                  cluster.report_ids.forEach(id => doVerify({ id, status: "false" }));
                  toast.success("Marked as fake");
                }}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Fake
              </button>
              <button
                onClick={() => setSelectedCluster(cluster)}
                className="px-3 py-1.5 bg-sky-500 text-white text-xs font-semibold rounded-md hover:bg-sky-600 transition-colors ml-auto"
              >
                View ({cluster.report_count})
              </button>
            </div>
          </div>
        );
      })}
      </div>
      );
    })()}
  </div>
)}

      <div className="p-4 md:p-6">

        {/* ── SOS Triggers Tab ── */}
        {activeTab === "sos" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">
                Critical severity reports (SOS triggers) from your district. These require immediate attention.
              </p>
            </div>

            {!stats?.sos_triggers?.length ? (
              <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-2xl">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No SOS triggers at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {stats.sos_triggers.map((sos) => (
                  <div key={sos.id}
                    className="bg-white dark:bg-[rgb(22,22,22)] border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                    
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 self-stretch rounded-full bg-red-500 shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={16} className="text-red-500 shrink-0" />
                          <span className="text-base font-black text-gray-900 dark:text-white">{sos.hazard_type}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                            CRITICAL
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3 italic">
                          "{sos.description || "No description provided."}"
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {sos.latitude.toFixed(4)}°N, {sos.longitude.toFixed(4)}°E
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {new Date(sos.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="text-[10px] text-gray-400">
                          Reported by: {sos.reporter_name} · ID: #{sos.id}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setAlertModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Bell size={12} /> Issue Alert
                          </button>
                          <button
                            onClick={() => {
                              // Open map centered on this location
                              window.open(`/map?lat=${sos.latitude}&lng=${sos.longitude}&zoom=12`, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <MapPin size={12} /> View on Map
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reports Tab ── */}
        {activeTab === "reports" && (
          <>
            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter size={14} className="text-gray-400" />
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors border
                    ${filter === f.value
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-white dark:bg-[rgb(22,22,22)] text-gray-500 dark:text-gray-300 border-gray-200 dark:border-[rgb(47,51,54)] hover:border-sky-300"}`}>
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-400">
                {reports?.length ?? 0} reports
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-sky-500" size={36} />
              </div>
            ) : reports?.length > 0 ? (
              <div>
                {reports.map((r) => (
                  <AdminReportCard
                    key={r.id}
                    report={r}
                    onVerify={(id, status) => doVerify({ id, status })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-2xl">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No reports in this category</p>
              </div>
            )}
          </>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            {!myAlerts?.length ? (
              <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-2xl">
                <BellOff className="mx-auto text-gray-300 mb-2" size={40} />
                <p className="text-xs text-gray-400 uppercase tracking-widest">No alerts issued yet</p>
              </div>
            ) : (
              myAlerts.map((alert) => {
                const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                return (
                  <div key={alert.id}
                    className={`bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-4 shadow-sm ${!alert.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-1.5 self-stretch rounded-full ${sev.bg} shrink-0`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-gray-900 dark:text-white">{alert.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${sev.light}`}>
                              {alert.severity}
                            </span>
                            {!alert.is_active && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{alert.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                            <span>{alert.district || "All Districts"} · {alert.state || "National"}</span>
                            <span>{alert.hazard_type}</span>
                            <span>{new Date(alert.created_at).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                      {alert.is_active && (() => {
                        // Check if this is a national alert (no district and no state)
                        const isNationalAlert = !alert.district && !alert.state;
                        // Check if current admin is a district admin (has a district)
                        const isDistrictAdmin = authUser?.district;
                        // District admins cannot deactivate national alerts
                        const canDeactivate = !(isNationalAlert && isDistrictAdmin);
                        
                        return canDeactivate ? (
                          <button
                            onClick={() => doDeactivate(alert.id)}
                            className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Deactivate alert"
                          >
                            <BellOff size={16} />
                          </button>
                        ) : (
                          <div className="shrink-0 p-2 text-gray-300 dark:text-gray-600" title="Only national admins can deactivate national alerts">
                            <BellOff size={16} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Map Resources Tab ── */}
        {activeTab === "map" && (
          <MapResourcesAdmin />
        )}
      </div>

      {/* Alert modal */}
      {alertModal && (
        <IssueAlertModal
          adminDistrict={authUser?.district}
          adminState={authUser?.state}
          onClose={() => setAlertModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["myAlerts"] })}
        />
      )}

      {/* Cluster Reports Modal */}
      {selectedCluster && (
        <ClusterReportsModal
          cluster={selectedCluster}
          reports={allReports || reports}
          onClose={() => setSelectedCluster(null)}
          onVerify={(id, status) => doVerify({ id, status })}
        />
      )}
    </div>
  );
};

export default AdminDashboard;