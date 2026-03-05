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
      verified: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      pending:  "bg-yellow-50  dark:bg-yellow-500/10  text-yellow-600  dark:text-yellow-400  border-yellow-200  dark:border-yellow-500/20",
      false:    "bg-red-50     dark:bg-red-500/10     text-red-600     dark:text-red-400     border-red-200     dark:border-red-500/20",
    };
    const labels = { verified: "Verified", pending: "Pending", false: "Fake/Irrelevant" };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black max-w-2xl mx-auto border-x border-gray-200 dark:border-[rgb(47,51,54)]">
      <Toaster />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {authUser.full_name}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {userReports?.length ?? 0} {t("myReports")}
          </p>
        </div>
      </div>

      {/* Cover + Avatar */}
      <div className="h-32 md:h-40 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-[rgb(38,38,38)] dark:to-[rgb(47,51,54)] relative">
        <div className="absolute -bottom-14 left-4 p-1 bg-white dark:bg-black rounded-full">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 border-4 border-white dark:border-black flex items-center justify-center text-3xl font-bold text-white shadow-lg">
            {authUser.full_name?.charAt(0)}
          </div>
        </div>
      </div>

      {/* Edit Button row */}
      <div className="flex justify-end p-4 h-16 md:h-20">
        {!isAdmin && (
          <button
            onClick={() => { setEditName(authUser.full_name || ""); setEditOpen(true); }}
            className="flex items-center gap-2 px-5 py-2 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-full font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[rgb(22,22,22)] transition-colors text-sm"
          >
            <Edit2 size={14} /> {t("editProfile")}
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="px-4 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {authUser.full_name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          @{authUser.email?.split('@')[0]}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mt-3">
          <span className="flex items-center gap-1.5">
            <Mail size={14} /> {authUser.email}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            Joined {authUser.created_at
              ? new Date(authUser.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              : 'N/A'}
          </span>
        </div>

        {isAdmin && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-block px-3 py-1.5 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-500/20">
              Government Admin
            </span>
            {authUser.district && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                📍 {authUser.district}, {authUser.state}
              </span>
            )}
            <p className="w-full text-xs text-gray-400 dark:text-gray-500 mt-2">
              Name and credentials are government-issued and cannot be modified.
            </p>
          </div>
        )}
      </div>

      {/* Filter Bar — citizens only */}
      {!isAdmin && (
        <div className="px-4 py-3 border-y border-gray-200 dark:border-[rgb(47,51,54)] flex items-center gap-2 overflow-x-auto bg-white dark:bg-black">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all
                ${statusFilter === f.value
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-[rgb(22,22,22)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)]"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Reports List */}
      <div className="p-4 space-y-3">
        {isAdmin ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-[rgb(22,22,22)] rounded-2xl border border-gray-200 dark:border-[rgb(47,51,54)]">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Admin accounts do not submit citizen reports.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Use the Admin Dashboard to review and verify reports.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-sky-500" size={32} />
          </div>
        ) : userReports?.length > 0 ? (
          userReports.map((report) => (
            <article
              key={report.id}
              className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden rounded-2xl hover:border-gray-300 dark:hover:border-[rgb(71,85,105)] transition-all"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock size={12} /> {report.date}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                      {report.disasterType} {statusBadge(report.status)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin size={12} className="text-red-500" /> {report.location}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[rgb(38,38,38)] p-3 rounded-xl border border-gray-100 dark:border-[rgb(47,51,54)]">
                  {report.description}
                </p>

                {report.image && (
                  <img
                    src={report.image}
                    alt="Report"
                    className="mt-3 w-full h-40 object-cover rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)]"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-sm">{t("noReports")}</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal — citizens only */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("editProfile")}
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("fullName")}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-2 w-full px-4 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("email")}
                </label>
                <input
                  type="text"
                  value={authUser.email}
                  disabled
                  className="mt-2 w-full px-4 py-3 border border-gray-100 dark:border-[rgb(47,51,54)] rounded-xl bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Email cannot be changed</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-3 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doEdit()}
                disabled={editPending}
                className="flex-1 py-3 bg-sky-500 text-white rounded-full text-sm font-semibold hover:bg-sky-600 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm"
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