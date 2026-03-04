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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
      <Toaster />
      <div className="mb-8">
        <img src="/logo.jpg" alt="Logo" className="w-32 md:w-40 object-contain drop-shadow-sm" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className={`h-2 ${isAdmin ? "bg-gradient-to-r from-purple-600 to-pink-500" : "bg-gradient-to-r from-blue-600 to-cyan-400"}`} />

        <div className="p-8">
          {/* Toggle tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 mb-8">
            <button
              onClick={switchToCitizen}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
                ${!isAdmin
                  ? "bg-white dark:bg-slate-600 text-blue-600 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
            >
              Citizen Login
            </button>
            <button
              onClick={switchToAdmin}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5
                ${isAdmin
                  ? "bg-white dark:bg-slate-600 text-purple-600 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
            >
              <ShieldAlert size={14} /> Admin Login
            </button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {isAdmin ? "Admin Portal" : t("welcomeBack")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {isAdmin
                ? "Government-issued credentials required"
                : "Enter your credentials to access the portal"}
            </p>
          </div>

          {isAdmin && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5">
                <ShieldAlert size={13} />
                Admin ID is issued by the government. Contact your district authority if you don't have one.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {isAdmin ? "Government Email ID" : t("email")}
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  placeholder={isAdmin ? "admin@tatsahayk.gov.in" : "name@email.com"}
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {isAdmin ? "Government Password" : t("password")}
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2
                ${isAdmin
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-slate-900 hover:bg-blue-700"}`}
            >
              {isPending
                ? <><Loader2 className="animate-spin" size={20} /> Verifying...</>
                : isAdmin ? "Access Admin Portal" : t("login")}
            </button>
          </form>

          {!isAdmin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                New to the platform?{" "}
                <Link to="/signup" className="text-blue-600 font-bold underline">
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