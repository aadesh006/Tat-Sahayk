import React, { useState } from 'react';
import { fetchReports, fetchSocialFeed } from '../lib/api.js';
import { useQuery } from '@tanstack/react-query';
import { 
  Phone, ShieldAlert, HeartPulse, Flame, AlertTriangle, 
  Clock, MapPin, ChevronRight, ShieldCheck, Loader2,
  PhoneCall
} from "lucide-react";

const HomePage = () => {
  const [mobileTab, setMobileTab] = useState("incidents");

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
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
      <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
          <ShieldAlert size={16} /> Emergency Directory
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {helplines.map((help) => (
            <a
              key={help.id}
              href={`tel:${help.number}`}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${help.color} shadow-sm group-hover:scale-110 transition-transform`}>
                  {help.icon}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase leading-none mb-0.5">{help.name}</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">
                    {help.number}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-all" />
            </a>
          ))}
        </div>
      </div>

      {/* Social Feed */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Social Updates
        </h3>
        {!socialFeed || socialFeed.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            No updates yet — feed runs every 15 min
          </p>
        ) : (
          <div className="space-y-2">
            {socialFeed.slice(0, 4).map((post) => (
              <a
                key={post.id}
                href={post.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                    {post.source}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                  {post.content}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  const IncidentsList = () => (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-8 bg-red-600 rounded-full" />
          Active Incidents
        </h2>
        <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded text-slate-500 uppercase tracking-widest text-[10px]">
          Live
        </span>
      </div>

      {reportsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={36} />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loading...</p>
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => (
            <article
              key={report.id}
              className="bg-white border-l-4 border-l-red-600 shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock size={12} /> {report.date || "Just Now"}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {report.disasterType}
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-tighter border 
                        ${report.severity === "critical" ? "bg-red-50 text-red-700 border-red-100" :
                          report.severity === "high"     ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                           "bg-yellow-50 text-yellow-700 border-yellow-100"}`}>
                        {report.severity || "Pending"}
                      </span>
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 font-medium">
                      <MapPin size={14} className="text-red-500" /> {report.location}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-3">
                      <p className="text-slate-700 text-sm leading-relaxed italic">
                        "{report.description || "Situation under assessment."}"
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-center px-3 py-2 bg-slate-100 rounded">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                        <p className="text-xs font-bold text-slate-900 capitalize">
                          {report.status || "Pending"}
                        </p>
                      </div>
                      <div className={`text-center px-3 py-2 rounded border ${
                        report.is_verified
                          ? "bg-emerald-50 border-emerald-100"
                          : "bg-slate-50 border-slate-100"
                      }`}>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase">Verification</p>
                        <p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
                          <ShieldCheck size={12} />
                          {report.is_verified ? "Verified" : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {report.image && (
                    <div className="md:w-48 h-32 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-200">
                      <img
                        src={report.image}
                        alt="Incident"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-xl">
          <AlertTriangle className="mx-auto text-slate-300 mb-2" size={48} />
          <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">
            No active incidents.
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setMobileTab("incidents")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors
            ${mobileTab === "incidents" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}
        >
          <AlertTriangle size={15} /> Incidents
        </button>
        <button
          onClick={() => setMobileTab("sidebar")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-colors
            ${mobileTab === "sidebar" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}
        >
          <PhoneCall size={15} /> Info & Feed
        </button>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden p-4">
        {mobileTab === "incidents" && <IncidentsList />}
        {mobileTab === "sidebar"   && <SidebarContent />}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex gap-8 p-6">
        <section className="flex-1 min-w-0">
          <IncidentsList />
        </section>
        <aside className="w-80 shrink-0">
          <div className="sticky top-6">
            <SidebarContent />
          </div>
        </aside>
      </div>

    </div>
  );
};

export default HomePage;