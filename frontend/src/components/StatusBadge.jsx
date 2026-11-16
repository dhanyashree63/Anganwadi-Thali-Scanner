import React from "react";

export function StatusBadge({ status }) {
  const map = {
    ADEQUATE: {
      label: "🟢 ADEQUATE",
      classes: "bg-emerald-100 text-emerald-800 border-emerald-300",
    },
    POTENTIAL_SHORTFALL: {
      label: "🟡 POTENTIAL SHORTFALL",
      classes: "bg-amber-100 text-amber-800 border-amber-300",
    },
    SIGNIFICANT_SHORTFALL: {
      label: "🔴 SIGNIFICANT SHORTFALL",
      classes: "bg-red-100 text-red-800 border-red-300",
    },
    QUALITY_REJECTED: {
      label: "⚠️ IMAGE QUALITY INSUFFICIENT",
      classes: "bg-slate-200 text-slate-800 border-slate-400",
    },
    PENDING_ANALYSIS: {
      label: "⏳ PENDING ANALYSIS",
      classes: "bg-blue-50 text-blue-800 border-blue-200",
    },
  };

  const info = map[status] || {
    label: status || "UNKNOWN",
    classes: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${info.classes}`}
    >
      {info.label}
    </span>
  );
}

export function ConfidenceBadge({ tier, pct }) {
  const map = {
    HIGH: "bg-emerald-50 text-emerald-800 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-800 border-amber-200",
    LOW: "bg-red-50 text-red-800 border-red-200",
  };
  const cls = map[tier] || "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span>Confidence: {tier || "N/A"}</span>
      {pct !== undefined && pct !== null && <span>({Number(pct).toFixed(1)}%)</span>}
    </span>
  );
}
