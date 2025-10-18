// Topbar.jsx - טופבר מחודש בסגנון Gmail

import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";
import { useSearch } from "../context/SearchContext";
import { useNavigate, Link } from "react-router-dom";

export default function Topbar() {
    const { setSearchQuery } = useSearch();
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Dark Mode state
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
    
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);
    
    const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

    const token = localStorage.getItem("token");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    console.error("Failed to fetch user");
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            }
        };

        if (token) fetchUser();
    }, [token]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && query.trim()) {
            const q = query.trim().toLowerCase();
            setSearchQuery(q);
            navigate(`/search?q=${encodeURIComponent(q)}`);
        }
    };

    const handleSearchChange = (e) => {
        setQuery(e.target.value);
    };

    return (
        <div className="topbar">
            <div className="topbar-left">
                <Link to="/label/inbox" className="topbar-logo">
                    📧 FooMail
                </Link>
                <input
                    type="text"
                    placeholder="Search mail"
                    value={query}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    className="search-bar"
                />
            </div>

            <div className="topbar-right">
                {/* Theme toggle button */}
                <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={theme === "light" ? "Enable dark theme" : "Disable dark theme"}
                    aria-label="Toggle theme"
                >
                    {theme === "light" ? "🌙" : "☀️"}
                </button>

                {/* User info */}
                <div className="user-info">
                    <span className="user-name">
                        {user?.firstName} {user?.lastName}
                    </span>
                    <img
                        src={
                            user?.profileImage?.startsWith("data:image")
                                ? user.profileImage
                                : user?.profileImage || "/user-svgrepo-com.svg"
                        }
                        alt="User avatar"
                        className="avatar"
                    />
                </div>

                {/* Logout button */}
                <LogoutButton />
            </div>
        </div>
    );
}