import React, { useState } from "react";
import AnganwadiThaliScannerMotion from "./AnganwadiThaliScannerMotion";
import ThemeToggle from "./ThemeToggle";

export default function WelcomeHeroMotion({ onEnter, onSelectRole }) {
  const [isEntering, setIsEntering] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleEnterClick = (role = null) => {
    setIsEntering(true);
    if (dontShowAgain) {
      try {
        localStorage.setItem("thalicheck_skip_intro", "true");
      } catch {}
    }
    setTimeout(() => {
      if (role && onSelectRole) {
        onSelectRole(role);
      } else if (onEnter) {
        onEnter();
      }
    }, 450);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-8 transition-all duration-500 ${
        isEntering ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Top Header Bar */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white font-extrabold text-xl shadow-md">
            TC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                ThaliCheck
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Anganwadi Edition
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ICDS Anganwadi &amp; PM POSHAN School Meal Nutrition Monitoring System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleEnterClick("THALISHARE")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
          >
            🤝 ThaliShare Community
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Body with Motion Graphic and Entry Call-to-Action */}
      <main className="mx-auto my-auto flex w-full max-w-7xl flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 py-8">
        
        {/* Left Text & Mission Column */}
        <div className="flex-1 text-center lg:text-left space-y-5 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>AI-Assisted Child Nutrition Safeguard</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Nurturing Healthy Meals for{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Every Anganwadi Child
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            ThaliCheck combines standardized 5-compartment thali trays with real-time PyTorch vision intelligence. By checking image quality, detecting 3.0cm calibration scales, and estimating calorie and protein ranges, it delivers proactive early-warning insights to keep school meals nourishing and complete.
          </p>

          {/* Interactive "Click to Enter" Action Button */}
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={() => handleEnterClick()}
              className="group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-8 py-4 text-base font-bold text-white shadow-xl hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
            >
              <span className="absolute -inset-1 rounded-2xl bg-emerald-500/30 blur-md group-hover:blur-lg transition pointer-events-none" />
              
              <span className="relative z-10 flex items-center gap-2">
                <span>✨ Click to Enter ThaliCheck</span>
                <span className="text-lg transition-transform group-hover:translate-x-1.5">
                  →
                </span>
              </span>
            </button>

            {/* Quick Demo Role Entries */}
            <div className="pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Or jump directly to a role:
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => handleEnterClick("STAFF")}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 shadow-sm transition"
                >
                  👩‍🍳 Anganwadi Staff
                </button>
                <button
                  type="button"
                  onClick={() => handleEnterClick("OFFICER")}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 shadow-sm transition"
                >
                  📋 District Officer
                </button>
                <button
                  type="button"
                  onClick={() => handleEnterClick("ADMIN")}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 shadow-sm transition"
                >
                  ⚙️ System Admin
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Animated Anganwadi Thali Scanner Graphic */}
        <div className="flex-1 flex justify-center w-full max-w-md lg:max-w-xl">
          <AnganwadiThaliScannerMotion />
        </div>
      </main>

      {/* Footer Info & Skip Preference */}
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Don't show this intro automatically on future visits</span>
        </label>

        <div>
          PM POSHAN &amp; ICDS Anganwadi Nutrition Early-Warning Framework
        </div>
      </footer>
    </div>
  );
}
