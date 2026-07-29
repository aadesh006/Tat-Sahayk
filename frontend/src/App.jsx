import { lazy, Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import Layout from "./components/Layout.jsx";
import useAuthUser from "./hooks/useAuthUser.js";

const AdminDashboard = lazy(
  () => import("./pages/AdminDashboard.jsx")
);

const AlertsPage = lazy(
  () => import("./pages/AlertsPage.jsx")
);

const CreateReport = lazy(
  () => import("./pages/CreateReport.jsx")
);

const HomePage = lazy(
  () => import("./pages/HomePage.jsx")
);

const LoginPage = lazy(
  () => import("./pages/LoginPage.jsx")
);

const MapPage = lazy(
  () => import("./pages/MapPage.jsx")
);

const ProfilePage = lazy(
  () => import("./pages/ProfilePage.jsx")
);

const SignupPage = lazy(
  () => import("./pages/SignupPage.jsx")
);

const RouteLoadingScreen = () => (
  <div className="h-full min-h-64 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-black">
    <Loader2
      className="animate-spin text-sky-500"
      size={36}
    />

    <p className="text-sm text-gray-500 dark:text-gray-400">
      Loading page…
    </p>
  </div>
);

const ProtectedRoute = ({
  isAuthenticated,
  children,
}) => {
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute = ({
  isAuthenticated,
  isAdmin,
  children,
}) => {
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Layout>{children}</Layout>;
};

const PublicLayout = ({ children }) => (
  <Layout>{children}</Layout>
);

const App = () => {
  const {
    isLoading,
    authUser,
  } = useAuthUser();

  const isAuthenticated = Boolean(authUser);
  const isAdmin = authUser?.role === "admin";
  const queryClient = useQueryClient();

  useEffect(() => {
    // Establish WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname === "localhost" ? "localhost:5001" : window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/api/v1/ws`);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "new_report" || message.type === "report_verified") {
          queryClient.invalidateQueries({ queryKey: ["reports"] });
          queryClient.invalidateQueries({ queryKey: ["adminReports"] });
          queryClient.invalidateQueries({ queryKey: ["allAdminReports"] });
          queryClient.invalidateQueries({ queryKey: ["reportStats"] });
          queryClient.invalidateQueries({ queryKey: ["aiClusters"] });
          queryClient.invalidateQueries({ queryKey: ["map-data"] });
        } else if (message.type === "new_alert") {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
          queryClient.invalidateQueries({ queryKey: ["myAlerts"] });
        } else if (message.type === "new_social_post") {
          queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center">
        <Loader2
          className="animate-spin text-sky-500"
          size={40}
        />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 6000,
          className: "",
          style: {
            padding: "16px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow:
              "0 8px 24px rgba(0, 0, 0, 0.2)",
            maxWidth: "500px",
            minWidth: "320px",
            background: "white",
            color: "#1f2937",
          },
          success: {
            duration: 4000,
            icon: "✓",
            style: {
              background: "white",
              color: "#1f2937",
              borderLeft:
                "4px solid #10b981",
              boxShadow:
                "0 8px 24px rgba(16, 185, 129, 0.2)",
            },
          },
          error: {
            duration: 8000,
            icon: "✕",
            style: {
              background: "white",
              color: "#1f2937",
              borderLeft:
                "4px solid #ef4444",
              boxShadow:
                "0 8px 24px rgba(239, 68, 68, 0.2)",
            },
          },
          loading: {
            duration: Infinity,
            icon: "⏳",
            style: {
              background: "white",
              color: "#1f2937",
              borderLeft:
                "4px solid #3b82f6",
              boxShadow:
                "0 8px 24px rgba(59, 130, 246, 0.2)",
            },
          },
        }}
        containerStyle={{
          top: 80,
          zIndex: 99999,
        }}
      />

      <Suspense fallback={<RouteLoadingScreen />}>
        <Routes>
          <Route
            path="/"
            element={(
              <PublicLayout>
                <HomePage />
              </PublicLayout>
            )}
          />

          <Route
            path="/map"
            element={(
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
              >
                <MapPage />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/alerts"
            element={(
              <PublicLayout>
                <AlertsPage />
              </PublicLayout>
            )}
          />

          <Route
            path="/profile"
            element={(
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
              >
                <ProfilePage />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/new"
            element={(
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
              >
                <CreateReport />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/admin"
            element={(
              <AdminRoute
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
              >
                <AdminDashboard />
              </AdminRoute>
            )}
          />

          <Route
            path="/login"
            element={(
              isAuthenticated
                ? (
                  <Navigate
                    to="/"
                    replace
                  />
                )
                : <LoginPage />
            )}
          />

          <Route
            path="/signup"
            element={(
              isAuthenticated
                ? (
                  <Navigate
                    to="/"
                    replace
                  />
                )
                : <SignupPage />
            )}
          />

          <Route
            path="*"
            element={(
              <Navigate
                to="/"
                replace
              />
            )}
          />
        </Routes>
      </Suspense>
    </div>
  );
};

export default App;