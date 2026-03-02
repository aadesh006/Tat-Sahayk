import React, { useState, useRef } from "react";
import {
  Camera,
  MapPin,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReport } from "../lib/api.js";
import { useNavigate } from "react-router";

const CreateReport = () => {
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState(null);

  const initialState = {
    location: "",
    disasterType: "Flood",
    description: "",
    image: null,
  };

  const [formData, setFormData] = useState(initialState);

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
      toast.error(error.message || "Failed to submit report");
    },
  });

  const handleBoxClick = () => {
    fileInputRef.current.click();
  };

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

    // Use FormData for multipart/form-data (required for images)
    const data = new FormData();
    data.append("location", formData.location);
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
                  <p className="text-xs text-blue-400">
                    High-res JPEG or PNG preferred
                  </p>
                </div>
              ) : (
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-blue-100 shadow-inner">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
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
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Disaster Type
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-blue-900"
                  value={formData.disasterType}
                  onChange={(e) =>
                    setFormData({ ...formData, disasterType: e.target.value })
                  }
                  required
                >
                  <option>Flood</option>
                  <option>Tsunami</option>
                  <option>Cyclone</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <MapPin size={16} className="text-blue-500" />
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Side, District B"
                  className="w-full px-4 py-2.5 rounded-lg border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-blue-900"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900">
                Detailed Description
              </label>
              <textarea
                rows="4"
                placeholder="Describe the situation clearly..."
                className="w-full px-4 py-2.5 rounded-lg border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-blue-900"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 
                ${isPending 
                  ? "bg-slate-400 cursor-not-allowed opacity-70" 
                  : "bg-blue-600 hover:from-blue-700  shadow-blue-200"
                }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Transmitting Data...</span>
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
