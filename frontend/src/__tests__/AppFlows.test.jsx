import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ModelStateBanner from "../components/ModelStateBanner";
import ImageQualityFeedback from "../components/ImageQualityFeedback";
import { StatusBadge, ConfidenceBadge } from "../components/StatusBadge";
import ThaliSharePage from "../pages/ThaliSharePage";
import { HashRouter } from "react-router-dom";

describe("ThaliCheck Frontend Honesty & Quality Components", () => {
  it("renders DEMO MODE banner when no trained model is active", () => {
    render(
      <ModelStateBanner
        modelInfo={{ model_state: "DEMO_MODE", is_demo: true }}
        mealIsDemo={true}
      />
    );
    expect(
      screen.getByText(/DEMO MODE: simulated predictions/i)
    ).toBeInTheDocument();
  });

  it("renders SMOKE-TEST MODEL banner when trained on synthetic smoke dataset", () => {
    render(
      <ModelStateBanner
        modelInfo={{
          model_state: "SMOKE_TEST_MODEL",
          is_smoke_test: true,
          version_tag: "smoke-test-mobilenet-1234",
        }}
      />
    );
    expect(
      screen.getByText(/SMOKE-TEST MODEL: not a real food model/i)
    ).toBeInTheDocument();
  });

  it("renders plain retake guidance when image quality check fails", () => {
    render(
      <ImageQualityFeedback
        qualityCheck={{
          passed: false,
          quality_score: 0.32,
          blur_variance: 18.4,
          brightness_mean: 30.0,
          marker_visible: false,
          tray_coverage_ratio: 0.35,
          tilt_degrees: 5.0,
          issues: ["Marker not visible", "Too dark", "Image blurry", "Move closer"],
          retake_guidance:
            "Marker not visible: Place the standardized cyan reference marker clearly inside the top-left corner.",
        }}
      />
    );
    expect(screen.getAllByText(/Marker not visible/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Too dark/i)).toBeInTheDocument();
    expect(screen.getByText(/Image blurry/i)).toBeInTheDocument();
    expect(screen.getByText(/Move closer/i)).toBeInTheDocument();
  });

  it("renders status and confidence badges accurately", () => {
    render(
      <div>
        <StatusBadge status="POTENTIAL_SHORTFALL" />
        <ConfidenceBadge tier="LOW" pct={58.4} />
      </div>
    );
    expect(screen.getByText(/POTENTIAL SHORTFALL/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: LOW/i)).toBeInTheDocument();
  });

  it("renders ThaliShare Community Contributions landing heading and sections", () => {
    render(
      <HashRouter>
        <ThaliSharePage user={{ full_name: "Staff User", email: "staff@thalicheck.gov.in", role: "STAFF" }} />
      </HashRouter>
    );
    expect(
      screen.getByText(/Together, We Can Make Every Meal Better\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Participating Foundations & NGO Directory/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Submit a Community Contribution Enquiry/i)
    ).toBeInTheDocument();
  });
});
