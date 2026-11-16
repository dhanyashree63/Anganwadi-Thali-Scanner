import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "../services/api";

/**
 * Model Performance Page (Section 17 & Section 20)
 * HONESTY RULE:
 * Reads strictly from `GET /model/metrics` (`ai_models/reports/metrics.json`).
 * If no evaluation exists, shows: "No trained model evaluated yet."
 * Never invents or hard-codes an accuracy number.
 */
export default function ModelPerformancePage({ user, refreshActiveModel }) {
  const [metricsRes, setMetricsRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [jobMessage, setJobMessage] = useState("");
  const [error, setError] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getModelMetrics();
      setMetricsRes(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleTrainAndEvaluate = async () => {
    setRunningJob(true);
    setError("");
    setJobMessage("Running PyTorch train.py (session-based split + temperature scaling)...");
    try {
      await api.triggerTraining(4, true, true);
      setJobMessage("Running evaluate.py on held-out TEST split...");
      await api.triggerEvaluation(true);
      setJobMessage("Completed PyTorch training and held-out test split evaluation.");
      await loadMetrics();
      if (refreshActiveModel) refreshActiveModel();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningJob(false);
    }
  };

  const handleEvaluateOnly = async () => {
    setRunningJob(true);
    setError("");
    setJobMessage("Running evaluate.py on held-out TEST split...");
    try {
      await api.triggerEvaluation(true);
      setJobMessage("Evaluation completed and written to ai_models/reports/metrics.json.");
      await loadMetrics();
      if (refreshActiveModel) refreshActiveModel();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningJob(false);
    }
  };

  const m = metricsRes?.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Model Performance &amp; Honest Evaluation Report
          </h1>
          <p className="text-sm text-slate-600">
            All metrics are read directly from <code>ai_models/reports/metrics.json</code> evaluated strictly on the held-out session test split.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "ADMIN" && (
            <button
              onClick={handleTrainAndEvaluate}
              disabled={runningJob}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {runningJob
                ? "Running Pipeline..."
                : "⚙️ Train & Evaluate PyTorch Model"}
            </button>
          )}
          <button
            onClick={handleEvaluateOnly}
            disabled={runningJob}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            🔄 Re-run Held-Out Test Evaluation
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {jobMessage && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {jobMessage}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">
          Reading evaluation report...
        </div>
      ) : !metricsRes?.evaluated || !m ? (
        <div
          data-testid="no-model-evaluated"
          className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center space-y-3"
        >
          <div className="text-lg font-bold text-slate-800">
            No trained model evaluated yet.
          </div>
          <p className="mx-auto max-w-xl text-xs text-slate-600 leading-relaxed">
            In compliance with ThaliCheck&apos;s honesty rules, no simulated or hard-coded accuracy numbers are shown when <code>ai_models/reports/metrics.json</code> does not exist. Click <strong>&ldquo;Train &amp; Evaluate PyTorch Model&rdquo;</strong> above (or run <code>python ai_models/train.py</code> and <code>python ai_models/evaluate.py</code>) to generate real evaluation metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Smoke-Test vs Real Model Banner */}
          {m.smoke_test_only && (
            <div className="rounded-xl border-2 border-orange-400 bg-orange-50 p-4 text-orange-950">
              <div className="font-bold text-sm">
                ⚠️ SMOKE-TEST MODEL: not a real food model
              </div>
              <p className="mt-1 text-xs text-orange-900">
                These metrics were computed by running <code>train.py</code> and <code>evaluate.py</code> on the synthetic colored-shape smoke dataset (<code>smoke_test_only = true</code>). They verify pipeline integrity only and must never be cited as real-world school meal accuracy.
              </p>
            </div>
          )}

          {/* Top Summary & Prominent False-Reassurance Safety Metric */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border-2 border-red-300 bg-red-50/70 p-4 shadow-sm">
              <div className="text-xs font-extrabold uppercase text-red-900">
                🚨 False-Reassurance Rate (Safety Metric)
              </div>
              <div
                data-testid="false-reassurance-rate"
                className="mt-1 text-3xl font-extrabold text-red-700"
              >
                {(m.status_agreement.false_reassurance_rate * 100).toFixed(1)}%
              </div>
              <p className="mt-1 text-[11px] text-red-800">
                True shortfalls misclassified as ADEQUATE ({m.status_agreement.false_reassurance_count} /{" "}
                {m.status_agreement.total_true_shortfalls})
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Top-1 / Top-3 Accuracy</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {(m.classification.top1_accuracy * 100).toFixed(1)}%{" "}
                <span className="text-sm font-normal text-slate-500">
                  / {(m.classification.top3_accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Macro F1: {(m.classification.macro_f1 * 100).toFixed(1)}%
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Portion Estimation Error</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                MAE: {m.portion_estimation.overall.mae_grams} g
              </div>
              <div className="mt-1 text-xs text-slate-500">
                MAPE: {m.portion_estimation.overall.mape_pct}% | Coverage:{" "}
                {m.portion_estimation.overall.range_coverage_pct}%
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Calibration Error (ECE)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">
                {m.calibration.ece}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Low-Conf Flag Recall:{" "}
                {(m.calibration.low_confidence_flag_recall * 100).toFixed(0)}%
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">Model &amp; Test Split</div>
              <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                {m.model_version}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Test Images: <strong>{m.test_set_size}</strong> ({m.test_sessions_count} sessions)
              </div>
              <div className="text-[11px] text-slate-400">
                Hash: {m.dataset_hash}
              </div>
            </div>
          </div>

          {/* Charts: Per-Class F1 & Reliability Calibration Curve */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Per-Class Precision, Recall &amp; F1 Score (Held-Out Test Split)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.classification.per_class}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="food_class" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="precision" name="Precision" fill="#0284c7" />
                    <Bar dataKey="recall" name="Recall" fill="#16a34a" />
                    <Bar dataKey="f1_score" name="F1 Score" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Confidence Calibration Reliability Curve (ECE = {m.calibration.ece})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.calibration.reliability_table}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin_label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="empirical_accuracy"
                      name="Empirical Accuracy"
                      stroke="#15803d"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="mean_confidence"
                      name="Mean Predicted Confidence"
                      stroke="#64748b"
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Portion Estimation Error Chart & Confusion Matrix Heatmap Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Per-Food Portion Error (MAE g &amp; MAPE %)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.portion_estimation.per_food}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="food_class" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mae_grams" name="MAE (grams)" fill="#d97706" />
                    <Bar dataKey="mape_pct" name="MAPE (%)" fill="#0f766e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CSS Grid Confusion Matrix (No matplotlib) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Confusion Matrix Heatmap (Rows = True, Columns = Predicted)
              </h3>
              <table className="w-full text-center text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 border border-slate-200 bg-slate-50">True \ Pred</th>
                    {m.classes.map((c) => (
                      <th key={c} className="p-1.5 border border-slate-200 bg-slate-50 truncate max-w-[60px]">
                        {c.slice(0, 6)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.classification.confusion_matrix.map((row, rIdx) => (
                    <tr key={m.classes[rIdx]}>
                      <td className="p-1.5 border border-slate-200 bg-slate-50 font-bold text-left">
                        {m.classes[rIdx]}
                      </td>
                      {row.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const bg =
                          val === 0
                            ? "bg-white text-slate-300"
                            : isDiag
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-red-100 text-red-900 font-semibold";
                        return (
                          <td key={cIdx} className={`p-1.5 border border-slate-200 ${bg}`}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
