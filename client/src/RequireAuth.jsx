import { Navigate, useLocation } from "react-router-dom";

function readToken() {
    const t = localStorage.getItem("token") || "";
    return t.trim();
}

function isExpired(jwt) {
    // Decode exp from JWT payload; return true if expired
    try {
        const payload = JSON.parse(
            atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        if (!payload || !payload.exp) return false; // no exp -> treat as non-expiring
        const nowSec = Math.floor(Date.now() / 1000);
        return nowSec >= Number(payload.exp);
    } catch {
        return true; // invalid token -> treat as expired
    }
}

export default function RequireAuth({ children }) {
    const location = useLocation();
    const token = readToken();

    if (!token || isExpired(token)) {
        // No/expired token -> go to login and keep return path
        return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />;
    }
    return children;
}
