import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import ReportCard from '../components/ReportCard.jsx';
import ReportModal from '../components/ReportModal.jsx';
import { fetchReports, fetchSocialFeed, fetchAlerts } from '../lib/api.js';
import { AlertOctagon } from 'lucide-react';
import { Phone, ShieldAlert, HeartPulse, Flame, AlertTriangle,
  ChevronRight, Loader2, PhoneCall, ClipboardList } from "lucide-react";

const STATUS_FILTERS = [
  { labelKey: "all",      value: "" },
  { labelKey: "pending",  value: "pending" },
  { labelKey: "verified", value: "verified" },
  { labelKey: "rejected", value: "false" },
];

const HomePage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileTab, setMobileTab] = useState("incidents");
  const [statusFilter, setStatusFilter] = useState("verified"); // Default to verified
  const [selectedReport, setSelectedReport] = useState(null);
  const reportRefs = useRef({});

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: () => fetchReports({ status: statusFilter || undefined, allReports: true }),
  });

  const { data: socialFeed } = useQuery({
    queryKey: ['socialFeed'],
    queryFn: fetchSocialFeed,
  });

const { data: alerts } = useQuery({
  queryKey: ["alerts"],
  queryFn:  () => fetchAlerts(),
  refetchInterval: 60000,
});

  // Handle shared report link - open modal for specific report
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (reportId && reports) {
      const report = reports.find(r => r.id === parseInt(reportId));
      if (report) {
        setSelectedReport(report);
        // Clear the URL parameter
        setSearchParams({});
      } else if (statusFilter !== "") {
        // Switch to "All" filter to find the report
        setStatusFilter("");
      }
    }
  }, [searchParams, reports, statusFilter, setSearchParams]);

  const helplines = [
    { id: 1, name: "Police Control",    number: "100",  icon: <ShieldAlert size={18} />, color: "from-blue-500 to-blue-600" },
    { id: 2, name: "Medical Emergency", number: "102",  icon: <HeartPulse size={18} />,  color: "from-red-500 to-red-600" },
    { id: 3, name: "Disaster Helpline", number: "1077", icon: <Flame size={18} />,        color: "from-orange-500 to-orange-600" },
    { id: 4, name: "Disaster Mgmt.",    number: "108",  icon: <Phone size={18} />,        color: "from-sky-500 to-sky-600" },
  ];

  const SidebarContent = () => {
    const severityConfig = {
      critical: { 
        bg: "bg-red-50 dark:bg-red-500/10", 
        border: "border-red-200 dark:border-red-500/20",
        text: "text-red-600 dark:text-red-400",
        icon: "text-red-500"
      },
      high: { 
        bg: "bg-orange-50 dark:bg-orange-500/10", 
        border: "border-orange-200 dark:border-orange-500/20",
        text: "text-orange-600 dark:text-orange-400",
        icon: "text-orange-500"
      },
      medium: { 
        bg: "bg-yellow-50 dark:bg-yellow-500/10", 
        border: "border-yellow-200 dark:border-yellow-500/20",
        text: "text-yellow-600 dark:text-yellow-400",
        icon: "text-yellow-500"
      },
      low: { 
        bg: "bg-sky-50 dark:bg-sky-500/10", 
        border: "border-sky-200 dark:border-sky-500/20",
        text: "text-sky-600 dark:text-sky-400",
        icon: "text-sky-500"
      },
    };

    return (
    <div className="space-y-4">
      {/* Emergency Contacts */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(47,51,54)]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" /> {t("emergencyDirectory")}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {helplines.map((help) => (
            <a key={help.id} href={`tel:${help.number}`}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[rgb(38,38,38)] hover:bg-gray-100 dark:hover:bg-[rgb(47,51,54)] border border-gray-100 dark:border-[rgb(47,51,54)] transition-all group">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${help.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                  {help.icon}
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none mb-0.5">{help.name}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{help.number}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-sky-500 transition-all" />
            </a>
          ))}
        </div>
      </div>

      {/* Government Advisories */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertOctagon size={16} className="text-sky-500" /> Government Alerts
          </h3>
          <a href="/alerts" className="text-xs font-medium text-sky-500 hover:text-sky-600 transition-colors">
            View All →
          </a>
        </div>
        
        {!alerts?.filter(a => a.is_active).length ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No active alerts</p>
        ) : (
          <div className="space-y-2">
            {alerts.filter(a => a.is_active).slice(0, 3).map((alert) => {
  const severityConfig = {
    critical: { 
      bg: "bg-red-50 dark:bg-red-500/10", 
      border: "border-red-200 dark:border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      icon: "text-red-500"
    },
    high: { 
      bg: "bg-orange-50 dark:bg-orange-500/10", 
      border: "border-orange-200 dark:border-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      icon: "text-orange-500"
    },
    medium: { 
      bg: "bg-yellow-50 dark:bg-yellow-500/10", 
      border: "border-yellow-200 dark:border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-400",
      icon: "text-yellow-500"
    },
    low: { 
      bg: "bg-sky-50 dark:bg-sky-500/10", 
      border: "border-sky-200 dark:border-sky-500/20",
      text: "text-sky-600 dark:text-sky-400",
      icon: "text-sky-500"
    },
  };
  
  const config = severityConfig[alert.severity] || severityConfig.low;

  return (
    <a
      key={alert.id}
      href="/alerts"
      className={`block ${config.bg} border ${config.border} rounded-2xl p-4 hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3">
        <AlertOctagon size={18} className={`${config.icon} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${config.text}`}>
              🏛 Government Advisory
            </span>
            <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
              {alert.severity}
            </span>
          </div>
          <p className={`font-semibold text-sm ${config.text} mb-1`}>{alert.title}</p>
          <p className={`text-xs ${config.text} opacity-90 leading-relaxed line-clamp-2`}>{alert.message}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
            {alert.admin_name} · {alert.district || "National"} · {new Date(alert.created_at).toLocaleString("en-IN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </a>
  );
})}
          </div>
        )}
      </div>

      {/* Social Feed */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(47,51,54)]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {t("socialUpdates")}
        </h3>
        {!socialFeed?.length ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">{t("noUpdates")} — feed runs every 15 min</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
            {socialFeed.slice(0, 10).map((post) => (
              <a key={post.id} href={post.url || "#"} target="_blank" rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-gray-50 dark:bg-[rgb(38,38,38)] hover:bg-gray-100 dark:hover:bg-[rgb(47,51,54)] border border-gray-100 dark:border-[rgb(47,51,54)] transition-all group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wide">{post.source}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {post.published_at ? new Date(post.published_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{post.content}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  };

  const IncidentsList = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
          What's Happening
        </h2>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all
                ${statusFilter === f.value
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)]"}`}>
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {reportsLoading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="animate-spin text-sky-500 mb-3" size={36} />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("loading")}</p>
        </div>
      ) : reports?.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:gap-4">
          {reports.map((report) => (
            <div key={report.id} ref={(el) => (reportRefs.current[report.id] = el)}>
              <ReportCard report={report} onCardClick={setSelectedReport} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl">
          <AlertTriangle className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={48} />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t("noIncidents")}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen">
      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-black sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-black/80">
        <button onClick={() => setMobileTab("incidents")}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wide transition-colors
            ${mobileTab === "incidents" ? "text-sky-500 border-b-2 border-sky-500" : "text-gray-500 dark:text-gray-400"}`}>
          <ClipboardList size={15} /> {t("reports")}
        </button>
        <button onClick={() => setMobileTab("sidebar")}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wide transition-colors
            ${mobileTab === "sidebar" ? "text-sky-500 border-b-2 border-sky-500" : "text-gray-500 dark:text-gray-400"}`}>
          <PhoneCall size={15} /> {t("infoFeed")}
        </button>
      </div>

      <div className="lg:hidden p-3 pb-8">
        {mobileTab === "incidents" && <IncidentsList />}
        {mobileTab === "sidebar"   && <SidebarContent />}
      </div>

      <div className="hidden lg:flex gap-6 p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)]">
        <section className="flex-1 min-w-0 overflow-y-auto pb-8 scrollbar-hide"><IncidentsList /></section>
        <aside className="w-80 shrink-0 overflow-y-auto pb-8 scrollbar-hide"><div className="sticky top-0"><SidebarContent /></div></aside>
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

export default HomePage;