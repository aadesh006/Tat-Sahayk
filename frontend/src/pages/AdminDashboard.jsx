import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchReportStats, verifyReport } from '../lib/api.js';
import { ShieldCheck, AlertTriangle, Clock, MapPin, Loader2,
  BarChart3, CheckCircle, XCircle, Filter } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const STATUS_FILTERS = [
  { label: "All",      value: "" },
  { label: "Pending",  value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "false" },
];

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: stats } = useQuery({
    queryKey: ['reportStats'],
    queryFn: fetchReportStats,
    refetchInterval: 30000, // refresh every 30s
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['adminReports', statusFilter],
    queryFn: () => fetchReports({ status: statusFilter || undefined }),
    refetchInterval: 30000,
  });

  const { mutate: doVerify } = useMutation({
    mutationFn: ({ id, status }) => verifyReport(id, status),
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['reportStats'] });
    },
    onError: () => toast.error("Action failed"),
  });

  const statCards = [
    { label: "Total Reports",    value: stats?.total_reports   ?? "—", color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100" },
    { label: "Pending Review",   value: stats?.pending_review  ?? "—", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" },
    { label: "Verified Hazards", value: stats?.verified_hazards?? "—", color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100" },
    { label: "Critical Alerts",  value: stats?.critical_alerts ?? "—", color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <Toaster />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <BarChart3 size={24} className="text-blue-600" /> Admin Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and action citizen hazard reports
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className={`${s.bg} ${s.border} border rounded-2xl p-4`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors border
              ${statusFilter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : reports?.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start gap-4">

                {/* Report Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-slate-900">{report.disasterType}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border
                      ${report.severity === "critical" ? "bg-red-50 text-red-700 border-red-100" :
                        report.severity === "high"     ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                         "bg-yellow-50 text-yellow-700 border-yellow-100"}`}>
                      {report.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border
                      ${report.status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        report.status === "false"    ? "bg-red-50 text-red-700 border-red-100" :
                                                       "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {report.status === "false" ? "Rejected" : report.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-blue-400" /> {report.location}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> {report.date}
                  </p>
                  <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    "{report.description}"
                  </p>
                  <p className="text-[10px] text-slate-400">Report ID: #{report.id}</p>
                </div>

                {/* Image */}
                {report.image && (
                  <img src={report.image} alt="Report"
                    className="w-full md:w-40 h-32 object-cover rounded-xl border border-slate-200 shrink-0"
                    onError={(e) => { e.target.style.display = "none"; }} />
                )}

                {/* Action Buttons */}
                <div className="flex md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => doVerify({ id: report.id, status: "verified" })}
                    disabled={report.status === "verified"}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button
                    onClick={() => doVerify({ id: report.id, status: "false" })}
                    disabled={report.status === "false"}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => doVerify({ id: report.id, status: "pending" })}
                    disabled={report.status === "pending"}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Clock size={14} /> Reset
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl">
          <AlertTriangle className="mx-auto text-slate-300 mb-2" size={40} />
          <p className="text-xs text-slate-400 uppercase tracking-widest">No reports in this category</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;