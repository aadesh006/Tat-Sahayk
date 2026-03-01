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

export const signup = async (data) => {
  const res = await axiosInstance.post("/auth/signup", data);
  return res.data;
};

export const logout = () => localStorage.removeItem("token");

export const updateProfile = async (data) => {
  const res = await axiosInstance.patch("/auth/me", data);
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
  image: r.media?.[0]?.file_path || null,
  location:
    r.latitude && r.longitude
      ? `${r.latitude.toFixed(4)}°N, ${r.longitude.toFixed(4)}°E`
      : "Location unavailable",
});

export const fetchReports = async ({ status, severity } = {}) => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (severity) params.append("severity", severity);
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

  const coords = await getCurrentPosition();

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

export const postComment = async ({ reportId, content }) => {
  const res = await axiosInstance.post(`/reports/${reportId}/comments`, { content });
  return res.data;
};

export const deleteComment = async ({ reportId, commentId }) => {
  await axiosInstance.delete(`/reports/${reportId}/comments/${commentId}`);
};