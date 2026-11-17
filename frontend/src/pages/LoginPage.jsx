import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setStoredAuth } from "../services/api";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("staff@thalicheck.gov.in");
  const [password, setPassword] = useState("Staff@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setStoredAuth(res.access_token, res.user);
      setUser(res.user);

      if (res.user.role === "OFFICER") {
        navigate("/officer-dashboard");
      } else if (res.user.role === "ADMIN") {
        navigate("/officer-dashboard");
      } else {
        navigate("/staff-dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const fillRole = (rEmail, rPass) => {
    setEmail(rEmail);
    setPassword(rPass);
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-extrabold text-white shadow-md">
          TC
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          ThaliCheck
        </h1>
        <p className="mt-1 text-center text-sm text-slate-600">
          AI-Assisted School &amp; Anganwadi Meal Nutrition Monitoring System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white py-8 px-6 shadow-sm sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-800"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                placeholder="staff@thalicheck.gov.in"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to ThaliCheck"}
            </button>
          </form>

          {/* Local Demo Role Switcher */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              Quick Demo Role Credentials (Local Seeded Accounts):
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillRole("staff@thalicheck.gov.in", "Staff@123")}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300"
              >
                Meal Staff
              </button>
              <button
                type="button"
                onClick={() => fillRole("officer@thalicheck.gov.in", "Officer@123")}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300"
              >
                District Officer
              </button>
              <button
                type="button"
                onClick={() => fillRole("admin@thalicheck.gov.in", "Admin@123")}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300"
              >
                System Admin
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed">
            <strong>Notice:</strong> AI nutrition outputs are statistical estimates with uncertainty ranges intended for monitoring and early warning, not clinical or administrative enforcement.
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 text-center">
            <Link
              to="/thalishare"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition"
            >
              <span>🤝 ThaliShare – Community Contributions Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
