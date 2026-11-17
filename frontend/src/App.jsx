import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { api, getStoredUser } from "./services/api";
import AppLayout from "./layouts/AppLayout";
import ThemeToggle from "./components/ThemeToggle";
import LoginPage from "./pages/LoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";
import MealCapturePage from "./pages/MealCapturePage";
import MealResultPage from "./pages/MealResultPage";
import OfficerDashboardPage from "./pages/OfficerDashboardPage";
import SchoolMonitoringPage from "./pages/SchoolMonitoringPage";
import VerificationPage from "./pages/VerificationPage";
import AuditLogPage from "./pages/AuditLogPage";
import DataCollectionPage from "./pages/DataCollectionPage";
import ModelPerformancePage from "./pages/ModelPerformancePage";
import AdminManagementPage from "./pages/AdminManagementPage";
import ThaliSharePage from "./pages/ThaliSharePage";

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [activeModel, setActiveModel] = useState(null);

  const refreshActiveModel = () => {
    if (user) {
      api
        .getActiveModel()
        .then((info) => setActiveModel(info))
        .catch(() => {});
    }
  };

  useEffect(() => {
    refreshActiveModel();
  }, [user]);

  if (!user) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route
            path="/thalishare"
            element={
              <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    ← Back to Login
                  </Link>
                  <ThemeToggle />
                </div>
                <ThaliSharePage user={null} />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  const defaultHome =
    user.role === "OFFICER" || user.role === "ADMIN"
      ? "/officer-dashboard"
      : "/staff-dashboard";

  return (
    <HashRouter>
      <AppLayout user={user} setUser={setUser} activeModel={activeModel}>
        <Routes>
          <Route
            path="/staff-dashboard"
            element={<StaffDashboardPage user={user} activeModel={activeModel} />}
          />
          <Route
            path="/capture"
            element={<MealCapturePage user={user} activeModel={activeModel} />}
          />
          <Route
            path="/meals/:mealId"
            element={<MealResultPage user={user} activeModel={activeModel} />}
          />
          <Route
            path="/officer-dashboard"
            element={<OfficerDashboardPage activeModel={activeModel} />}
          />
          <Route
            path="/schools-monitoring"
            element={<SchoolMonitoringPage />}
          />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/audit-logs" element={<AuditLogPage />} />
          <Route
            path="/data-collection"
            element={<DataCollectionPage user={user} />}
          />
          <Route
            path="/model-performance"
            element={
              <ModelPerformancePage
                user={user}
                refreshActiveModel={refreshActiveModel}
              />
            }
          />
          <Route path="/admin" element={<AdminManagementPage />} />
          <Route
            path="/thalishare"
            element={<ThaliSharePage user={user} />}
          />
          <Route path="*" element={<Navigate to={defaultHome} replace />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  );
}
