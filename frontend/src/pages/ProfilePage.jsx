import React, { useState } from 'react';
import { Link } from 'react-router';
import { MapPin, Calendar, Mail, ArrowLeft, Clock,
  Loader2, Trash2, Edit2, X, Check, Filter } from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserReports, deleteReport, updateProfile } from '../lib/api.js';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const STATUS_FILTERS = [
  { label: "All",             value: "" },
  { label: "Pending",         value: "pending" },
  { label: "Verified",        value: "verified" },
  { label: "Fake/Irrelevant", value: "false" },
];

const ProfilePage = () => {
  const { authUser } = useAuthUser();
  const queryClient  = useQueryClient();
  const { t }        = useTranslation();
  const [statusFilter, setStatusFilter] = useState("");
  const [editOpen,     setEditOpen]     = useState(false);
  const [editName,     setEditName]     = useState(authUser?.full_name || "");
  const isAdmin = authUser?.role === "admin";

  const { data: userReports, isLoading } = useQuery({
    queryKey: ['user_reports', statusFilter],
    queryFn:  () => fetchUserReports({ status: statusFilter || undefined }),
    enabled:  !!authUser,
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      toast.success("Report deleted");
      queryClient.invalidateQueries({ queryKey: ['user_reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: () => toast.error("Failed to delete report"),
  });

  const { mutate: doEdit, isPending: editPending } = useMutation({
    mutationFn: () => updateProfile({ full_name: editName }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const handleDelete = (id) => {
    if (window.confirm(t("confirmDelete"))) doDelete(id);
  };

  if (!authUser) return null;

  const statusBadge = (status) => {
    const styles = {
      verified: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
      pending:  "bg-yellow-50  dark:bg-yellow-900/20  text-yellow-700  dark:text-yellow-400  border-yellow-100  dark:border-yellow-800",
      false:    "bg-red-50     dark:bg-red-900/20     text-red-700     dark:text-red-400     border-red-100     dark:border-red-800",
    };
    const labels = { verified: "Verified", pending: "Pending", false: "Fake/Irrelevant" };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 max-w-2xl mx-auto border-x border-blue-50 dark:border-slate-700">
      <Toaster />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 flex items-center gap-6 border-b border-blue-50 dark:border-slate-700">
        <Link to="/" className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-blue-900 dark:text-white" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-blue-900 dark:text-white leading-tight">
            {authUser.full_name}
          </h1>
          <p className="text-xs text-blue-500 font-medium">
            {userReports?.length ?? 0} {t("myReports")}
          </p>
        </div>
      </div>

      {/* Cover + Avatar */}
      <div className="h-32 md:h-44 bg-gradient-to-r from-blue-600 to-cyan-400 relative">
        <div className="absolute -bottom-14 left-4 p-1 bg-white dark:bg-slate-900 rounded-full">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border-4 border-white dark:border-slate-900 flex items-center justify-center text-3xl font-bold text-white shadow-sm">
            {authUser.full_name?.charAt(0)}
          </div>
        </div>
      </div>

      {/* Edit Button row */}
      <div className="flex justify-end p-4 h-16 md:h-20">
        {!isAdmin && (
          <button
            onClick={() => { setEditName(authUser.full_name || ""); setEditOpen(true); }}
            className="flex items-center gap-2 px-5 py-1.5 border border-blue-200 dark:border-slate-600 rounded-full font-bold text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-sm"
          >
            <Edit2 size={14} /> {t("editProfile")}
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="px-4 mb-4">
        <h2 className="text-xl font-black text-blue-900 dark:text-white tracking-tight">
          {authUser.full_name}
        </h2>
        <p className="text-blue-500 dark:text-blue-400 text-sm">
          @{authUser.email?.split('@')[0]}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-500 dark:text-blue-400 mt-2">
          <span className="flex items-center gap-1">
            <Mail size={14} /> {authUser.email}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            Joined {authUser.created_at
              ? new Date(authUser.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              : 'N/A'}
          </span>
        </div>

        {isAdmin && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-black uppercase rounded-full border border-purple-200 dark:border-purple-800">
              Government Admin
            </span>
            {authUser.district && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                📍 {authUser.district}, {authUser.state}
              </span>
            )}
            <p className="w-full text-xs text-slate-400 mt-1">
              Name and credentials are government-issued and cannot be modified.
            </p>
          </div>
        )}
      </div>

      {/* Filter Bar — citizens only */}
      {!isAdmin && (
        <div className="px-4 py-3 border-y border-blue-50 dark:border-slate-700 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900">
          <Filter size={14} className="text-slate-400 shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors border
                ${statusFilter === f.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Reports List */}
      <div className="p-4 space-y-4">
        {isAdmin ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Admin accounts do not submit citizen reports.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Use the Admin Dashboard to review and verify reports.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : userReports?.length > 0 ? (
          userReports.map((report) => (
            <article
              key={report.id}
              className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden rounded-r-xl"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Clock size={12} /> {report.date}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      {report.disasterType} {statusBadge(report.status)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="text-blue-400" /> {report.location}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-700 p-3 rounded border border-slate-100 dark:border-slate-600">
                  "{report.description}"
                </p>

                {report.image && (
                  <img
                    src={report.image}
                    alt="Report"
                    className="mt-3 w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-xs uppercase tracking-widest">{t("noReports")}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal — citizens only */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {t("editProfile")}
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("fullName")}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("email")}
                </label>
                <input
                  type="text"
                  value={authUser.email}
                  disabled
                  className="mt-1 w-full px-4 py-2.5 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doEdit()}
                disabled={editPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                {editPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Check size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;