import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";

export default function VerificationPage() {
  const [meals, setMeals] = useState([]);
  const [foods, setFoods] = useState([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [action, setAction] = useState("VERIFY");
  const [detectionId, setDetectionId] = useState("");
  const [correctedFoodName, setCorrectedFoodName] = useState("Rice");
  const [correctedGrams, setCorrectedGrams] = useState("135");
  const [reason, setReason] = useState("Verified manually against kitchen serving weight");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadQueue = async (resolvedFlag) => {
    setLoading(true);
    setError("");
    try {
      const [queueData, foodList] = await Promise.all([
        api.getPendingVerifications(resolvedFlag),
        api.getFoods(),
      ]);
      setMeals(queueData);
      setFoods(foodList);
      if (queueData.length > 0 && !selectedMeal) {
        selectMealForAction(queueData[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(includeResolved);
  }, [includeResolved]);

  const selectMealForAction = (m) => {
    setSelectedMeal(m);
    setFeedback("");
    if (m.detections && m.detections.length > 0) {
      const firstDet = m.detections[0];
      setDetectionId(firstDet.id);
      setCorrectedFoodName(firstDet.detected_food_name);
      setCorrectedGrams(String(firstDet.estimated_grams_likely));
    }
  };

  const handleDetectionSelect = (detIdVal) => {
    setDetectionId(detIdVal);
    const det = selectedMeal?.detections?.find((d) => String(d.id) === String(detIdVal));
    if (det) {
      setCorrectedFoodName(det.detected_food_name);
      setCorrectedGrams(String(det.estimated_grams_likely));
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!selectedMeal) return;
    setSubmitting(true);
    setError("");
    setFeedback("");

    try {
      const payload = {
        action,
        reason,
        notes: notes || undefined,
        detection_id: detectionId ? Number(detectionId) : undefined,
        corrected_food_name: action === "CORRECT_FOOD" ? correctedFoodName : undefined,
        corrected_grams:
          action === "CORRECT_PORTION" || action === "CORRECT_FOOD"
            ? Number(correctedGrams)
            : undefined,
      };
      const updated = await api.submitVerificationAction(selectedMeal.id, payload);
      setSelectedMeal(updated);
      setFeedback(
        action === "CORRECT_FOOD" || action === "CORRECT_PORTION"
          ? `Verification saved to PostgreSQL & Audit Trail. Correction queued as a candidate training sample ("CANDIDATE_NEEDS_REVIEW") awaiting admin approval.`
          : `Verification action (${action}) recorded in PostgreSQL & Audit Trail.`
      );
      await loadQueue(includeResolved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Human Verification &amp; AI Correction Workbench
          </h1>
          <p className="text-sm text-slate-600">
            Review low-confidence detections and potential shortfalls. Officer corrections update nutrition records and generate candidate training samples.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => setIncludeResolved(e.target.checked)}
          />
          <span>Show Resolved Verifications</span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {feedback && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Queue List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Flagged Meals Queue ({meals.length})
          </div>
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Loading verification queue...
            </div>
          ) : meals.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No pending verification tasks in queue.
            </div>
          ) : (
            meals.map((m) => (
              <div
                key={m.id}
                onClick={() => selectMealForAction(m)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedMeal?.id === m.id
                    ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Meal #{m.id} • {m.meal_date}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {m.verification_status}
                  </span>
                </div>
                <div className="mt-1 font-bold text-sm text-slate-900">
                  {m.school_name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={m.status} />
                  <ConfidenceBadge
                    tier={m.overall_confidence_tier}
                    pct={m.overall_confidence_pct}
                  />
                </div>
                <p className="mt-2 text-xs text-amber-900 font-medium">
                  Reason: {m.verification_reason || "Flagged for human review"}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right Action Workbench */}
        <div className="lg:col-span-7">
          {selectedMeal ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Reviewing Meal #{selectedMeal.id} — {selectedMeal.school_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Date: {selectedMeal.meal_date} • Meal: {selectedMeal.meal_type} •{" "}
                    <Link
                      to={`/meals/${selectedMeal.id}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      Open Full Meal Result Page →
                    </Link>
                  </p>
                </div>
                <StatusBadge status={selectedMeal.status} />
              </div>

              {/* Compartment Detections Overview */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                  AI Compartment Detections &amp; Portion Ranges
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Compartment</th>
                        <th className="px-3 py-2">Food</th>
                        <th className="px-3 py-2">Estimated Portion</th>
                        <th className="px-3 py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedMeal.detections?.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-2">{d.compartment_name}</td>
                          <td className="px-3 py-2 font-bold">{d.detected_food_name}</td>
                          <td className="px-3 py-2">
                            {d.estimated_grams_low.toFixed(0)}–{d.estimated_grams_high.toFixed(0)} g (likely{" "}
                            {d.estimated_grams_likely.toFixed(0)} g)
                          </td>
                          <td className="px-3 py-2">
                            {(d.calibrated_confidence * 100).toFixed(0)}%
                            {d.is_low_confidence && (
                              <span className="ml-1 text-red-700 font-bold">(Low)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Officer Action Form */}
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                    Select Officer Verification Action
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { id: "VERIFY", label: "✅ Verify Result" },
                      { id: "CORRECT_FOOD", label: "🍲 Correct Food" },
                      { id: "CORRECT_PORTION", label: "⚖️ Correct Portion" },
                      { id: "REJECT", label: "🚫 Reject AI Result" },
                      { id: "ADD_NOTES", label: "📝 Add Notes" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setAction(btn.id)}
                        className={`rounded-lg border px-2.5 py-2 text-xs font-bold transition ${
                          action === btn.id
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(action === "CORRECT_FOOD" || action === "CORRECT_PORTION") && (
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Target Compartment
                      </label>
                      <select
                        value={detectionId}
                        onChange={(e) => handleDetectionSelect(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      >
                        {selectedMeal.detections?.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.compartment_name} ({d.detected_food_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {action === "CORRECT_FOOD" && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Corrected Food Item
                        </label>
                        <select
                          value={correctedFoodName}
                          onChange={(e) => setCorrectedFoodName(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        >
                          {foods.map((f) => (
                            <option key={f.id} value={f.name}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Verified Portion (grams)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="1000"
                        value={correctedGrams}
                        onChange={(e) => setCorrectedGrams(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Audit Reason (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700">
                    Officer Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional verification details or kitchen observations..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {submitting ? "Saving Verification..." : `Submit Verification (${action})`}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Select a meal from the queue on the left to inspect and verify.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
