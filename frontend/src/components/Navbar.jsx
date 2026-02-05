import React from "react";
import { User, Menu, Bell } from 'lucide-react';

const NavBar = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-blue-200 shadow-sm h-16 flex-none">
      <div className="px-4 h-full flex items-center justify-between">
        
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 text-blue-600 rounded-md hover:bg-blue-50 lg:hidden focus:outline-none"
          >
            <Menu size={24} />
          </button>
          
          <span className="lg:hidden text-xl font-bold font-mono text-blue-600 tracking-wider">
            Tat-Sahay
          </span>
        </div>

        <div className="flex items-center gap-4">
         

          <button className="flex items-center gap-2 p-1 pl-2 pr-4 rounded-full border border-blue-100 hover:bg-blue-50 transition-all group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-sm">
              <User size={18} />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-blue-900 group-hover:text-blue-700">Hardik</p>
              <p className="text-xs  text-blue-900 group-hover:text-blue-700">Hardik_17</p>
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};

export default NavBar;