import { axiosInstance } from "./axios";
import { reports, MapData, UserReports } from "../services/storage";

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const getAuthUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const res = await axiosInstance.get("/auth/me");
    return { user: res.data };
  } catch {
    localStorage.removeItem("token");
    return null;
  }
};

export const login = async ({ email, password }) => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  
  try {
    const res = await axiosInstance.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("token", res.data.access_token);
    const userRes = await axiosInstance.get("/auth/me");
    return { user: userRes.data };
  } catch (error) {
    // Re-throw the error with proper message
    if (error.response?.status === 401) {
      throw new Error("Incorrect email or password");
    } else if (error.response?.status === 403) {
      throw new Error(error.response.data.detail || "Access denied");
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error("Login failed. Please try again.");
    }
  }
};

export const adminLogin = async ({ email, password }) => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  
  try {
    const res = await axiosInstance.post("/auth/admin-login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("token", res.data.access_token);
    const userRes = await axiosInstance.get("/auth/me");
    const user = userRes.data;
    
    // Auto-save location for admins on login
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axiosInstance.patch("/auth/me", {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          } catch (err) {
            console.error("Failed to save admin location:", err);
            // Don't throw - location save is optional
          }
        },
        (error) => {
          console.warn("Geolocation denied or unavailable:", error);
          // Don't throw - location is optional
        }
      );
    }
    
    return { user };
  } catch (error) {
    // Re-throw the error with proper message
    if (error.response?.status === 401) {
      throw new Error("Incorrect email or password");
    } else if (error.response?.status === 403) {
      throw new Error(error.response.data.detail || "Access denied");
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error("Admin login failed. Please try again.");
    }
  }
};

export const googleLogin = async (credential) => {
  try {
    const res = await axiosInstance.post("/auth/google", { credential });
    localStorage.setItem("token", res.data.access_token);
    const userRes = await axiosInstance.get("/auth/me");
    return { user: userRes.data };
  } catch (error) {
    // Re-throw the error with proper message
    if (error.response?.status === 401) {
      throw new Error("Invalid Google token");
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error("Google login failed. Please try again.");
    }
  }
};

export const signup = async (data) => {
  try {
    // First create the account
    await axiosInstance.post("/auth/signup", data);
    
    // Then automatically log in
    const formData = new URLSearchParams();
    formData.append("username", data.email);
    formData.append("password", data.password);
    const loginRes = await axiosInstance.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    localStorage.setItem("token", loginRes.data.access_token);
    const userRes = await axiosInstance.get("/auth/me");
    return { user: userRes.data };
  } catch (error) {
    // Re-throw the error with proper message
    if (error.response?.status === 400) {
      throw new Error("Email already registered");
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error("Signup failed. Please try again.");
    }
  }
};

export const logout = () => localStorage.removeItem("token");

export const updateProfile = async (data) => {
  const res = await axiosInstance.patch("/auth/me", data);
  return res.data;
};

// ── Phone Verification ───────────────────────────────────────────────────────

export const sendOTP = async (phone) => {
  const res = await axiosInstance.post("/auth/send-otp", { phone });
  return res.data;
};

export const verifyOTP = async (phone, otp) => {
  const res = await axiosInstance.post("/auth/verify-otp", { phone, otp });
  return res.data;
};

export const deleteAccount = async () => {
  const res = await axiosInstance.delete("/auth/me");
  return res.data;
};

// ─── GPS ─────────────────────────────────────────────────────────────────────

export const getCurrentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation)
      return resolve({ lat: 20.5937, lng: 78.9629 });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 20.5937, lng: 78.9629 })
    );
  });

// ─── REPORTS ─────────────────────────────────────────────────────────────────

const normalizeReport = (r) => ({
  ...r,
  disasterType: r.hazard_type,
  date: r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "Just Now",
  images: r.media?.map((m) => m.file_path).filter(Boolean) || [],
  image:  r.media?.[0]?.file_path || null,  // keep for backward compat
  reporterName: r.reporter_name || "Anonymous",
  location:
    r.latitude && r.longitude
      ? `${Number(r.latitude).toFixed(4)}°N, ${Number(r.longitude).toFixed(4)}°E`
      : "Location unavailable",
});

export const fetchReports = async ({ status, severity, allReports = false } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (severity) params.append("severity", severity);
  if (allReports) params.append("all_reports", "true");
  const res = await axiosInstance.get(`/reports/?${params.toString()}`);
  return res.data.map(normalizeReport);
};

export const fetchUserReports = async ({ status } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  const res = await axiosInstance.get(`/reports/my?${params.toString()}`);
  return res.data.map(normalizeReport);
};

export const createReport = async (formData) => {
  const imageFiles = formData.getAll("images");
  let imageFilenames = [];

  if (imageFiles.length > 0) {
    const multiForm = new FormData();
    imageFiles.forEach((f) => multiForm.append("files", f));
    const uploadRes = await axiosInstance.post("/media/upload-many", multiForm);
    imageFilenames = uploadRes.data.file_paths;
  }

  let coords;
  const manualLocationStr = formData.get("manual_location");
  
  if (manualLocationStr) {
    // Manual location provided - use geocoding or default coordinates
    const manualLocation = JSON.parse(manualLocationStr);
    
    // Try to geocode the location
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation.district + ', ' + manualLocation.state + ', India')}&limit=1`;
      const geocodeRes = await fetch(geocodeUrl);
      const geocodeData = await geocodeRes.json();
      
      if (geocodeData && geocodeData.length > 0) {
        coords = {
          lat: parseFloat(geocodeData[0].lat),
          lng: parseFloat(geocodeData[0].lon)
        };
      } else {
        // Fallback to approximate center of India if geocoding fails
        coords = { lat: 20.5937, lng: 78.9629 };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      // Fallback to approximate center of India
      coords = { lat: 20.5937, lng: 78.9629 };
    }
  } else {
    // Use GPS location
    coords = await getCurrentPosition();
  }

  const res = await axiosInstance.post("/reports/", {
    hazard_type: formData.get("disasterType"),
    description: formData.get("description"),
    severity: "medium",
    latitude: coords.lat,
    longitude: coords.lng,
    image_filenames: imageFilenames,
  });
  return res.data;
};

export const deleteReport = async (reportId) => {
  await axiosInstance.delete(`/reports/${reportId}`);
};

export const verifyReport = async (reportId, status) => {
  const res = await axiosInstance.patch(
    `/reports/${reportId}/verify?status=${status}`
  );
  return res.data;
};

export const fetchReportStats = async () => {
  const res = await axiosInstance.get("/reports/stats");
  return res.data;
};

// ─── MAP ─────────────────────────────────────────────────────────────────────

const HAZARD_COLORS = {
  flood: "#3b82f6",
  cyclone: "#ef4444",
  storm: "#f59e0b",
  tsunami: "#8b5cf6",
  oil_spill: "#10b981",
  default: "#6b7280",
};

export const fetchMap = async () => {
  const res = await axiosInstance.get("/reports/hotspots");
  if (!res.data.hotspots?.length) return [];
  return res.data.hotspots.map((spot, i) => ({
    id: i,
    position: [spot.center_lat, spot.center_lon],
    radius: Math.min(spot.report_count * 5000, 80000),
    color: HAZARD_COLORS[spot.hazard_type?.toLowerCase()] || HAZARD_COLORS.default,
    name: `${spot.hazard_type?.toUpperCase() || "HAZARD"} — ${spot.report_count} report(s)`,
  }));
};

// ─── SOCIAL ──────────────────────────────────────────────────────────────────

export const fetchSocialFeed = async () => {
  const res = await axiosInstance.get("/social/");
  return res.data;
};

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export const fetchComments = async (reportId) => {
  const res = await axiosInstance.get(`/reports/${reportId}/comments`);
  return res.data;
};

export const postComment = async ({ reportId, content, parent_id }) => {
  const res = await axiosInstance.post(`/reports/${reportId}/comments`, { 
    content,
    parent_id: parent_id || null
  });
  return res.data;
};

export const deleteComment = async ({ reportId, commentId }) => {
  await axiosInstance.delete(`/reports/${reportId}/comments/${commentId}`);
};

// ─── ALERTS ──────────────────────────────────────────────────────────────────

export const fetchAlerts = async ({ district, state } = {}) => {
  const params = new URLSearchParams();
  if (district) params.append("district", district);
  if (state)    params.append("state",    state);
  const res = await axiosInstance.get(`/alerts/?${params.toString()}`);
  return res.data;
};

export const createAlert = async (alertData) => {
  const res = await axiosInstance.post("/alerts/", alertData);
  return res.data;
};

export const deactivateAlert = async (alertId) => {
  const res = await axiosInstance.patch(`/alerts/${alertId}/deactivate`);
  return res.data;
};

// ─── ADMIN REPORT SUMMARY (AI) ───────────────────────────────────────────────

export const fetchAdminReports = async ({ status, severity } = {}) => {
  const params = new URLSearchParams();
  if (status)   params.append("status",   status);
  if (severity) params.append("severity", severity);
  const res = await axiosInstance.get(`/reports/?${params.toString()}`);
  return res.data.map((r) => ({
    ...r,
    disasterType: r.hazard_type,
    date: r.created_at
      ? new Date(r.created_at).toLocaleString("en-IN")
      : "Just Now",
    image: r.media?.[0]?.file_path || null,
    location:
      r.latitude && r.longitude
        ? `${Number(r.latitude).toFixed(4)}°N, ${Number(r.longitude).toFixed(4)}°E`
        : "Location unavailable",
    aiScore: r.ai_authenticity_score,
    aiSummary: r.ai_analysis_summary,
  }));
};

export const fetchAIClusters = async () => {
  const res = await axiosInstance.get("/ai/clusters");
  return res.data;
};
