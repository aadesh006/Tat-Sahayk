import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { signup, googleLogin } from "../lib/api.js";
import { 
  Lock, 
  Mail, 
  User, 
  Loader2, 
  ArrowRight,
  Home,
  Sun,
  Moon,
  Eye,
  EyeOff
} from "lucide-react"; 
import { Link, useNavigate } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import { useTheme } from "../context/ThemeContext.jsx";

const GOOGLE_CLIENT_ID = "156193308727-aq2u3kv8u5t8oh5p7v8nc7s44asb095e.apps.googleusercontent.com";

const SignupPage = () => {
  const { dark, toggle } = useTheme();
  const [signupData, setSignupData] = useState({
    email: "",
    full_name: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    mutate: signupMutation,
    error,
    isPending,
  } = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      toast.success("Account created successfully! Logging you in...");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      // Force navigation after successful signup
      window.location.href = "/";
    },
    onError: (err) => {
      const errorMsg = err?.message || err?.response?.data?.detail || "Signup failed. Please try again.";
      toast.error(errorMsg);
    },
  });

  const { mutate: googleLoginMutation, isPending: isGooglePending } = useMutation({
    mutationFn: googleLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      // Force navigation after successful Google signup
      window.location.href = "/";
    },
    onError: (err) => {
      const errorMsg = err?.message || err?.response?.data?.detail || "Google signup failed";
      toast.error(errorMsg);
    },
  });

  // Initialize Google Sign-In
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignUpButton"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signup_with",
            shape: "pill",
          }
        );
      }
    };

    // Wait for Google script to load
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      window.addEventListener("load", initializeGoogleSignIn);
      return () => window.removeEventListener("load", initializeGoogleSignIn);
    }
  }, []);

  const handleGoogleResponse = (response) => {
    googleLoginMutation(response.credential);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    signupMutation(signupData);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-4 sm:p-6 relative">
       <Toaster position="top-center" toastOptions={{
        duration: 4000,
        style: {
          background: 'rgb(var(--bg-secondary))',
          color: 'rgb(var(--text-primary))',
        },
      }} />
      
      {/* Top-right controls - adjusted for mobile */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 sm:p-3 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-full hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all hover:scale-110 shadow-sm"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={16} className="sm:w-5 sm:h-5 text-gray-300" /> : <Moon size={16} className="sm:w-5 sm:h-5 text-gray-700" />}
        </button>
        
        {/* Home icon */}
        <Link 
          to="/" 
          className="p-2 sm:p-3 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-full hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all hover:scale-110 shadow-sm"
          title="Go to Homepage"
        >
          <Home size={16} className="sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
        </Link>
      </div>
      
      {/* Logo - adjusted spacing for mobile */}
      <div className="mb-6 sm:mb-8 mt-12 sm:mt-0">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
          तट-Sahayk
        </h1>
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
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min. 6 characters"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-[rgb(47,51,54)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-[rgb(22,22,22)] text-gray-500 dark:text-gray-400">
                Or sign up with
              </span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <div id="googleSignUpButton" className="flex justify-center"></div>

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