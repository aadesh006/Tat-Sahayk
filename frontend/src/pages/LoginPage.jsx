import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { login } from "../lib/api.js";

const LoginPage = () => {
  const [loginData, setLoginData] = useState({
    email : "",
    password: "",
  });
  const queryClient = useQueryClient();

  const {
    loginMutation: mutate,
    error,
    isPending,
  } = useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  });

  const handleLogin = (e) => {
    e.preventDefault();
    // loginMutation(loginData);
  };
  return (
    <div className="bg-white h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full flex justify-center pb-10">
          <img src="../public/logo.jpg" className=" w-28 md:w-36 object-contain " />
        </div>
      <div className=" border bg-gray-50 flex flex-col w-full max-w-md mx-auto rounded-xl shadow-lg overflow-hidden">
        <div className="w-full bg-gray-100">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col items-center justify-center space-y-4 ">
              <div className="pt-8 pb-4">
                <h1 className="text-xl font-bold text-blue-500 ">
                  Login With SSO
                </h1>
              </div>
              <div className=" w-full px-6 pb-4 md:px-8">
                <input
                  type="text"
                  placeholder="Email"
                  value={loginData.id}
                  onChange={(e) => {
                    setLoginData({ ...loginData, id: e.target.value });
                  }}
                  className="input input-bordered w-full  bg-white "
                />
              </div>
              <div className="w-full px-6 pb-4 md:px-8">
                <input
                  type="password"
                  placeholder="Password"
                  className="input input-bordered w-full bg-white"
                />
              </div>
              <button
                type="submit"
                className="btn bg-blue-500 text-white text-5 w-4/6 "
              >
                Log In
              </button>
              <div className="pb-5 cursor-pointer hover:text-blue-500 transition-colors">
                <p>Login With Otp</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
