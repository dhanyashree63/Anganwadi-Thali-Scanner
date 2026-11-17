import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clearStoredAuth } from "../services/api";

export default function AppLayout({ user, setUser, activeModel, children }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearStoredAuth();
    setUser(null);
    navigate("/login");
  };

  const role = user?.role || "STAFF";

  const navItems = [
    {
      to: "/staff-dashboard",
      label: "Staff Dashboard",
      roles: ["STAFF", "OFFICER", "ADMIN"],
    },
    {
      to: "/capture",
      label: "Meal Capture & Analyze",
      roles: ["STAFF", "ADMIN"],
    },
    {
      to: "/officer-dashboard",
      label: "Officer Dashboard",
      roles: ["OFFICER", "ADMIN"],
    },
    {
      to: "/schools-monitoring",
      label: "School Monitoring",
      roles: ["OFFICER", "ADMIN", "STAFF"],
    },
    {
      to: "/verification",
      label: "Human Verification",
      roles: ["OFFICER", "ADMIN"],
    },
    {
      to: "/data-collection",
      label: "Data Collection & Dataset",
      roles: ["STAFF", "OFFICER", "ADMIN"],
    },
    {
      to: "/model-performance",
      label: "Model Performance",
      roles: ["OFFICER", "ADMIN"],
    },
    {
      to: "/audit-logs",
      label: "Audit Trail",
      roles: ["OFFICER", "ADMIN"],
    },
    {
      to: "/admin",
      label: "Admin & Calibration",
      roles: ["ADMIN"],
    },
    {
      to: "/thalishare",
      label: "🤝 ThaliShare (Contribute)",
      roles: ["STAFF", "OFFICER", "ADMIN"],
    },
  ].filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Government / Institutional Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Toggle Menu"
            >
              ☰
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 font-bold text-white shadow-sm">
              TC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  ThaliCheck
                </span>
                <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 sm:inline-block">
                  Real-Accuracy Edition
                </span>
              </div>
              <p className="text-xs text-slate-500">
                School &amp; Anganwadi AI Meal Nutrition Early-Warning System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeModel && (
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeModel.model_state === "REAL_MODEL"
                      ? "bg-emerald-600"
                      : activeModel.model_state === "SMOKE_TEST_MODEL"
                      ? "bg-orange-500"
                      : "bg-amber-500"
                  }`}
                />
                <span>
                  {activeModel.model_state === "REAL_MODEL"
                    ? `Model: ${activeModel.version_tag}`
                    : activeModel.model_state === "SMOKE_TEST_MODEL"
                    ? "SMOKE-TEST MODEL"
                    : "DEMO MODE"}
                </span>
              </div>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800">
                {user?.full_name}
              </div>
              <div className="text-[11px] font-medium text-emerald-700">
                Role: {user?.role}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? "block" : "hidden"
          } w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block`}
        >
          <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation ({role})
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800">
              Non-Enforcement Safeguard
            </div>
            <p className="leading-relaxed">
              ThaliCheck reports estimated calorie &amp; protein ranges for monitoring and early warning. Human verification is required before administrative action.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>

      {/* Footer with Model Metadata */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div>
            <strong>ThaliCheck Local Full-Stack System</strong> — Estimates only; not a clinical or legal enforcement determination.
          </div>
          <div>
            {activeModel?.metrics?.classification?.top1_accuracy !== undefined ? (
              <span>
                Active Model: <strong>{activeModel.version_tag}</strong> | Test Set:{" "}
                <strong>{activeModel.metrics.test_set_size} imgs</strong> | Top-1 Acc:{" "}
                <strong>
                  {(activeModel.metrics.classification.top1_accuracy * 100).toFixed(1)}%
                </strong>{" "}
                | Evaluated:{" "}
                <strong>
                  {activeModel.metrics.evaluated_at
                    ? new Date(activeModel.metrics.evaluated_at).toLocaleDateString()
                    : "N/A"}
                </strong>
              </span>
            ) : (
              <span>
                Model Evaluation Status: <strong>No trained model evaluated yet.</strong>
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
