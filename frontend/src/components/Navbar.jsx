import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext.jsx";
import { Sun, Moon, Menu, ChevronDown, Phone } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English",    native: "EN" },
  { code: "hi", label: "Hindi",      native: "हिं" },
  { code: "mr", label: "Marathi",    native: "मर" },
  { code: "bn", label: "Bengali",    native: "বাং" },
  { code: "te", label: "Telugu",     native: "తె" },
  { code: "ta", label: "Tamil",      native: "தமி" },
  { code: "gu", label: "Gujarati",   native: "ગુ" },
  { code: "kn", label: "Kannada",    native: "ಕನ್" },
];

const Navbar = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { dark, toggle } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const langRef = useRef(null);
  const sosRef  = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (sosRef.current  && !sosRef.current.contains(e.target))  setSosOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const helplines = [
    { name: "Police",          number: "100" },
    { name: "Medical",         number: "102" },
    { name: "Disaster",        number: "1077" },
    { name: "Disaster Mgmt.",  number: "108" },
    { name: "Coast Guard",     number: "1554" },
  ];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0 z-20">

      {/* Left — hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Menu size={22} className="text-slate-700 dark:text-slate-200" />
      </button>

      <div className="hidden lg:block" />

      {/* Right controls */}
      <div className="flex items-center gap-2">

        {/* SOS Button */}
        <div ref={sosRef} className="relative">
          <button
            onClick={() => setSosOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-lg shadow-red-900/20"
          >
            <Phone size={14} className="animate-pulse" />
            SOS
            <ChevronDown size={12} className={`transition-transform ${sosOpen ? "rotate-180" : ""}`} />
          </button>

          {sosOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Emergency Helplines</p>
              </div>
              {helplines.map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                >
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{h.name}</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400 group-hover:text-red-700">{h.number}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Language dropdown */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <span className="text-xs">{currentLang.native}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{currentLang.label}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Language</p>
              </div>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${i18n.language === lang.code
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  <span className="text-base w-8 text-center">{lang.native}</span>
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

      </div>
    </header>
  );
};

export default Navbar;