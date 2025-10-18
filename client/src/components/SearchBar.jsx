import React, { useState } from "react";

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
      <input
        type="text"
        placeholder="Search mail"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: "16px",
          borderRadius: "4px",
          border: "1px solid #ddd"
        }}
      />
    </div>
  );
};

export default SearchBar;
