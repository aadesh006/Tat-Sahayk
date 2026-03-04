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
import { Loader2 } from 'lucide-react';

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);
  const isAdmin = authUser?.role === "admin";

  if (isLoading) return (
    <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  const Protected = ({ children }) =>
    isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;

  const AdminOnly = ({ children }) =>
    isAuthenticated && isAdmin ? <Layout>{children}</Layout> : <Navigate to="/" />;

  return (
    <div className="h-screen">
      <Routes>
        <Route path="/"      element={<Protected><HomePage /></Protected>} />
        <Route path="/map"   element={<Protected><MapPage /></Protected>} />
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