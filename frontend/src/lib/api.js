import { axiosInstance } from "./axios";
import { reports, MapData, UserReports } from "../services/storage";

//is user authenticated
export const getAuthUser = async () => {
  try {
    // const res = await axiosInstance.get("/auth/me");
    // return res.data;
    const savedUser = localStorage.getItem("simulated_user");
    if (savedUser) {
      return { user: JSON.parse(savedUser) };
    }
    return null;
  } catch (error) {
    console.log("Error in auth user");
    return null; // for logout
  }
};

export const login = async (loginData) => {
  // const response = await axiosInstance.post("/auth/login", loginData);
  const mockUser = {
    id: "usr_12345",
    full_name: "Hardik Gupta",
    email: loginData.email || "hardik@gmail.com",
    city: "Jaipur",
    state: "Rajasthan",
    created_at: new Date().toISOString(),
  };

  localStorage.setItem("simulated_user", JSON.stringify(mockUser)); //backend simulation
  return { message: "Login successful", user: mockUser };
  // return response.data;
};

export const signup = async (SignUpData) => {
  try {
    const response = await axiosInstance.post("/auth/signup", SignUpData);
    return response.data;
  } catch (error) {
    console.log("Error is signup");
  }
};

export const logout = async () => {
  try {
    // const response = await axiosInstance.post("/auth/logout");
    // return response.data;
    localStorage.removeItem("simulated_user");
  } catch (error) {
    console.log("error logging out");
  }
};

export const fetchReports = async () => {
  try {
    // const response = await axiosInstance.get();
    // return response.data;
    return reports;
  } catch (error) {
    console.error("Error in fetch reports.");
  }
};

export const fetchMap = async () => {
  try {
    // const response = await axiosInstance.get();
    // return response.data;

    return MapData;
  } catch (error) {
    console.log("Error in Fetch Map Endpoint.");
  }
};

export const fetchUserReports = async () => {
  try {
    // const response = await axiosInstance.get();
    // return response.data;
    return UserReports;
  } catch (error) {
    console.log("Error in fetchUserReports");
  }
};

export const createReport = async (formdata) => {
  try {
    // const response = await axiosInstance.post("",formdata);
    // return response.data;
    console.log(Object.fromEntries(formdata.entries()));
  } catch (error) {
    console.log("Error in create report");
  }
};
