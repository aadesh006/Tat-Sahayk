import React, { useState, useRef } from 'react';
import { Link } from 'react-router';
import { MapPin, Calendar, Mail, ArrowLeft, Clock,
  Loader2, Trash2, Edit2, X, Check, Filter, Shield, 
  Users, Phone, AlertTriangle, Map as MapIcon, Camera, Upload, PhoneCall } from 'lucide-react';
import useAuthUser from '../hooks/useAuthUser.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserReports, deleteReport, updateProfile } from '../lib/api.js';
import { axiosInstance } from '../lib/axios.js';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PhoneVerificationModal from '../components/PhoneVerificationModal.jsx';

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const fileInputRef = useRef(null);
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload image
      const formData = new FormData();
      formData.append('files', file);
      const uploadRes = await axiosInstance.post('/media/upload-many', formData);
      const photoUrl = uploadRes.data.file_paths[0];

      // Update profile with new photo
      await updateProfile({ profile_photo: photoUrl });
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Toaster />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 lg:px-6 py-3 flex items-center gap-4 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {authUser.full_name}
          </h1>
          {!isAdmin && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userReports?.length ?? 0} {t("myReports")}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
      {/* Cover + Avatar */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-[rgb(38,38,38)] dark:to-[rgb(47,51,54)] relative">
        <div className="absolute -bottom-14 left-4 lg:left-8 p-1 bg-white dark:bg-black rounded-full">
          <div className="relative group">
            {authUser.profile_photo ? (
              <img
                src={authUser.profile_photo}
                alt={authUser.full_name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-black object-cover shadow-lg"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div 
              className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 border-4 border-white dark:border-black flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-lg ${authUser.profile_photo ? 'hidden' : ''}`}
            >
              {authUser.full_name?.charAt(0)}
            </div>
            
            {/* Upload button overlay - only for citizens */}
            {!isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploadingPhoto ? (
                    <Loader2 size={24} className="text-white animate-spin" />
                  ) : (
                    <Camera size={24} className="text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Button row */}
      <div className="flex justify-end p-4 lg:px-8 h-16 md:h-20">
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
      <div className="px-4 lg:px-8 mb-4">
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

        {/* Phone Verification Badge - Citizens only */}
        {!isAdmin && (
          <div className="mt-3">
            {authUser.phone_verified ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full border border-green-200 dark:border-green-500/20">
                <PhoneCall size={14} />
                Phone Verified: +91 {authUser.phone}
              </div>
            ) : (
              <button
                onClick={() => setPhoneVerifyOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs font-semibold rounded-full border border-yellow-200 dark:border-yellow-500/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
              >
                <AlertTriangle size={14} />
                Verify Phone Number
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar — citizens only */}
      {!isAdmin && (
        <div className="px-4 lg:px-8 py-3 border-y border-gray-200 dark:border-[rgb(47,51,54)] flex items-center gap-2 overflow-x-auto bg-white dark:bg-black">
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
      <div className="p-4 lg:px-8 space-y-3">
        {isAdmin ? (
          <div className="space-y-4">
            {/* Admin Info Card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-200 dark:border-purple-500/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="text-purple-600 dark:text-purple-400" size={24} />
                Government Administrator
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                    <MapIcon size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Area of Control</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {authUser.district ? `${authUser.district} District, ${authUser.state}` : 'National Level Operations'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Monitor and coordinate disaster response across your jurisdiction
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Resources Available</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        AI-powered report verification system
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        Real-time disaster mapping & hotspot detection
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        Emergency alert broadcasting system
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        Force deployment & coordination tools
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                    <Phone size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Emergency Contacts</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <a href="tel:1077" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <AlertTriangle size={14} className="text-orange-500" />
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Disaster</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">1077</p>
                        </div>
                      </a>
                      <a href="tel:1554" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <Shield size={14} className="text-blue-500" />
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Coast Guard</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">1554</p>
                        </div>
                      </a>
                      <a href="tel:100" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <Shield size={14} className="text-blue-600" />
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Police</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">100</p>
                        </div>
                      </a>
                      <a href="tel:102" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[rgb(22,22,22)] rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <Phone size={14} className="text-red-500" />
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Medical</p>
                          <p className="text-xs font-bold text-gray-900 dark:text-white">102</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl border border-gray-200 dark:border-[rgb(47,51,54)] p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/admin"
                  className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-500/20 rounded-xl hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield size={24} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white text-center">Admin Dashboard</span>
                </Link>
                <Link
                  to="/map"
                  className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-500/20 rounded-xl hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MapIcon size={24} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white text-center">Map View</span>
                </Link>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-gray-50 dark:bg-[rgb(22,22,22)] rounded-2xl border border-gray-200 dark:border-[rgb(47,51,54)] p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                <span className="font-semibold">Note:</span> Admin accounts do not submit citizen reports. Use the Admin Dashboard to review and verify reports from citizens.
              </p>
            </div>
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
                    className="mt-3 w-full max-h-64 object-contain rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] bg-gray-50 dark:bg-[rgb(38,38,38)]"
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

      {/* Phone Verification Modal */}
      {phoneVerifyOpen && (
        <PhoneVerificationModal
          onClose={() => setPhoneVerifyOpen(false)}
          onSuccess={() => toast.success('Phone verified! You will now receive emergency alerts.')}
        />
      )}
    </div>
  );
};

export default ProfilePage;