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
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <Toaster />
      <div className="max-w-2xl mx-auto">
        <main className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl border border-gray-200 dark:border-[rgb(47,51,54)] shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-[rgb(47,51,54)] bg-white dark:bg-[rgb(22,22,22)]">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("submitReport")}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Provide details to help emergency services respond.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Multi-image upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                {t("reportPhoto")} <span className="text-gray-400 font-normal text-xs">(up to 5)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/mp4,video/quicktime"
                multiple
                className="hidden"
              />

              {/* Camera input for mobile */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[rgb(47,51,54)] group">
                      <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-all active:scale-90"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* Add more buttons */}
                  {previews.length < 5 && (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-[rgb(47,51,54)] flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-[rgb(38,38,38)] hover:bg-gray-100 dark:hover:bg-[rgb(47,51,54)] transition-colors">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-2 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                        title="Take photo"
                      >
                        <Camera size={20} className="text-sky-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                        title="Upload from device"
                      >
                        <Plus size={20} className="text-sky-500" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {previews.length === 0 && (
                <div className="space-y-3">
                  {/* Camera button (mobile) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full aspect-[16/9] border-2 border-dashed border-sky-300 dark:border-sky-700 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex flex-col items-center justify-center hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all group"
                  >
                    <div className="p-4 bg-white dark:bg-[rgb(22,22,22)] rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 border border-sky-200 dark:border-sky-700">
                      <Camera className="text-sky-500" size={32} />
                    </div>
                    <p className="mt-3 text-sm text-gray-900 dark:text-white font-medium">Take Photo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Use your camera to capture the scene</p>
                  </button>

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 border-2 border-dashed border-gray-300 dark:border-[rgb(47,51,54)] rounded-xl bg-gray-50 dark:bg-[rgb(38,38,38)] flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[rgb(47,51,54)] transition-all group"
                  >
                    <Plus size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-sky-500 transition-colors" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-sky-500 transition-colors">
                      Or upload from device
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Disaster type */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <AlertTriangle size={16} className="text-amber-500" /> {t("disasterType")}
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none bg-white transition-all font-medium text-sm"
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
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:border-[rgb(47,51,54)] text-gray-700 dark:text-gray-300 text-sm font-medium">
                        <Loader2 size={16} className="animate-spin text-sky-500" /> {t("detectingLocation")}
                      </div>
                    )}
                    {gpsStatus === "found" && (
                      <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                        ✓ {t("locationFound")}
                      </div>
                    )}
                    {gpsStatus === "denied" && (
                      <div className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-medium">
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State (e.g., Tamil Nadu)"
                      value={manualLocation.state}
                      onChange={(e) => setManualLocation({ ...manualLocation, state: e.target.value })}
                      onBlur={handleGeocodeLocation}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      required
                    />
                    {geocodedCoords && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        ✓ Coordinates: {geocodedCoords.lat.toFixed(4)}°N, {geocodedCoords.lon.toFixed(4)}°E
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

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                {t("description")}
              </label>
              <textarea
                rows="4"
                placeholder="Describe the situation clearly..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all placeholder:text-gray-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 text-white font-semibold text-sm rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2
                ${isPending ? "bg-gray-400 cursor-not-allowed opacity-70" : "bg-sky-600 hover:bg-sky-700"}`}
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