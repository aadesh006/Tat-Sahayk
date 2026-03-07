import { Routes, Route, Navigate } from "react-router";
import useAuthUser from './hooks/useAuthUser.js';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MapPage from './pages/MapPage.jsx';
import CreateReport from './pages/CreateReport.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import { Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);
  const isAdmin = authUser?.role === "admin";

  // Show loading screen while checking authentication
  if (isLoading) return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-sky-500" size={40} />
    </div>
  );

  const Protected = ({ children }) =>
    isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;

  const AdminOnly = ({ children }) =>
    isAuthenticated && isAdmin ? <Layout>{children}</Layout> : <Navigate to="/" />;
  
  const PublicOrProtected = ({ children }) =>
    <Layout>{children}</Layout>; // Always show, but features may be limited

  return (
    <div className="h-screen">
      {/* Global Toast Configuration */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 6000, // Increased to 6 seconds
          className: '',
          style: {
            padding: '16px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            maxWidth: '500px',
            minWidth: '320px',
            background: 'white',
            color: '#1f2937',
          },
          success: {
            duration: 4000,
            icon: '✓',
            style: {
              background: 'white',
              color: '#1f2937',
              borderLeft: '4px solid #10b981',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
            },
          },
          error: {
            duration: 8000, // Increased to 8 seconds for errors
            icon: '✕',
            style: {
              background: 'white',
              color: '#1f2937',
              borderLeft: '4px solid #ef4444',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
            },
          },
          loading: {
            duration: Infinity, // Loading toasts stay until dismissed
            icon: '⏳',
            style: {
              background: 'white',
              color: '#1f2937',
              borderLeft: '4px solid #3b82f6',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)',
            },
          },
        }}
        containerStyle={{
          top: 80,
          zIndex: 99999,
        }}
      />
      
      <Routes>
        <Route path="/"      element={<PublicOrProtected><HomePage /></PublicOrProtected>} />
        <Route path="/map"   element={<Protected><MapPage /></Protected>} />
        <Route path="/alerts" element={<PublicOrProtected><AlertsPage /></PublicOrProtected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="/new"   element={<Protected><CreateReport /></Protected>} />
        <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
        <Route path="/login"  element={!isAuthenticated ? <LoginPage />  : <Navigate to="/" />} />
        <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;