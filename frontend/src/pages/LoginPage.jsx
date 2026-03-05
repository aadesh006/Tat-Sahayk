import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { login } from "../lib/api.js";
import { Lock, Mail, Loader2, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";


const LoginPage = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const queryClient = useQueryClient();

  const { mutate: loginMutation, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
    onError: (err) => toast.error(err?.response?.data?.detail || "Login failed"),
  });

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  // Pre-fill admin credentials hint
  const switchToAdmin = () => {
    setIsAdmin(true);
    setLoginData({ email: "admin@tatsahayk.gov.in", password: "" });
  };

  const switchToCitizen = () => {
    setIsAdmin(false);
    setLoginData({ email: "", password: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-6">
      <Toaster />
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
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
            <div className="mb-6 p-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1.5">
                <ShieldAlert size={13} />
                Admin ID is issued by the government. Contact your district authority if you don't have one.
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
                  placeholder={isAdmin ? "admin@tatsahayk.gov.in" : "name@email.com"}
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
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
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
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                New to the platform?{" "}
                <Link to="/signup" className="text-sky-500 hover:text-sky-600 font-semibold">
                  Register here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;