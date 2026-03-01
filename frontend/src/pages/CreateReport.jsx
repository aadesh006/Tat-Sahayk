import React, { useState, useRef, useEffect } from "react";
import { Camera, MapPin, AlertTriangle, X, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReport } from "../lib/api.js";

const CreateReport = () => {
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | detecting | found | denied

  const initialState = {
    disasterType: "Flood",
    description: "",
    image: null,
    lat: null,
    lng: null,
  };

  const [formData, setFormData] = useState(initialState);

  // Auto-detect GPS on mount
  useEffect(() => {
    setGpsStatus("detecting");
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setGpsStatus("found");
      },
      () => setGpsStatus("denied")
    );
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      toast.success("Report submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setFormData(initialState);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Failed to submit report");
    },
  });

  const handleBoxClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setFormData((prev) => ({ ...prev, image: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.image) {
      return toast.error("Please upload a photo of the incident");
    }
    const data = new FormData();
    data.append("disasterType", formData.disasterType);
    data.append("description", formData.description);
    data.append("image", formData.image);
    mutate(data);
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <Toaster />
      <div className="max-w-2xl mx-auto">
        <main className="bg-white rounded-2xl border border-blue-100 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-900 to-blue-800">
            <h1 className="text-2xl font-bold text-white">Submit New Report</h1>
            <p className="text-blue-100 text-sm opacity-90">
              Provide details to help emergency services respond.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900">
                Report Photo
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {!previewUrl ? (
                <div
                  onClick={handleBoxClick}
                  className="aspect-[16/9] w-full border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer group"
                >
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="text-blue-500" size={32} />
                  </div>
                  <p className="mt-3 text-sm text-blue-600 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-blue-400">High-res JPEG or PNG preferred</p>
                </div>
              ) : (
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disaster Type */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Disaster Type
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-blue-900"
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

              {/* GPS Location */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <MapPin size={16} className="text-blue-500" />
                  Location (GPS)
                </label>

                {gpsStatus === "detecting" && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Detecting your location...
                  </div>
                )}
                {gpsStatus === "found" && (
                  <div className="px-4 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-medium">
                    ✓ {formData.lat?.toFixed(4)}°N, {formData.lng?.toFixed(4)}°E
                  </div>
                )}
                {gpsStatus === "denied" && (
                  <div className="px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm">
                    ⚠ Location denied — using India default
                  </div>
                )}
                {gpsStatus === "idle" && (
                  <div className="px-4 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 text-sm">
                    Waiting for GPS...
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900">
                Detailed Description
              </label>
              <textarea
                rows="4"
                placeholder="Describe the situation clearly..."
                className="w-full px-4 py-2.5 rounded-lg border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-blue-900"
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
                ${isPending
                  ? "bg-slate-400 cursor-not-allowed opacity-70"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Transmitting Data...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default CreateReport;