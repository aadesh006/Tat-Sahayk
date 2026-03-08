import { useState, useEffect } from "react";
import SideBar from "./SideBar.jsx";
import Navbar from "./Navbar.jsx";
import LocationPrompt from "./LocationPrompt.jsx";
import useAuthUser from "../hooks/useAuthUser.js";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const { authUser } = useAuthUser();

  // Check if location prompt should be shown
  useEffect(() => {
    if (!authUser) {
      setShowLocationPrompt(false);
      return;
    }

    // Don't show for admins
    if (authUser.role === 'admin') {
      setShowLocationPrompt(false);
      return;
    }

    // Don't show if user already has location
    if (authUser.district && authUser.state) {
      setShowLocationPrompt(false);
      return;
    }

    // Check if user has dismissed the prompt in this session
    const dismissed = sessionStorage.getItem('locationPromptDismissed');
    if (dismissed === 'true') {
      setShowLocationPrompt(false);
      return;
    }

    // Show the prompt
    setShowLocationPrompt(true);
  }, [authUser]);

  const handleCloseLocationPrompt = () => {
    setShowLocationPrompt(false);
    // Remember dismissal for this session
    sessionStorage.setItem('locationPromptDismissed', 'true');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
      <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
      
      {/* Location prompt for citizens without location */}
      {showLocationPrompt && authUser && (
        <LocationPrompt 
          user={authUser} 
          onClose={handleCloseLocationPrompt} 
        />
      )}
    </div>
  );
};

export default Layout;