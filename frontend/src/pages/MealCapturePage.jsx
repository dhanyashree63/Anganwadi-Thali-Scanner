import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import ModelStateBanner from "../components/ModelStateBanner";
import ImageQualityFeedback from "../components/ImageQualityFeedback";

const ANALYSIS_STAGES = [
  "Image uploaded",
  "Quality check (blur, brightness, framing)",
  "Marker detection & pixel-to-cm scale",
  "Detecting food items per compartment",
  "Estimating portions with residual ranges",
  "Calculating nutrition (IFCT / School Recipe)",
  "Comparing with configurable norms",
];

export default function MealCapturePage({ user, activeModel }) {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [mealDate, setMealDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState("LUNCH");
  const [scheme, setScheme] = useState("PM POSHAN");
  const [ageGroup, setAgeGroup] = useState("6-10 years (Primary)");
  const [childrenServed, setChildrenServed] = useState(90);
  const [notes, setNotes] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [demoPreset, setDemoPreset] = useState("adequate");
  const [captureMode, setCaptureMode] = useState("upload"); // "upload" or "demo"

  const [qualityCheck, setQualityCheck] = useState(null);
  const [checkingQuality, setCheckingQuality] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSchools().then((list) => {
      setSchools(list);
      if (list.length > 0) {
        const defaultSchool =
          list.find((s) => s.id === user?.school_id) || list[0];
        setSchoolId(defaultSchool.id);
        setScheme(defaultSchool.scheme);
        setAgeGroup(defaultSchool.default_age_group);
      }
    }).catch((err) => setError(err.message));
  }, [user]);

  const handleSchoolChange = (idVal) => {
    setSchoolId(idVal);
    const found = schools.find((s) => String(s.id) === String(idVal));
    if (found) {
      setScheme(found.scheme);
      setAgeGroup(found.default_age_group);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setQualityCheck(null);

    // Run real backend quality check immediately upon selection
    setCheckingQuality(true);
    try {
      const qc = await api.checkImageQuality(file);
      setQualityCheck(qc);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingQuality(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setQualityCheck(null);
  };

  const handleRunAnalysis = async (e) => {
    e.preventDefault();
    setError("");

    if (!schoolId) {
      setError("Please select a school or Anganwadi centre.");
      return;
    }
    if (captureMode === "upload" && !selectedFile) {
      setError("Please upload a meal tray photo or switch to Demo Meal Preset mode.");
      return;
    }

    setAnalyzing(true);
    setCurrentStageIdx(0);

    // Step through visual progress indicators while backend runs real pipeline
    const stageTimer = setInterval(() => {
      setCurrentStageIdx((prev) =>
        prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev
      );
    }, 320);

    try {
      const createdMeal = await api.createMeal({
        school_id: Number(schoolId),
        meal_date: mealDate,
        meal_type: mealType,
        scheme,
        age_group: ageGroup,
        children_served: Number(childrenServed),
        notes: notes || undefined,
        is_demo: captureMode === "demo",
      });

      const fd = new FormData();
      if (captureMode === "upload" && selectedFile) {
        fd.append("image", selectedFile);
      } else {
        fd.append("demo_preset", demoPreset);
      }

      const analyzedMeal = await api.analyzeMeal(createdMeal.id, fd);
      setCurrentStageIdx(ANALYSIS_STAGES.length - 1);

      setTimeout(() => {
        clearInterval(stageTimer);
        setAnalyzing(false);
        navigate(`/meals/${analyzedMeal.id}`);
      }, 450);
    } catch (err) {
      clearInterval(stageTimer);
      setAnalyzing(false);
      setError(err.message || "AI meal analysis failed.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ModelStateBanner
        modelInfo={activeModel}
        mealIsDemo={captureMode === "demo"}
      />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Meal Capture &amp; AI Nutrition Analysis
        </h1>
        <p className="text-sm text-slate-600">
          Photograph a served school/Anganwadi meal on the standardized 5-compartment tray.
        </p>
      </div>

      {/* Mandatory Framing Instruction Banner (Section 7.3) */}
      <div className="rounded-xl border-2 border-cyan-600 bg-cyan-50 px-4 py-3 text-cyan-950 shadow-sm">
        <div className="flex items-center gap-2.5 font-bold text-sm">
          <span className="inline-block h-4 w-4 rounded bg-cyan-500 border border-white shadow-sm" />
          <span>
            Place the standardized reference marker inside the camera frame before capturing the meal.
          </span>
        </div>
        <p className="mt-1 text-xs text-cyan-800">
          Ensure top-down framing with good overhead lighting and minimal shadow across all 5 tray compartments.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {error}
        </div>
      )}

      {/* Analysis Progress Screen (Section 7.4) */}
      {analyzing && (
        <div
          data-testid="analysis-progress-screen"
          className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Running End-to-End AI Nutrition Pipeline...
            </h3>
            <span className="text-xs font-semibold text-emerald-700">
              Stage {currentStageIdx + 1} of {ANALYSIS_STAGES.length}
            </span>
          </div>

          <div className="w-full rounded-full bg-slate-100 h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{
                width: `${((currentStageIdx + 1) / ANALYSIS_STAGES.length) * 100}%`,
              }}
            />
          </div>

          <ul className="space-y-2 text-xs">
            {ANALYSIS_STAGES.map((stageLabel, idx) => {
              const done = idx < currentStageIdx;
              const current = idx === currentStageIdx;
              return (
                <li
                  key={stageLabel}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    current
                      ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200"
                      : done
                      ? "text-emerald-700 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  <span>{done ? "✓" : current ? "⚙️" : "○"}</span>
                  <span>{stageLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleRunAnalysis}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {/* Meal Metadata Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              School / Anganwadi Centre
            </label>
            <select
              value={schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Meal Date
            </label>
            <input
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="LUNCH">Mid-Day Hot Cooked Lunch (LUNCH)</option>
              <option value="BREAKFAST">Morning Breakfast (BREAKFAST)</option>
              <option value="SNACK">Supplementary Snack (SNACK)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Scheme &amp; Age Group Norm
            </label>
            <select
              value={ageGroup}
              onChange={(e) => {
                const val = e.target.value;
                setAgeGroup(val);
                if (val.includes("Anganwadi")) setScheme("ICDS Anganwadi");
                else setScheme("PM POSHAN");
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="6-10 years (Primary)">
                PM POSHAN — 6-10 years (Primary: 450 kcal, 12g protein)
              </option>
              <option value="11-14 years (Upper Primary)">
                PM POSHAN — 11-14 years (Upper Primary: 700 kcal, 20g protein)
              </option>
              <option value="3-6 years (Anganwadi)">
                ICDS Anganwadi — 3-6 years (350 kcal, 10g protein)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Children Served
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              value={childrenServed}
              onChange={(e) => setChildrenServed(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Optional Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Served with seasonal banana / kitchen batch #1"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Image Source Toggle: Upload Local Image vs Select Demo Meal */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCaptureMode("upload")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                captureMode === "upload"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              📷 Upload / Capture Tray Photo
            </button>
            <button
              type="button"
              onClick={() => setCaptureMode("demo")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                captureMode === "demo"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
              }`}
            >
              🧪 Select Demo Meal Preset (Instant Local Demo)
            </button>
          </div>

          {captureMode === "upload" ? (
            <div className="space-y-4">
              {!previewUrl ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 px-6 text-center hover:border-emerald-600 hover:bg-emerald-50/30">
                  <span className="text-3xl">📸</span>
                  <span className="mt-2 text-sm font-semibold text-slate-800">
                    Click to select or capture standardized tray photo
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Supports JPG, PNG, WEBP. Automatically checks marker scale, sharpness &amp; lighting.
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
                    <img
                      src={previewUrl}
                      alt="Selected meal tray preview"
                      className="mx-auto max-h-80 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">
                      File: <strong>{selectedFile?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}

              {checkingQuality && (
                <div className="text-xs font-medium text-slate-600">
                  Running real-time image quality &amp; marker geometry check...
                </div>
              )}
              <ImageQualityFeedback qualityCheck={qualityCheck} />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 space-y-3">
              <div className="text-xs font-bold uppercase text-amber-900">
                Select Standardized Tray Demo Scenario
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  {
                    id: "adequate",
                    title: "🟢 Demo Meal 1: Adequate Full Serving",
                    desc: "Full 5-compartment serving with visible 3cm cyan marker (~480 kcal).",
                  },
                  {
                    id: "potential_shortfall",
                    title: "🟡 Demo Meal 2: Potential Shortfall (Range Overlap)",
                    desc: "Moderate serving whose uncertainty range straddles the 450 kcal norm.",
                  },
                  {
                    id: "significant_shortfall",
                    title: "🔴 Demo Meal 3: Significant Shortfall",
                    desc: "Under-filled compartments (<340 kcal); triggers officer verification task.",
                  },
                  {
                    id: "no_marker",
                    title: "⚠️ Demo Meal 4: Missing Reference Marker (Quality Reject)",
                    desc: "Demonstrates quality gate rejection with 'Marker not visible' retake guidance.",
                  },
                  {
                    id: "too_dark",
                    title: "🌑 Demo Meal 5: Too Dark / Low Light (Quality Reject)",
                    desc: "Demonstrates quality gate rejection with 'Too dark' retake guidance.",
                  },
                ].map((preset) => (
                  <label
                    key={preset.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition ${
                      demoPreset === preset.id
                        ? "border-amber-600 bg-white font-semibold shadow-sm"
                        : "border-amber-200 bg-amber-50/40 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoPreset"
                      value={preset.id}
                      checked={demoPreset === preset.id}
                      onChange={(e) => setDemoPreset(e.target.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-slate-900 font-bold">{preset.title}</div>
                      <div className="text-slate-600 mt-0.5 font-normal">{preset.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="submit"
            disabled={analyzing}
            className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {analyzing ? "Running AI Pipeline..." : "🔍 Analyze Meal Nutrition"}
          </button>
        </div>
      </form>
    </div>
  );
}
