import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext.jsx";
import { Sun, Moon, Menu, ChevronDown, Phone, User, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser.js";
import { Link } from "react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { logout } from "../lib/api.js";

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
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [langOpen, setLangOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const langRef = useRef(null);
  const sosRef  = useRef(null);
  const userMenuRef = useRef(null);
  
  const isAdmin = authUser?.role === "admin";

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (sosRef.current  && !sosRef.current.contains(e.target))  setSosOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { mutate: logoutMutation, isPending: loggingOut } = useMutation({
    mutationFn: () => {
      logout();
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => toast.error("Failed to sign out"),
  });

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const helplines = [
    { name: "Police",          number: "100" },
    { name: "Medical",         number: "102" },
    { name: "Disaster",        number: "1077" },
    { name: "Disaster Mgmt.",  number: "108" },
    { name: "Coast Guard",     number: "1554" },
  ];

  const handleSOS = async () => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          
          // Create SOS message
          const sosMessage = `🚨 EMERGENCY SOS 🚨\n\nI need immediate help!\n\nMy Location: ${locationUrl}\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nPlease send rescue assistance immediately.`;
          
          // Try to send SMS to emergency services (if supported by device)
          // Note: SMS sending requires native app or specific permissions
          // For web, we'll copy to clipboard and dial 112
          
          try {
            // Copy SOS message to clipboard
            await navigator.clipboard.writeText(sosMessage);
            toast.success("SOS message copied to clipboard! Dialing 112...", { duration: 3000 });
          } catch (err) {
            console.error("Failed to copy to clipboard:", err);
          }
          
          // Dial emergency number
          window.location.href = "tel:112";
        },
        (error) => {
          console.error("Location error:", error);
          toast.error("Unable to get location. Dialing 112...");
          // Still dial 112 even if location fails
          window.location.href = "tel:112";
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      toast.error("Geolocation not supported. Dialing 112...");
      window.location.href = "tel:112";
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-black border-b border-gray-200 dark:border-[rgb(47,51,54)] flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 backdrop-blur-sm bg-white/80 dark:bg-black/80">

      {/* Left — hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[rgb(22,22,22)] rounded-full transition-colors"
        >
          <Menu size={20} className="text-gray-700 dark:text-gray-200" />
        </button>
        
        {/* Logo - visible on desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            तट-Sahayk
          </div>
          {isAdmin && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full border border-purple-200 dark:border-purple-500/20">
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 relative z-40">

        {/* SOS Button - Only for citizens, not admins */}
        {!isAdmin && (
          <button
            onClick={handleSOS}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Phone size={14} />
            <span className="hidden sm:inline">SOS 112</span>
          </button>
        )}

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
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-xl overflow-hidden z-[9999]">
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

        {/* User menu - only show if authenticated */}
        {authUser && (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[rgb(22,22,22)] hover:bg-gray-200 dark:hover:bg-[rgb(38,38,38)] rounded-full transition-colors"
            >
              {authUser.profile_photo ? (
                <img 
                  src={authUser.profile_photo} 
                  alt={authUser.full_name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                  {authUser.full_name?.charAt(0)}
                </div>
              )}
              <ChevronDown size={13} className={`text-gray-400 transition-transform hidden sm:block ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-2xl shadow-xl overflow-hidden z-[9999]">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[rgb(47,51,54)]">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {authUser.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{authUser.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-colors"
                  >
                    <User size={16} />
                    <span>{t("myProfile")}</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logoutMutation();
                    }}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    <span>{loggingOut ? "Signing out..." : t("signOut")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;