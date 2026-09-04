import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Home, Map, PlusCircle, Bell, User, ShieldAlert, AlertTriangle, LayoutDashboard, Brain } from 'lucide-react';
import useAuthUser from "../hooks/useAuthUser.js";

const BottomNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const isAdmin = authUser?.role === "admin";

  // Don't show on desktop (lg and above)
  // Don't show on login/signup pages
  if (location.pathname === "/login" || location.pathname === "/signup") {
    return null;
  }

  // Citizen navigation items
  const citizenNavItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/map", label: "Map", icon: Map },
    { to: "/new", label: "", icon: PlusCircle, isCenter: true }, // Center FAB
    { to: "/alerts", label: "Alerts", icon: Bell },
    { to: "/profile", label: "Profile", icon: User },
  ];

  // Admin navigation items
  const adminNavItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/map", label: "Map", icon: Map },
    { to: "/admin", label: "", icon: LayoutDashboard, isCenter: true }, // Center FAB
    { to: "/admin/analytics", label: "Analytics", icon: Brain },
    { to: "/red-zone", label: "Red Zone", icon: AlertTriangle },
  ];

  const navItems = isAdmin ? adminNavItems : citizenNavItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[rgb(47,51,54)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          // Center FAB button
          if (item.isCenter) {
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="relative -mt-8 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center"
              >
                <Icon size={28} className="text-white" strokeWidth={2.5} />
              </button>
            );
          }

          // Regular nav items
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-sky-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
