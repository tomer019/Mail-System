// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import MailViewPage from "./pages/MailViewPage";
import { SendMailProvider } from "./context/SendMailContext";
import LabelPage from "./pages/LabelPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import DraftEditPage from "./pages/DraftEditPage";
import Layout from "./components/Layout";
import RequireAuth from "./RequireAuth"; // <-- add
import "./App.css";

import { useEffect, useState } from "react"; // Added earlier for theme boot – OK to keep
import { ThemeProvider } from "./theme/ThemeProvider"; // Added for Dark Mode: wrap app with provider
import { waitForServerReady } from "./utils/waitForServer"; // Added by Meir for initial loading screen

function App() {
  useEffect(() => {
    // Added for Dark Mode: apply saved theme ASAP on load (prevents flash)
    const saved = localStorage.getItem("theme") || "light"; // Added for Dark Mode
    document.documentElement.setAttribute("data-theme", saved); // Added for Dark Mode
  }, []); // Added for Dark Mode

  // server readiness state
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    waitForServerReady().then(ok => alive && setReady(ok));
    return () => { alive = false; };
  }, []);

  if (!ready) {
    return <div className="loading">Starting services…</div>;
  }

  return (
    <SendMailProvider>
      <ThemeProvider> {/* Added for Dark Mode: global theme context */}
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected area */}
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/label/:labelId" element={<LabelPage />} />
              <Route path="/mail/:id" element={<MailViewPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/draft/:id" element={<DraftEditPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider> {/* Added for Dark Mode */}
    </SendMailProvider>
  );
}

export default App;
