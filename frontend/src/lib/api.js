import { axiosInstance } from "./axios";

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
  const res = await axiosInstance.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  localStorage.setItem("token", res.data.access_token);
  const userRes = await axiosInstance.get("/auth/me");
  return { user: userRes.data };
};

export const signup = async (signupData) => {
  const res = await axiosInstance.post("/auth/signup", signupData);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
};

// ─── GPS HELPER ──────────────────────────────────────────────────────────────

export const getCurrentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve({ lat: 20.5937, lng: 78.9629 }); // center of India fallback
    }
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
  image: r.media?.[0]?.file_path || null,
  location: r.latitude && r.longitude
    ? `${r.latitude.toFixed(4)}°N, ${r.longitude.toFixed(4)}°E`
    : "Location unavailable",
});

export const fetchReports = async () => {
  const res = await axiosInstance.get("/reports/");
  return res.data.map(normalizeReport);
};

export const fetchUserReports = async () => {
  const res = await axiosInstance.get("/reports/my");
  return res.data.map(normalizeReport);
};

export const createReport = async (formData) => {
  // Step 1: Upload image to Cloudinary via /media/upload
  const imageFile = formData.get("image");
  let imageFilenames = [];

  if (imageFile) {
    const mediaForm = new FormData();
    mediaForm.append("file", imageFile);
    const uploadRes = await axiosInstance.post("/media/upload", mediaForm, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    imageFilenames = [uploadRes.data.file_path]; // Cloudinary URL
  }

  // Step 2: Get GPS coordinates
  const coords = await getCurrentPosition();

  // Step 3: Submit JSON report to backend
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

// ─── SOCIAL FEED ─────────────────────────────────────────────────────────────

export const fetchSocialFeed = async () => {
  const res = await axiosInstance.get("/social/");
  return res.data;
};