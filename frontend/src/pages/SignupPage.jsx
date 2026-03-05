import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { signup } from "../lib/api.js";
import { 
  Lock, 
  Mail, 
  User, 
  Loader2, 
  ArrowRight 
} from "lucide-react"; 
import { Link, useNavigate } from "react-router";
import toast, { Toaster } from "react-hot-toast";

const SignupPage = () => {
  const [signupData, setSignupData] = useState({
    email: "",
    full_name: "",
    password: "",
  });
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    mutate: signupMutation,
    error,
    isPending,
  } = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      navigate("/");
    },
  });

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.error("Password must be atleast 6 characters long.");

      return;
    }
    signupMutation(signupData);
    if(error){
        toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6">
       <Toaster />
      <div className="mb-8">
        <Link to="/">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent hover:from-sky-600 hover:to-blue-700 transition-all">
            तट-Sahayk
          </h1>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[rgb(22,22,22)] rounded-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        <div className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Join the community response network</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 font-semibold rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-6 bg-sky-500 hover:bg-sky-600 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-sky-500 hover:text-sky-600 font-semibold transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;