import React, { useState, useRef, useEffect } from "react";
import { Camera, MapPin, AlertTriangle, X, Loader2, Plus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReport } from "../lib/api.js";
import { useTranslation } from "react-i18next";

const CreateReport = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [previews, setPreviews] = useState([]);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [formData, setFormData] = useState({
    disasterType: "Flood",
    description: "",
  });

  useEffect(() => {
    setGpsStatus("detecting");
    if (!navigator.geolocation) { setGpsStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      () => setGpsStatus("found"),
      () => setGpsStatus("denied")
    );
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      toast.success(t("reportSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setPreviews([]);
      setFormData({ disasterType: "Flood", description: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to submit"),
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (previews.length + files.length > 5) {
      return toast.error("Maximum 5 images allowed");
    }
    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (previews.length === 0) return toast.error("Please upload at least one photo");
    const data = new FormData();
    data.append("disasterType", formData.disasterType);
    data.append("description", formData.description);
    previews.forEach((p) => data.append("images", p.file));
    mutate(data);
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-900 p-6">
      <Toaster />
      <div className="max-w-2xl mx-auto">
        <main className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-blue-50 dark:border-slate-700 bg-gradient-to-r from-blue-900 to-blue-800">
            <h1 className="text-2xl font-bold text-white">{t("submitReport")}</h1>
            <p className="text-blue-100 text-sm opacity-90">Provide details to help emergency services respond.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Multi-image upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-300">
                {t("reportPhoto")} <span className="text-slate-400 font-normal text-xs">(up to 5)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />

              {/* Preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-blue-100 dark:border-slate-600">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {/* Add more button */}
                  {previews.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-blue-200 dark:border-slate-600 flex flex-col items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Plus size={24} className="text-blue-400" />
                      <span className="text-xs text-blue-400 mt-1">Add</span>
                    </button>
                  )}
                </div>
              )}

              {/* Empty state */}
              {previews.length === 0 && (
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="aspect-[16/9] w-full border-2 border-dashed border-blue-200 dark:border-slate-600 rounded-xl bg-blue-50 dark:bg-slate-700 flex flex-col items-center justify-center hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors cursor-pointer group"
                >
                  <div className="p-4 bg-white dark:bg-slate-600 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="text-blue-500" size={32} />
                  </div>
                  <p className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">{t("uploadPhoto")}</p>
                  <p className="text-xs text-blue-400">JPEG or PNG, up to 5 images</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disaster type */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  <AlertTriangle size={16} className="text-amber-500" /> {t("disasterType")}
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  value={formData.disasterType}
                  onChange={(e) => setFormData({ ...formData, disasterType: e.target.value })}
                  required
                >
                  <option>Flood</option>
                  <option>Storm</option>
                  <option>Cyclone</option>
                  <option>Tsunami</option>
                  <option>Oil Spill</option>
                </select>
              </div>

              {/* GPS */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
                  <MapPin size={16} className="text-blue-500" /> {t("locationGps")}
                </label>
                {gpsStatus === "detecting" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-100 bg-blue-50 dark:bg-slate-700 dark:border-slate-600 text-blue-600 dark:text-blue-400 text-sm">
                    <Loader2 size={16} className="animate-spin" /> {t("detectingLocation")}
                  </div>
                )}
                {gpsStatus === "found" && (
                  <div className="px-4 py-2.5 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium">
                    ✓ {t("locationFound")}
                  </div>
                )}
                {gpsStatus === "denied" && (
                  <div className="px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                    ⚠ {t("locationDenied")}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900 dark:text-blue-300">
                {t("description")}
              </label>
              <textarea
                rows="4"
                placeholder="Describe the situation clearly..."
                className="w-full px-4 py-2.5 rounded-lg border border-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2
                ${isPending ? "bg-slate-400 cursor-not-allowed opacity-70" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isPending
                ? <><Loader2 className="animate-spin" size={20} /> {t("transmitting")}</>
                : t("submitReport")}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateReport;