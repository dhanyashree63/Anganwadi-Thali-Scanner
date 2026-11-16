import React from "react";

/**
 * Displays persistent, unambiguous banners for DEMO MODE, SMOKE-TEST MODEL, or REAL EVALUATED MODEL
 * in strict compliance with Section 2 & Section 18.
 */
export default function ModelStateBanner({ modelInfo, mealIsDemo = false }) {
  const state = modelInfo?.model_state || (mealIsDemo ? "DEMO_MODE" : "DEMO_MODE");
  const isSmoke = Boolean(modelInfo?.is_smoke_test || state === "SMOKE_TEST_MODEL");
  const isDemo = Boolean(mealIsDemo || state === "DEMO_MODE");
  const metrics = modelInfo?.metrics;

  if (isDemo) {
    return (
      <div
        data-testid="model-state-banner"
        className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />
            <span>DEMO MODE: simulated predictions</span>
          </div>
          <span className="rounded bg-amber-200/80 px-2 py-0.5 text-xs font-medium text-amber-900">
            Early-Warning Monitoring Estimate Only
          </span>
        </div>
        <p className="mt-1 text-xs text-amber-800">
          No trained real food recognition model is active. Predictions use deterministic tray priors and visual signatures for workflow demonstration and are tagged <code>is_demo = true</code>.
        </p>
      </div>
    );
  }

  if (isSmoke) {
    return (
      <div
        data-testid="model-state-banner"
        className="mb-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-950 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-600" />
            <span>SMOKE-TEST MODEL: not a real food model</span>
          </div>
          <span className="rounded bg-orange-200/80 px-2 py-0.5 text-xs font-medium text-orange-900">
            Version: {modelInfo?.version_tag || "smoke-test"}
          </span>
        </div>
        <p className="mt-1 text-xs text-orange-800">
          Active PyTorch weights were trained on the synthetic colored-shape smoke dataset to verify the training and evaluation pipeline. Collect real weighed tray photos in Data Collection mode before field interpretation.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="model-state-banner"
      className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span>ACTIVE PYTORCH MODEL: {modelInfo?.version_tag}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-900">
          {metrics?.classification?.top1_accuracy !== undefined ? (
            <span>
              Held-out Test Top-1 Accuracy:{" "}
              <strong>{(metrics.classification.top1_accuracy * 100).toFixed(1)}%</strong> (n=
              {metrics.test_set_size})
            </span>
          ) : (
            <span>No trained model evaluated yet.</span>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-emerald-800">
        All AI results are nutritional estimates with empirical uncertainty ranges, not official medical or administrative violation findings.
      </p>
    </div>
  );
}
