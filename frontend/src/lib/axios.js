import axios from "axios";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001/api/v1"
    : "/api/v1";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Automatically attach the Bearer token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});