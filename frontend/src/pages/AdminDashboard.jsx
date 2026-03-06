import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminReports, fetchReportStats, verifyReport,
  fetchAlerts, createAlert, deactivateAlert
} from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { ClipboardList, CheckCircle, XCircle, Clock, MapPin,
  Loader2, AlertTriangle, Bell, BellOff, Plus,
  X, Shield, TrendingUp, Users, Zap, ChevronDown,
  Filter, Brain, MessageSquare, BarChart3 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ImageLightbox from '../components/ImageLightbox.jsx';
import ClusterReportsModal from '../components/ClusterReportsModal.jsx';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)]">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg">Issue Emergency Alert</h2>
              <p className="text-white/80 text-xs">Broadcast to citizens in your jurisdiction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Jurisdiction notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-bold mb-1">Jurisdiction: {adminDistrict || "All Districts"}, {adminState || "National"}</p>
              <p>This alert will be sent to citizens in your administrative area only.</p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
              Alert Title
            </label>
            <input
              type="text"
              placeholder="e.g. Cyclone Warning — Coastal Districts"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all text-sm font-medium"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
              Advisory Message
            </label>
            <textarea
              rows={4}
              placeholder="Provide detailed instructions to citizens..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Hazard type */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                Hazard Type
              </label>
              <select
                value={form.hazard_type}
                onChange={(e) => setForm({ ...form, hazard_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none text-sm font-medium"
              >
                {["Flood","Cyclone","Storm","Tsunami","Oil Spill","Earthquake","General"].map(h => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                Severity Level
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none text-sm font-medium"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
          </div>

          {/* Target area - read-only display */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                Target District
              </label>
              <input
                type="text"
                value={form.district || "All Districts"}
                disabled
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-600 dark:text-gray-400 rounded-xl outline-none text-sm font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 block">
                Target State
              </label>
              <input
                type="text"
                value={form.state || "National"}
                disabled
                className="w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-600 dark:text-gray-400 rounded-xl outline-none text-sm font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button onClick={onClose}
              className="flex-1 py-3.5 border-2 border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all">
              Cancel
            </button>
            <button
              onClick={() => { 
                if (!form.title || !form.message) return toast.error("Title and message required"); 
                mutate(form); 
              }}
              disabled={isPending}
              className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-lg shadow-red-500/20"
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
  const [expanded, setExpanded]     = useState(false);
  const [lightboxOpen, setLightbox] = useState(false);

  const sev  = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium;
  const score = report.aiScore;

  return (
    <>
      <div className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="p-4">

          {/* Top row */}
          <div className="flex items-start gap-3">
            {/* Severity indicator */}
            <div className={`w-1.5 self-stretch rounded-full ${sev.bg} shrink-0`} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-base font-black text-gray-900 dark:text-white">{report.disasterType}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${sev.light}`}>
                  {report.severity}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border
                  ${report.status === "verified" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200" :
                    report.status === "false"    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200" :
                                                   "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"}`}>
                  {report.status === "false" ? "Fake/Irrelevant" : report.status}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={11} /> {report.location}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {report.date}</span>
                <span className="text-[10px]">ID: #{report.id}</span>
              </div>
            </div>

            {/* AI Score badge */}
            <div className="shrink-0 text-center">
              <div className={`text-xl font-black ${AI_SCORE_COLOR(score)}`}>
                {score !== null && score !== undefined
                  ? `${Math.round(score * 100)}%`
                  : "—"}
              </div>
              <div className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-0.5 justify-center">
                <Brain size={9} /> AI Score
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3 ml-4 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl p-3 border border-gray-100 dark:border-[rgb(47,51,54)]">
            <p className="text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed">
              "{report.description || "No description provided."}"
            </p>
          </div>

          {/* AI Summary */}
          {report.aiSummary && (
            <div className="mt-2 ml-4 flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <Brain size={13} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">{report.aiSummary}</p>
            </div>
          )}

          {/* Image + actions row */}
          <div className="mt-3 ml-4 flex items-center gap-3 flex-wrap">
            {report.image && (
              <button onClick={() => setLightbox(true)}>
                <img src={report.image} alt="Report"
                  className="w-20 h-14 object-cover rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:opacity-80 transition-opacity cursor-zoom-in"
                  onError={(e) => { e.target.style.display = "none"; }} />
              </button>
            )}

            {/* Admin action buttons */}
            <div className="flex gap-2 ml-auto flex-wrap">
              <button
                onClick={() => onVerify(report.id, "verified")}
                disabled={report.status === "verified"}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={13} /> Verify
              </button>
              <button
                onClick={() => onVerify(report.id, "false")}
                disabled={report.status === "false"}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle size={13} /> Fake
              </button>
              <button
                onClick={() => onVerify(report.id, "pending")}
                disabled={report.status === "pending"}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              >
                <Clock size={13} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && report.image && (
        <ImageLightbox images={[report.image]} onClose={() => setLightbox(false)} />
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
  const [activeTab, setActiveTab]  = useState("sos"); // sos | alerts | ai | reports
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

  const { data: myAlerts } = useQuery({
    queryKey: ["myAlerts"],
    queryFn:  () => fetchAlerts({
      district: authUser?.district || undefined,
      state:    authUser?.state    || undefined,
    }),
  });

  const { mutate: doVerify } = useMutation({
    mutationFn: ({ id, status }) => verifyReport(id, status),
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const { mutate: doDeactivate } = useMutation({
    mutationFn: deactivateAlert,
    onSuccess: () => {
      toast.success("Alert deactivated");
      queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
    },
  });

  const statCards = [
    { label: "SOS Triggers", value: stats?.total_sos ?? "—", icon: <AlertTriangle size={18} />, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800" },
    { label: "Active Hazards", value: stats?.total_active ?? "—", icon: <Zap size={18} />, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800" },
    { label: "Flood", value: stats?.hazard_breakdown?.Flood ?? 0, icon: <BarChart3 size={18} />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800" },
    { label: "Cyclone", value: stats?.hazard_breakdown?.Cyclone ?? 0, icon: <TrendingUp size={18} />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800" },
  ];

  const FILTERS = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "pending" },
    { label: "Verified", value: "verified" },
    { label: "Fake",     value: "false" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Toaster />

      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-sky-500" />
              District Command — {authUser?.district || "National"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {authUser?.full_name} · {authUser?.state || "All States"} · Admin
            </p>
          </div>

          {/* Push Alert Button */}
          <button
            onClick={() => setAlertModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-95"
          >
            <Bell size={16} className="animate-pulse" />
            Push Live Alert
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {statCards.map((s) => (
            <div key={s.label} className={`${s.bg} border rounded-xl p-3 flex items-center gap-3`}>
              <div className={s.color}>{s.icon}</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(22,22,22)] px-4 md:px-6 scrollbar-hide">
        {[
          { key: "sos", label: "SOS Triggers", icon: <AlertTriangle size={14} /> },
          { key: "reports", label: "All Reports", icon: <ClipboardList size={14} /> },
          { key: "alerts",  label: "Issued Alerts", icon: <Bell size={15} /> },
          { key: "ai", label: "AI Intelligence", icon: <Brain size={15} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 md:px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.key
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.key.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {activeTab === "ai" && (
  <div className="space-y-4">
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
      <Brain size={14} className="text-blue-500 shrink-0" />
      <p className="text-xs text-blue-700 dark:text-blue-300">
        AI clusters reports by location every 15 minutes. Each card = multiple reports from the same area analysed by Amazon Nova.
      </p>
    </div>

    {!aiClusters?.length ? (
      <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-2xl">
        <Brain className="mx-auto text-gray-300 mb-2" size={40} />
        <p className="text-xs text-gray-400 uppercase tracking-widest">No clusters yet — waiting for 2+ reports near each other</p>
      </div>
    ) : (
      aiClusters.map((cluster) => {
        return (
          <div key={cluster.cluster_id}
            className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl p-5 shadow-sm">

            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-lg">
                  {cluster.hazard_type}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cluster.report_count} reports · {cluster.center_lat.toFixed(3)}°N, {cluster.center_lon.toFixed(3)}°E · {cluster.max_severity?.toUpperCase()}
                </p>
              </div>
              {/* AI Score */}
              <div className="text-right shrink-0">
                <div className={`text-3xl font-black ${
                  cluster.authenticity_score >= 0.8 ? "text-emerald-500" :
                  cluster.authenticity_score >= 0.5 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {Math.round(cluster.authenticity_score * 100)}%
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                  <Brain size={10} /> AI Authenticity
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Brain size={10} /> Amazon Nova Analysis
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{cluster.ai_summary}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAlertModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                <Bell size={13} /> Issue Alert for This Area
              </button>
              <button
                onClick={() => {
                  cluster.report_ids.forEach(id => doVerify({ id, status: "verified" }));
                  toast.success(`Verified ${cluster.report_count} reports`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle size={13} /> Verify All ({cluster.report_count})
              </button>
              <button
                onClick={() => {
                  cluster.report_ids.forEach(id => doVerify({ id, status: "false" }));
                  toast.success("Marked as fake");
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <XCircle size={13} /> Mark All Fake
              </button>
              <button
                onClick={() => setSelectedCluster(cluster)}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-colors ml-auto"
              >
                <ClipboardList size={13} /> View Individual Reports ({cluster.report_count})
              </button>
            </div>
          </div>
        );
      })
    )}
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
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={40} />
                <p className="text-xs text-gray-400 uppercase tracking-widest">No SOS triggers at the moment</p>
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
              <div className="space-y-3">
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
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={40} />
                <p className="text-xs text-gray-400 uppercase tracking-widest">No reports in this category</p>
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
                      {alert.is_active && (
                        <button
                          onClick={() => doDeactivate(alert.id)}
                          className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Deactivate alert"
                        >
                          <BellOff size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
          reports={reports}
          onClose={() => setSelectedCluster(null)}
          onVerify={(id, status) => doVerify({ id, status })}
        />
      )}
    </div>
  );
};

export default AdminDashboard;