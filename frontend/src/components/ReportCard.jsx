import { useState } from "react";
import { Clock, MapPin, ShieldCheck, MessageCircle, Share2, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";
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

  const { mutate: toggleConfirm, isPending: confirmPending } = useMutation({
    mutationFn: () => axiosInstance.post(`/reports/${report.id}/confirm`),
    onSuccess: (data) => {
      setConfirmed(data.data.confirmed);
      setConfirmCount(data.data.confirmation_count);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: () => toast.error("Failed to confirm report"),
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
        className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden hover:border-gray-300 dark:hover:border-[rgb(71,85,105)] transition-all rounded-2xl cursor-pointer"
        onClick={() => onCardClick?.(report)}
      >
        <div className="p-3 lg:p-4">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2 lg:mb-3">
            <div className="space-y-1.5">
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
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Clock size={12} />
                <span>{report.date || "Just Now"}</span>
              </div>

              <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                {report.disasterType}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityStyle[report.severity] || severityStyle.medium}`}>
                  {report.severity || "medium"}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border
                  ${report.status === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                    report.status === "false"    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                                                   "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"}`}>
                  {report.status === "false" ? "Rejected" : (report.status === "verified" ? "Verified" : "Pending")}
                </span>
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={13} className="text-red-500" /> {report.location}
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

            {onDelete && (
              <button onClick={() => onDelete(report.id)}
                className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row gap-3 lg:gap-4">
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] p-3 rounded-xl border border-gray-100 dark:border-[rgb(47,51,54)] mb-2 lg:mb-3">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {report.description || "Situation under assessment."}
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
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 ml-auto">
                  <ShieldCheck size={16} className={report.is_verified ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"} />
                  <span className="hidden sm:inline text-xs">{report.is_verified ? t("verified") : t("pending")}</span>
                </div>
              </div>
            </div>

            {/* Multi-Image Grid */}
            {images.length > 0 && (
              <div className="md:w-52 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className={`grid gap-1.5 rounded-xl overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)]
                  ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {images.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => openLightbox(idx)}
                      className={`relative cursor-zoom-in group/img bg-gray-100 dark:bg-[rgb(38,38,38)]
                        ${images.length === 1 ? "h-36" : "h-24"}
                        ${images.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                    >
                      <img
                        src={img}
                        alt={`Incident ${idx + 1}`}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-300"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {images.length > 4 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-semibold text-lg backdrop-blur-sm">
                          +{images.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments section */}
          {commentsOpen && (
            <div className="mt-4 border-t border-gray-100 dark:border-[rgb(47,51,54)] pt-4" onClick={(e) => e.stopPropagation()}>
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