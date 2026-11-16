import React from "react";

/**
 * Plain-language Image-Quality Feedback component with actionable retake guidance:
 * "Move closer", "Marker not visible", "Too dark", "Image blurry", "Tray tilted too much"
 */
export default function ImageQualityFeedback({ qualityCheck }) {
  if (!qualityCheck) return null;

  const {
    passed,
    quality_score,
    blur_variance,
    brightness_mean,
    marker_visible,
    px_per_cm,
    tray_coverage_ratio,
    tilt_degrees,
    issues = [],
    retake_guidance,
  } = qualityCheck;

  return (
    <div
      data-testid="image-quality-feedback"
      className={`mt-4 rounded-xl border p-4 ${
        passed
          ? "border-emerald-300 bg-emerald-50/70 text-emerald-950"
          : "border-red-300 bg-red-50 text-red-950"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold">
          {passed
            ? "✅ Image Quality Check Passed"
            : "❌ Image Quality Insufficient — Retake Required"}
        </h4>
        <span className="rounded bg-white/90 px-2.5 py-0.5 text-xs font-semibold shadow-sm">
          Quality Score: {(Number(quality_score || 0) * 100).toFixed(0)}%
        </span>
      </div>

      {!passed && issues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {issues.map((issue, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
            >
              ⚠️ {issue}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs leading-relaxed font-medium">
        {retake_guidance}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-2.5 text-xs sm:grid-cols-5">
        <div>
          <span className="text-slate-600 block">Reference Marker</span>
          <strong className={marker_visible ? "text-emerald-700" : "text-red-700"}>
            {marker_visible ? `Detected (${px_per_cm || 20} px/cm)` : "Marker not visible"}
          </strong>
        </div>
        <div>
          <span className="text-slate-600 block">Sharpness (Laplacian)</span>
          <strong>{Number(blur_variance || 0).toFixed(1)}</strong>
        </div>
        <div>
          <span className="text-slate-600 block">Brightness</span>
          <strong>{Number(brightness_mean || 0).toFixed(0)} / 255</strong>
        </div>
        <div>
          <span className="text-slate-600 block">Tray Coverage</span>
          <strong>{(Number(tray_coverage_ratio || 0) * 100).toFixed(0)}%</strong>
        </div>
        <div>
          <span className="text-slate-600 block">Perspective Tilt</span>
          <strong>{Number(tilt_degrees || 0).toFixed(1)}°</strong>
        </div>
      </div>
    </div>
  );
}
