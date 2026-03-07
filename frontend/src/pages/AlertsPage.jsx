import React, { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, AlertOctagon, MapPin, Calendar, Shield, Bell, Filter, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '../lib/api.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { Toaster } from 'react-hot-toast';

const SEVERITY_FILTERS = [
  { label: "All", value: "" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const AlertsPage = () => {
  const { authUser } = useAuthUser();
  const [severityFilter, setSeverityFilter] = useState("");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredAlerts = alerts?.filter(alert => 
    !severityFilter || alert.severity === severityFilter
  );

  const severityConfig = {
    critical: { 
      bg: "bg-red-50 dark:bg-red-500/10", 
      border: "border-red-200 dark:border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      icon: "text-red-500",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
    },
    high: { 
      bg: "bg-orange-50 dark:bg-orange-500/10", 
      border: "border-orange-200 dark:border-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      icon: "text-orange-500",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
    },
    medium: { 
      bg: "bg-yellow-50 dark:bg-yellow-500/10", 
      border: "border-yellow-200 dark:border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-400",
      icon: "text-yellow-500",
      badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
    },
    low: { 
      bg: "bg-sky-50 dark:bg-sky-500/10", 
      border: "border-sky-200 dark:border-sky-500/20",
      text: "text-sky-600 dark:text-sky-400",
      icon: "text-sky-500",
      badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
    },
  };

  const getLocationText = (alert) => {
    if (alert.district && alert.state) {
      return `${alert.district}, ${alert.state}`;
    } else if (alert.state) {
      return `${alert.state} (State-wide)`;
    } else {
      return "Nationwide";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Toaster />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-sky-500" />
              Government Alerts & Notices
            </h1>
            {authUser?.district && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin size={12} />
                Showing alerts for {authUser.district}, {authUser.state}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Official Government Communications
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                These alerts are issued by verified government administrators. 
                {authUser?.district 
                  ? ` You're seeing alerts relevant to your location (${authUser.district}, ${authUser.state}) and nationwide notices.`
                  : " Set your location in profile to receive location-specific alerts."}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSeverityFilter(f.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all
                ${severityFilter === f.value
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)]"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-sky-500 mb-3" size={36} />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading alerts...</p>
          </div>
        ) : filteredAlerts?.length > 0 ? (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const config = severityConfig[alert.severity] || severityConfig.low;
              
              return (
                <article
                  key={alert.id}
                  className={`${config.bg} border-2 ${config.border} rounded-2xl p-5 transition-all hover:shadow-md`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-white dark:bg-[rgb(22,22,22)] border ${config.border} flex items-center justify-center shrink-0`}>
                      <AlertOctagon size={24} className={config.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.badge}`}>
                          {alert.severity}
                        </span>
                        {alert.hazard_type && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[rgb(47,51,54)]">
                            {alert.hazard_type}
                          </span>
                        )}
                      </div>
                      <h2 className={`text-lg font-bold ${config.text} mb-2`}>
                        {alert.title}
                      </h2>
                      <p className={`text-sm ${config.text} opacity-90 leading-relaxed`}>
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Shield size={12} />
                        {alert.admin_name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {getLocationText(alert)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(alert.created_at).toLocaleString("en-IN", { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl">
            <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
              No alerts at this time
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              {severityFilter ? "Try changing the filter" : "You're all caught up!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
