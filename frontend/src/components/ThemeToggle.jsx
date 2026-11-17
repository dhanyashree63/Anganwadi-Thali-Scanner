import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ showLabel = false, className = "" }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`group relative inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <span
            role="img"
            aria-label="Sun"
            className="text-amber-400 text-sm transition-transform duration-300 group-hover:rotate-45"
          >
            ☀️
          </span>
        ) : (
          <span
            role="img"
            aria-label="Moon"
            className="text-indigo-600 text-sm transition-transform duration-300 group-hover:-rotate-12"
          >
            🌙
          </span>
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
