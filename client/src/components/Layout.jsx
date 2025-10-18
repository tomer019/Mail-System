
import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { SearchProvider } from "../context/SearchContext";
import { Outlet } from "react-router-dom";
import "../App.css";

const Layout = () => {
  return (
    <SearchProvider>
      <div className="app-layout">
        {/* Top navigation bar */}
        <Topbar />
        
        {/* Main content area below topbar */}
        <div className="main-layout">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content */}
          <div className="main-content">
            <div className="route-scroll">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </SearchProvider>
  );
};

export default Layout;