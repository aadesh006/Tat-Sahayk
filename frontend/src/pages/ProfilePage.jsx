import React from 'react';
import { Link } from 'react-router';
import { MapPin, Calendar, Mail, Edit3, ArrowLeft, MoreHorizontal, FileText } from 'lucide-react';
import { UserReports } from '../services/storage.js';

const ProfilePage = ({ user }) => {
  const userData = user || {
    full_name: "Hardik Gupta",
    email: "hardik@gmail.com",
    created_at: "2024-01-15",
  };

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

      <div className="p-4 space-y-6">
        {UserReports.map((report) => (
          <article
            key={report.id}
            className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-4 flex items-center gap-3 border-b border-blue-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold shrink-0">
                {report.username?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 truncate">{report.username}</p>
                <p className="text-sm text-blue-500 truncate">{report.location}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 shrink-0">
                  {report.disasterType}
                </span>
                <span className="text-[10px] text-blue-300 font-medium">{report.date}</span>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-sm text-blue-900 leading-relaxed">
                {report.description}
              </p>
            </div>
            <div className="aspect-[16/10] bg-blue-50">
              <img
                src={report.image}
                alt={report.disasterType}
                className="w-full h-full object-cover"
              />
            </div>
            
          </article>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;