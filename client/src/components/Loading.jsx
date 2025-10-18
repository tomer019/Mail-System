import React from "react";
import { FaSpinner } from "react-icons/fa";
import "./Loading.css";

export default function Loading({ label = "Loading…" }) {
  return (
    <div role="status" aria-live="polite" className="loading-wrap">
      <FaSpinner className="loading-icon" aria-hidden="true" />
      <span className="loading-text">{label}</span>
    </div>
  );
}
