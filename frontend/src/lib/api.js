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
  // FastAPI OAuth2 requires form-encoded data, NOT JSON
  const formData = new URLSearchParams();
  formData.append("username", email); // FastAPI calls it "username"
  formData.append("password", password);

  const res = await axiosInstance.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  localStorage.setItem("token", res.data.access_token);
  // Re-fetch user info after login
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

// ─── REPORTS ─────────────────────────────────────────────────────────────────

export const fetchReports = async () => {
  const res = await axiosInstance.get("/reports/");
  // Normalize backend field names to what the UI expects
  return res.data.map((r) => ({
    ...r,
    disasterType: r.hazard_type,
    location: `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`,
    date: r.created_at ? new Date(r.created_at).toLocaleString() : "Just Now",
    image: r.media?.[0]?.file_path || null,
  }));
};

export const fetchUserReports = async () => {
  const res = await axiosInstance.get("/reports/my");
  return res.data.map((r) => ({
    ...r,
    disasterType: r.hazard_type,
    location: `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`,
    date: r.created_at ? new Date(r.created_at).toLocaleString() : "Just Now",
    image: r.media?.[0]?.file_path || null,
  }));
};

export const createReport = async (formData) => {
  // Step 1: Upload the image to Cloudinary via /media/upload
  const imageFile = formData.get("image");
  let imageFilenames = [];

  if (imageFile) {
    const mediaForm = new FormData();
    mediaForm.append("file", imageFile);
    const uploadRes = await axiosInstance.post("/media/upload", mediaForm, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    imageFilenames = [uploadRes.data.file_path];
  }

  // Step 2: Get GPS coordinates from browser
  const coords = await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: 20.5937, lng: 78.9629 }); // India center fallback
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 20.5937, lng: 78.9629 })
    );
  });

  // Step 3: Submit the report as JSON
  const reportPayload = {
    hazard_type: formData.get("disasterType"),
    description: formData.get("description"),
    severity: "medium",
    latitude: coords.lat,
    longitude: coords.lng,
    image_filenames: imageFilenames,
  };

  const res = await axiosInstance.post("/reports/", reportPayload);
  return res.data;
};

// ─── MAP ─────────────────────────────────────────────────────────────────────

const HAZARD_COLORS = {
  flood: "#3b82f6",
  cyclone: "#ef4444",
  storm: "#f59e0b",
  tsunami: "#8b5cf6",
  default: "#6b7280",
};

export const fetchMap = async () => {
  const res = await axiosInstance.get("/reports/hotspots");
  // Transform hotspot data into the shape MapPage expects
  return res.data.hotspots.map((spot, i) => ({
    id: i,
    position: [spot.center_lat, spot.center_lon],
    radius: Math.min(spot.report_count * 3000, 50000), // scale radius by report count
    color: HAZARD_COLORS[spot.hazard_type] || HAZARD_COLORS.default,
    name: `${spot.hazard_type?.toUpperCase()} — ${spot.report_count} reports`,
  }));
};

// ─── SOCIAL ──────────────────────────────────────────────────────────────────

export const fetchSocialFeed = async () => {
  const res = await axiosInstance.get("/social/");
  return res.data;
};