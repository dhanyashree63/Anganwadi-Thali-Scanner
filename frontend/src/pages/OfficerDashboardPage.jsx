import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "../services/api";
import ModelStateBanner from "../components/ModelStateBanner";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function OfficerDashboardPage({ activeModel }) {
  const [includeDemo, setIncludeDemo] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (demoFlag) => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, trRes] = await Promise.all([
        api.getDashboardSummary(demoFlag),
        api.getDashboardTrends(demoFlag),
      ]);
      setSummary(sumRes);
      setTrends(trRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(includeDemo);
  }, [includeDemo]);

  if (loading && !summary) {
    return (
      <div className="p-10 text-center text-sm text-slate-600">
        Loading District Nutrition Officer Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModelStateBanner modelInfo={summary?.active_model || activeModel} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            District Nutrition Officer Monitoring Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Monitor repeated nutritional shortfalls, statistical anomalies, confidence distributions, and verification queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            <span>Include Demo Records in Officer Statistics</span>
          </label>
          <Link
            to="/verification"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Review Verification Queue ({summary?.pending_verification_count || 0})
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 6 Summary Cards (Section 15) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Meals Analyzed</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">
            {summary?.total_meals_analyzed || 0}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-emerald-800">Adequate</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-700">
            {summary?.adequate_count || 0}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-amber-800">Potential Shortfalls</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">
            {summary?.potential_shortfalls_count || 0}
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-red-800">Significant Shortfalls</div>
          <div className="mt-1 text-2xl font-extrabold text-red-700">
            {summary?.significant_shortfalls_count || 0}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-indigo-800">Pending Verification</div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-700">
            {summary?.pending_verification_count || 0}
          </div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
          <div className="text-xs font-semibold text-orange-800">Low-Confidence Results</div>
          <div className="mt-1 text-2xl font-extrabold text-orange-700">
            {summary?.low_confidence_count || 0}
          </div>
        </div>
      </div>

      {/* Repeated Shortfalls & Pattern Classification Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Schools &amp; Centres Requiring Attention (Shortfall Pattern Analysis)
            </h2>
            <p className="text-xs text-slate-500">
              Distinguishes between a Single Anomaly, a Repeated Shortfall, and a Persistent Pattern across verified meals.
            </p>
          </div>
          <Link
            to="/schools-monitoring"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Open School Monitoring →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">School / Centre</th>
                <th className="px-4 py-3">District / Scheme</th>
                <th className="px-4 py-3">Analyzed Meals</th>
                <th className="px-4 py-3">Shortfalls (Verified)</th>
                <th className="px-4 py-3">Pattern Classification</th>
                <th className="px-4 py-3">Monitoring Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary?.school_patterns?.map((sp) => (
                <tr key={sp.school_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <Link
                      to={`/schools-monitoring?school_id=${sp.school_id}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {sp.school_name}
                    </Link>
                    <div className="text-xs font-normal text-slate-500">{sp.school_code}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{sp.district}</div>
                    <div className="font-medium">{sp.scheme}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{sp.total_meals}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">
                      {sp.shortfall_count} ({sp.shortfall_rate_pct}%)
                    </span>
                    <div className="text-xs text-slate-500">
                      Verified shortfalls: {sp.verified_shortfall_count}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        sp.pattern_type === "PERSISTENT_PATTERN"
                          ? "bg-red-100 text-red-800 border border-red-300"
                          : sp.pattern_type === "REPEATED_SHORTFALL"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : sp.pattern_type === "SINGLE_ANOMALY"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {sp.pattern_type.replace("_", " ")}
                    </span>
                    {sp.flag_for_inspection && (
                      <div className="mt-1 text-[11px] font-bold text-red-700">
                        🔍 Flagged for Officer Field Review
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-md">
                    {sp.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistical & Scikit-learn Anomaly Detection Section */}
      {summary?.anomalies?.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-amber-950">
              ⚠️ Statistical &amp; IsolationForest Anomaly Alerts
            </h2>
            <span className="rounded bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              Anomaly detected. Review recommended.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {summary.anomalies.map((anom) => (
              <div
                key={anom.meal_id}
                className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>{anom.banner_message}</span>
                    <span>{anom.meal_date}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {anom.school_name} — Meal #{anom.meal_id} ({anom.meal_type})
                  </div>
                  <ul className="mt-2 list-disc pl-4 text-xs text-slate-700 space-y-1">
                    {anom.anomaly_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <span>
                    Est: <strong>{anom.calories_likely} kcal</strong> /{" "}
                    <strong>{anom.protein_likely}g protein</strong>
                  </span>
                  <Link
                    to={`/meals/${anom.meal_id}`}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    Inspect Meal →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Recharts Visualizations Required by Section 15 */}
      {trends && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Calorie Trends */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              1. Daily Calorie Trends vs Configured Norm (kcal)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg_calories"
                    name="Estimated Calories (kcal)"
                    stroke="#15803d"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="target_calories"
                    name="Norm Target (kcal)"
                    stroke="#64748b"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Protein Trends */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              2. Daily Protein Trends vs Configured Norm (g)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg_protein"
                    name="Estimated Protein (g)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="target_protein"
                    name="Norm Target (g)"
                    stroke="#64748b"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Shortfall Status Trends */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              3. Daily Meal Status &amp; Shortfall Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="adequate" name="Adequate" fill="#16a34a" stackId="a" />
                  <Bar
                    dataKey="potential_shortfall"
                    name="Potential Shortfall"
                    fill="#d97706"
                    stackId="a"
                  />
                  <Bar
                    dataKey="significant_shortfall"
                    name="Significant Shortfall"
                    fill="#dc2626"
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. School Comparison */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              4. School / Centre Average Calories Comparison
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.school_comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="school_name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_calories" name="Avg Calories (kcal)" fill="#0f766e" />
                  <Bar dataKey="shortfall_rate_pct" name="Shortfall Rate (%)" fill="#e11d48" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. Meal-Type Comparison */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              5. Meal-Type Comparison (Calories &amp; Protein)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.meal_type_comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="meal_type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_calories" name="Avg Calories" fill="#2563eb" />
                  <Bar dataKey="avg_protein" name="Avg Protein (g)" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Confidence Tier Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              6. AI Overall Confidence Tier Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.confidence_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Meal Count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
