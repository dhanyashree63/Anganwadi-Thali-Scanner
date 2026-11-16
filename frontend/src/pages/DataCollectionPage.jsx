import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import ImageQualityFeedback from "../components/ImageQualityFeedback";

export default function DataCollectionPage({ user }) {
  const [progress, setProgress] = useState(null);
  const [foods, setFoods] = useState([]);
  const [sessionId, setSessionId] = useState(
    `sess_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_01`
  );
  const [lighting, setLighting] = useState("Indoor Natural");
  const [deviceModel, setDeviceModel] = useState("Android Smartphone Camera");
  const [photographer, setPhotographer] = useState(user?.email || "staff@thalicheck.gov.in");
  const [selectedFile, setSelectedFile] = useState(null);
  const [qualityCheck, setQualityCheck] = useState(null);

  const [compartments, setCompartments] = useState([
    { compartment_id: "comp_1", label: "Comp 1 (Top-Left Bowl)", food_class: "dal", weighed_grams: 120 },
    { compartment_id: "comp_2", label: "Comp 2 (Top-Center Bowl)", food_class: "vegetable_curry", weighed_grams: 100 },
    { compartment_id: "comp_3", label: "Comp 3 (Top-Right Bowl)", food_class: "curd", weighed_grams: 80 },
    { compartment_id: "comp_4", label: "Comp 4 (Main Well)", food_class: "rice", weighed_grams: 165 },
    { compartment_id: "comp_5", label: "Comp 5 (Flat Well)", food_class: "chapati", weighed_grams: 50 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [exportInfo, setExportInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProgress = async () => {
    try {
      const [progData, foodList] = await Promise.all([
        api.getDatasetProgress(),
        api.getFoods(),
      ]);
      setProgress(progData);
      setFoods(foodList);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError("");
    try {
      const qc = await api.checkImageQuality(file);
      setQualityCheck(qc);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateCompartment = (idx, field, val) => {
    setCompartments((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );
  };

  const handleSubmitSample = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a standardized tray photo to collect weighed samples.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("image", selectedFile);
      fd.append("session_id", sessionId);
      fd.append("lighting_condition", lighting);
      fd.append("device_model", deviceModel);
      fd.append("photographer", photographer);
      fd.append("compartments_json", JSON.stringify(compartments));

      const res = await api.submitDatasetSamples(fd);
      setQualityCheck(res.quality_check);
      setMessage(
        `Saved ${res.samples_created.length} weighed compartment crops to PostgreSQL and data/dataset/ for session ${res.session_id}.`
      );
      await loadProgress();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDataset = async () => {
    setError("");
    try {
      const res = await api.exportDataset();
      setExportInfo(res);
      setMessage(`Exported ${res.exported_rows} approved samples to ${res.labels_csv_path}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveCandidate = async (sampleId) => {
    try {
      await api.approveCandidateSample(sampleId);
      setMessage(`Approved candidate sample #${sampleId} for training dataset.`);
      await loadProgress();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Data Collection &amp; Dataset Progress Module
          </h1>
          <p className="text-sm text-slate-600">
            Collect real weighed ground-truth tray samples per compartment, track per-class readiness, and export to <code>data/dataset/labels.csv</code>.
          </p>
        </div>

        <button
          onClick={handleExportDataset}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
        >
          📦 Export Dataset to data/dataset/labels.csv
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      )}

      {/* Form to Collect Labeled, Weighed Samples (Section 16) */}
      <form
        onSubmit={handleSubmitSample}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <h2 className="text-base font-bold text-slate-900">
          1. Record Weighed Standardized Tray Session
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Session ID (Split Unit)
            </label>
            <input
              type="text"
              required
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Lighting Condition
            </label>
            <select
              value={lighting}
              onChange={(e) => setLighting(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="Indoor Natural">Indoor Natural Daylight</option>
              <option value="Overhead LED">Kitchen Overhead LED</option>
              <option value="Semi-Outdoor Verandah">Semi-Outdoor Verandah</option>
              <option value="Low Light">Dim / Overcast</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Device / Phone Model
            </label>
            <input
              type="text"
              required
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Photographer
            </label>
            <input
              type="text"
              required
              value={photographer}
              onChange={(e) => setPhotographer(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Standardized Tray Photograph
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-emerald-700"
          />
          <ImageQualityFeedback qualityCheck={qualityCheck} />
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase text-slate-700 mb-2">
            Per-Compartment Food Label &amp; Digital Scale Weight (Grams)
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {compartments.map((comp, idx) => (
              <div
                key={comp.compartment_id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="text-xs font-bold text-slate-800">{comp.label}</div>
                <div>
                  <label className="block text-[11px] text-slate-500">Food Class</label>
                  <select
                    value={comp.food_class}
                    onChange={(e) => updateCompartment(idx, "food_class", e.target.value)}
                    className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    {foods.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500">
                    Weighed Grams (g)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="1000"
                    value={comp.weighed_grams}
                    onChange={(e) =>
                      updateCompartment(idx, "weighed_grams", Number(e.target.value))
                    }
                    className="mt-0.5 block w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting
              ? "Validating & Saving Crops..."
              : "💾 Save Weighed Tray Samples to Dataset"}
          </button>
        </div>
      </form>

      {/* Dataset Progress Table (Section 16) */}
      {progress && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Dataset Readiness &amp; Calibration Sample Progress
              </h2>
              <p className="text-xs text-slate-500">
                Recommended minimum: <strong>{progress.recommended_min_images_per_class} images</strong> and{" "}
                <strong>{progress.recommended_min_calibration_samples} weighed scale samples</strong> per food class.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-700">
              Total Approved Samples: <strong>{progress.total_approved_samples}</strong> across{" "}
              <strong>{progress.total_unique_sessions}</strong> sessions
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Food Class</th>
                  <th className="px-4 py-3">Collected Images</th>
                  <th className="px-4 py-3">Unique Sessions</th>
                  <th className="px-4 py-3">Weighed Scale Samples</th>
                  <th className="px-4 py-3">Readiness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {progress.class_progress.map((cp) => (
                  <tr key={cp.food_code} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {cp.food_name} <span className="text-slate-400">({cp.food_code})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">
                        {cp.images_count} / {cp.recommended_min_images}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{cp.sessions_count} sessions</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">
                        {cp.calibration_samples_count} / {cp.recommended_min_calibration}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {cp.meets_image_minimum ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          ✓ Image Target Met
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                          Below 50-Image Min
                        </span>
                      )}
                      {cp.meets_calibration_minimum ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          ✓ Scale Calibrated (≥30)
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          Uncalibrated (&lt;30 weighed)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Training Samples from Officer Corrections */}
      {progress?.candidate_samples?.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-indigo-100 bg-indigo-50/50 px-6 py-4">
            <h2 className="text-base font-bold text-indigo-950">
              3. Candidate Training Samples from Officer Corrections (Needs Admin Review)
            </h2>
            <p className="text-xs text-indigo-800">
              Officer corrections are never auto-added to the training dataset without administrator approval.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID / Meal</th>
                  <th className="px-4 py-3">Corrected Food Class</th>
                  <th className="px-4 py-3">Corrected Grams</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {progress.candidate_samples.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">
                      Sample #{c.id} (Meal #{c.source_meal_id})
                    </td>
                    <td className="px-4 py-3 font-bold">{c.food_class}</td>
                    <td className="px-4 py-3">{c.weighed_grams} g</td>
                    <td className="px-4 py-3">{c.photographer}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user?.role === "ADMIN" ? (
                        <button
                          onClick={() => handleApproveCandidate(c.id)}
                          className="rounded-lg bg-emerald-700 px-3 py-1 font-bold text-white hover:bg-emerald-800"
                        >
                          Approve for Training
                        </button>
                      ) : (
                        <span className="text-slate-400">Admin approval required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
