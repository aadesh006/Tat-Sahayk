import { useState } from "react";
import { Clock, MapPin, ShieldCheck, MessageCircle, Share2, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, User, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import ImageLightbox from "./ImageLightbox.jsx";
import CommentSection from "./CommentSection.jsx";

const ReportCard = ({ report, showAdminActions = false, onVerify, onDelete, isAdmin = false }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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
    critical: "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300",
    high:     "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300",
    medium:   "bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300",
    low:      "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300",
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
      <article className="bg-white dark:bg-slate-800 border-l-4 border-l-red-600 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all group rounded-r-xl">
        <div className="p-4">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="space-y-1">
              {/* Reporter name + time */}
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-[9px] font-black shrink-0">
                  {report.reporterName?.charAt(0) || "?"}
                </div>
                <span className="text-blue-600 dark:text-blue-400">{report.reporterName || "Anonymous"}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <Clock size={11} />
                <span>{report.date || "Just Now"}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                {report.disasterType}
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${severityStyle[report.severity] || severityStyle.medium}`}>
                  {report.severity || "medium"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border
                  ${report.status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300" :
                    report.status === "false"    ? "bg-red-50 text-red-700 border-red-100" :
                                                   "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {report.status === "false" ? t("rejected") : t(report.status || "pending")}
                </span>
              </h3>
              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={14} className="text-red-500" /> {report.location}
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded border border-slate-100 dark:border-slate-600 mb-3">
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed italic">
                  "{report.description || "Situation under assessment."}"
                </p>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-4 pt-1">
                <button 
                  onClick={() => toggleConfirm()}
                  disabled={confirmPending}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    confirmed 
                      ? "text-blue-600 dark:text-blue-400" 
                      : "text-slate-500 dark:text-slate-400 hover:text-blue-600"
                  }`}
                >
                  <ThumbsUp size={15} className={confirmed ? "fill-current" : ""} />
                  {confirmCount > 0 && <span>{confirmCount}</span>}
                  Confirm
                </button>
                <button onClick={() => setCommentsOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">
                  <MessageCircle size={15} />
                  {t("comments")}
                  {commentsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">
                  <Share2 size={15} /> Share
                </button>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <ShieldCheck size={15} className={report.is_verified ? "text-emerald-500" : "text-slate-300"} />
                  {report.is_verified ? t("verified") : t("pending")}
                </div>
              </div>
            </div>

            {/* Multi-Image Grid */}
            {images.length > 0 && (
              <div className="md:w-52 shrink-0">
                <div className={`grid gap-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700
                  ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {images.slice(0, 4).map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => openLightbox(idx)}
                      className={`relative cursor-zoom-in group/img bg-slate-200 dark:bg-slate-700
                        ${images.length === 1 ? "h-36" : "h-24"}
                        ${images.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                    >
                      <img
                        src={img}
                        alt={`Incident ${idx + 1}`}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-all duration-500"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      {images.length > 4 && idx === 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-xl backdrop-blur-sm">
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
            <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
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