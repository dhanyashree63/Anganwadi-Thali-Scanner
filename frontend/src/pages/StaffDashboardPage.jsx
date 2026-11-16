import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import ModelStateBanner from "../components/ModelStateBanner";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function StaffDashboardPage({ user, activeModel }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMeals = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getMeals({ include_demo: true });
      setMeals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysMeals = meals.filter((m) => m.meal_date === todayStr || m.meal_date === "2026-11-15");
  const totalAnalyzed = meals.filter((m) => m.status !== "PENDING_ANALYSIS").length;
  const adequateCount = meals.filter((m) => m.status === "ADEQUATE").length;
  const potentialCount = meals.filter((m) => m.status === "POTENTIAL_SHORTFALL").length;
  const significantCount = meals.filter((m) => m.status === "SIGNIFICANT_SHORTFALL").length;
  const pendingVerifCount = meals.filter((m) => m.verification_status === "PENDING").length;

  return (
    <div className="space-y-6">
      <ModelStateBanner modelInfo={activeModel} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Meal Staff Monitoring Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Capture standardized compartment tray photos, review AI portion estimates, and track verification status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/data-collection"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + Collect Weighed Sample
          </Link>
          <Link
            to="/capture"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            📸 Capture &amp; Analyze Meal
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Summary Cards Required by Section 7.2 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Today&apos;s Meals</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{todaysMeals.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Meals Analyzed</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalAnalyzed}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800">Adequate</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{adequateCount}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-800">Potential Shortfalls</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{potentialCount}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-red-800">Significant Shortfalls</div>
          <div className="mt-1 text-2xl font-bold text-red-700">{significantCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Pending Verification</div>
          <div className="mt-1 text-2xl font-bold text-indigo-700">{pendingVerifCount}</div>
        </div>
      </div>

      {/* Recent Meals Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Recent Meal Submissions &amp; Nutrition Estimates
          </h2>
          <button
            onClick={loadMeals}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading meal records...
          </div>
        ) : meals.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No meals recorded yet. Click &ldquo;Capture &amp; Analyze Meal&rdquo; to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Meal ID / Date</th>
                  <th className="px-4 py-3">School / Centre</th>
                  <th className="px-4 py-3">Meal Type</th>
                  <th className="px-4 py-3">Estimated Calories</th>
                  <th className="px-4 py-3">Estimated Protein</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {meals.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>#{m.id} — {m.meal_date}</div>
                      {m.is_demo && (
                        <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          DEMO RECORD
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{m.school_name}</div>
                      <div className="text-xs text-slate-500">{m.age_group}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{m.meal_type}</td>
                    <td className="px-4 py-3">
                      {m.nutrition ? (
                        <div>
                          <span className="font-semibold">
                            {m.nutrition.total_calories_low.toFixed(0)}–{m.nutrition.total_calories_high.toFixed(0)} kcal
                          </span>
                          <div className="text-xs text-slate-500">
                            Target: {m.nutrition.target_calories.toFixed(0)} kcal
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not analyzed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.nutrition ? (
                        <div>
                          <span className="font-semibold">
                            {m.nutrition.total_protein_low.toFixed(1)}–{m.nutrition.total_protein_high.toFixed(1)} g
                          </span>
                          <div className="text-xs text-slate-500">
                            Target: {m.nutrition.target_protein.toFixed(1)} g
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge
                        tier={m.overall_confidence_tier}
                        pct={m.overall_confidence_pct}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                      {m.verification_status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/meals/${m.id}`}
                        className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        View Result
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
