import { useState } from "react";
import { Clock, MapPin, MessageCircle, Share2, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, Plus, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import ImageLightbox from "./ImageLightbox.jsx";
import CommentSection from "./CommentSection.jsx";

const ReportCard = ({ report, showAdminActions = false, onVerify, onDelete, onCardClick }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(report.user_confirmed || false);
  const [confirmCount, setConfirmCount] = useState(report.confirmation_count || 0);
  const [menuOpen, setMenuOpen] = useState(false);

  const { mutate: toggleConfirm, isPending: confirmPending } = useMutation({
    mutationFn: () => axiosInstance.post(`/reports/${report.id}/confirm`),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reports'] });
      
      // Snapshot previous values
      const previousConfirmed = confirmed;
      const previousCount = confirmCount;
      
      // Optimistically update UI
      const newConfirmed = !confirmed;
      const newCount = newConfirmed ? confirmCount + 1 : Math.max(0, confirmCount - 1);
      
      setConfirmed(newConfirmed);
      setConfirmCount(newCount);
      
      return { previousConfirmed, previousCount };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      setConfirmed(context.previousConfirmed);
      setConfirmCount(context.previousCount);
      toast.error("Failed to confirm report");
    },
    onSuccess: (data) => {
      // Update with actual server values
      setConfirmed(data.data.confirmed);
      setConfirmCount(data.data.confirmation_count);
    },
  });

  const severityStyle = {
    critical: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    high:     "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    medium:   "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
    low:      "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
  };

  const handleShare = () => {
    const reportUrl = `${window.location.origin}/?report=${report.id}`;
    if (navigator.share) {
      navigator.share({ 
        title: `Hazard Report: ${report.disasterType}`, 
        text: report.description, 
        url: reportUrl 
      });
    } else {
      navigator.clipboard.writeText(reportUrl);
      toast.success("Report link copied to clipboard!");
    }
  };

  const openLightbox = (idx = 0) => { setLightboxIndex(idx); setLightboxOpen(true); };

  const images = report.images?.length > 0 ? report.images : (report.image ? [report.image] : []);

  return (
    <>
      <article 
        className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-[rgb(47,51,54)] hover:bg-gray-100 dark:hover:bg-[rgb(10,10,10)] transition-all cursor-pointer"
        onClick={() => onCardClick?.(report)}
      >
        <div className="p-4 lg:p-5">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="space-y-1">
              {/* Reporter name + time */}
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {report.reporter_profile_photo ? (
                  <img 
                    src={report.reporter_profile_photo} 
                    alt={report.reporterName}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {report.reporterName?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-gray-900 dark:text-white font-semibold">{report.reporterName || "Anonymous"}</span>
                <Clock size={12} />
                <span>{report.date || "Just Now"}</span>
              </div>

              {/* Location with status badge (severity only for admins) */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <MapPin size={13} className="text-red-500" /> 
                <span>{report.location}</span>
                {showAdminActions && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${severityStyle[report.severity] || severityStyle.medium}`}>
                    {report.severity || "medium"}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                  ${report.status === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                    report.status === "false"    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                                                   "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"}`}>
                  {report.status === "false" ? "Rejected" : (report.status === "verified" ? "Verified" : "Pending")}
                </span>
              </div>
            </div>

            {/* Admin actions */}
            {showAdminActions && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onVerify?.(report.id, "verified")}
                  disabled={report.status === "verified"}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
                  <CheckCircle size={12} /> {t("verify")}
                </button>
                <button onClick={() => onVerify?.(report.id, "false")}
                  disabled={report.status === "false"}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-40">
                  <XCircle size={12} /> {t("reject")}
                </button>
              </div>
            )}

            {/* Three-dot menu for delete (citizens) */}
            {onDelete && (
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors"
                >
                  <MoreHorizontal size={18} />
                </button>
                
                {menuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                    />
                    
                    {/* Dropdown menu - positioned to avoid going off screen */}
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl shadow-lg overflow-hidden min-w-[140px] transform -translate-x-2 sm:translate-x-0">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setMenuOpen(false); 
                          onDelete(report.id); 
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete Report
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="p-3 mb-3">
                <p className="text-gray-900 dark:text-white text-base font-medium leading-relaxed">
                  <span className="font-bold">{report.disasterType}:</span> {report.description || "Situation under assessment."}
                </p>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-4 lg:gap-5 pt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleConfirm(); }}
                  disabled={confirmPending}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-all group
                    ${confirmed 
                      ? "text-sky-500 dark:text-sky-400" 
                      : "text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400"}`}
                >
                  <Plus size={16} className={`${confirmed ? "fill-current rotate-45" : ""} group-hover:scale-110 transition-transform`} />
                  {confirmCount > 0 && <span className="font-semibold">{confirmCount}</span>}
                  <span className="hidden sm:inline">{confirmed ? "Confirmed" : "Confirm"}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setCommentsOpen((o) => !o); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors group">
                  <MessageCircle size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">{t("comments")}</span>
                  {commentsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors group">
                  <Share2 size={16} className="group-hover:scale-110 transition-transform" /> 
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Multi-Image/Video Grid */}
            {images.length > 0 && (
              <div className="md:w-52 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className={`grid gap-1 rounded-lg overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)]
                  ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {images.slice(0, 4).map((img, idx) => {
                    const isVideo = typeof img === 'string' && (img.includes('.mp4') || img.includes('.mov') || img.includes('.webm'));
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => !isVideo && openLightbox(idx)}
                        className={`relative ${!isVideo ? 'cursor-zoom-in' : ''} group/img bg-gray-100 dark:bg-[rgb(38,38,38)]
                          ${images.length === 1 ? "h-36" : "h-24"}
                          ${images.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                      >
                        {isVideo ? (
                          <>
                            <video
                              src={img}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                            />
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md">
                              Video
                            </div>
                          </>
                        ) : (
                          <img
                            src={img}
                            alt={`Incident ${idx + 1}`}
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-300"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        {images.length > 4 && idx === 3 && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-semibold text-lg backdrop-blur-sm">
                            +{images.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Comments section */}
          {commentsOpen && (
            <div className="mt-4 border-t border-gray-100 dark:border-[rgb(47,51,54)] pt-4 pb-20 lg:pb-4" onClick={(e) => e.stopPropagation()}>
              <CommentSection reportId={report.id} />
            </div>
          )}
        </div>
      </article>

      {lightboxOpen && (
        <ImageLightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
};

export default ReportCard;