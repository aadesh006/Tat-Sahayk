import React from "react";
import { Link, useLocation } from "react-router"; 
import { ClipboardList, Map, LayoutDashboard, X } from 'lucide-react';

const SideBar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const activeLinkClasses = "!bg-cyan-200 hover:!bg-blue-700 hover:!text-white";
  const inactiveLinkClasses = "text-blue-900 hover:bg-blue-50";
  
  const navItems = [
    { to: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { to: "/Reports", label: "My Reports", icon: <ClipboardList size={20}/> },
    { to: "/Map", label: "Map", icon: <Map size={20} /> },
  ];

  return (
    <div>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          flex flex-col h-screen bg-white shrink-0 w-64
          fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:relative lg:top-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-blue-200 shrink-0">
           <span className="text-xl font-semibold font-sans bg-clip-text text-blue-600 tracking-wider truncate px-2 ">
             Tat-Sahay
           </span>
           
           <button onClick={onClose} className="lg:hidden text-blue-500">
             <X size={24} />
           </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 pt-5 overflow-y-auto border-r border-blue-200">
          {navItems.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => onClose()} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                currentPath === to ? activeLinkClasses : inactiveLinkClasses
              }`}
            >
              <span className="shrink-0">{icon}</span>
              <span className="font-medium">{label}</span>
            </Link>
          ))}
          <div className="w-full flex justify-center pt-4">
            <button className="btn bg-blue-700 text-white w-full hover:bg-black ">New Report</button>
          </div>
          
        </nav>
        
      </aside>
    </div>
  );
};

export default SideBar;