import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";

export default function SchoolMonitoringPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("school_id") || "");
  const [includeDemo, setIncludeDemo] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSchools().then((list) => {
      setSchools(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(String(list[0].id));
      }
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    api
      .getSchoolStatistics(selectedId, includeDemo)
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId, includeDemo]);

  const handleSelectSchool = (idVal) => {
    setSelectedId(idVal);
    setSearchParams({ school_id: idVal });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            School &amp; Anganwadi Nutrition Monitoring
          </h1>
          <p className="text-sm text-slate-600">
            Detailed school-level calorie/protein averages, shortfall percentages, and longitudinal meal trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => handleSelectSchool(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            <span>Include Demo Meals</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Loading school nutrition statistics...
        </div>
      ) : stats ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {stats.school.name}
                </h2>
                <p className="text-xs text-slate-600">
                  Code: <strong>{stats.school.code}</strong> • District:{" "}
                  <strong>{stats.school.district}</strong> ({stats.school.block}) • Scheme:{" "}
                  <strong>{stats.school.scheme}</strong> • Age Group:{" "}
                  <strong>{stats.school.default_age_group}</strong>
                </p>
              </div>
              {stats.shortfall_pattern && (
                <div className="text-right">
                  <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                    Pattern: {stats.shortfall_pattern.pattern_type.replace("_", " ")}
                  </span>
                </div>
              )}
            </div>

            {stats.shortfall_pattern && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <strong>Monitoring Assessment:</strong> {stats.shortfall_pattern.recommendation}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] font-medium text-slate-500">Total Meals</div>
                <div className="text-xl font-bold text-slate-900">{stats.total_meals}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] font-medium text-slate-500">Avg Calories</div>
                <div className="text-xl font-bold text-slate-900">{stats.average_calories} kcal</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-[11px] font-medium text-slate-500">Avg Protein</div>
                <div className="text-xl font-bold text-slate-900">{stats.average_protein} g</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-[11px] font-semibold text-emerald-800">Adequate %</div>
                <div className="text-xl font-bold text-emerald-700">{stats.adequate_pct}%</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="text-[11px] font-semibold text-amber-800">Potential Shortfall %</div>
                <div className="text-xl font-bold text-amber-700">{stats.potential_shortfall_pct}%</div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                <div className="text-[11px] font-semibold text-red-800">Significant Shortfall %</div>
                <div className="text-xl font-bold text-red-700">{stats.significant_shortfall_pct}%</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <div className="text-[11px] font-semibold text-indigo-800">Verification Count</div>
                <div className="text-xl font-bold text-indigo-700">{stats.verification_count}</div>
              </div>
            </div>
          </div>

          {/* School Longitudinal Trend Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              School Calorie &amp; Protein Trends Over Time
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calories_likely"
                    name="Estimated Calories (kcal)"
                    stroke="#15803d"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="target_calories"
                    name="Calorie Target (kcal)"
                    stroke="#64748b"
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* School Meal History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                Analyzed Meals for {stats.school.name}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date / Meal</th>
                    <th className="px-4 py-3">Calories Range</th>
                    <th className="px-4 py-3">Protein Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.trends.map((t) => (
                    <tr key={t.meal_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        #{t.meal_id} — {t.date} ({t.meal_type})
                      </td>
                      <td className="px-4 py-3">
                        {t.calories_low.toFixed(0)}–{t.calories_high.toFixed(0)} kcal (Target:{" "}
                        {t.target_calories} kcal)
                      </td>
                      <td className="px-4 py-3">
                        {t.protein_low.toFixed(1)}–{t.protein_high.toFixed(1)} g (Target:{" "}
                        {t.target_protein} g)
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {t.verification_status}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/meals/${t.meal_id}`}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          View Meal →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
