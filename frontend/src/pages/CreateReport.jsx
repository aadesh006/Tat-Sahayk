import React, { useState, useRef, useEffect } from "react";
import { Camera, MapPin, AlertTriangle, X, Loader2, Plus, Navigation } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createReport } from "../lib/api.js";
import { useTranslation } from "react-i18next";

const CreateReport = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [previews, setPreviews] = useState([]);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState({ district: "", state: "" });
  const [geocodedCoords, setGeocodedCoords] = useState(null); // Store geocoded coordinates
  const [formData, setFormData] = useState({
    disasterType: "Flood",
    description: "",
  });

  useEffect(() => {
    if (!useManualLocation) {
      setGpsStatus("detecting");
      if (!navigator.geolocation) { setGpsStatus("denied"); return; }
      navigator.geolocation.getCurrentPosition(
        () => setGpsStatus("found"),
        () => setGpsStatus("denied")
      );
    }
  }, [useManualLocation]);

  // Geocode manual location when user finishes typing
  const handleGeocodeLocation = async () => {
    if (!manualLocation.district || !manualLocation.state) return;
    
    const locationQuery = `${manualLocation.district}, ${manualLocation.state}, India`;
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&countrycodes=in`,
        { headers: { "User-Agent": "TatSahayk/1.0" } }
      );
      const data = await res.json();
      
      if (data.length > 0) {
        setGeocodedCoords({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        });
        toast.success(`Location set to ${data[0].display_name}`);
      } else {
        toast.error("Location not found — try a different name");
        setGeocodedCoords(null);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Could not geocode location");
      setGeocodedCoords(null);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      toast.success(t("reportSubmitted"));
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      setPreviews([]);
      setFormData({ disasterType: "Flood", description: "" });
      setManualLocation({ district: "", state: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(err?.response?.data?.detail || "Failed to submit"),
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (previews.length + files.length > 5) {
      return toast.error("Maximum 5 media files allowed");
    }
    
    const newPreviews = files.map((file) => {
      const isVideo = file.type.startsWith('video/');
      return {
        url: URL.createObjectURL(file),
        file,
        isVideo,
      };
    });
    
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (previews.length === 0) return toast.error("Please upload at least one photo or video");
    if (useManualLocation && (!manualLocation.district || !manualLocation.state)) {
      return toast.error("Please enter district and state");
    }
    if (useManualLocation && !geocodedCoords) {
      return toast.error("Please wait for location to be geocoded");
    }
    
    const data = new FormData();
    data.append("disasterType", formData.disasterType);
    data.append("description", formData.description);
    
    if (useManualLocation && geocodedCoords) {
      // Send both manual location text and geocoded coordinates
      data.append("manual_location", JSON.stringify({
        ...manualLocation,
        lat: geocodedCoords.lat,
        lon: geocodedCoords.lon
      }));
    }
    
    previews.forEach((p) => data.append("images", p.file));
    mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-2xl mx-auto">
        {/* Header - matching app style */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("submitReport")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Help emergency services respond quickly</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-[rgb(22,22,22)]">
          
          {/* Description - Now First */}
          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {t("description")}
            </label>
            <textarea
              rows="6"
              placeholder="What's happening? Describe the situation, severity, and any immediate dangers..."
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(38,38,38)] dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all placeholder:text-gray-400 text-sm resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Disaster Type & Location */}
          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-[rgb(47,51,54)] space-y-4">
            {/* Disaster type */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <AlertTriangle size={16} className="text-amber-500" /> {t("disasterType")}
              </label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(38,38,38)] dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-sm font-medium"
                value={formData.disasterType}
                onChange={(e) => setFormData({ ...formData, disasterType: e.target.value })}
                required
              >
                <option>Flood</option>
                <option>Cyclone</option>
                <option>Storm</option>
                <option>Tsunami</option>
                <option>Oil Spill</option>
                <option>Earthquake</option>
              </select>
            </div>

            {/* GPS / Manual Location */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <MapPin size={16} className="text-sky-500" /> Location
              </label>
              
              {!useManualLocation ? (
                <>
                  {gpsStatus === "detecting" && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)] text-gray-700 dark:text-gray-300 text-sm">
                      <Loader2 size={16} className="animate-spin text-sky-500" /> {t("detectingLocation")}
                    </div>
                  )}
                  {gpsStatus === "found" && (
                    <div className="px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
                      ✓ {t("locationFound")}
                    </div>
                  )}
                  {gpsStatus === "denied" && (
                    <div className="px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
                      ⚠ {t("locationDenied")}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setUseManualLocation(true)}
                    className="text-xs text-sky-500 hover:text-sky-600 font-medium hover:underline"
                  >
                    Enter location manually
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="District (e.g., Ennore)"
                    value={manualLocation.district}
                    onChange={(e) => setManualLocation({ ...manualLocation, district: e.target.value })}
                    onBlur={handleGeocodeLocation}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(38,38,38)] dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State (e.g., Tamil Nadu)"
                    value={manualLocation.state}
                    onChange={(e) => setManualLocation({ ...manualLocation, state: e.target.value })}
                    onBlur={handleGeocodeLocation}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(38,38,38)] dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    required
                  />
                  {geocodedCoords && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      ✓ Location set: {geocodedCoords.lat.toFixed(4)}°N, {geocodedCoords.lon.toFixed(4)}°E
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { 
                      setUseManualLocation(false); 
                      setManualLocation({ district: "", state: "" }); 
                      setGeocodedCoords(null);
                    }}
                    className="text-xs text-sky-500 hover:text-sky-600 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Navigation size={12} /> Use GPS instead
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Media Upload Section - Twitter-style compact attachment */}
          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/mp4,video/quicktime"
              multiple
              className="hidden"
            />

            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* Preview thumbnails - compact Twitter style */}
            {previews.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)] group">
                      {p.isVideo ? (
                        <video 
                          src={p.url} 
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img 
                          src={p.url} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-500 transition-all"
                      >
                        <X size={12} />
                      </button>
                      {p.isVideo && (
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/70 text-white text-[10px] text-center">
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add media buttons - Twitter style */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all text-sm font-medium"
              >
                <Camera size={18} />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all text-sm font-medium"
              >
                <Plus size={18} />
                <span>Media</span>
              </button>
              {previews.length > 0 && (
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                  {previews.length}/5
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-4 lg:p-6">
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-3.5 text-white font-semibold text-sm rounded-full shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2
                ${isPending ? "bg-gray-400 cursor-not-allowed opacity-70" : "bg-sky-600 hover:bg-sky-700"}`}
            >
              {isPending
                ? <><Loader2 className="animate-spin" size={18} /> {t("transmitting")}</>
                : t("submitReport")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReport;