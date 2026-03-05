import React from "react";
import { Link, useLocation } from "react-router";
import { ClipboardList, Map, LayoutDashboard, X,
  PlusCircle, LogOut, ShieldAlert } from 'lucide-react';
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
      window.location.href = "/login";
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const navItems = [
    { to: "/",        label: t("dashboard"), icon: <LayoutDashboard size={20} /> },
    { to: "/profile", label: t("myProfile"), icon: <ClipboardList size={20} /> },
    { to: "/map",     label: t("map"),        icon: <Map size={20} /> },
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
        bg-white dark:bg-slate-900
        border-r border-blue-100 dark:border-slate-700
        w-64 shrink-0
        fixed top-0 left-0 z-[1000]
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-blue-100 dark:border-slate-700 shrink-0">
          <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-wider hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            तट-Sahayk
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 pt-5 overflow-y-auto">
          {navItems.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium
                ${location.pathname === to ? active : inactive}`}
            >
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          {/*
            NEW REPORT button — hidden for admins.
            Admins don't submit citizen reports, they only review and issue alerts.
            Citizens (role === "citizen") see this button normally.
          */}
          {!isAdmin && (
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
              <Link
                to="/new"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-sm uppercase tracking-tight"
              >
                <PlusCircle size={18} /> {t("newReport")}
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom — user info + sign out */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          {authUser && (
            <div className="mb-3 px-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {authUser.full_name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{authUser.email}</p>
              {/* District shown for admins */}
              {isAdmin && authUser.district && (
                <p className="text-[10px] text-blue-400 truncate mt-0.5">
                  📍 {authUser.district}, {authUser.state}
                </p>
              )}
              {isAdmin && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full mt-1 inline-block border border-purple-200 dark:border-purple-800">
                  Admin
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => logoutMutation()}
            disabled={isPending}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase tracking-widest text-[11px]">
              {isPending ? "Signing out..." : t("signOut")}
            </span>
          </button>
        </div>

      </aside>
    </div>
  );
};

export default SideBar;