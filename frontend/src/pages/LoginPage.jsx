import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { login, adminLogin, googleLogin } from "../lib/api.js";
import { Lock, Mail, Loader2, ShieldAlert, Home, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext.jsx";

const GOOGLE_CLIENT_ID = "156193308727-aq2u3kv8u5t8oh5p7v8nc7s44asb095e.apps.googleusercontent.com";

const LoginPage = () => {
  const { t } = useTranslation();
  const { dark, toggle } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: loginMutation, isPending } = useMutation({
    mutationFn: isAdmin ? adminLogin : login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      // Force navigation after successful login
      window.location.href = "/";
    },
    onError: (err) => {
      console.error("Login error:", err);
      const errorMsg = err?.message || err?.response?.data?.detail || "Login failed. Please try again.";
      toast.error(errorMsg, {
        duration: 8000,
      });
      // Don't reset form on error - keep the entered values
    },
  });

  const { mutate: googleLoginMutation, isPending: isGooglePending } = useMutation({
    mutationFn: googleLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      // Force navigation after successful Google login
      window.location.href = "/";
    },
    onError: (err) => {
      console.error("Google login error:", err);
      const errorMsg = err?.message || err?.response?.data?.detail || "Google login failed";
      toast.error(errorMsg, {
        duration: 8000,
      });
    },
  });

  // Initialize Google Sign-In
  useEffect(() => {
    if (isAdmin) return; // Don't show Google login for admin

    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInButton"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
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
  }, [isAdmin]);

  const handleGoogleResponse = (response) => {
    googleLoginMutation(response.credential);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  // Pre-fill admin credentials hint
  const switchToAdmin = () => {
    setIsAdmin(true);
    setLoginData({ email: "admin.mumbai@tatsahayk.gov.in", password: "MUMBAI_ADMIN_123" });
  };

  const switchToCitizen = () => {
    setIsAdmin(false);
    setLoginData({ email: "", password: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center p-4 sm:p-6 py-8 sm:py-12 relative overflow-y-auto">
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
          {/* Toggle tabs */}
          <div className="flex rounded-full bg-gray-100 dark:bg-[rgb(38,38,38)] p-1 mb-8">
            <button
              onClick={switchToCitizen}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all
                ${!isAdmin
                  ? "bg-white dark:bg-[rgb(22,22,22)] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              Citizen Login
            </button>
            <button
              onClick={switchToAdmin}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5
                ${isAdmin
                  ? "bg-white dark:bg-[rgb(22,22,22)] text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              <ShieldAlert size={14} /> Admin
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? "Admin Portal" : t("welcomeBack")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              {isAdmin
                ? "Government-issued credentials required"
                : "Enter your credentials to access the portal"}
            </p>
          </div>

          {isAdmin && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl space-y-2">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                <ShieldAlert size={13} />
                Demo Credentials (Pre-filled)
              </p>
              <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1 pl-5">
                <p><span className="font-medium">Email:</span> admin.mumbai@tatsahayk.gov.in</p>
                <p><span className="font-medium">Password:</span> MUMBAI_ADMIN_123</p>
              </div>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 italic pl-5">
                Other admins: admin.chennai / admin.national (follow same pattern: CITY_ADMIN_123)
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isAdmin ? "Government Email ID" : t("email")}
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  placeholder={isAdmin ? "admin.mumbai@tatsahayk.gov.in" : "name@email.com"}
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isAdmin ? "Government Password" : t("password")}
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
              className={`w-full py-3.5 text-white font-semibold rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2
                ${isAdmin
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-sky-500 hover:bg-sky-600"}`}
            >
              {isPending
                ? <><Loader2 className="animate-spin" size={20} /> Verifying...</>
                : isAdmin ? "Access Admin Portal" : t("login")}
            </button>
          </form>

          {!isAdmin && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-[rgb(47,51,54)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-[rgb(22,22,22)] text-gray-500 dark:text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <div id="googleSignInButton" className="flex justify-center"></div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  New to the platform?{" "}
                  <Link to="/signup" className="text-sky-500 hover:text-sky-600 font-semibold">
                    Register here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;