// src/components/Topbar.jsx
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton";
import { useSearch } from "../context/SearchContext";
import { useNavigate } from "react-router-dom";
import "./Topbar.css";

export default function Topbar() {
    const { setSearchQuery } = useSearch();
    const [query, setQuery] = useState("");
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

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

    console.log("user in Topbar:", user);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && query.trim()) {
        //setSearchQuery(query.trim().toLowerCase());
        const q = query.trim().toLowerCase();
        setSearchQuery(q);
        navigate(`/search?q=${encodeURIComponent(q)}`);
        }
    };

    return (
        <div className="topbar">
        <div className="topbar-left">
            <input
            type="text"
            placeholder="Search mail"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="search-bar"
            />
        </div>

        <div className="topbar-right">
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
            <LogoutButton />
        </div>
        </div>
    );
}
