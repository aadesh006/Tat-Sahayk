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
    <header className="h-16 bg-white dark:bg-black border-b border-gray-200 dark:border-[rgb(47,51,54)] flex items-center justify-between px-4 lg:px-6 shrink-0 z-20 backdrop-blur-sm bg-white/80 dark:bg-black/80">

      {/* Left — hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] rounded-full transition-colors"
      >
        <Menu size={20} className="text-gray-700 dark:text-gray-200" />
      </button>

      <div className="hidden lg:block" />

      {/* Right controls */}
      <div className="flex items-center gap-2">

        {/* SOS Button - Direct emergency call */}
        <a
          href="tel:112"
          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-all shadow-sm hover:shadow-md"
        >
          <Phone size={14} />
          <span className="hidden sm:inline">SOS 112</span>
        </a>

        {/* Language dropdown */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-[rgb(22,22,22)] hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)] rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <span className="text-xs">{currentLang.native}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{currentLang.label}</span>
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-[rgb(47,51,54)]">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Language</p>
              </div>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                    ${i18n.language === lang.code
                      ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)]"}`}
                >
                  <span className="text-base w-8 text-center">{lang.native}</span>
                  <span>{lang.label}</span>
                  {i18n.language === lang.code && <span className="ml-auto text-sky-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-[rgb(22,22,22)] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)] transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

      </div>
    </header>
  );
};

export default Navbar;