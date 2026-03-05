import { X, Brain } from "lucide-react";
import { useState } from "react";

const ClusterReportsModal = ({ cluster, reports, onClose, onVerify }) => {
  const [selectedReportId, setSelectedReportId] = useState(null);

  const clusterReports = reports?.filter(r => cluster.report_ids.includes(r.id)) || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Brain size={20} /> {cluster.hazard_type} Cluster
              </h2>
              <p className="text-white/90 text-sm mt-1">
                {cluster.report_count} reports · {cluster.center_lat.toFixed(3)}°N, {cluster.center_lon.toFixed(3)}°E
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* AI Summary Section */}
          <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Brain size={12} /> Amazon Nova Analysis
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{cluster.ai_summary}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-3xl font-black ${
                  cluster.authenticity_score >= 0.8 ? "text-emerald-500" :
                  cluster.authenticity_score >= 0.5 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {Math.round(cluster.authenticity_score * 100)}%
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">AI Score</div>
              </div>
            </div>
          </div>

          {/* Scrollable Reports List */}
          <div className="overflow-y-auto flex-1 p-6">
            <div className="space-y-3">
              {clusterReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onVerify={onVerify}
                  isSelected={selectedReportId === report.id}
                  onClick={() => setSelectedReportId(report.id === selectedReportId ? null : report.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Compact Report Card for Modal
const ReportCard = ({ report, onVerify, isSelected, onClick }) => {
  const SEVERITY_COLORS = {
    critical: { bg: "bg-red-500", light: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
    high:     { bg: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" },
    medium:   { bg: "bg-yellow-500", light: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20" },
    low:      { bg: "bg-green-500", light: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20" },
  };

  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium;

  return (
    <div 
      className={`bg-white dark:bg-[rgb(22,22,22)] border rounded-2xl overflow-hidden transition-all cursor-pointer
        ${isSelected 
          ? "border-sky-500 ring-2 ring-sky-500/20" 
          : "border-gray-200 dark:border-[rgb(47,51,54)] hover:border-gray-300 dark:hover:border-[rgb(71,85,105)]"}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Severity indicator */}
          <div className={`w-1.5 self-stretch rounded-full ${sev.bg} shrink-0`} />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
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
              <span className="text-[10px] text-gray-400 ml-auto">ID: #{report.id}</span>
            </div>

            <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl p-3 border border-gray-100 dark:border-[rgb(47,51,54)] mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                "{report.description || "No description provided."}"
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>{report.location}</span>
              <span>·</span>
              <span>{report.date}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); onVerify(report.id, "verified"); }}
                disabled={report.status === "verified"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✓ Verify
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVerify(report.id, "false"); }}
                disabled={report.status === "false"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✗ Fake
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVerify(report.id, "pending"); }}
                disabled={report.status === "pending"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
              >
                ↻ Reset
              </button>
            </div>
          </div>

          {/* Image thumbnail */}
          {report.image && (
            <img 
              src={report.image} 
              alt="Report" 
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClusterReportsModal;
