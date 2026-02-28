import React from 'react';
import { Link } from 'react-router';
import { 
  MapPin, Calendar, Mail, ArrowLeft, 
  Clock, ShieldCheck, ChevronRight ,Loader2
} from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser.js';
import { useQuery } from '@tanstack/react-query';
import { fetchUserReports } from '../lib/api.js';

const ProfilePage = () => {
  const { authUser } = useAuthUser();
  const userData = authUser;

  const {data:UserReports,isLoading,Error} = useQuery({
    queryKey : ['user_reports'],
    queryFn : fetchUserReports,
  })
  

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Loading Profile...</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto border-x border-blue-50">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-4 py-2 flex items-center gap-8 border-b border-blue-50">
        <Link to="/" className="p-2 hover:bg-blue-50 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-blue-900" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-blue-900 leading-tight">{userData.full_name}</h1>
          <p className="text-xs text-blue-500 font-medium">{UserReports.length} Reports</p>
        </div>
      </div>

      <div className="h-32 md:h-44 bg-gradient-to-r from-blue-600 to-cyan-400 relative">
        <div className="absolute -bottom-14 left-4 p-1 bg-white rounded-full">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border-4 border-white flex items-center justify-center text-3xl font-bold text-white shadow-sm">
            {userData.full_name.charAt(0)}
          </div>
        </div>
      </div>

      <div className="flex justify-end p-4 h-16 md:h-20">
        <button className="px-5 py-1.5 border border-blue-200 rounded-full font-bold text-blue-900 hover:bg-blue-50 transition-colors text-sm">
          Edit Profile
        </button>
      </div>

      <div className="px-4 mb-6">
        <div className="mb-3">
          <h2 className="text-xl font-black text-blue-900 tracking-tight">{userData.full_name}</h2>
          <p className="text-blue-500 text-sm">@{userData.email.split('@')[0]}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-500">
          <div className="flex items-center gap-1"><Mail size={16} /> {userData.email}</div>
          <div className="flex items-center gap-1">
            <Calendar size={16} /> 
            Joined {userData.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', {month:'long', year:'numeric'}) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-blue-50">
        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">My Reports</h3>
      </div>


    {/*////////////// User Reports ////////////*/}
      <div className="p-4 space-y-4">
        {UserReports.map((report) => (
          <article
            key={report.id || report._id}
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
                
                
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="bg-slate-50 p-3 rounded border border-slate-100 mb-4">
                    <p className="text-slate-700 text-sm leading-relaxed italic">
                      "{report.description || "Situation under assessment."}"
                    </p>
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
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;