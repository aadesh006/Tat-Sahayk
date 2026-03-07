import { X, Brain, MapPin, Camera, Clock, FileText, Newspaper, Eye, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import ReportModal from "./ReportModal";

const ClusterReportsModal = ({ cluster, reports, onClose, onVerify }) => {
  const [viewingReport, setViewingReport] = useState(null);

  // Ensure cluster and reports are defined
  if (!cluster || !reports) {
    console.log('ClusterReportsModal: Missing cluster or reports', { cluster, reports });
    return null;
  }

  // Filter reports that belong to this cluster
  const clusterReports = reports.filter(r => cluster.report_ids?.includes(r.id)) || [];
  
  // Debug logging
  console.log('ClusterReportsModal Debug:', {
    cluster,
    totalReports: reports?.length,
    clusterReportIds: cluster.report_ids,
    filteredReports: clusterReports.length,
    clusterReports
  });

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-[rgb(22,22,22)] rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - subtle theme */}
          <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  {cluster.hazard_type} Cluster
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {cluster.report_count} reports · {cluster.center_lat?.toFixed(4) || 0}°N, {cluster.center_lon?.toFixed(4) || 0}°E
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors shrink-0"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* AI Summary Section - subtle theme */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-[rgb(18,18,18)] border-b border-gray-200 dark:border-[rgb(47,51,54)] shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-6 mb-3">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-sky-500 dark:text-sky-400" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Multi-Model AI Analysis
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {cluster.ai_summary || "AI analysis failed — manual review required."}
                </p>
              </div>
              <div className="text-center shrink-0 bg-white dark:bg-[rgb(22,22,22)] rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-[rgb(47,51,54)] min-w-[80px] sm:min-w-[100px] self-center sm:self-auto">
                <div className={`text-2xl sm:text-3xl font-black ${
                  cluster.authenticity_score >= 0.8 ? "text-emerald-500" :
                  cluster.authenticity_score >= 0.5 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {Math.round((cluster.authenticity_score || 0) * 100)}%
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Overall Score</div>
              </div>
            </div>

            {/* Analysis Breakdown - subtle colors */}
            {cluster.analysis_breakdown && (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <AnalysisMetric 
                  label="Image" 
                  score={cluster.analysis_breakdown.image_authenticity} 
                  icon={<Camera size={12} className="text-sky-500" />}
                />
                <AnalysisMetric 
                  label="Location" 
                  score={cluster.analysis_breakdown.location_verification} 
                  icon={<MapPin size={12} className="text-sky-500" />}
                />
                <AnalysisMetric 
                  label="Timing" 
                  score={cluster.analysis_breakdown.temporal_consistency} 
                  icon={<Clock size={12} className="text-sky-500" />}
                />
                <AnalysisMetric 
                  label="News" 
                  score={cluster.analysis_breakdown.news_correlation} 
                  icon={<Newspaper size={12} className="text-sky-500" />}
                />
                <AnalysisMetric 
                  label="Text" 
                  score={cluster.analysis_breakdown.text_coherence} 
                  icon={<FileText size={12} className="text-sky-500" />}
                />
              </div>
            )}
          </div>

          {/* Scrollable Reports List - improved mobile */}
          <div className="overflow-y-auto flex-1 p-3 sm:p-6">
            <h3 className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Individual Reports ({clusterReports.length})
            </h3>
            {clusterReports.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {clusterReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onVerify={onVerify}
                    onView={() => setViewingReport(report)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <Brain className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">
                  No reports found in this cluster
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs">
                  The reports may have been deleted or are not available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {viewingReport && (
        <ReportModal 
          report={viewingReport} 
          onClose={() => setViewingReport(null)} 
        />
      )}
    </>
  );
};

// Analysis Metric Component - improved mobile
const AnalysisMetric = ({ label, score, icon }) => {
  const getColor = (score) => {
    if (!score) return "text-gray-400 dark:text-gray-500";
    if (score >= 0.8) return "text-emerald-500";
    if (score >= 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-lg p-1.5 sm:p-2 border border-gray-200 dark:border-[rgb(47,51,54)] text-center">
      <div className="flex justify-center mb-0.5 sm:mb-1">{icon}</div>
      <div className={`text-sm sm:text-lg font-bold ${getColor(score)}`}>
        {score ? `${Math.round(score * 100)}%` : "—"}
      </div>
      <div className="text-[8px] sm:text-[9px] text-gray-500 dark:text-gray-400 font-semibold uppercase">{label}</div>
    </div>
  );
};

// Compact Report Card for Modal - FIXED property names
const ReportCard = ({ report, onVerify, onView }) => {
  const SEVERITY_COLORS = {
    critical: { bg: "bg-red-500", light: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400" },
    high:     { bg: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400" },
    medium:   { bg: "bg-yellow-500", light: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
    low:      { bg: "bg-green-500", light: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400" },
  };

  const sev = SEVERITY_COLORS[report.severity?.toLowerCase()] || SEVERITY_COLORS.medium;
  const firstMedia = report.media?.[0]?.file_path;

  return (
    <div 
      className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl overflow-hidden hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all"
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Image thumbnail - improved mobile */}
          {firstMedia && (
            <img 
              src={firstMedia} 
              alt="Report" 
              className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{report.hazard_type}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase border ${sev.light}`}>
                  {report.severity}
                </span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase border
                  ${report.status === "verified" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" :
                    report.status === "false"    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" :
                                                   "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"}`}>
                  {report.status === "false" ? "Fake" : report.status}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 shrink-0 font-mono">#{report.id}</span>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2 italic">
              "{report.description || "No description provided."}"
            </p>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{report.latitude?.toFixed(4)}°N, {report.longitude?.toFixed(4)}°E</span>
              <span>·</span>
              <Clock size={11} className="shrink-0" />
              <span>{new Date(report.created_at).toLocaleDateString("en-IN")}</span>
            </div>

            {/* AI Score - NEW */}
            {report.ai_authenticity_score && (
              <div className="mb-2 sm:mb-3 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <Brain size={12} className="text-blue-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 line-clamp-1">
                    {report.ai_analysis_summary || "AI analysis complete"}
                  </p>
                </div>
                <div className={`text-sm sm:text-base font-black ${
                  report.ai_authenticity_score >= 0.8 ? "text-emerald-500" :
                  report.ai_authenticity_score >= 0.5 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {Math.round(report.ai_authenticity_score * 100)}%
                </div>
              </div>
            )}

            {/* Action buttons - improved mobile */}
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-[10px] sm:text-xs font-semibold rounded-lg transition-all"
              >
                <Eye size={12} /> View
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVerify({ id: report.id, status: "verified" }); }}
                disabled={report.status === "verified"}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10px] sm:text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={12} /> Verify
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVerify({ id: report.id, status: "false" }); }}
                disabled={report.status === "false"}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-[10px] sm:text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle size={12} /> Fake
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterReportsModal;
