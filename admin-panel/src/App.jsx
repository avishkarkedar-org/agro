import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SystemHealth from "./pages/SystemHealth";
import Posts from "./pages/Posts";
import YoutubeSettings from "./pages/YoutubeSettings";
import Announcement from "./pages/Announcement";
import FuelPrices from "./pages/FuelPrices";
import Visitors from "./pages/Visitors";
import ManageAdmins from "./pages/ManageAdmins";
import MandiPricesAdmin from "./pages/MandiPricesAdmin";
import TractorRentalsAdmin from "./pages/TractorRentalsAdmin";
import PremiumFeatures from "./pages/PremiumFeatures";
import AuditRestore from "./pages/AuditRestore";
import DangerZone from "./pages/DangerZone";
import BlockedIPs from "./pages/BlockedIPs";
import ChatLogs from "./pages/ChatLogs";
import AccessCodes from "./pages/AccessCodes";
import AdvancedSettings from "./pages/AdvancedSettings";
import FeatureToggles from "./pages/FeatureToggles";

// New Pages imported for React Migration
import Scans from "./pages/Scans";
import Users from "./pages/Users";
import Messaging from "./pages/Messaging";
import Export from "./pages/Export";
import Backup from "./pages/Backup";
import FeatureUsage from "./pages/FeatureUsage";
import ErrorRate from "./pages/ErrorRate";
import FeatureAccess from "./pages/FeatureAccess";
import FeatureOrder from "./pages/FeatureOrder";
import AiUsage from "./pages/AiUsage";
import LoginLog from "./pages/LoginLog";
import Tasks from "./pages/Tasks";
import News from "./pages/News";
import ChangePassword from "./pages/ChangePassword";

// Phase 3 Pages
import SessionManagement from "./pages/SessionManagement";
import SecurityPolicies from "./pages/SecurityPolicies";
import MaintenanceScheduler from "./pages/MaintenanceScheduler";
import RateLimits from "./pages/RateLimits";
import BanEngine from "./pages/BanEngine";
import BugReports from "./pages/BugReports";
import MetricsHeatmap from "./pages/MetricsHeatmap";

import { api } from "./utils/api";
import ToastHost from "./components/ToastHost";
import ConfirmHost from "./components/ConfirmHost";

const Layout = ({ children, setIsAuth, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="dash show">
      <Topbar
        setIsAuth={setIsAuth}
        user={user}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="dash-body">
        <div
          className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
          onClick={() => setSidebarOpen(false)}
        ></div>
        <Sidebar
          isOpen={sidebarOpen}
          role={user?.role}
          permissions={user?.permissions}
        />
        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      api("/api/admin/me")
        .then((res) => {
          if (res.username) {
            setUser(res);
            setIsAuth(true);
          }
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading)
    return (
      <div className="login-page">
        <div className="loading-center">
          <span className="spinner spinner-lg"></span>Loading...
        </div>
      </div>
    );

  return (
    <>
      <ToastHost />
      <ConfirmHost />
      <BrowserRouter>
      {isAuth ? (
        <Layout setIsAuth={setIsAuth} user={user}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/health" element={<SystemHealth />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/youtube" element={<YoutubeSettings />} />
            <Route path="/announcement" element={<Announcement />} />
            <Route path="/mandi" element={<MandiPricesAdmin />} />
            <Route path="/rentals" element={<TractorRentalsAdmin />} />
            <Route path="/fuel" element={<FuelPrices />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/admins" element={<ManageAdmins user={user} />} />
            <Route path="/premium" element={<PremiumFeatures />} />
            <Route path="/audit" element={<AuditRestore />} />
            <Route path="/danger" element={<DangerZone />} />
            <Route path="/blocked-ips" element={<BlockedIPs />} />
            <Route path="/chat-logs" element={<ChatLogs />} />
            <Route path="/access-codes" element={<AccessCodes />} />
            <Route path="/advanced-settings" element={<AdvancedSettings />} />
            <Route path="/feature-toggles" element={<FeatureToggles />} />

            {/* New routes registered */}
            <Route path="/scans" element={<Scans />} />
            <Route path="/users" element={<Users />} />
            <Route path="/messaging" element={<Messaging />} />
            <Route path="/export" element={<Export />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/feature-usage" element={<FeatureUsage />} />
            <Route path="/error-rate" element={<ErrorRate />} />
            <Route path="/feature-access" element={<FeatureAccess />} />
            <Route path="/feature-order" element={<FeatureOrder />} />
            <Route path="/ai-usage" element={<AiUsage />} />
            <Route path="/login-log" element={<LoginLog />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/news" element={<News />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Phase 3 New Routes */}
            <Route path="/sessions" element={<SessionManagement />} />
            <Route path="/policies" element={<SecurityPolicies />} />
            <Route path="/maintenance" element={<MaintenanceScheduler />} />
            <Route path="/rate-limits" element={<RateLimits />} />
            <Route path="/bans" element={<BanEngine />} />
            <Route path="/bugs" element={<BugReports />} />
            <Route path="/heatmap" element={<MetricsHeatmap />} />

            <Route
              path="*"
              element={
                <div className="empty-state">
                  <p>Page Not Found</p>
                </div>
              }
            />
          </Routes>
        </Layout>
      ) : (
        <Routes>
          <Route
            path="*"
            element={<Login setIsAuth={setIsAuth} setUser={setUser} />}
          />
        </Routes>
      )}
    </BrowserRouter>
    </>
  );
}
