import { X, Clock, MapPin, ShieldCheck, MessageCircle, Share2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import ImageLightbox from "./ImageLightbox.jsx";
import CommentSection from "./CommentSection.jsx";

const ReportModal = ({ report, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(report.confirmation_count || 0);

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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-[rgb(22,22,22)]/80 backdrop-blur-md border-b border-gray-200 dark:border-[rgb(47,51,54)] px-4 py-3 flex items-center justify-between z-10 shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1">
            <div className="p-4 md:p-6 space-y-4">
            {/* Reporter info */}
            <div className="flex items-center gap-3">
              {report.reporter_profile_photo ? (
                <img 
                  src={report.reporter_profile_photo} 
                  alt={report.reporterName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                  {report.reporterName?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{report.reporterName || "Anonymous"}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock size={12} />
                  <span>{report.date || "Just Now"}</span>
                </div>
              </div>
            </div>

            {/* Hazard type and badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{report.disasterType}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityStyle[report.severity] || severityStyle.medium}`}>
                {report.severity || "medium"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border
                ${report.status === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                  report.status === "false"    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                                                 "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"}`}>
                {report.status === "false" ? t("rejected") : t(report.status || "pending")}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <MapPin size={14} className="text-red-500" />
              <span>{report.location}</span>
            </div>

            {/* Description */}
            <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] p-4 rounded-xl border border-gray-100 dark:border-[rgb(47,51,54)]">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {report.description || "Situation under assessment."}
              </p>
            </div>

            {/* Images */}
            {images.length > 0 && (
              <div className={`grid gap-2 rounded-xl overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)]
                ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => openLightbox(idx)}
                    className={`relative cursor-zoom-in group bg-gray-100 dark:bg-[rgb(38,38,38)]
                      ${images.length === 1 ? "aspect-video" : "aspect-square"}
                      ${images.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                  >
                    <img
                      src={img}
                      alt={`Incident ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-6 pt-2 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
              <button 
                onClick={() => toggleConfirm()}
                disabled={confirmPending}
                className={`flex items-center gap-2 text-sm font-medium transition-colors group
                  ${confirmed 
                    ? "text-sky-500 dark:text-sky-400" 
                    : "text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400"}`}
              >
                <Plus size={18} className={`${confirmed ? "fill-current" : ""} group-hover:scale-110 transition-transform`} />
                {confirmCount > 0 && <span className="font-semibold">{confirmCount}</span>}
                <span>Confirm</span>
              </button>
              <button onClick={handleShare}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors group">
                <Share2 size={18} className="group-hover:scale-110 transition-transform" /> 
                <span>Share</span>
              </button>
              {/* Removed pending/verified indicator from action bar */}
            </div>

            {/* Comments section */}
            <div className="border-t border-gray-200 dark:border-[rgb(47,51,54)] pt-4">
              <CommentSection reportId={report.id} />
            </div>
          </div>
        </div>
      </div>
    </div>

      {lightboxOpen && (
        <ImageLightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
};

export default ReportModal;
