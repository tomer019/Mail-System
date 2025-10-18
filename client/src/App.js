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

function App() {
  return (
    <SendMailProvider>
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
    </SendMailProvider>
  );
}

export default App;
