import React, { useState } from 'react';
import { fetchReports, fetchSocialFeed } from '../lib/api.js';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from "react-i18next";
import ReportCard from '../components/ReportCard.jsx';
import { Phone, ShieldAlert, HeartPulse, Flame, AlertTriangle,
  ChevronRight, Loader2, PhoneCall, Filter } from "lucide-react";

const STATUS_FILTERS = [
  { labelKey: "all",      value: "" },
  { labelKey: "pending",  value: "pending" },
  { labelKey: "verified", value: "verified" },
  { labelKey: "rejected", value: "false" },
];

const HomePage = () => {
  const { t } = useTranslation();
  const [mobileTab, setMobileTab] = useState("incidents");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: () => fetchReports({ status: statusFilter || undefined }),
  });

  const { data: socialFeed } = useQuery({
    queryKey: ['socialFeed'],
    queryFn: fetchSocialFeed,
  });

  const helplines = [
    { id: 1, name: "Police Control",    number: "100",  icon: <ShieldAlert size={18} />, color: "bg-blue-600 text-white" },
    { id: 2, name: "Medical Emergency", number: "102",  icon: <HeartPulse size={18} />,  color: "bg-red-600 text-white" },
    { id: 3, name: "Disaster Helpline", number: "1077", icon: <Flame size={18} />,        color: "bg-orange-600 text-white" },
    { id: 4, name: "Disaster Mgmt.",    number: "108",  icon: <Phone size={18} />,        color: "bg-blue-700 text-white" },
  ];

  const SidebarContent = () => (
    <div className="space-y-4">
      {/* Emergency Contacts */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 dark:border-slate-700">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
          <ShieldAlert size={16} /> {t("emergencyDirectory")}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {helplines.map((help) => (
            <a key={help.id} href={`tel:${help.number}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 hover:shadow-md border border-slate-100 dark:border-slate-600 hover:border-blue-200 transition-all group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${help.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  {help.icon}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none mb-0.5">{help.name}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-blue-600 transition-colors">{help.number}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all" />
            </a>
          ))}
        </div>
      </div>

      {/* Social Feed */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 dark:border-slate-700">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          {t("socialUpdates")}
        </h3>
        {!socialFeed?.length ? (
          <p className="text-xs text-slate-400 text-center py-4">{t("noUpdates")} — feed runs every 15 min</p>
        ) : (
          <div className="space-y-2">
            {socialFeed.slice(0, 4).map((post) => (
              <a key={post.id} href={post.url || "#"} target="_blank" rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-100 dark:border-slate-600 hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{post.source}</span>
                  <span className="text-[9px] text-slate-400">
                    {post.published_at ? new Date(post.published_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">{post.content}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const IncidentsList = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-8 bg-red-600 rounded-full" /> {t("activeIncidents")}
        </h2>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors border
                ${statusFilter === f.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}>
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {reportsLoading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={36} />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t("loading")}</p>
        </div>
      ) : reports?.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
          <AlertTriangle className="mx-auto text-slate-300 mb-2" size={48} />
          <p className="text-slate-500 text-xs uppercase tracking-widest">{t("noIncidents")}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <button onClick={() => setMobileTab("incidents")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors
            ${mobileTab === "incidents" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>
          <AlertTriangle size={15} /> {t("incidents")}
        </button>
        <button onClick={() => setMobileTab("sidebar")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors
            ${mobileTab === "sidebar" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>
          <PhoneCall size={15} /> {t("infoFeed")}
        </button>
      </div>

      <div className="lg:hidden p-4">
        {mobileTab === "incidents" && <IncidentsList />}
        {mobileTab === "sidebar"   && <SidebarContent />}
      </div>

      <div className="hidden lg:flex gap-8 p-6">
        <section className="flex-1 min-w-0"><IncidentsList /></section>
        <aside className="w-80 shrink-0"><div className="sticky top-6"><SidebarContent /></div></aside>
      </div>
    </div>
  );
};

export default HomePage;