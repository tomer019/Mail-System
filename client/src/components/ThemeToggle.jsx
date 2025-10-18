// src/components/ThemeToggle.jsx
// Small, self-contained toggle control for Dark Mode (Gmail-like).
// Added for Dark Mode: use with the existing Topbar without changing its logic.

import React from "react";
import { useTheme } from "../theme/ThemeProvider";

const ThemeToggle = ({
  className = "theme-toggle",                               // Added for Dark Mode: optional class hook
  titleOn = "Disable dark theme",                           // Added for Dark Mode: a11y title
  titleOff = "Enable dark theme",                           // Added for Dark Mode: a11y title
}) => {
  const { theme, toggleTheme } = useTheme();                // Added for Dark Mode: consume provider

  return (
    <button
      type="button"
      onClick={toggleTheme}                                  /* Added for Dark Mode: toggle handler */
      className={className}                                  /* Added for Dark Mode */
      title={theme === "dark" ? titleOn : titleOff}          /* Added for Dark Mode */
      aria-label="Toggle theme"                              /* Added for Dark Mode */
      style={{
        /* Inline minimal styling to avoid forcing CSS refactors.
           You can move these rules to Topbar.css if you prefer. */
        background: "var(--btn-secondary-bg)",
        border: "1px solid var(--btn-secondary-border)",
        color: "var(--text)",
        width: 36,
        height: 32,
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
      }}
    >
      {theme === "dark" ? "☀️" : "🌙" /* Added for Dark Mode: Gmail-like icon */}
    </button>
  );
};

export default ThemeToggle;
