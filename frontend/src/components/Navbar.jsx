import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Menu, AlertCircle, ChevronDown, Languages, Check, FileText,Book } from 'lucide-react';


const NavBar = ({ onMenuClick }) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const dropdownRef = useRef(null);

  const languages = ["English", "हिन्दी", "বাংলা", "தமிழ்", "తెలుగు"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-blue-200 shadow-sm h-16 flex-none">
      <div className="px-4 h-full flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 text-blue-600 rounded-md hover:bg-blue-50 lg:hidden focus:outline-none"
          >
            <Menu size={24} />
          </button>
          
          <span className="hidden text-xl font-bold font-mono text-blue-600 tracking-wider">
            Tat-Sahayak
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          
          <button className="relative flex items-center gap-2 px-4 md:px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all active:scale-95 group">
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"></span>
            <AlertCircle size={18} className="relative z-10" />
            <span className="relative z-10 text-sm font-black uppercase tracking-widest">
              SOS
            </span>
          </button>
          <Link to="/protocols">
            <button className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50
            rounded-md transition-all font-bold uppercase tracking-tighter text-sm border border-transparent">
              
                <Book size={18} />
                <span className="hidden sm:inline">Protocols</span>
            
            </button>
           </Link>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-md transition-colors group"
            >
              <Languages size={20} className="text-slate-700" />
              <span className="text-lg font-medium text-slate-900">{selectedLang}</span>
              <ChevronDown 
                size={18} 
                className={`text-slate-900 stroke-[3px] transition-transform ${isLangOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLang(lang);
                      setIsLangOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className={`text-sm ${selectedLang === lang ? 'font-bold text-blue-600' : 'text-slate-700'}`}>
                      {lang}
                    </span>
                    {selectedLang === lang && <Check size={14} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default NavBar;