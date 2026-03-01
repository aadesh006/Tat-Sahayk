import React from "react";
import { Link, useLocation } from "react-router";
import { ClipboardList, Map, LayoutDashboard, X,
  PlusCircle, LogOut, ShieldAlert } from 'lucide-react';
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast, Toaster } from "react-hot-toast";
import { logout } from "../lib/api.js";
import useAuthUser from "../hooks/useAuthUser.js";

const SideBar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const isAdmin = authUser?.role === "admin";

  const { mutate: logoutMutation, isPending } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const navItems = [
    { to: "/",        label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { to: "/profile", label: "My Profile", icon: <ClipboardList size={20} /> },
    { to: "/map",     label: "Map",        icon: <Map size={20} /> },
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: <ShieldAlert size={20} /> }] : []),
  ];

  const active = "!bg-cyan-200 hover:!bg-blue-700 hover:!text-white text-blue-900";
  const inactive = "text-blue-900 hover:bg-blue-50";

  return (
    <div>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 lg:hidden backdrop-blur-sm z-[1000]" onClick={onClose} />
      )}
      <aside className={`
        flex flex-col h-screen bg-white shrink-0 w-64
        fixed top-0 left-0 z-[1000] transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative border-r border-blue-200
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Toaster />

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-blue-200 shrink-0">
          <span className="text-xl font-bold text-blue-600 tracking-wider">तट-Sahayk</span>
          <button onClick={onClose} className="lg:hidden text-blue-500"><X size={24} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-2 pt-5 overflow-y-auto">
          {navItems.map(({ to, label, icon }) => (
            <Link key={to} to={to} onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200
                ${location.pathname === to ? active : inactive}`}>
              <span className="shrink-0">{icon}</span>
              <span className="font-medium">{label}</span>
            </Link>
          ))}

          {/* New Report button */}
          <div className="pt-4 mt-4 border-t border-blue-100">
            <Link to="/new" onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm uppercase tracking-tight">
              <PlusCircle size={18} /> New Report
            </Link>
          </div>
        </nav>

        {/* User info + sign out */}
        <div className="p-4 border-t border-blue-100 shrink-0">
          {authUser && (
            <div className="mb-3 px-2">
              <p className="text-xs font-bold text-slate-700 truncate">{authUser.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{authUser.email}</p>
              {isAdmin && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full mt-1 inline-block">
                  Admin
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => logoutMutation()}
            disabled={isPending}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-lg transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase tracking-widest text-[11px]">
              {isPending ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default SideBar;