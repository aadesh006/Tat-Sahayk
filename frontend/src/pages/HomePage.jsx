import React from 'react';
import { fetchReports } from '../lib/api.js';
import { 
  Phone, 
  ShieldAlert, 
  HeartPulse, 
  Flame, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import {  useQuery } from '@tanstack/react-query';


const HomePage = () => {
  const{data:reports,isLoading,isError} = useQuery({
    queryKey:['reports'],
    queryFn:fetchReports,

  })

  const helplines = [
    { id: 1, name: "Police Control", number: "100", icon: <ShieldAlert size={18} />, color: "bg-blue-600 text-white" },
    { id: 2, name: "Medical Emergency", number: "102", icon: <HeartPulse size={18} />, color: "bg-red-600 text-white" },
    { id: 3, name: "Disaster helpline", number: "1077", icon: <Flame size={18} />, color: "bg-orange-600 text-white" },
    { id: 4, name: "Disaster Mgmt. Service", number: "108", icon: <Phone size={18} />, color: "bg-blue-700 text-white" },
  ];

   if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6 bg-slate-50 min-h-screen">
  
      <aside className="lg:w-80 shrink-0 order-1 lg:order-2">
        <div className="sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 flex items-center gap-2">
              <ShieldAlert size={16} /> Emergency Directory
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {helplines.map((help) => (
                <a
                  key={help.id}
                  href={`tel:${help.number}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-100 hover:bg-white hover:shadow-md border border-slate-100 hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${help.color} shadow-sm group-hover:scale-110 transition-transform`}>
                      {help.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-black uppercase leading-none mb-1">
                        {help.name}
                      </p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">
                        {help.number}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-all" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="flex-1 min-w-0 order-2 lg:order-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-8 bg-red-600 rounded-full"></span>
            Active Incidents
          </h2>
          <div className="flex gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded text-slate-500 uppercase tracking-widest text-[10px]">
              Live Operations
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {reports && reports.length > 0 ? (
            reports.map((report) => (
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
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] uppercase font-black tracking-tighter border border-red-100">
                          Critical
                        </span>
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 font-medium">
                        <MapPin size={14} className="text-red-500" /> {report.location}
                      </div>
                    </div>
                    
                    <button className="hidden md:flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter">
                      View Protocol <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4">
                        <p className="text-slate-700 text-sm leading-relaxed italic">
                          "{report.description || "Situation under assessment."}"
                        </p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-slate-100 rounded">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Reporter</p>
                          <p className="text-xs font-bold text-slate-900">{report.username}</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-emerald-50 rounded border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase">Verification</p>
                          <p className="text-xs font-bold text-emerald-700 uppercase flex items-center gap-1">
                            <ShieldCheck size={12} /> Verified
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:w-48 h-32 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-inner bg-slate-200">
                      <img
                        src={report.image}
                        alt="Incident Visual"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1454165833222-d1d7d8599335?q=80&w=400"; }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-xl">
              <AlertTriangle className="mx-auto text-slate-300 mb-2" size={48} />
              <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">No active incident data available.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;