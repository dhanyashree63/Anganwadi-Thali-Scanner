import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setStoredAuth } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";
import AnganwadiThaliScannerMotion from "../components/AnganwadiThaliScannerMotion";
import WelcomeHeroMotion from "../components/WelcomeHeroMotion";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("staff@thalicheck.gov.in");
  const [password, setPassword] = useState("Staff@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Control initial welcome splash / motion
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem("thalicheck_skip_intro") !== "true";
    } catch {
      return true;
    }
  });

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

  const handleRoleSelectFromWelcome = (role) => {
    setShowWelcome(false);
    if (role === "STAFF") {
      fillRole("staff@thalicheck.gov.in", "Staff@123");
    } else if (role === "OFFICER") {
      fillRole("officer@thalicheck.gov.in", "Officer@123");
    } else if (role === "ADMIN") {
      fillRole("admin@thalicheck.gov.in", "Admin@123");
    } else if (role === "THALISHARE") {
      navigate("/thalishare");
    }
  };

  return (
    <>
      {/* Full-screen Opening Motion & Splash Screen */}
      {showWelcome && (
        <WelcomeHeroMotion
          onEnter={() => setShowWelcome(false)}
          onSelectRole={handleRoleSelectFromWelcome}
        />
      )}

      {/* Main Authentication & Scanner Showcase Page */}
      <div className="relative min-h-screen flex flex-col justify-between bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Top Navbar */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between pb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-lg font-extrabold text-white shadow-md">
              TC
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                ThaliCheck
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Anganwadi &amp; School Nutrition AI Scanner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowWelcome(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Replay opening intro animation"
            >
              <span>🎬 Intro Motion</span>
            </button>
            <Link
              to="/thalishare"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              🤝 ThaliShare
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Area: Split layout with Animated Anganwadi Scanner + Login Card */}
        <main className="mx-auto my-auto flex w-full max-w-6xl flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 py-4">
          
          {/* Left Column: Animated Anganwadi Scanner Showcase */}
          <div className="flex-1 w-full max-w-lg text-center lg:text-left space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Real-Time Compartment Nutrition Scanner</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              AI Monitoring for{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                Nutritious Anganwadi Meals
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Standardized 5-compartment tray vision pipeline with 3.0cm calibration marker detection, calorie and protein range estimation, and instant early warnings.
            </p>

            {/* Embedded Live Motion Graphic */}
            <div className="py-2">
              <AnganwadiThaliScannerMotion compact={false} />
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="w-full max-w-md shrink-0">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-7 px-6 shadow-xl sm:px-8">
              
              <div className="mb-5 text-center">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Official Portal Sign In
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter authorized school staff or officer credentials
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-xs font-medium text-red-800 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Official Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white shadow-sm focus:border-emerald-600 focus:outline-none"
                    placeholder="staff@thalicheck.gov.in"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white shadow-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition"
                >
                  {loading ? "Authenticating..." : "Sign In to ThaliCheck"}
                </button>
              </form>

              {/* Local Demo Role Switcher */}
              <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Quick Demo Role Credentials:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fillRole("staff@thalicheck.gov.in", "Staff@123")}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-slate-700 transition"
                  >
                    👩‍🍳 Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRole("officer@thalicheck.gov.in", "Officer@123")}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-slate-700 transition"
                  >
                    📋 Officer
                  </button>
                  <button
                    type="button"
                    onClick={() => fillRole("admin@thalicheck.gov.in", "Admin@123")}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-slate-700 transition"
                  >
                    ⚙️ Admin
                  </button>
                </div>
              </div>

              {/* ThaliShare Community Button */}
              <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3.5 text-center">
                <Link
                  to="/thalishare"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 transition"
                >
                  <span>🤝 ThaliShare – Community Contributions</span>
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mx-auto flex w-full max-w-7xl items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            ThaliCheck Anganwadi &amp; PM POSHAN Meal Nutrition Monitoring System
          </div>
          <div>
            AI outputs are statistical estimates with confidence ranges.
          </div>
        </footer>
      </div>
    </>
  );
}
