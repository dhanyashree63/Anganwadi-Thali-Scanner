import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState("foods");
  const [foods, setFoods] = useState([]);
  const [norms, setNorms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [trayConfig, setTrayConfig] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // New Food Form
  const [newFood, setNewFood] = useState({
    code: "",
    name: "",
    category: "Grains & Staples",
    calories_per_100g: 120,
    protein_per_100g: 4.0,
    density_g_per_ml: 0.85,
    source: "IFCT 2017",
    verified: false,
  });

  // New Norm Form
  const [newNorm, setNewNorm] = useState({
    scheme: "PM POSHAN",
    age_group: "6-10 years (Primary)",
    meal_type: "LUNCH",
    calorie_target: 450,
    protein_target: 12,
    tolerance_pct: 10,
    severe_shortfall_pct: 22,
    description: "Configured PM POSHAN norm",
  });

  // New School Form
  const [newSchool, setNewSchool] = useState({
    code: "",
    name: "",
    center_type: "PRIMARY_SCHOOL",
    district: "Bengaluru Urban",
    block: "North Block",
    scheme: "PM POSHAN",
    default_age_group: "6-10 years (Primary)",
    enrolled_children: 130,
  });

  // New User Form
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "STAFF",
  });

  const loadAll = async () => {
    try {
      const [fList, nList, sList, uList, cList, tCfg] = await Promise.all([
        api.getFoods(),
        api.getNorms(),
        api.getSchools(),
        api.getUsers(),
        api.getCalibrations(),
        api.getTrayConfig(),
      ]);
      setFoods(fList);
      setNorms(nList);
      setSchools(sList);
      setUsers(uList);
      setCalibrations(cList);
      setTrayConfig(tCfg);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleVerifyFood = async (food) => {
    setError("");
    setMessage("");
    try {
      await api.updateFood(food.id, { verified: !food.verified });
      setMessage(
        `Updated verification status for ${food.name} to ${!food.verified ? "VERIFIED" : "UNVERIFIED"}.`
      );
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddFood = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createFood({
        ...newFood,
        calories_per_100g: Number(newFood.calories_per_100g),
        protein_per_100g: Number(newFood.protein_per_100g),
        density_g_per_ml: Number(newFood.density_g_per_ml),
      });
      setMessage(`Added food item "${newFood.name}" to PostgreSQL nutrition table.`);
      setNewFood({ ...newFood, code: "", name: "" });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveNorm = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.saveNorm({
        ...newNorm,
        calorie_target: Number(newNorm.calorie_target),
        protein_target: Number(newNorm.protein_target),
        tolerance_pct: Number(newNorm.tolerance_pct),
        severe_shortfall_pct: Number(newNorm.severe_shortfall_pct),
      });
      setMessage("Saved configurable nutritional norm.");
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createSchool({
        ...newSchool,
        enrolled_children: Number(newSchool.enrolled_children),
      });
      setMessage(`Created school "${newSchool.name}".`);
      setNewSchool({ ...newSchool, code: "", name: "" });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.registerUser(newUser);
      setMessage(`Created user account ${newUser.email} (${newUser.role}).`);
      setNewUser({ email: "", full_name: "", password: "", role: "STAFF" });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFitCalibrations = async () => {
    setError("");
    try {
      const res = await api.fitCalibrations();
      setMessage(`Fitted scale regression calibration models for ${res.fitted_models.length} foods.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          System Administration, Nutrition Database &amp; Scale Calibration
        </h1>
        <p className="text-sm text-slate-600">
          Configure IFCT 2017 nutrition values, food densities, nutritional norms, standardized tray geometry, and user accounts.
        </p>
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

      {/* Admin Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "foods", label: "🍲 Foods, Densities & IFCT Verification" },
          { id: "norms", label: "📏 Configurable Nutritional Norms" },
          { id: "calibration", label: "⚖️ Tray Config & Scale Calibration" },
          { id: "schools", label: "🏫 Schools & Anganwadi Centres" },
          { id: "users", label: "👥 User Accounts & Roles" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FOODS & DENSITIES */}
      {activeTab === "foods" && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddFood}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-900">
              Add New Food Item to Nutrition Database
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <input
                type="text"
                placeholder="Code (e.g. khichdi)"
                required
                value={newFood.code}
                onChange={(e) => setNewFood({ ...newFood, code: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                placeholder="Display Name"
                required
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Calories / 100g"
                required
                value={newFood.calories_per_100g}
                onChange={(e) =>
                  setNewFood({ ...newFood, calories_per_100g: e.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Protein / 100g"
                required
                value={newFood.protein_per_100g}
                onChange={(e) =>
                  setNewFood({ ...newFood, protein_per_100g: e.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Density (g/ml)"
                required
                value={newFood.density_g_per_ml}
                onChange={(e) =>
                  setNewFood({ ...newFood, density_g_per_ml: e.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                + Add Food
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Food Name</th>
                    <th className="px-4 py-3">Calories / 100g</th>
                    <th className="px-4 py-3">Protein / 100g</th>
                    <th className="px-4 py-3">Density (g/ml)</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Verification Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {foods.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {f.name} <span className="text-slate-400">({f.code})</span>
                      </td>
                      <td className="px-4 py-3">
                        {f.calories_per_100g !== null ? `${f.calories_per_100g} kcal` : "Missing"}
                      </td>
                      <td className="px-4 py-3">
                        {f.protein_per_100g !== null ? `${f.protein_per_100g} g` : "Missing"}
                      </td>
                      <td className="px-4 py-3 font-mono">{f.density_g_per_ml} g/ml</td>
                      <td className="px-4 py-3">{f.source}</td>
                      <td className="px-4 py-3">
                        {f.verified ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            ✓ Verified IFCT/Recipe
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                            unverified nutrition value
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleVerifyFood(f)}
                          className="rounded border border-slate-300 px-2.5 py-1 font-semibold hover:bg-slate-100"
                        >
                          {f.verified ? "Mark Unverified" : "Verify Value"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NORMS */}
      {activeTab === "norms" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveNorm}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-900">
              Configure / Update Nutritional Norm Threshold
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <input
                type="text"
                value={newNorm.scheme}
                onChange={(e) => setNewNorm({ ...newNorm, scheme: e.target.value })}
                placeholder="Scheme"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={newNorm.age_group}
                onChange={(e) => setNewNorm({ ...newNorm, age_group: e.target.value })}
                placeholder="Age Group"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <select
                value={newNorm.meal_type}
                onChange={(e) => setNewNorm({ ...newNorm, meal_type: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              >
                <option value="LUNCH">LUNCH</option>
                <option value="BREAKFAST">BREAKFAST</option>
                <option value="SNACK">SNACK</option>
              </select>
              <input
                type="number"
                value={newNorm.calorie_target}
                onChange={(e) =>
                  setNewNorm({ ...newNorm, calorie_target: e.target.value })
                }
                placeholder="Calorie Target"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.5"
                value={newNorm.protein_target}
                onChange={(e) =>
                  setNewNorm({ ...newNorm, protein_target: e.target.value })
                }
                placeholder="Protein Target (g)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white"
              >
                Save Norm
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Scheme</th>
                  <th className="px-4 py-3">Age Group</th>
                  <th className="px-4 py-3">Meal Type</th>
                  <th className="px-4 py-3">Calorie Target</th>
                  <th className="px-4 py-3">Protein Target</th>
                  <th className="px-4 py-3">Tolerance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {norms.map((n) => (
                  <tr key={n.id}>
                    <td className="px-4 py-3 font-bold">{n.scheme}</td>
                    <td className="px-4 py-3">{n.age_group}</td>
                    <td className="px-4 py-3">{n.meal_type}</td>
                    <td className="px-4 py-3 font-bold">{n.calorie_target} kcal</td>
                    <td className="px-4 py-3 font-bold">{n.protein_target} g</td>
                    <td className="px-4 py-3">±{n.tolerance_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRAY CONFIG & SCALE CALIBRATION */}
      {activeTab === "calibration" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Per-Food Scale Calibration Models (Linear Regression + Empirical Residuals)
                </h2>
                <p className="text-xs text-slate-500">
                  Maps geometric volume x density estimates to weighed grams and computes 10th–90th percentile uncertainty ranges.
                </p>
              </div>
              <button
                onClick={handleFitCalibrations}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                ⚖️ Fit Scale Calibration Models
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Food</th>
                    <th className="px-4 py-3">Samples (Min 30)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Slope / Intercept</th>
                    <th className="px-4 py-3">10th–90th Residual Range</th>
                    <th className="px-4 py-3">MAE (g)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calibrations.map((c) => (
                    <tr key={c.food_id}>
                      <td className="px-4 py-3 font-bold">{c.food_name}</td>
                      <td className="px-4 py-3">{c.calibration?.sample_count || 0}</td>
                      <td className="px-4 py-3">
                        {c.calibration?.is_calibrated ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            Calibrated
                          </span>
                        ) : (
                          <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                            Uncalibrated (&lt;30 samples)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {c.calibration
                          ? `y = ${c.calibration.slope}x + ${c.calibration.intercept}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {c.calibration
                          ? `[${c.calibration.residual_p10_g}g, +${c.calibration.residual_p90_g}g]`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{c.calibration?.mae_g ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {trayConfig && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                Standardized Compartment Tray Configuration (<code>data/tray/tray_config.json</code>)
              </h2>
              <p className="text-xs text-slate-600">
                Tray: <strong>{trayConfig.tray_name}</strong> (v{trayConfig.version}) • Dimensions:{" "}
                {trayConfig.tray_width_cm} cm × {trayConfig.tray_height_cm} cm • Marker Side:{" "}
                {trayConfig.marker?.side_length_cm} cm
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {trayConfig.compartments?.map((comp) => (
                  <div
                    key={comp.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="font-bold text-slate-900">{comp.name}</div>
                    <div className="mt-1 text-slate-600">
                      Shape: {comp.shape} • Vol: <strong>{comp.volume_ml} ml</strong>
                    </div>
                    <div className="text-slate-500">
                      {comp.width_cm}×{comp.height_cm}×{comp.depth_cm} cm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCHOOLS */}
      {activeTab === "schools" && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddSchool}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
          >
            <h2 className="text-sm font-bold text-slate-900">
              Add School or Anganwadi Centre
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input
                type="text"
                required
                placeholder="Code (e.g. SCH-BLR-105)"
                value={newSchool.code}
                onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                placeholder="School / Centre Name"
                value={newSchool.name}
                onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                placeholder="District"
                value={newSchool.district}
                onChange={(e) => setNewSchool({ ...newSchool, district: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="number"
                required
                placeholder="Enrolled Children"
                value={newSchool.enrolled_children}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, enrolled_children: e.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white"
              >
                + Add School
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">District / Block</th>
                  <th className="px-4 py-3">Scheme / Age Group</th>
                  <th className="px-4 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schools.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono font-bold">{s.code}</td>
                    <td className="px-4 py-3 font-bold">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.district} ({s.block})
                    </td>
                    <td className="px-4 py-3">
                      {s.scheme} — {s.default_age_group}
                    </td>
                    <td className="px-4 py-3">{s.enrolled_children}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: USERS */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddUser}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
          >
            <h2 className="text-sm font-bold text-slate-900">Create User Account</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input
                type="email"
                required
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="password"
                required
                placeholder="Password (min 6 chars)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              >
                <option value="STAFF">STAFF</option>
                <option value="OFFICER">OFFICER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white"
              >
                + Create User
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">#{u.id}</td>
                    <td className="px-4 py-3 font-bold">{u.full_name}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 font-bold text-emerald-800">{u.role}</td>
                    <td className="px-4 py-3">{u.is_active ? "Active" : "Inactive"}</td>
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
