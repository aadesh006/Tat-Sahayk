import { useState } from "react";
import SideBar from "./SideBar.jsx";
import Navbar from "./Navbar.jsx";
import LocationPrompt from "./LocationPrompt.jsx";
import useAuthUser from "../hooks/useAuthUser.js";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const { authUser } = useAuthUser();

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
          onClose={() => setShowLocationPrompt(false)} 
        />
      )}
    </div>
  );
};

export default Layout;