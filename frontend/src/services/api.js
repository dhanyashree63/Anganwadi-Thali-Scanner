import { handleStaticFallbackRequest } from "./localFallbackEngine";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export function getStoredToken() {
  return localStorage.getItem("thalicheck_token");
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("thalicheck_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token, user) {
  localStorage.setItem("thalicheck_token", token);
  localStorage.setItem("thalicheck_user", JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem("thalicheck_token");
  localStorage.removeItem("thalicheck_user");
}

function isStaticHostEnvironment() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  return (
    host.includes("githack.com") ||
    host.includes("github.io") ||
    window.location.protocol === "file:"
  );
}

async function request(path, options = {}) {
  if (isStaticHostEnvironment()) {
    return handleStaticFallbackRequest(path, options);
  }

  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // If local FastAPI is not running, fall back gracefully so static previews work
    return handleStaticFallbackRequest(path, options);
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // If a static file server returned HTML for /api/*, use the static fallback store
    if (contentType.includes("text/html")) {
      return handleStaticFallbackRequest(path, options);
    }
    const text = await response.text();
    data = { detail: text };
  }

  if (!response.ok) {
    if (response.status === 404 && !contentType.includes("application/json")) {
      return handleStaticFallbackRequest(path, options);
    }
    const msg =
      (data && (data.detail || data.message)) ||
      `Request failed with HTTP status ${response.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  registerUser: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getUsers: () => request("/users"),
  getSchools: () => request("/schools"),
  createSchool: (payload) =>
    request("/schools", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSchoolStatistics: (schoolId, includeDemo = false) =>
    request(`/schools/${schoolId}/statistics?include_demo=${includeDemo}`),
  getMeals: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.school_id) qs.set("school_id", params.school_id);
    if (params.status_filter) qs.set("status_filter", params.status_filter);
    if (params.include_demo !== undefined) qs.set("include_demo", params.include_demo);
    return request(`/meals?${qs.toString()}`);
  },
  getMeal: (mealId) => request(`/meals/${mealId}`),
  createMeal: (payload) =>
    request("/meals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  analyzeMeal: (mealId, formData) =>
    request(`/meals/${mealId}/analyze`, {
      method: "POST",
      body: formData,
    }),
  flagMealForVerification: (mealId, reason) => {
    const fd = new FormData();
    fd.append("reason", reason);
    return request(`/meals/${mealId}/flag-verification`, {
      method: "POST",
      body: fd,
    });
  },
  checkImageQuality: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return request("/images/quality-check", {
      method: "POST",
      body: fd,
    });
  },
  getDashboardSummary: (includeDemo = false, schoolId = null) => {
    const qs = new URLSearchParams({ include_demo: String(includeDemo) });
    if (schoolId) qs.set("school_id", String(schoolId));
    return request(`/dashboard/summary?${qs.toString()}`);
  },
  getDashboardTrends: (includeDemo = false) =>
    request(`/dashboard/trends?include_demo=${includeDemo}`),
  getPendingVerifications: (includeResolved = false) =>
    request(`/verification/pending?include_resolved=${includeResolved}`),
  submitVerificationAction: (mealId, payload) =>
    request(`/verification/${mealId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAuditLogs: (limit = 100) => request(`/audit-logs?limit=${limit}`),
  submitDatasetSamples: (formData) =>
    request("/dataset/samples", {
      method: "POST",
      body: formData,
    }),
  getDatasetProgress: () => request("/dataset/progress"),
  approveCandidateSample: (sampleId) =>
    request(`/dataset/candidates/${sampleId}/approve`, { method: "POST" }),
  exportDataset: () => request("/dataset/export", { method: "POST" }),
  getActiveModel: () => request("/model/active"),
  getModelMetrics: () => request("/model/metrics"),
  triggerTraining: (epochs = 5, quickRun = true, sync = true) =>
    request(`/model/train?epochs=${epochs}&quick_run=${quickRun}&sync=${sync}`, {
      method: "POST",
    }),
  triggerEvaluation: (sync = true) =>
    request(`/model/evaluate?sync=${sync}`, {
      method: "POST",
    }),
  getCalibrations: () => request("/calibration"),
  fitCalibrations: (foodId = null) =>
    request(`/calibration/fit${foodId ? `?food_id=${foodId}` : ""}`, {
      method: "POST",
    }),
  getFoods: () => request("/foods"),
  createFood: (payload) =>
    request("/foods", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateFood: (foodId, payload) =>
    request(`/foods/${foodId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getRecipes: () => request("/recipes"),
  saveRecipe: (payload) =>
    request("/recipes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getNorms: () => request("/norms"),
  saveNorm: (payload) =>
    request("/norms", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTrayConfig: () => request("/tray-config"),
  updateTrayConfig: (payload) =>
    request("/tray-config", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
