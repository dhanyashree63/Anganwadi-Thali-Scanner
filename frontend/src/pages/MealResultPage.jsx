import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import ModelStateBanner from "../components/ModelStateBanner";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";
import ImageQualityFeedback from "../components/ImageQualityFeedback";

export default function MealResultPage({ user, activeModel }) {
  const { mealId } = useParams();
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagMessage, setFlagMessage] = useState("");

  const loadMeal = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getMeal(mealId);
      setMeal(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeal();
  }, [mealId]);

  const handleMarkForVerification = async () => {
    setFlagging(true);
    setFlagMessage("");
    try {
      const updated = await api.flagMealForVerification(
        meal.id,
        "Staff requested manual officer review from Result Page"
      );
      setMeal(updated);
      setFlagMessage("Meal marked for human verification and queued for the District Nutrition Officer.");
    } catch (err) {
      setError(err.message);
    } finally {
      setFlagging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-slate-600">
        Loading meal analysis result...
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
        {error || "Meal record not found."}
      </div>
    );
  }

  const nr = meal.nutrition;
  const cb = meal.confidence_breakdown || {};

  return (
    <div className="space-y-6">
      <ModelStateBanner modelInfo={activeModel} mealIsDemo={meal.is_demo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Meal Analysis Result #{meal.id}
            </h1>
            {meal.is_demo && (
              <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                DEMO RECORD
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            {meal.school_name} ({meal.school_code}) • {meal.meal_date} •{" "}
            <strong>{meal.meal_type}</strong> • {meal.age_group}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/capture"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Analyze Another Meal
          </Link>
          {meal.verification_status !== "PENDING" &&
            meal.verification_status !== "VERIFIED" && (
              <button
                onClick={handleMarkForVerification}
                disabled={flagging}
                className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {flagging ? "Flagging..." : "🚩 Mark for Human Verification"}
              </button>
            )}
          {(user?.role === "OFFICER" || user?.role === "ADMIN") && (
            <Link
              to="/verification"
              className="rounded-lg bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
            >
              Open Officer Verification Queue
            </Link>
          )}
        </div>
      </div>

      {flagMessage && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          {flagMessage}
        </div>
      )}

      {/* Primary Status & Non-Enforcement Notice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={meal.status} />
            <ConfidenceBadge
              tier={meal.overall_confidence_tier}
              pct={meal.overall_confidence_pct}
            />
          </div>
          <div className="text-xs font-semibold text-slate-600">
            Verification Status:{" "}
            <span className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-800">
              {meal.verification_status}
            </span>
          </div>
        </div>

        <div
          data-testid="status-explanation"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800"
        >
          {meal.status_explanation}
          {nr?.range_straddles_threshold && (
            <div className="mt-1.5 text-xs font-bold text-amber-800">
              ⚠️ Note: Estimate range overlaps threshold — classified as POTENTIAL SHORTFALL for human review.
            </div>
          )}
        </div>

        {meal.requires_verification && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
            <strong>Verification Recommendation:</strong> Human verification recommended (
            {meal.verification_reason || "Flagged by confidence/shortfall rules"}).
          </div>
        )}
      </div>

      {/* Quality Check Details if Rejected or Available */}
      {meal.quality_check && !meal.quality_check.passed && (
        <ImageQualityFeedback qualityCheck={meal.quality_check} />
      )}

      {/* Calorie & Protein Range vs Target Cards */}
      {nr && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">
              Estimated Energy (Calories Range)
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">
              {nr.total_calories_low.toFixed(0)}–{nr.total_calories_high.toFixed(0)} kcal
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Likely estimate: <strong>{nr.total_calories_likely.toFixed(0)} kcal</strong> | Norm Target:{" "}
              <strong>{nr.target_calories.toFixed(0)} kcal</strong>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${
                  nr.total_calories_likely >= nr.target_calories * 0.95
                    ? "bg-emerald-600"
                    : nr.total_calories_likely >= nr.target_calories * 0.78
                    ? "bg-amber-500"
                    : "bg-red-600"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (nr.total_calories_likely / Math.max(1, nr.target_calories)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">
              Estimated Protein Range
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">
              {nr.total_protein_low.toFixed(1)}–{nr.total_protein_high.toFixed(1)} g
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Likely estimate: <strong>{nr.total_protein_likely.toFixed(1)} g</strong> | Norm Target:{" "}
              <strong>{nr.target_protein.toFixed(1)} g</strong>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${
                  nr.total_protein_likely >= nr.target_protein * 0.95
                    ? "bg-emerald-600"
                    : nr.total_protein_likely >= nr.target_protein * 0.78
                    ? "bg-amber-500"
                    : "bg-red-600"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (nr.total_protein_likely / Math.max(1, nr.target_protein)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">
              Overall Confidence Breakdown
            </div>
            <div className="mt-2 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Classification Tier:</span>
                <strong>{cb.classification_tier || "MEDIUM"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Image &amp; Marker Tier:</span>
                <strong>{cb.image_quality_tier || "HIGH"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Portion Calibration Tier:</span>
                <strong>{cb.portion_calibration_tier || "MEDIUM"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Nutrition Data Tier:</span>
                <strong>{cb.nutrition_data_tier || "MEDIUM"}</strong>
              </div>
              <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                Rule: Overall confidence never exceeds the weakest critical factor&apos;s tier.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detected Foods & Compartment Portion Table (Section 7.5) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Detected Tray Compartments, Portion Ranges &amp; Nutrition Mapping
          </h2>
          <p className="text-xs text-slate-500">
            Every portion is reported as an estimated range derived from scale calibration residuals.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Compartment</th>
                <th className="px-4 py-3">Detected Food</th>
                <th className="px-4 py-3">Estimated Portion Range</th>
                <th className="px-4 py-3">Calibrated Confidence</th>
                <th className="px-4 py-3">Calories Range</th>
                <th className="px-4 py-3">Protein Range</th>
                <th className="px-4 py-3">Data Quality Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {meal.detections?.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-600">
                    <div>{d.compartment_name}</div>
                    <div className="text-[11px] text-slate-400">
                      Fill: {(d.fill_fraction * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {d.detected_food_name}
                    {d.manually_corrected && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                        Corrected by Officer
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div>
                      Estimated portion: {d.estimated_grams_low.toFixed(0)}–{d.estimated_grams_high.toFixed(0)} g
                    </div>
                    <div className="text-xs text-slate-500">
                      Likely: {d.estimated_grams_likely.toFixed(0)} g
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                        d.is_low_confidence
                          ? "bg-red-100 text-red-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {(d.calibrated_confidence * 100).toFixed(1)}%
                    </span>
                    {d.is_low_confidence && (
                      <div className="mt-1 text-[11px] font-semibold text-red-700">
                        Low-confidence detection. Human verification recommended.
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {d.nutrition_missing ? (
                      <span className="font-semibold text-red-600">
                        Missing nutrition value (Excluded)
                      </span>
                    ) : (
                      <span>
                        {d.calories_low?.toFixed(0)}–{d.calories_high?.toFixed(0)} kcal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {d.nutrition_missing ? (
                      <span className="font-semibold text-red-600">Excluded</span>
                    ) : (
                      <span>
                        {d.protein_low?.toFixed(1)}–{d.protein_high?.toFixed(1)} g
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    {!d.nutrition_verified && !d.nutrition_missing && (
                      <span className="inline-block rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        unverified nutrition value
                      </span>
                    )}
                    {!d.is_portion_calibrated && (
                      <span className="inline-block rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        uncalibrated ({d.calibration_sample_count}/30 samples)
                      </span>
                    )}
                    {d.nutrition_missing && (
                      <span className="inline-block rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                        missing nutrition data
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview & Quality Metadata */}
      {meal.quality_check && meal.quality_check.passed && (
        <ImageQualityFeedback qualityCheck={meal.quality_check} />
      )}
    </div>
  );
}
