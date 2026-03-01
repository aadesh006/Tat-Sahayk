import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminReports, fetchReportStats, verifyReport,
  fetchAlerts, createAlert, deactivateAlert
} from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import {
  BarChart3, CheckCircle, XCircle, Clock, MapPin,
  Loader2, AlertTriangle, Bell, BellOff, Plus,
  X, Shield, TrendingUp, Users, Zap, ChevronDown,
  Filter, Brain, MessageSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ImageLightbox from '../components/ImageLightbox.jsx';

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-500",    text: "text-red-500",    light: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  high:     { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50 dark:bg-orange-900/20 border-orange-200" },
  medium:   { bg: "bg-yellow-500", text: "text-yellow-500", light: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200" },
  low:      { bg: "bg-green-500",  text: "text-green-500",  light: "bg-green-50 dark:bg-green-900/20 border-green-200" },
};

const AI_SCORE_COLOR = (score) => {
  if (!score) return "text-slate-400";
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
    onError:   () => toast.error("Failed to issue alert"),
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-white" />
            <h2 className="text-white font-black text-lg">Issue Government Alert</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Alert Title</label>
            <input
              type="text"
              placeholder="e.g. Cyclone Warning — Coastal Districts"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Advisory Message</label>
            <textarea
              rows={4}
              placeholder="Provide detailed instructions to citizens..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1 w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Hazard type */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Hazard Type</label>
              <select
                value={form.hazard_type}
                onChange={(e) => setForm({ ...form, hazard_type: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none"
              >
                {["Flood","Cyclone","Storm","Tsunami","Oil Spill","Earthquake","General"].map(h => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Target area */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">District</label>
              <input
                type="text"
                placeholder="Leave blank for statewide"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">State</label>
              <input
                type="text"
                placeholder="Leave blank for national"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (!form.title || !form.message) return toast.error("Title and message required"); mutate(form); }}
              disabled={isPending}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
              Issue Alert
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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="p-4">

          {/* Top row */}
          <div className="flex items-start gap-3">
            {/* Severity indicator */}
            <div className={`w-1.5 self-stretch rounded-full ${sev.bg} shrink-0`} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-base font-black text-slate-900 dark:text-white">{report.disasterType}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${sev.light}`}>
                  {report.severity}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border
                  ${report.status === "verified" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200" :
                    report.status === "false"    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200" :
                                                   "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"}`}>
                  {report.status === "false" ? "Fake/Irrelevant" : report.status}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
              <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-0.5 justify-center">
                <Brain size={9} /> AI Score
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-3 ml-4 bg-slate-50 dark:bg-slate-700 rounded-xl p-3 border border-slate-100 dark:border-slate-600">
            <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
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
                  className="w-20 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-80 transition-opacity cursor-zoom-in"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
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
  const [activeTab, setActiveTab]  = useState("reports"); // reports | alerts

  const { data: stats } = useQuery({
    queryKey: ["reportStats"],
    queryFn:  fetchReportStats,
    refetchInterval: 30000,
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
    { label: "Total",    value: stats?.total_reports    ?? "—", icon: <BarChart3 size={18} />,     color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800" },
    { label: "Pending",  value: stats?.pending_review   ?? "—", icon: <Clock size={18} />,          color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800" },
    { label: "Verified", value: stats?.verified_hazards ?? "—", icon: <Shield size={18} />,         color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" },
    { label: "Critical", value: stats?.critical_alerts  ?? "—", icon: <Zap size={18} />,            color: "text-red-500",     bg: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800" },
  ];

  const FILTERS = [
    { label: "All",      value: "" },
    { label: "Pending",  value: "pending" },
    { label: "Verified", value: "verified" },
    { label: "Fake",     value: "false" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Toaster />

      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              District Command — {authUser?.district || "National"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6">
        {[
          { key: "reports", label: "Verification Queue",   icon: <Filter size={15} /> },
          { key: "alerts",  label: "Issued Alerts",        icon: <Bell size={15} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors
              ${activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6">

        {/* ── Reports Tab ── */}
        {activeTab === "reports" && (
          <>
            {/* Filter pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter size={14} className="text-slate-400" />
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors border
                    ${filter === f.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}>
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400">
                {reports?.length ?? 0} reports
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-600" size={36} />
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
              <div className="text-center py-20 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={40} />
                <p className="text-xs text-slate-400 uppercase tracking-widest">No reports in this category</p>
              </div>
            )}
          </>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            {!myAlerts?.length ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl">
                <BellOff className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-xs text-slate-400 uppercase tracking-widest">No alerts issued yet</p>
              </div>
            ) : (
              myAlerts.map((alert) => {
                const sev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                return (
                  <div key={alert.id}
                    className={`bg-white dark:bg-slate-800 border rounded-2xl p-4 shadow-sm ${!alert.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-1.5 self-stretch rounded-full ${sev.bg} shrink-0`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-slate-900 dark:text-white">{alert.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${sev.light}`}>
                              {alert.severity}
                            </span>
                            {!alert.is_active && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{alert.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span>{alert.district || "All Districts"} · {alert.state || "National"}</span>
                            <span>{alert.hazard_type}</span>
                            <span>{new Date(alert.created_at).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                      {alert.is_active && (
                        <button
                          onClick={() => doDeactivate(alert.id)}
                          className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
    </div>
  );
};

export default AdminDashboard;