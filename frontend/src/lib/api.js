import { axiosInstance } from "./axios";

//is user authenticated
export const getAuthUser = async()=>{
     try {
      const savedUser = localStorage.getItem("simulated_user");
      
      if (savedUser) {
          return { user: JSON.parse(savedUser) };
      }
      
      return null;
     } catch (error) {
      console.log("Error in auth user");
        return null;
     }
}


export const login = async (loginData) => {
  // const response = await axiosInstance.post("/auth/login", loginData);
  await delay(800);
    const mockUser = {
        id: "usr_12345",
        full_name: "Hardik Gupta",
        email: loginData.email || "hardik@gmail.com",
        city: "Jaipur",
        state: "Rajasthan",
        created_at: new Date().toISOString()
    };


    localStorage.setItem("simulated_user", JSON.stringify(mockUser));//backend simulation
    return { message: "Login successful", user: mockUser };
  // return response.data;
};

export const signup = async (SignUpData) => {
  const response = await axiosInstance.post("/auth/signup", SignUpData);
  return response.data;
};