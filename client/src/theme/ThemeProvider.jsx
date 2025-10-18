// src/theme/ThemeProvider.jsx
// React provider for app-wide theme (light/dark) with Gmail-like styling
// Added for Dark Mode support WITHOUT touching existing business logic.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import "../styles/theme.css"; // Added for Dark Mode: load theme tokens & safe overrides

const ThemeContext = createContext({
  theme: "light",                 // Added for Dark Mode: current theme name
  setTheme: () => {},             // Added for Dark Mode: setter
  toggleTheme: () => {},          // Added for Dark Mode: convenience toggle
});

export const ThemeProvider = ({ children }) => {
  // Added for Dark Mode: read initial theme from localStorage (default: light)
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    // Added for Dark Mode: reflect theme on <html data-theme="...">
    document.documentElement.setAttribute("data-theme", theme);
    // Added for Dark Mode: persist selection across reloads
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    // Added for Dark Mode: switch between light/dark
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children /* No structural changes to your app, only context wrapper */}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); // Added for Dark Mode: consumer hook
