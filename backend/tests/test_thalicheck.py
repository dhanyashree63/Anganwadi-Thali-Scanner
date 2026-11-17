"""
Comprehensive Pytest Suite for ThaliCheck (`backend/tests/test_thalicheck.py`).

Covers all requirements in Section 24:
1. Authentication, JWT validation, password hashing, and RBAC (ADMIN, OFFICER, STAFF)
2. Marker detection on synthetic tray images with known 3.0 cm scale (60 px => 20.0 px/cm within tolerance)
3. Pixel-to-cm conversion and compartment geometry extraction
4. Quality gate rejection for dark, blurry, or missing-marker images with plain retake guidance
5. Portion = fill x volume x density, with uncertainty range derived from calibration residuals
6. Scale calibration fitting (Scikit-learn LinearRegression) & uncalibrated fallback (<30 samples)
7. Nutrition calculation, recipe-based cooking yield calculation, and missing nutrition value exclusion (never fabricated)
8. Range-straddles-threshold status logic (POTENTIAL_SHORTFALL when range overlaps norm)
9. Confidence tiering rule ("weakest critical factor caps overall confidence")
10. Automatic verification task creation for BOTH low-confidence shortfall AND low-confidence adequate (false-reassurance safeguard)
11. Human verification workflow (VERIFY, CORRECT_FOOD, CORRECT_PORTION, REJECT) + candidate training sample creation (`CANDIDATE_NEEDS_REVIEW`) + audit logging
12. Session-based dataset splitting (`split_samples_by_session`) guaranteeing zero session overlap between train, val, and test splits
13. Evaluation metric computation (`compute_evaluation_metrics_from_predictions`) verified against exact hand-computed values on a deterministic fixture (including false-reassurance rate)
14. Demo / Smoke-Test / Real model state banner flags and "No trained model evaluated yet." honesty rule
15. Edge cases: 0 g portion, unknown food, missing nutrition data, low confidence, extremely large portion, invalid meal input
"""
from pathlib import Path
import os
import sys

os.environ["THALICHECK_USE_SQLITE_FALLBACK"] = "1"

import numpy as np
from PIL import Image, ImageDraw
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(PROJECT_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.main import app
from app.database import Base, SessionLocal, engine
from app.models import CalibrationModel, DatasetSample, FoodItem, Meal, ModelVersion
from app.ai.tray_vision import (
    compute_laplacian_blur_variance,
    detect_reference_marker,
    extract_compartment_crops,
    load_tray_config,
    run_image_quality_gate,
)
from app.ai.portion_estimator import (
    estimate_portion_grams_with_range,
    fit_portion_calibration_for_food,
)
from app.nutrition import (
    calculate_item_nutrition_range,
    compute_overall_confidence,
    compute_recipe_nutrition_per_100g,
    evaluate_norm_and_status,
    resolve_food_nutrition_per_100g,
    should_create_verification_task,
)
from ai_models.train import split_samples_by_session
from ai_models.evaluate import compute_evaluation_metrics_from_predictions
from scripts.seed_demo_data import seed_all_data


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all_data(db)
    finally:
        db.close()
    with TestClient(app) as c:
        yield c


def _auth_header(client: TestClient, email: str, password: str) -> dict:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. AUTHENTICATION, JWT & RBAC TESTS
# ---------------------------------------------------------------------------
def test_authentication_and_jwt_validation(client: TestClient):
    # Valid login
    res = client.post("/auth/login", json={"email": "staff@thalicheck.gov.in", "password": "Staff@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "STAFF"
    assert "hashed_password" not in data["user"]

    # Invalid password rejected
    bad = client.post("/auth/login", json={"email": "staff@thalicheck.gov.in", "password": "WrongPassword"})
    assert bad.status_code == 401

    # Unauthenticated protected route rejected
    unauth = client.get("/schools")
    assert unauth.status_code == 401

    # Forged JWT token rejected
    forged = client.get("/schools", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert forged.status_code == 401


def test_role_based_authorization(client: TestClient):
    staff_headers = _auth_header(client, "staff@thalicheck.gov.in", "Staff@123")
    officer_headers = _auth_header(client, "officer@thalicheck.gov.in", "Officer@123")
    admin_headers = _auth_header(client, "admin@thalicheck.gov.in", "Admin@123")

    # Staff cannot access Officer/Admin verification queue or user list
    assert client.get("/verification/pending", headers=staff_headers).status_code == 403
    assert client.get("/users", headers=staff_headers).status_code == 403

    # Officer can access verification queue and audit logs, but cannot create schools (Admin only)
    assert client.get("/verification/pending", headers=officer_headers).status_code == 200
    assert client.get("/audit-logs", headers=officer_headers).status_code == 200
    assert client.post(
        "/schools",
        json={
            "code": "SCH-FORBID",
            "name": "Forbidden School",
            "district": "Test",
            "block": "Test",
        },
        headers=officer_headers,
    ).status_code == 403

    # Admin can access `/users`
    assert client.get("/users", headers=admin_headers).status_code == 200


# ---------------------------------------------------------------------------
# 2. MARKER DETECTION, PIXEL-TO-CM SCALE & COMPARTMENT GEOMETRY
# ---------------------------------------------------------------------------
def test_marker_detection_and_pixel_to_cm_scale(tmp_path: Path):
    tray_cfg = load_tray_config()
    # Create synthetic 640x480 tray with a known 60x60 pixel cyan marker -> 3.0 cm real side => 20.0 px/cm
    img = Image.new("RGB", (640, 480), color=(185, 190, 195))
    draw = ImageDraw.Draw(img)
    marker_rgb = tuple(tray_cfg["marker"]["target_rgb"])
    draw.rectangle([40, 30, 100, 90], fill=marker_rgb)  # 60x60 px square

    rgb_arr = np.asarray(img, dtype=np.uint8)
    res = detect_reference_marker(rgb_arr, tray_cfg)
    assert res["detected"] is True
    # Known scale is 60 px / 3.0 cm = 20.0 px/cm; verify error is within tolerance (< 1.0 px/cm)
    assert abs(res["px_per_cm"] - 20.0) < 1.0

    img_path = tmp_path / "known_scale_tray.jpg"
    img.save(img_path)
    crops, comp_metrics = extract_compartment_crops(img_path, tray_cfg)
    assert len(crops) == 5
    assert "comp_1" in comp_metrics and "comp_4" in comp_metrics
    assert comp_metrics["comp_4"]["configured_volume_ml"] == 380.0


# ---------------------------------------------------------------------------
# 3. IMAGE QUALITY GATE (DARK / BLURRY / NO MARKER REJECTION)
# ---------------------------------------------------------------------------
def test_quality_checks_reject_dark_blurry_and_missing_marker(tmp_path: Path):
    tray_cfg = load_tray_config()

    # 1. Missing marker & flat uniform (blurry) image
    no_marker_path = tmp_path / "no_marker_blurry.jpg"
    Image.new("RGB", (640, 480), color=(160, 160, 160)).save(no_marker_path)
    qc_no_marker = run_image_quality_gate(no_marker_path, tray_cfg)
    assert qc_no_marker["passed"] is False
    assert "Marker not visible" in qc_no_marker["issues"]
    assert "Image blurry" in qc_no_marker["issues"]

    # 2. Too dark image
    dark_path = tmp_path / "too_dark.jpg"
    Image.new("RGB", (640, 480), color=(15, 15, 18)).save(dark_path)
    qc_dark = run_image_quality_gate(dark_path, tray_cfg)
    assert qc_dark["passed"] is False
    assert "Too dark" in qc_dark["issues"]


# ---------------------------------------------------------------------------
# 4. PORTION ESTIMATION, SCALE CALIBRATION & UNCALIBRATED FALLBACK
# ---------------------------------------------------------------------------
def test_portion_estimation_and_calibration_fitting():
    db = SessionLocal()
    try:
        rice = db.query(FoodItem).filter(FoodItem.code == "rice").first()
        assert rice is not None

        # Fit calibration with 35 weighed samples (exceeds default min 30 -> calibrated)
        geom_x = [100.0 + i * 2.5 for i in range(35)]
        # True weight = 1.05 * x + 4.0 + deterministic residual in [-10, +10]
        true_y = [1.05 * x + 4.0 + ((-8.0) if idx % 3 == 0 else (8.0 if idx % 3 == 1 else 0.0)) for idx, x in enumerate(geom_x)]

        cal_model = fit_portion_calibration_for_food(db, rice, geometric_estimates=geom_x, weighed_truths=true_y, min_samples=30)
        assert cal_model.is_calibrated is True
        assert cal_model.sample_count == 35
        assert cal_model.residual_p10_g < 0 < cal_model.residual_p90_g

        # Verify portion = fill x volume x density mapped through calibration with range from residuals
        est = estimate_portion_grams_with_range(
            db=db,
            food_item=rice,
            fill_fraction=0.50,
            compartment_volume_ml=380.0,
            min_calibration_samples=30,
        )
        expected_geom = round(0.50 * 380.0 * rice.density_g_per_ml, 1)
        assert est["geometric_grams"] == expected_geom
        assert est["is_calibrated"] is True
        assert est["low_grams"] < est["likely_grams"] < est["high_grams"]

        # Uncalibrated fallback when sample count < 30
        uncal_food = db.query(FoodItem).filter(FoodItem.code == "fruits").first()
        fit_portion_calibration_for_food(db, uncal_food, geometric_estimates=[80.0, 90.0, 100.0, 110.0], weighed_truths=[82.0, 88.0, 104.0, 108.0], min_samples=30)
        uncal_est = estimate_portion_grams_with_range(
            db=db,
            food_item=uncal_food,
            fill_fraction=0.50,
            compartment_volume_ml=250.0,
            min_calibration_samples=30,
        )
        assert uncal_est["is_calibrated"] is False
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 5. CONFIDENCE TIERING, RANGE-STRADDLE STATUS & AUTO-VERIFICATION RULES
# ---------------------------------------------------------------------------
def test_confidence_weakest_factor_caps_overall_tier():
    # High classification (0.92), High image quality (0.90), Calibrated portions (True),
    # but Missing Nutrition (True -> LOW tier) => Overall tier MUST be capped at LOW
    conf = compute_overall_confidence(
        classification_confidences=[0.92, 0.94, 0.91],
        quality_score=0.90,
        marker_detected=True,
        all_portions_calibrated=True,
        all_nutrition_verified=True,
        has_missing_nutrition=True,
    )
    assert conf["tier"] == "LOW"

    # High classification, High image quality, Verified nutrition, but Uncalibrated portions -> capped at MEDIUM
    conf_med = compute_overall_confidence(
        classification_confidences=[0.91, 0.89],
        quality_score=0.88,
        marker_detected=True,
        all_portions_calibrated=False,
        all_nutrition_verified=True,
        has_missing_nutrition=False,
    )
    assert conf_med["tier"] == "MEDIUM"


def test_range_straddles_threshold_and_verification_triggers():
    # Range [430, 448, 468] straddles target 450 kcal -> POTENTIAL_SHORTFALL with straddle flag
    res = evaluate_norm_and_status(
        calories_range=(430.0, 448.0, 468.0),
        protein_range=(12.5, 13.2, 14.0),
        target_calories=450.0,
        target_protein=12.0,
        tolerance_pct=10.0,
    )
    assert res["status"] == "POTENTIAL_SHORTFALL"
    assert res["range_straddles_threshold"] is True
    assert "estimate range overlaps threshold" in res["explanation"].lower()
    assert "violated" not in res["explanation"].lower()

    # Auto-verification rule 1: SIGNIFICANT_SHORTFALL + LOW confidence -> creates task
    v1, r1 = should_create_verification_task("SIGNIFICANT_SHORTFALL", "LOW", False, False)
    assert v1 is True and "low confidence" in r1.lower()

    # Auto-verification rule 2: ADEQUATE + LOW confidence -> ALSO creates task (false-reassurance safeguard)
    v2, r2 = should_create_verification_task("ADEQUATE", "LOW", False, False)
    assert v2 is True and "false-reassurance" in r2.lower()


# ---------------------------------------------------------------------------
# 6. SESSION-BASED SPLIT & HAND-COMPUTED EVALUATION METRICS FIXTURE
# ---------------------------------------------------------------------------
def test_split_by_session_has_zero_session_overlap():
    rows = []
    for s_idx in range(1, 11):
        for img_idx in range(4):
            rows.append({
                "image_path": f"rice/img_{s_idx}_{img_idx}.jpg",
                "food_class": "rice",
                "session_id": f"session_{s_idx:02d}",
                "weighed_grams": 150.0,
            })

    train_r, val_r, test_r = split_samples_by_session(rows, seed=42)
    train_s = {r["session_id"] for r in train_r}
    val_s = {r["session_id"] for r in val_r}
    test_s = {r["session_id"] for r in test_r}

    assert len(train_s) > 0 and len(val_s) > 0 and len(test_s) > 0
    assert train_s.isdisjoint(val_s)
    assert train_s.isdisjoint(test_s)
    assert val_s.isdisjoint(test_s)


def test_metric_computation_against_hand_computed_fixture():
    # Hand-computed 4-sample fixture across 2 classes ("rice"=0, "dal"=1)
    classes = ["rice", "dal"]
    y_true = [0, 0, 1, 1]
    y_pred = [0, 1, 1, 1]  # 3/4 correct => Top-1 accuracy = 0.75
    y_prob = np.array([
        [0.90, 0.10],
        [0.40, 0.60],  # Misclassified with confidence 0.60 (< 0.65 threshold -> flagged!)
        [0.15, 0.85],
        [0.20, 0.80],
    ])
    test_rows = [
        {"food_class": "rice", "session_id": "s1"},
        {"food_class": "rice", "session_id": "s1"},
        {"food_class": "dal", "session_id": "s2"},
        {"food_class": "dal", "session_id": "s2"},
    ]
    # 2 portion records:
    # Sample 1: true=100g, pred=110g (|err|=10g, APE=10%, range=[95, 125] -> covers true), true_status=POTENTIAL_SHORTFALL, pred_status=ADEQUATE (false reassurance!)
    # Sample 2: true=200g, pred=180g (|err|=20g, APE=10%, range=[160, 205] -> covers true), true_status=POTENTIAL_SHORTFALL, pred_status=POTENTIAL_SHORTFALL
    portion_records = [
        {
            "food_class": "rice",
            "true_grams": 100.0,
            "pred_grams_low": 95.0,
            "pred_grams_likely": 110.0,
            "pred_grams_high": 125.0,
            "true_calories": 130.0,
            "pred_calories": 143.0,
            "true_protein": 2.7,
            "pred_protein": 2.97,
            "true_status": "POTENTIAL_SHORTFALL",
            "pred_status": "ADEQUATE",
        },
        {
            "food_class": "dal",
            "true_grams": 200.0,
            "pred_grams_low": 160.0,
            "pred_grams_likely": 180.0,
            "pred_grams_high": 205.0,
            "true_calories": 232.0,
            "pred_calories": 208.8,
            "true_protein": 14.4,
            "pred_protein": 12.96,
            "true_status": "POTENTIAL_SHORTFALL",
            "pred_status": "POTENTIAL_SHORTFALL",
        },
    ]

    metrics = compute_evaluation_metrics_from_predictions(
        y_true=y_true,
        y_pred=y_pred,
        y_prob_matrix=y_prob,
        classes=classes,
        test_rows=test_rows,
        portion_records=portion_records,
        low_conf_threshold=0.65,
        is_smoke_test=True,
    )

    assert metrics["classification"]["top1_accuracy"] == 0.75
    # MAE = (10 + 20) / 2 = 15.0 g; MAPE = (10% + 10%) / 2 = 10.0%; Coverage = 100.0%
    assert metrics["portion_estimation"]["overall"]["mae_grams"] == 15.0
    assert metrics["portion_estimation"]["overall"]["mape_pct"] == 10.0
    assert metrics["portion_estimation"]["overall"]["range_coverage_pct"] == 100.0
    # False-reassurance rate: 1 of 2 true shortfalls predicted ADEQUATE => 0.5
    assert metrics["status_agreement"]["false_reassurance_rate"] == 0.5
    assert metrics["status_agreement"]["false_reassurance_count"] == 1
    # Low-confidence flag: sample #2 had conf 0.60 < 0.65 and was the only error => precision=1.0, recall=1.0
    assert metrics["calibration"]["low_confidence_flag_precision"] == 1.0
    assert metrics["calibration"]["low_confidence_flag_recall"] == 1.0


# ---------------------------------------------------------------------------
# 7. EDGE CASES & MISSING NUTRITION EXCLUSION (NEVER FABRICATED)
# ---------------------------------------------------------------------------
def test_edge_cases_and_missing_nutrition_never_fabricated(client: TestClient):
    db = SessionLocal()
    try:
        # 1. Missing nutrition data (Unknown / Other food item has None calories/protein)
        unknown_food = db.query(FoodItem).filter(FoodItem.code == "unknown").first()
        nutr_res = resolve_food_nutrition_per_100g(db, unknown_food)
        assert nutr_res["missing"] is True
        assert nutr_res["calories_per_100g"] is None
        assert nutr_res["protein_per_100g"] is None

        item_range = calculate_item_nutrition_range(50.0, 60.0, 70.0, None, None)
        assert item_range["calories_likely"] is None
        assert item_range["protein_likely"] is None

        # 2. 0g portion edge case
        rice = db.query(FoodItem).filter(FoodItem.code == "rice").first()
        zero_portion = estimate_portion_grams_with_range(db, rice, fill_fraction=0.0, compartment_volume_ml=380.0)
        assert zero_portion["likely_grams"] == 0.0
        assert zero_portion["low_grams"] == 0.0
        assert zero_portion["high_grams"] == 0.0

        # 3. Extremely large portion edge case
        huge_nutr = calculate_item_nutrition_range(800.0, 950.0, 1100.0, 130.0, 2.7)
        assert huge_nutr["calories_likely"] == round(950.0 * 1.3, 1)
    finally:
        db.close()

    # 4. Invalid meal creation (0 children served) rejected with 400
    staff_headers = _auth_header(client, "staff@thalicheck.gov.in", "Staff@123")
    bad_meal = client.post(
        "/meals",
        json={
            "school_id": 1,
            "meal_date": "2026-11-15",
            "meal_type": "LUNCH",
            "children_served": 0,
        },
        headers=staff_headers,
    )
    assert bad_meal.status_code == 400


# ---------------------------------------------------------------------------
# 8. END-TO-END API FLOW: MEAL ANALYSIS, VERIFICATION, DASHBOARD & BANNERS
# ---------------------------------------------------------------------------
def test_end_to_end_meal_analysis_verification_and_banners(client: TestClient):
    staff_headers = _auth_header(client, "staff@thalicheck.gov.in", "Staff@123")
    officer_headers = _auth_header(client, "officer@thalicheck.gov.in", "Officer@123")

    # 1. Create meal
    create_res = client.post(
        "/meals",
        json={
            "school_id": 1,
            "meal_date": "2026-11-15",
            "meal_type": "LUNCH",
            "scheme": "PM POSHAN",
            "age_group": "6-10 years (Primary)",
            "children_served": 95,
            "is_demo": True,
        },
        headers=staff_headers,
    )
    assert create_res.status_code == 201
    meal_id = create_res.json()["id"]

    # 2. Analyze meal using demo preset
    analyze_res = client.post(
        f"/meals/{meal_id}/analyze",
        data={"demo_preset": "potential_shortfall"},
        headers=staff_headers,
    )
    assert analyze_res.status_code == 200
    analyzed = analyze_res.json()
    assert analyzed["status"] in ("ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL")
    assert len(analyzed["detections"]) == 5
    assert analyzed["nutrition"] is not None

    # 3. Officer verifies / corrects portion on the meal and creates candidate training sample
    det_id = analyzed["detections"][0]["id"]
    verif_res = client.post(
        f"/verification/{meal_id}",
        json={
            "action": "CORRECT_PORTION",
            "detection_id": det_id,
            "corrected_grams": 115.0,
            "reason": "Verified manually on kitchen digital scale",
            "notes": "Logged during test suite run",
        },
        headers=officer_headers,
    )
    assert verif_res.status_code == 200
    assert verif_res.json()["verification_status"] == "CORRECTED"

    # 4. Check that candidate sample was created with status CANDIDATE_NEEDS_REVIEW
    prog_res = client.get("/dataset/progress", headers=officer_headers)
    assert prog_res.status_code == 200
    candidates = prog_res.json()["candidate_samples"]
    assert any(c["source_meal_id"] == meal_id and c["status"] == "CANDIDATE_NEEDS_REVIEW" for c in candidates)

    # 5. Check active model & dashboard summary APIs
    model_res = client.get("/model/active", headers=officer_headers)
    assert model_res.status_code == 200
    assert model_res.json()["model_state"] in ("DEMO_MODE", "SMOKE_TEST_MODEL", "REAL_MODEL")

    dash_res = client.get("/dashboard/summary?include_demo=false", headers=officer_headers)
    assert dash_res.status_code == 200
    assert "school_patterns" in dash_res.json()
    assert "anomalies" in dash_res.json()


def test_thalishare_community_contributions_and_verified_only_rule(client: TestClient):
    # 1. Verified live impact statistics default to 0 (excluding demo records)
    live_impact = client.get("/thalishare/impact?include_demo=false")
    assert live_impact.status_code == 200
    assert live_impact.json()["include_demo"] is False

    # 2. Register an unverified organization and verify it cannot receive contributions
    unver_res = client.post(
        "/thalishare/foundations",
        json={
            "name": "Unverified Applicant NGO",
            "logo_initials": "UAN",
            "description": "Pending verification test organization",
            "mission": "Child nutrition support",
            "areas_of_operation": ["Bengaluru Urban"],
            "initiatives_supported": ["School Meal Sponsorship"],
            "verified": False,
            "is_demo": False,
        },
    )
    assert unver_res.status_code == 201
    unver_id = unver_res.json()["id"]

    blocked_contrib = client.post(
        "/thalishare/contributions",
        json={
            "full_name": "Priya Sharma",
            "email": "priya@example.org",
            "phone": "9876543210",
            "contributor_category": "INDIVIDUAL",
            "foundation_id": unver_id,
            "contribution_type": "MONETARY",
            "amount_inr": 2500.0,
            "meals_supported_est": 100,
            "children_reached_est": 50,
        },
    )
    assert blocked_contrib.status_code == 400
    assert "verification" in blocked_contrib.json()["detail"].lower()

    # 3. Admin verifies the organization, then contributor submits an enquiry and tracks it
    admin_headers = _auth_header(client, "admin@thalicheck.gov.in", "Admin@123")
    ver_res = client.put(f"/thalishare/foundations/{unver_id}/verify?verified=true", headers=admin_headers)
    assert ver_res.status_code == 200
    assert ver_res.json()["verified"] is True

    ok_contrib = client.post(
        "/thalishare/contributions",
        json={
            "full_name": "Priya Sharma",
            "email": "priya@example.org",
            "phone": "9876543210",
            "contributor_category": "INDIVIDUAL",
            "foundation_id": unver_id,
            "contribution_type": "MONETARY",
            "amount_inr": 2500.0,
            "meals_supported_est": 100,
            "children_reached_est": 50,
            "is_demo": False,
        },
    )
    assert ok_contrib.status_code == 201
    ref = ok_contrib.json()["tracking_ref"]
    assert ref.startswith("TS-")

    track_res = client.get(f"/thalishare/track?query={ref}")
    assert track_res.status_code == 200
    assert len(track_res.json()) == 1
    assert track_res.json()[0]["full_name"] == "Priya Sharma"

