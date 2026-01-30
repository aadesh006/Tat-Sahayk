import { axiosInstance } from "./axios";

//is user authenticated
export const getAuthUser = async()=>{
     try {
       const res = await axiosInstance.get("/auth/me");
       return res.data;
     } catch (error) {
      console.log("Error in auth user");
        return null;
     }
}


export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
