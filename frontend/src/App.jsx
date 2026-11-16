import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api, getStoredUser } from "./services/api";
import AppLayout from "./layouts/AppLayout";
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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const defaultHome =
    user.role === "OFFICER" || user.role === "ADMIN"
      ? "/officer-dashboard"
      : "/staff-dashboard";

  return (
    <BrowserRouter>
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
          <Route path="*" element={<Navigate to={defaultHome} replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
