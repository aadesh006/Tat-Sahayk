import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./i18n/index.js";
import "./index.css";
import App from "./App.jsx";

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "122233319245-p0goes7q96dtltp1dof60vlb4uakr6dd.apps.googleusercontent.com";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);