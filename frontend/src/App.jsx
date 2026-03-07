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