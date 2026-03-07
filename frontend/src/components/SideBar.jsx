import React from "react";
import { Link, useLocation } from "react-router";
import { ClipboardList, Map, LayoutDashboard, X,
  PlusCircle, LogOut, ShieldAlert, LogIn, Home, Bell } from 'lucide-react';
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast, Toaster } from "react-hot-toast";
import { logout } from "../lib/api.js";
import useAuthUser from "../hooks/useAuthUser.js";
import { useTranslation } from "react-i18next";

const SideBar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { t } = useTranslation();
  const isAdmin = authUser?.role === "admin";

  const { mutate: logoutMutation, isPending } = useMutation({
    mutationFn: () => {
      logout();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.clear();
      // Stay on homepage instead of redirecting to login
      window.location.href = "/";
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const navItems = [
    { to: "/",        label: "Home", icon: <Home size={20} />, public: true },
    { to: "/alerts",  label: "Alerts & Notices", icon: <Bell size={20} />, public: true },
    ...(authUser ? [
      { to: "/profile", label: t("myProfile"), icon: <ClipboardList size={20} /> },
      { to: "/map",     label: t("map"),        icon: <Map size={20} /> },
    ] : []),
    // Admin Panel link only appears for admins
    ...(isAdmin ? [{ to: "/admin", label: t("adminPanel"), icon: <ShieldAlert size={20} /> }] : []),
  ];

  const active   = "bg-cyan-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200";
  const inactive = "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";

  return (
    <div>
      <Toaster />

      {/* Dark overlay on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden backdrop-blur-sm z-[1000]"
          onClick={onClose}
        />
      )}

      <aside className={`
        flex flex-col h-screen
        bg-white dark:bg-black
        border-r border-gray-200 dark:border-[rgb(47,51,54)]
        w-64 shrink-0
        fixed top-0 left-0 z-[1000]
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 shrink-0">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent hover:from-sky-600 hover:to-blue-700 transition-all">
            तट-Sahayk
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nav links - scrollable */}
        <nav className="flex-1 px-3 space-y-1 pt-4 overflow-y-auto min-h-0">
          {navItems.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 font-medium text-[15px]
                ${location.pathname === to 
                  ? "bg-gray-100 dark:bg-[rgb(22,22,22)] text-gray-900 dark:text-white font-semibold" 
                  : "text-gray-700 dark:text-[rgb(139,152,165)] hover:bg-gray-50 dark:hover:bg-[rgb(22,22,22)]"}`}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          {!isAdmin && authUser && (
            <div className="pt-3 mt-2 pb-4">
              <Link
                to="/new"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-full font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 text-[15px]"
              >
                <PlusCircle size={18} /> {t("newReport")}
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom — user info + sign out/login - always visible */}
        <div className="p-3 shrink-0 bg-white dark:bg-black">
          {authUser ? (
            <>
              <div className="mb-3 px-3 py-2 border-t border-gray-200 dark:border-[rgb(47,51,54)] pt-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {authUser.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-[rgb(139,152,165)] truncate">{authUser.email}</p>
                {isAdmin && authUser.district && (
                  <p className="text-xs text-sky-500 dark:text-sky-400 truncate mt-1">
                    📍 {authUser.district}, {authUser.state}
                  </p>
                )}
                {isAdmin && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full mt-2 inline-block">
                    Admin
                  </span>
                )}
              </div>

              <button
                onClick={() => logoutMutation()}
                disabled={isPending}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-red-500 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
              >
                <LogOut size={18} />
                <span className="text-sm">
                  {isPending ? "Signing out..." : t("signOut")}
                </span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-full font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <LogIn size={18} />
              <span>Login</span>
            </Link>
          )}
        </div>

      </aside>
    </div>
  );
};

export default SideBar;