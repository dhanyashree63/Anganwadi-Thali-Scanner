const STORAGE_KEY = "thalicheck_static_demo_store_v1";

const INITIAL_SMOKE_METRICS = {
  model_version: "smoke-test-mobilenet_v3_small-0215b327",
  dataset_hash: "0215b3273cb53c5e",
  smoke_test_only: true,
  evaluated_at: "2026-11-16T16:15:38.747043+00:00",
  test_set_size: 22,
  test_sessions_count: 1,
  classes: [
    "chapati",
    "curd",
    "dal",
    "egg",
    "fruits",
    "ragi_mudde",
    "rice",
    "sambar",
    "unknown",
    "vegetable_curry",
    "vegetables",
  ],
  classification: {
    top1_accuracy: 0.0909,
    top3_accuracy: 0.2727,
    macro_f1: 0.0152,
    per_class: [
      { food_class: "chapati", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "curd", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "dal", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "egg", precision: 0.0909, recall: 1.0, f1_score: 0.1667, test_images: 2, test_sessions: 1 },
      { food_class: "fruits", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "ragi_mudde", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "rice", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "sambar", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "unknown", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "vegetable_curry", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
      { food_class: "vegetables", precision: 0.0, recall: 0.0, f1_score: 0.0, test_images: 2, test_sessions: 1 },
    ],
    confusion_matrix: [
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  portion_estimation: {
    overall: {
      mae_grams: 6.18,
      mape_pct: 5.27,
      median_ape_pct: 4.98,
      bias_grams: -1.16,
      range_coverage_pct: 95.0,
      evaluated_samples: 20,
    },
    per_food: [
      { food_class: "chapati", samples: 2, mae_grams: 2.8, mape_pct: 3.29, median_ape_pct: 3.29, bias_grams: -2.8, range_coverage_pct: 100.0 },
      { food_class: "curd", samples: 2, mae_grams: 4.85, mape_pct: 6.21, median_ape_pct: 6.21, bias_grams: 4.85, range_coverage_pct: 100.0 },
      { food_class: "dal", samples: 2, mae_grams: 7.75, mape_pct: 6.35, median_ape_pct: 6.35, bias_grams: 7.75, range_coverage_pct: 100.0 },
      { food_class: "egg", samples: 2, mae_grams: 2.6, mape_pct: 4.48, median_ape_pct: 4.48, bias_grams: 2.6, range_coverage_pct: 100.0 },
      { food_class: "fruits", samples: 2, mae_grams: 4.6, mape_pct: 4.98, median_ape_pct: 4.98, bias_grams: -2.0, range_coverage_pct: 100.0 },
      { food_class: "ragi_mudde", samples: 2, mae_grams: 8.7, mape_pct: 4.99, median_ape_pct: 4.99, bias_grams: -2.6, range_coverage_pct: 100.0 },
      { food_class: "rice", samples: 2, mae_grams: 7.4, mape_pct: 5.03, median_ape_pct: 5.03, bias_grams: -4.2, range_coverage_pct: 100.0 },
      { food_class: "sambar", samples: 2, mae_grams: 17.75, mape_pct: 12.22, median_ape_pct: 12.22, bias_grams: -17.75, range_coverage_pct: 50.0 },
      { food_class: "vegetable_curry", samples: 2, mae_grams: 1.7, mape_pct: 1.67, median_ape_pct: 1.67, bias_grams: -0.7, range_coverage_pct: 100.0 },
      { food_class: "vegetables", samples: 2, mae_grams: 3.6, mape_pct: 3.49, median_ape_pct: 3.49, bias_grams: 3.3, range_coverage_pct: 100.0 },
    ],
  },
  nutrition_estimation: {
    calorie_mae_kcal: 6.78,
    calorie_mape_pct: 5.27,
    protein_mae_g: 0.26,
    protein_mape_pct: 5.19,
  },
  status_agreement: {
    agreement_rate: 0.8,
    false_reassurance_rate: 0.0,
    false_reassurance_count: 0,
    total_true_shortfalls: 12,
  },
  calibration: {
    ece: 0.0033,
    low_confidence_threshold: 0.35,
    low_confidence_flag_precision: 0.9091,
    low_confidence_flag_recall: 1.0,
    reliability_table: [
      { bin_label: "0.0-0.1", bin_mid: 0.05, count: 22, mean_confidence: 0.094, empirical_accuracy: 0.091, calibration_gap: 0.003 },
      { bin_label: "0.1-0.2", bin_mid: 0.15, count: 0, mean_confidence: 0.15, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.2-0.3", bin_mid: 0.25, count: 0, mean_confidence: 0.25, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.3-0.4", bin_mid: 0.35, count: 0, mean_confidence: 0.35, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.4-0.5", bin_mid: 0.45, count: 0, mean_confidence: 0.45, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.5-0.6", bin_mid: 0.55, count: 0, mean_confidence: 0.55, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.6-0.7", bin_mid: 0.65, count: 0, mean_confidence: 0.65, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.7-0.8", bin_mid: 0.75, count: 0, mean_confidence: 0.75, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.8-0.9", bin_mid: 0.85, count: 0, mean_confidence: 0.85, empirical_accuracy: 0.0, calibration_gap: 0.0 },
      { bin_label: "0.9-1.0", bin_mid: 0.95, count: 0, mean_confidence: 0.95, empirical_accuracy: 0.0, calibration_gap: 0.0 },
    ],
  },
};

function makeDetections(mealId, riceG, dalG, vegG, chapatiG, curdG, lowConf = false) {
  const items = [
    ["comp_1", "Top-Left Bowl (Dal / Sambar)", 2, "Dal", dalG, true, 34, 0.88, 116.0, 7.2],
    ["comp_2", "Top-Center Bowl (Vegetable Curry)", 4, "Vegetable Curry", vegG, false, 12, lowConf ? 0.56 : 0.81, 92.0, 2.4],
    ["comp_3", "Top-Right Bowl (Curd / Side / Egg)", 7, "Curd", curdG, false, 12, 0.84, 61.0, 3.5],
    ["comp_4", "Bottom-Left Main Well (Rice / Staple)", 1, "Rice", riceG, true, 34, 0.91, 130.0, 2.7],
    ["comp_5", "Bottom-Right Flat Well (Chapati / Fruit / Salad)", 5, "Chapati", chapatiG, false, 12, lowConf ? 0.58 : 0.83, 297.0, 9.8],
  ];
  return items.map(([cid, cname, fid, fname, [low, likely, high], isCal, scount, conf, cal100, prot100], idx) => ({
    id: mealId * 10 + idx + 1,
    compartment_id: cid,
    compartment_name: cname,
    food_item_id: fid,
    detected_food_name: fname,
    raw_confidence: Math.min(0.98, Number((conf + 0.03).toFixed(2))),
    calibrated_confidence: conf,
    is_low_confidence: conf < 0.65,
    fill_fraction: Number(Math.min(0.92, likely / 190.0).toFixed(2)),
    geometric_grams: Number((likely * 0.97).toFixed(1)),
    estimated_grams_low: low,
    estimated_grams_likely: likely,
    estimated_grams_high: high,
    portion_label: `Estimated portion: ${low}–${high} g (likely ${likely} g)`,
    is_portion_calibrated: isCal,
    calibration_sample_count: scount,
    calories_low: Number(((low * cal100) / 100.0).toFixed(1)),
    calories_likely: Number(((likely * cal100) / 100.0).toFixed(1)),
    calories_high: Number(((high * cal100) / 100.0).toFixed(1)),
    protein_low: Number(((low * prot100) / 100.0).toFixed(2)),
    protein_likely: Number(((likely * prot100) / 100.0).toFixed(2)),
    protein_high: Number(((high * prot100) / 100.0).toFixed(2)),
    nutrition_verified: false,
    nutrition_missing: false,
    nutrition_source: "IFCT 2017",
    manually_corrected: false,
  }));
}

function createInitialStore() {
  const schools = [
    {
      id: 1,
      code: "SCH-BLR-101",
      name: "Govt Model Primary School, Malleswaram",
      center_type: "PRIMARY_SCHOOL",
      district: "Bengaluru Urban",
      block: "North Block-1",
      scheme: "PM POSHAN",
      default_age_group: "6-10 years (Primary)",
      enrolled_children: 145,
      is_active: true,
    },
    {
      id: 2,
      code: "SCH-BLR-102",
      name: "Govt Higher Primary School, Yelahanka",
      center_type: "UPPER_PRIMARY",
      district: "Bengaluru Urban",
      block: "North Block-2",
      scheme: "PM POSHAN",
      default_age_group: "11-14 years (Upper Primary)",
      enrolled_children: 210,
      is_active: true,
    },
    {
      id: 3,
      code: "AWC-MYS-201",
      name: "Anganwadi Centre #42, Hunsur",
      center_type: "ANGANWADI",
      district: "Mysuru",
      block: "Hunsur Rural",
      scheme: "ICDS Anganwadi",
      default_age_group: "3-6 years (Anganwadi)",
      enrolled_children: 58,
      is_active: true,
    },
    {
      id: 4,
      code: "SCH-DWD-301",
      name: "Govt Primary School, Navalgund",
      center_type: "PRIMARY_SCHOOL",
      district: "Dharwad",
      block: "Navalgund",
      scheme: "PM POSHAN",
      default_age_group: "6-10 years (Primary)",
      enrolled_children: 112,
      is_active: true,
    },
  ];

  const users = [
    { id: 1, email: "admin@thalicheck.gov.in", full_name: "Dr. Kavitha Rao (State System Admin)", role: "ADMIN", school_id: null, is_active: true },
    { id: 2, email: "officer@thalicheck.gov.in", full_name: "Rajeshwar Gowda (District Nutrition Officer)", role: "OFFICER", school_id: null, is_active: true },
    { id: 3, email: "staff@thalicheck.gov.in", full_name: "Meenakshi Devi (Mid-Day Meal Coordinator)", role: "STAFF", school_id: 1, is_active: true },
  ];

  const foods = [
    { id: 1, code: "rice", name: "Rice", category: "Grains & Staples", calories_per_100g: 130.0, protein_per_100g: 2.7, density_g_per_ml: 0.85, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 2, code: "dal", name: "Dal", category: "Pulses & Legumes", calories_per_100g: 116.0, protein_per_100g: 7.2, density_g_per_ml: 0.98, source: "IFCT 2017", verified: false, is_recipe_based: true },
    { id: 3, code: "sambar", name: "Sambar", category: "Recipe Dishes", calories_per_100g: 78.0, protein_per_100g: 3.6, density_g_per_ml: 1.02, source: "school recipe", verified: false, is_recipe_based: true },
    { id: 4, code: "vegetable_curry", name: "Vegetable Curry", category: "Recipe Dishes", calories_per_100g: 92.0, protein_per_100g: 2.4, density_g_per_ml: 0.90, source: "school recipe", verified: false, is_recipe_based: true },
    { id: 5, code: "chapati", name: "Chapati", category: "Grains & Staples", calories_per_100g: 297.0, protein_per_100g: 9.8, density_g_per_ml: 0.55, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 6, code: "ragi_mudde", name: "Ragi Mudde", category: "Grains & Staples", calories_per_100g: 142.0, protein_per_100g: 3.3, density_g_per_ml: 1.05, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 7, code: "curd", name: "Curd", category: "Dairy", calories_per_100g: 61.0, protein_per_100g: 3.5, density_g_per_ml: 1.03, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 8, code: "egg", name: "Egg", category: "Animal Protein", calories_per_100g: 155.0, protein_per_100g: 12.6, density_g_per_ml: 1.00, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 9, code: "fruits", name: "Fruits", category: "Fruits", calories_per_100g: 89.0, protein_per_100g: 1.1, density_g_per_ml: 0.75, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 10, code: "vegetables", name: "Vegetables", category: "Vegetables", calories_per_100g: 55.0, protein_per_100g: 2.1, density_g_per_ml: 0.72, source: "IFCT 2017", verified: false, is_recipe_based: false },
    { id: 11, code: "unknown", name: "Unknown / Other", category: "Other", calories_per_100g: null, protein_per_100g: null, density_g_per_ml: 0.80, source: "user-entered", verified: false, is_recipe_based: false },
  ];

  const norms = [
    { id: 1, scheme: "PM POSHAN", age_group: "6-10 years (Primary)", meal_type: "LUNCH", calorie_target: 450.0, protein_target: 12.0, tolerance_pct: 10.0, severe_shortfall_pct: 22.0 },
    { id: 2, scheme: "PM POSHAN", age_group: "11-14 years (Upper Primary)", meal_type: "LUNCH", calorie_target: 700.0, protein_target: 20.0, tolerance_pct: 10.0, severe_shortfall_pct: 22.0 },
    { id: 3, scheme: "ICDS Anganwadi", age_group: "3-6 years (Anganwadi)", meal_type: "LUNCH", calorie_target: 350.0, protein_target: 10.0, tolerance_pct: 10.0, severe_shortfall_pct: 22.0 },
    { id: 4, scheme: "ICDS Anganwadi", age_group: "3-6 years (Anganwadi)", meal_type: "BREAKFAST", calorie_target: 250.0, protein_target: 7.5, tolerance_pct: 10.0, severe_shortfall_pct: 22.0 },
  ];

  const defaultQuality = {
    passed: true,
    quality_score: 0.89,
    blur_variance: 142.5,
    brightness_mean: 148.0,
    marker_visible: true,
    px_per_cm: 20.0,
    tray_coverage_ratio: 0.78,
    tilt_degrees: 1.2,
    issues: [],
    retake_guidance: "Image quality sufficient for analysis.",
  };

  const meals = [
    {
      id: 1,
      school_id: 1,
      school_name: schools[0].name,
      school_code: schools[0].code,
      district: schools[0].district,
      meal_date: "2026-11-11",
      meal_type: "LUNCH",
      scheme: "PM POSHAN",
      age_group: "6-10 years (Primary)",
      children_served: 123,
      status: "ADEQUATE",
      status_explanation: "Estimated meal nutrition appears to meet the configured calorie and protein norms within range.",
      overall_confidence_tier: "MEDIUM",
      overall_confidence_pct: 79.5,
      confidence_breakdown: { classification_tier: "HIGH", image_quality_tier: "HIGH", portion_calibration_tier: "MEDIUM", nutrition_data_tier: "MEDIUM" },
      requires_verification: false,
      verification_status: "NOT_REQUIRED",
      verification_reason: null,
      is_demo: false,
      model_state: "SMOKE_TEST_MODEL",
      quality_check: defaultQuality,
      nutrition: {
        total_calories_low: 448.0, total_calories_likely: 482.0, total_calories_high: 518.0,
        total_protein_low: 12.4, total_protein_likely: 13.8, total_protein_high: 15.2,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: 32.0, protein_gap_likely: 1.8,
        range_straddles_threshold: false,
      },
      detections: makeDetections(1, [155, 170, 185], [115, 130, 145], [85, 100, 115], [40, 48, 56], [65, 75, 85], false),
    },
    {
      id: 2,
      school_id: 1,
      school_name: schools[0].name,
      school_code: schools[0].code,
      district: schools[0].district,
      meal_date: "2026-11-13",
      meal_type: "LUNCH",
      scheme: "PM POSHAN",
      age_group: "6-10 years (Primary)",
      children_served: 120,
      status: "POTENTIAL_SHORTFALL",
      status_explanation: "Potential nutritional shortfall detected: estimate range overlaps threshold. Human verification recommended.",
      overall_confidence_tier: "MEDIUM",
      overall_confidence_pct: 74.2,
      confidence_breakdown: { classification_tier: "HIGH", image_quality_tier: "HIGH", portion_calibration_tier: "MEDIUM", nutrition_data_tier: "MEDIUM" },
      requires_verification: true,
      verification_status: "VERIFIED",
      verification_reason: "Estimate range overlaps calorie/protein threshold",
      is_demo: false,
      model_state: "SMOKE_TEST_MODEL",
      quality_check: defaultQuality,
      nutrition: {
        total_calories_low: 418.0, total_calories_likely: 444.0, total_calories_high: 472.0,
        total_protein_low: 11.1, total_protein_likely: 12.1, total_protein_high: 13.3,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: -6.0, protein_gap_likely: 0.1,
        range_straddles_threshold: true,
      },
      detections: makeDetections(2, [135, 150, 165], [95, 110, 125], [70, 85, 100], [35, 42, 50], [55, 65, 75], false),
    },
    {
      id: 3,
      school_id: 2,
      school_name: schools[1].name,
      school_code: schools[1].code,
      district: schools[1].district,
      meal_date: "2026-11-14",
      meal_type: "LUNCH",
      scheme: "PM POSHAN",
      age_group: "11-14 years (Upper Primary)",
      children_served: 180,
      status: "SIGNIFICANT_SHORTFALL",
      status_explanation: "Potential nutritional shortfall detected (significantly below target norms). Human verification recommended. Note: AI output is an early-warning estimate, not an official violation.",
      overall_confidence_tier: "LOW",
      overall_confidence_pct: 54.0,
      confidence_breakdown: { classification_tier: "LOW", image_quality_tier: "HIGH", portion_calibration_tier: "MEDIUM", nutrition_data_tier: "MEDIUM" },
      requires_verification: true,
      verification_status: "PENDING",
      verification_reason: "Significant shortfall with low confidence; Low-confidence food detection",
      is_demo: false,
      model_state: "SMOKE_TEST_MODEL",
      quality_check: defaultQuality,
      nutrition: {
        total_calories_low: 460.0, total_calories_likely: 498.0, total_calories_high: 535.0,
        total_protein_low: 12.2, total_protein_likely: 13.8, total_protein_high: 15.4,
        target_calories: 700.0, target_protein: 20.0, tolerance_pct: 10.0,
        calorie_gap_likely: -202.0, protein_gap_likely: -6.2,
        range_straddles_threshold: false,
      },
      detections: makeDetections(3, [140, 155, 170], [85, 100, 115], [65, 78, 92], [35, 42, 50], [45, 55, 65], true),
    },
    {
      id: 4,
      school_id: 3,
      school_name: schools[2].name,
      school_code: schools[2].code,
      district: schools[2].district,
      meal_date: "2026-11-14",
      meal_type: "LUNCH",
      scheme: "ICDS Anganwadi",
      age_group: "3-6 years (Anganwadi)",
      children_served: 50,
      status: "ADEQUATE",
      status_explanation: "Estimated meal nutrition appears to meet the configured calorie and protein norms within range.",
      overall_confidence_tier: "MEDIUM",
      overall_confidence_pct: 80.2,
      confidence_breakdown: { classification_tier: "HIGH", image_quality_tier: "HIGH", portion_calibration_tier: "MEDIUM", nutrition_data_tier: "MEDIUM" },
      requires_verification: false,
      verification_status: "NOT_REQUIRED",
      verification_reason: null,
      is_demo: false,
      model_state: "SMOKE_TEST_MODEL",
      quality_check: defaultQuality,
      nutrition: {
        total_calories_low: 342.0, total_calories_likely: 368.0, total_calories_high: 395.0,
        total_protein_low: 9.8, total_protein_likely: 10.9, total_protein_high: 12.1,
        target_calories: 350.0, target_protein: 10.0, tolerance_pct: 10.0,
        calorie_gap_likely: 18.0, protein_gap_likely: 0.9,
        range_straddles_threshold: false,
      },
      detections: makeDetections(4, [115, 128, 142], [85, 98, 112], [60, 72, 84], [25, 32, 40], [50, 60, 70], false),
    },
    {
      id: 5,
      school_id: 4,
      school_name: schools[3].name,
      school_code: schools[3].code,
      district: schools[3].district,
      meal_date: "2026-11-15",
      meal_type: "LUNCH",
      scheme: "PM POSHAN",
      age_group: "6-10 years (Primary)",
      children_served: 95,
      status: "SIGNIFICANT_SHORTFALL",
      status_explanation: "Potential nutritional shortfall detected (significantly below target norms). Human verification recommended.",
      overall_confidence_tier: "LOW",
      overall_confidence_pct: 56.5,
      confidence_breakdown: { classification_tier: "LOW", image_quality_tier: "HIGH", portion_calibration_tier: "MEDIUM", nutrition_data_tier: "MEDIUM" },
      requires_verification: true,
      verification_status: "PENDING",
      verification_reason: "Significant shortfall with low confidence",
      is_demo: false,
      model_state: "SMOKE_TEST_MODEL",
      quality_check: defaultQuality,
      nutrition: {
        total_calories_low: 285.0, total_calories_likely: 312.0, total_calories_high: 340.0,
        total_protein_low: 7.1, total_protein_likely: 8.0, total_protein_high: 9.0,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: -138.0, protein_gap_likely: -4.0,
        range_straddles_threshold: false,
      },
      detections: makeDetections(5, [95, 108, 120], [58, 68, 78], [45, 55, 65], [22, 26, 32], [35, 42, 50], true),
    },
  ];

  const auditLogs = [
    {
      id: 1,
      user_email: "admin@thalicheck.gov.in",
      user_role: "ADMIN",
      entity_type: "FoodDatabase",
      entity_id: "seed_csv",
      action: "SEED_FOODS_UNVERIFIED",
      previous_value: null,
      new_value: { seeded_items: 11, verified: false },
      reason: "Seeded initial food composition table from data/nutrition/foods_seed.csv (marked unverified until IFCT 2017 check).",
      created_at: "2026-11-15T10:00:00Z",
    },
    {
      id: 2,
      user_email: "officer@thalicheck.gov.in",
      user_role: "OFFICER",
      entity_type: "MealDetection",
      entity_id: "2",
      action: "VERIFY",
      previous_value: { verification_status: "PENDING" },
      new_value: { verification_status: "VERIFIED" },
      reason: "Verified against kitchen serving register by District Nutrition Officer.",
      created_at: "2026-11-15T14:30:00Z",
    },
  ];

  return {
    schools,
    users,
    foods,
    norms,
    meals,
    auditLogs,
    candidateSamples: [],
    metrics: INITIAL_SMOKE_METRICS,
    thalishareFoundations: [
      {
        id: 1,
        name: "[DEMO TEMPLATE] District School Nutrition Partner Trust",
        logo_initials: "DSN",
        description:
          "Demonstration profile showing how a verified partner organization appears in the ThaliShare directory.",
        mission:
          "Support supplementary protein, pulses, and seasonal fruit distribution in government primary schools.",
        registration_status: "Demo Verification Completed (Sample Profile Only)",
        registration_reference: null,
        areas_of_operation: ["Bengaluru Urban", "Mysuru"],
        initiatives_supported: [
          "Protein & Pulse Supplementation",
          "Seasonal Fruit & Micronutrient Drive",
          "School Meal Sponsorship",
        ],
        contribution_types: [
          "MONETARY",
          "FOOD_SUPPLIES",
          "SCHOOL_SPONSORSHIP",
          "INITIATIVE_SUPPORT",
        ],
        official_website: null,
        contact_email: null,
        contact_phone: null,
        verified: true,
        eligible_recipient: true,
        is_demo: true,
        utilization_summary:
          "Sample Demo Record: No live funds or external links associated with this template.",
      },
      {
        id: 2,
        name: "[DEMO TEMPLATE] Anganwadi Early Childhood Nutrition Collective",
        logo_initials: "AEC",
        description:
          "Demonstration profile for ICDS Anganwadi early-childhood nutrition and kitchen equipment support.",
        mission:
          "Strengthen morning breakfast and hot-cooked meal adequacy across rural Anganwadi centres.",
        registration_status: "Demo Verification Completed (Sample Profile Only)",
        registration_reference: null,
        areas_of_operation: ["Dharwad", "Mysuru"],
        initiatives_supported: [
          "Anganwadi Protein & Egg Addition",
          "Approved Dry Ration & Grocery Support",
          "Kitchen Digital Scale & Standardized Tray Support",
        ],
        contribution_types: [
          "FOOD_SUPPLIES",
          "SCHOOL_SPONSORSHIP",
          "INITIATIVE_SUPPORT",
        ],
        official_website: null,
        contact_email: null,
        contact_phone: null,
        verified: true,
        eligible_recipient: true,
        is_demo: true,
        utilization_summary:
          "Sample Demo Record: Used only to demonstrate ThaliShare filtering and enquiry workflows.",
      },
      {
        id: 3,
        name: "[DEMO TEMPLATE] Pending Applicant Organization (Unverified Example)",
        logo_initials: "PAO",
        description:
          "Demonstration profile showing an organization whose verification has not yet been completed.",
        mission:
          "Applicant awaiting administrative verification of registration documents.",
        registration_status:
          "Pending Document Verification — Ineligible for Contributions",
        registration_reference: null,
        areas_of_operation: ["Bengaluru Urban"],
        initiatives_supported: ["School Meal Sponsorship"],
        contribution_types: ["MONETARY"],
        official_website: null,
        contact_email: null,
        contact_phone: null,
        verified: false,
        eligible_recipient: false,
        is_demo: true,
        utilization_summary: null,
      },
    ],
    thalishareContributions: [
      {
        id: 1,
        tracking_ref: "TS-DEMO-0001",
        foundation_id: 1,
        foundation_name: "[DEMO TEMPLATE] District School Nutrition Partner Trust",
        foundation_website: null,
        full_name: "Demo Contributor (Sample Record)",
        email: "demo.contributor@example.org",
        phone: "0000000000",
        contributor_category: "INDIVIDUAL",
        contribution_type: "SCHOOL_SPONSORSHIP",
        amount_inr: null,
        school_id: 1,
        school_name: "Govt Model Primary School, Malleswaram (SCH-BLR-101)",
        initiative_name: "Protein & Pulse Supplementation",
        meals_supported_est: 120,
        children_reached_est: 60,
        message: "Sample demo enquiry illustrating contribution tracking.",
        status: "ENQUIRY_RECORDED",
        receipt_note:
          "Demo sample record (is_demo = true). Excluded from verified live platform statistics by default.",
        utilization_report: "Sample utilization entry for UI demonstration.",
        is_demo: true,
      },
    ],
  };
}

function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const init = createInitialStore();
  saveStore(init);
  return init;
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function handleStaticFallbackRequest(path, options = {}) {
  const store = getStore();
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;

  let bodyObj = {};
  if (typeof options.body === "string") {
    try {
      bodyObj = JSON.parse(options.body);
    } catch {
      bodyObj = {};
    }
  }

  // 1. Auth
  if (pathname === "/auth/login" && method === "POST") {
    const email = (bodyObj.email || "").toLowerCase().trim();
    const found =
      store.users.find((u) => u.email.toLowerCase() === email) || store.users[2];
    return {
      access_token: `static-demo-jwt-${found.role.toLowerCase()}`,
      token_type: "bearer",
      user: found,
    };
  }

  if (pathname === "/auth/register" && method === "POST") {
    const newUser = {
      id: store.users.length + 1,
      email: bodyObj.email,
      full_name: bodyObj.full_name,
      role: bodyObj.role || "STAFF",
      school_id: bodyObj.school_id || null,
      is_active: true,
    };
    store.users.push(newUser);
    saveStore(store);
    return newUser;
  }

  if (pathname === "/users") {
    return store.users;
  }

  // 2. Schools
  if (pathname === "/schools" && method === "GET") {
    return store.schools;
  }
  if (pathname === "/schools" && method === "POST") {
    const ns = {
      id: store.schools.length + 1,
      ...bodyObj,
      is_active: true,
    };
    store.schools.push(ns);
    saveStore(store);
    return ns;
  }

  const schoolStatsMatch = pathname.match(/^\/schools\/(\d+)\/statistics$/);
  if (schoolStatsMatch) {
    const sid = Number(schoolStatsMatch[1]);
    const school = store.schools.find((s) => s.id === sid) || store.schools[0];
    const sMeals = store.meals.filter((m) => m.school_id === school.id);
    const total = sMeals.length || 1;
    const adeq = sMeals.filter((m) => m.status === "ADEQUATE").length;
    const pot = sMeals.filter((m) => m.status === "POTENTIAL_SHORTFALL").length;
    const sig = sMeals.filter((m) => m.status === "SIGNIFICANT_SHORTFALL").length;
    return {
      school,
      total_meals: sMeals.length,
      average_calories: 445.0,
      average_protein: 12.4,
      adequate_count: adeq,
      potential_shortfall_count: pot,
      significant_shortfall_count: sig,
      adequate_pct: Number(((adeq / total) * 100).toFixed(1)),
      potential_shortfall_pct: Number(((pot / total) * 100).toFixed(1)),
      significant_shortfall_pct: Number(((sig / total) * 100).toFixed(1)),
      verification_count: sMeals.filter((m) => m.requires_verification).length,
      shortfall_pattern: {
        pattern_type: sig > 0 ? "REPEATED_SHORTFALL" : "SINGLE_ANOMALY",
        recommendation:
          sig > 0
            ? "Repeated potential nutritional shortfalls detected. Human verification and menu compliance review recommended."
            : "Meals within expected nutrition parameters.",
      },
      trends: sMeals.map((m) => ({
        meal_id: m.id,
        date: m.meal_date,
        meal_type: m.meal_type,
        calories_low: m.nutrition.total_calories_low,
        calories_likely: m.nutrition.total_calories_likely,
        calories_high: m.nutrition.total_calories_high,
        target_calories: m.nutrition.target_calories,
        protein_low: m.nutrition.total_protein_low,
        protein_likely: m.nutrition.total_protein_likely,
        protein_high: m.nutrition.total_protein_high,
        target_protein: m.nutrition.target_protein,
        status: m.status,
        verification_status: m.verification_status,
      })),
    };
  }

  // 3. Meals & Analysis
  if (pathname === "/images/quality-check") {
    return {
      passed: true,
      quality_score: 0.91,
      blur_variance: 156.2,
      brightness_mean: 152.0,
      marker_visible: true,
      px_per_cm: 20.0,
      tray_coverage_ratio: 0.81,
      tilt_degrees: 1.1,
      issues: [],
      retake_guidance: "Image quality sufficient for analysis.",
    };
  }

  if (pathname === "/meals" && method === "GET") {
    return store.meals;
  }

  if (pathname === "/meals" && method === "POST") {
    const school =
      store.schools.find((s) => s.id === Number(bodyObj.school_id)) ||
      store.schools[0];
    const newMeal = {
      id: store.meals.length + 1,
      school_id: school.id,
      school_name: school.name,
      school_code: school.code,
      district: school.district,
      meal_date: bodyObj.meal_date || "2026-11-16",
      meal_type: bodyObj.meal_type || "LUNCH",
      scheme: bodyObj.scheme || school.scheme,
      age_group: bodyObj.age_group || school.default_age_group,
      children_served: bodyObj.children_served || 90,
      notes: bodyObj.notes || "",
      status: "PENDING_ANALYSIS",
      is_demo: Boolean(bodyObj.is_demo),
      model_state: "SMOKE_TEST_MODEL",
      detections: [],
    };
    store.meals.unshift(newMeal);
    saveStore(store);
    return newMeal;
  }

  const analyzeMatch = pathname.match(/^\/meals\/(\d+)\/analyze$/);
  if (analyzeMatch && method === "POST") {
    const mid = Number(analyzeMatch[1]);
    const meal = store.meals.find((m) => m.id === mid) || store.meals[0];
    let preset = "adequate";
    if (options.body instanceof FormData) {
      preset = options.body.get("demo_preset") || "adequate";
    }
    if (preset === "no_marker" || preset === "too_dark") {
      meal.status = "QUALITY_REJECTED";
      meal.status_explanation =
        preset === "no_marker"
          ? "Image quality insufficient: Marker not visible. Place the standardized cyan reference marker inside the top-left corner."
          : "Image quality insufficient: Too dark. Move to a well-lit area before photographing the meal.";
      meal.overall_confidence_tier = "LOW";
      meal.overall_confidence_pct = 28.0;
      meal.requires_verification = true;
      meal.verification_status = "PENDING";
      meal.quality_check = {
        passed: false,
        quality_score: 0.31,
        blur_variance: 85.0,
        brightness_mean: preset === "too_dark" ? 24.0 : 135.0,
        marker_visible: preset !== "no_marker",
        px_per_cm: preset === "no_marker" ? null : 20.0,
        tray_coverage_ratio: 0.65,
        tilt_degrees: 3.2,
        issues: preset === "no_marker" ? ["Marker not visible"] : ["Too dark"],
        retake_guidance: meal.status_explanation,
      };
    } else if (preset === "significant_shortfall") {
      meal.status = "SIGNIFICANT_SHORTFALL";
      meal.status_explanation =
        "Potential nutritional shortfall detected (significantly below target norms). Human verification recommended.";
      meal.overall_confidence_tier = "LOW";
      meal.overall_confidence_pct = 58.0;
      meal.requires_verification = true;
      meal.verification_status = "PENDING";
      meal.verification_reason = "Significant shortfall with low confidence";
      meal.nutrition = {
        total_calories_low: 295.0, total_calories_likely: 325.0, total_calories_high: 355.0,
        total_protein_low: 7.4, total_protein_likely: 8.5, total_protein_high: 9.6,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: -125.0, protein_gap_likely: -3.5,
        range_straddles_threshold: false,
      };
      meal.detections = makeDetections(meal.id, [95, 110, 125], [60, 70, 80], [45, 55, 65], [22, 28, 34], [35, 45, 55], true);
      meal.quality_check = {
        passed: true, quality_score: 0.88, blur_variance: 138.0, brightness_mean: 144.0,
        marker_visible: true, px_per_cm: 20.0, tray_coverage_ratio: 0.76, tilt_degrees: 1.5, issues: [],
        retake_guidance: "Image quality sufficient for analysis.",
      };
    } else if (preset === "potential_shortfall") {
      meal.status = "POTENTIAL_SHORTFALL";
      meal.status_explanation =
        "Potential nutritional shortfall detected: estimate range overlaps threshold. Human verification recommended.";
      meal.overall_confidence_tier = "MEDIUM";
      meal.overall_confidence_pct = 74.5;
      meal.requires_verification = true;
      meal.verification_status = "PENDING";
      meal.verification_reason = "Estimate range overlaps threshold";
      meal.nutrition = {
        total_calories_low: 418.0, total_calories_likely: 444.0, total_calories_high: 472.0,
        total_protein_low: 11.1, total_protein_likely: 12.1, total_protein_high: 13.3,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: -6.0, protein_gap_likely: 0.1,
        range_straddles_threshold: true,
      };
      meal.detections = makeDetections(meal.id, [135, 150, 165], [95, 110, 125], [70, 85, 100], [35, 42, 50], [55, 65, 75], false);
      meal.quality_check = {
        passed: true, quality_score: 0.89, blur_variance: 142.0, brightness_mean: 148.0,
        marker_visible: true, px_per_cm: 20.0, tray_coverage_ratio: 0.78, tilt_degrees: 1.2, issues: [],
        retake_guidance: "Image quality sufficient for analysis.",
      };
    } else {
      meal.status = "ADEQUATE";
      meal.status_explanation =
        "Estimated meal nutrition appears to meet the configured calorie and protein norms within range.";
      meal.overall_confidence_tier = "MEDIUM";
      meal.overall_confidence_pct = 81.0;
      meal.requires_verification = false;
      meal.verification_status = "NOT_REQUIRED";
      meal.nutrition = {
        total_calories_low: 452.0, total_calories_likely: 486.0, total_calories_high: 520.0,
        total_protein_low: 12.5, total_protein_likely: 13.9, total_protein_high: 15.3,
        target_calories: 450.0, target_protein: 12.0, tolerance_pct: 10.0,
        calorie_gap_likely: 36.0, protein_gap_likely: 1.9,
        range_straddles_threshold: false,
      };
      meal.detections = makeDetections(meal.id, [155, 170, 185], [115, 130, 145], [85, 100, 115], [40, 48, 56], [65, 75, 85], false);
      meal.quality_check = {
        passed: true, quality_score: 0.91, blur_variance: 152.0, brightness_mean: 151.0,
        marker_visible: true, px_per_cm: 20.0, tray_coverage_ratio: 0.80, tilt_degrees: 1.0, issues: [],
        retake_guidance: "Image quality sufficient for analysis.",
      };
    }
    saveStore(store);
    return meal;
  }

  const mealDetailMatch = pathname.match(/^\/meals\/(\d+)(\/nutrition)?$/);
  if (mealDetailMatch && method === "GET") {
    const mid = Number(mealDetailMatch[1]);
    return store.meals.find((m) => m.id === mid) || store.meals[0];
  }

  const flagMatch = pathname.match(/^\/meals\/(\d+)\/flag-verification$/);
  if (flagMatch && method === "POST") {
    const mid = Number(flagMatch[1]);
    const meal = store.meals.find((m) => m.id === mid) || store.meals[0];
    meal.requires_verification = true;
    meal.verification_status = "PENDING";
    meal.verification_reason = "Staff requested manual officer review";
    saveStore(store);
    return meal;
  }

  // 4. Dashboard
  if (pathname === "/dashboard/summary") {
    const meals = store.meals;
    return {
      include_demo: false,
      total_meals_analyzed: meals.length,
      adequate_count: meals.filter((m) => m.status === "ADEQUATE").length,
      potential_shortfalls_count: meals.filter((m) => m.status === "POTENTIAL_SHORTFALL").length,
      significant_shortfalls_count: meals.filter((m) => m.status === "SIGNIFICANT_SHORTFALL").length,
      pending_verification_count: meals.filter((m) => m.verification_status === "PENDING").length,
      low_confidence_count: meals.filter((m) => m.overall_confidence_tier === "LOW").length,
      school_patterns: [
        {
          school_id: 4,
          school_code: "SCH-DWD-301",
          school_name: "Govt Primary School, Navalgund",
          district: "Dharwad",
          scheme: "PM POSHAN",
          total_meals: 4,
          shortfall_count: 4,
          verified_shortfall_count: 3,
          shortfall_rate_pct: 100.0,
          pattern_type: "PERSISTENT_PATTERN",
          flag_for_inspection: true,
          recommendation: "Persistent nutritional shortfall pattern across multiple meals. Field officer review and kitchen ration support check recommended.",
        },
        {
          school_id: 2,
          school_code: "SCH-BLR-102",
          school_name: "Govt Higher Primary School, Yelahanka",
          district: "Bengaluru Urban",
          scheme: "PM POSHAN",
          total_meals: 2,
          shortfall_count: 2,
          verified_shortfall_count: 1,
          shortfall_rate_pct: 100.0,
          pattern_type: "REPEATED_SHORTFALL",
          flag_for_inspection: true,
          recommendation: "Repeated potential nutritional shortfalls detected. Human verification and menu compliance review recommended.",
        },
        {
          school_id: 1,
          school_code: "SCH-BLR-101",
          school_name: "Govt Model Primary School, Malleswaram",
          district: "Bengaluru Urban",
          scheme: "PM POSHAN",
          total_meals: 3,
          shortfall_count: 1,
          verified_shortfall_count: 1,
          shortfall_rate_pct: 33.3,
          pattern_type: "SINGLE_ANOMALY",
          flag_for_inspection: false,
          recommendation: "Single potential shortfall observed. Routine monitoring recommended.",
        },
      ],
      anomalies: [
        {
          meal_id: 5,
          school_id: 4,
          school_name: "Govt Primary School, Navalgund",
          meal_date: "2026-11-15",
          meal_type: "LUNCH",
          calories_likely: 312.0,
          protein_likely: 8.0,
          total_grams_likely: 299.0,
          status: "SIGNIFICANT_SHORTFALL",
          confidence_tier: "LOW",
          anomaly_reasons: [
            "Unusually low calorie estimate (312 kcal vs 450 kcal norm)",
          ],
          banner_message: "Anomaly detected. Review recommended.",
        },
      ],
      active_model: {
        model_state: "SMOKE_TEST_MODEL",
        is_demo: false,
        is_smoke_test: true,
        version_tag: "smoke-test-mobilenet_v3_small-0215b327",
        metrics: store.metrics,
      },
    };
  }

  if (pathname === "/dashboard/trends") {
    return {
      daily_trends: [
        { date: "2026-11-11", avg_calories: 445.0, target_calories: 450.0, avg_protein: 12.3, target_protein: 12.0, adequate: 1, potential_shortfall: 0, significant_shortfall: 1 },
        { date: "2026-11-13", avg_calories: 410.0, target_calories: 450.0, avg_protein: 11.2, target_protein: 12.0, adequate: 0, potential_shortfall: 1, significant_shortfall: 1 },
        { date: "2026-11-14", avg_calories: 433.0, target_calories: 525.0, avg_protein: 12.3, target_protein: 15.0, adequate: 1, potential_shortfall: 0, significant_shortfall: 1 },
        { date: "2026-11-15", avg_calories: 394.0, target_calories: 450.0, avg_protein: 10.6, target_protein: 12.0, adequate: 1, potential_shortfall: 1, significant_shortfall: 1 },
      ],
      school_comparison: [
        { school_name: "Malleswaram Primary", avg_calories: 467.0, avg_protein: 13.0, shortfall_rate_pct: 33.3, total_meals: 3 },
        { school_name: "Yelahanka Higher", avg_calories: 566.5, avg_protein: 16.1, shortfall_rate_pct: 100.0, total_meals: 2 },
        { school_name: "Anganwadi #42 Hunsur", avg_calories: 368.0, avg_protein: 10.9, shortfall_rate_pct: 0.0, total_meals: 1 },
        { school_name: "Navalgund Primary", avg_calories: 346.2, avg_protein: 9.0, shortfall_rate_pct: 100.0, total_meals: 4 },
      ],
      meal_type_comparison: [
        { meal_type: "LUNCH", avg_calories: 442.0, avg_protein: 12.1, count: 10 },
        { meal_type: "BREAKFAST", avg_calories: 265.0, avg_protein: 8.1, count: 2 },
      ],
      confidence_distribution: [
        { tier: "HIGH", count: 1 },
        { tier: "MEDIUM", count: 5 },
        { tier: "LOW", count: 4 },
      ],
    };
  }

  // 5. Verification
  if (pathname === "/verification/pending") {
    return store.meals.filter(
      (m) => m.requires_verification || m.verification_status === "PENDING"
    );
  }

  const verifActionMatch = pathname.match(/^\/verification\/(\d+)$/);
  if (verifActionMatch && method === "POST") {
    const mid = Number(verifActionMatch[1]);
    const meal = store.meals.find((m) => m.id === mid) || store.meals[0];
    meal.verification_status =
      bodyObj.action === "VERIFY"
        ? "VERIFIED"
        : bodyObj.action === "REJECT"
        ? "REJECTED"
        : "CORRECTED";

    if (
      (bodyObj.action === "CORRECT_PORTION" || bodyObj.action === "CORRECT_FOOD") &&
      meal.detections?.length
    ) {
      const det =
        meal.detections.find((d) => d.id === Number(bodyObj.detection_id)) ||
        meal.detections[0];
      if (bodyObj.corrected_food_name) det.detected_food_name = bodyObj.corrected_food_name;
      if (bodyObj.corrected_grams !== undefined) {
        det.estimated_grams_likely = Number(bodyObj.corrected_grams);
        det.estimated_grams_low = Math.max(0, Number(bodyObj.corrected_grams) - 5);
        det.estimated_grams_high = Number(bodyObj.corrected_grams) + 5;
      }
      det.manually_corrected = true;
      store.candidateSamples.push({
        id: store.candidateSamples.length + 1,
        food_class: det.detected_food_name.toLowerCase().replace(/\s+/g, "_"),
        compartment_id: det.compartment_id,
        weighed_grams: det.estimated_grams_likely,
        session_id: `officer_corr_meal_${meal.id}`,
        photographer: "officer@thalicheck.gov.in",
        source_meal_id: meal.id,
        status: "CANDIDATE_NEEDS_REVIEW",
        created_at: new Date().toISOString(),
      });
    }

    store.auditLogs.unshift({
      id: store.auditLogs.length + 1,
      user_email: "officer@thalicheck.gov.in",
      user_role: "OFFICER",
      entity_type: "MealVerification",
      entity_id: String(meal.id),
      action: bodyObj.action,
      previous_value: { verification_status: "PENDING" },
      new_value: { verification_status: meal.verification_status },
      reason: bodyObj.reason || "Officer verification action",
      created_at: new Date().toISOString(),
    });
    saveStore(store);
    return meal;
  }

  // 6. Audit Logs
  if (pathname === "/audit-logs") {
    return store.auditLogs;
  }

  // 7. Dataset Progress & Collection
  if (pathname === "/dataset/progress") {
    return {
      total_approved_samples: 132,
      total_unique_sessions: 6,
      recommended_min_images_per_class: 50,
      recommended_min_calibration_samples: 30,
      class_progress: store.foods.map((f) => ({
        food_id: f.id,
        food_code: f.code,
        food_name: f.name,
        images_count: 12,
        recommended_min_images: 50,
        meets_image_minimum: false,
        sessions_count: 6,
        calibration_samples_count: ["rice", "dal", "sambar"].includes(f.code) ? 34 : 12,
        recommended_min_calibration: 30,
        meets_calibration_minimum: ["rice", "dal", "sambar"].includes(f.code),
      })),
      candidate_samples: store.candidateSamples,
    };
  }

  if (pathname === "/dataset/samples" && method === "POST") {
    return {
      session_id: "sess_static_01",
      quality_check: {
        passed: true,
        quality_score: 0.90,
        blur_variance: 145.0,
        brightness_mean: 149.0,
        marker_visible: true,
        px_per_cm: 20.0,
        tray_coverage_ratio: 0.79,
        tilt_degrees: 1.2,
        issues: [],
        retake_guidance: "Image quality sufficient for dataset collection.",
      },
      samples_created: [
        { id: 201, compartment_id: "comp_1", food_class: "dal", weighed_grams: 120 },
        { id: 202, compartment_id: "comp_2", food_class: "vegetable_curry", weighed_grams: 100 },
        { id: 203, compartment_id: "comp_3", food_class: "curd", weighed_grams: 80 },
        { id: 204, compartment_id: "comp_4", food_class: "rice", weighed_grams: 165 },
        { id: 205, compartment_id: "comp_5", food_class: "chapati", weighed_grams: 50 },
      ],
    };
  }

  if (pathname === "/dataset/export") {
    return {
      exported_rows: 132,
      labels_csv_path: "data/dataset/labels.csv",
      dataset_dir: "data/dataset",
    };
  }

  // 8. Model & Metrics
  if (pathname === "/model/active") {
    return {
      model_state: "SMOKE_TEST_MODEL",
      is_demo: false,
      is_smoke_test: true,
      version_tag: "smoke-test-mobilenet_v3_small-0215b327",
      architecture: "mobilenet_v3_small",
      metrics: store.metrics,
    };
  }

  if (pathname === "/model/metrics") {
    return {
      evaluated: true,
      message: "SMOKE-TEST MODEL: evaluated on synthetic smoke dataset (not a real food model).",
      metrics: store.metrics,
    };
  }

  if (pathname === "/model/train" || pathname === "/model/evaluate") {
    return {
      status: "COMPLETED",
      message: "Completed pipeline run.",
      result: store.metrics,
    };
  }

  // 9. Calibrations, Foods, Norms, Tray Config
  if (pathname === "/calibration" && method === "GET") {
    return store.foods.map((f) => {
      const isCal = ["rice", "dal", "sambar"].includes(f.code);
      return {
        food_id: f.id,
        food_code: f.code,
        food_name: f.name,
        density_g_per_ml: f.density_g_per_ml,
        calibration: {
          version: isCal ? `cal-${f.code}-n34` : `cal-${f.code}-n12-uncalibrated`,
          sample_count: isCal ? 34 : 12,
          is_calibrated: isCal,
          slope: isCal ? 1.02 : 1.0,
          intercept: isCal ? 1.5 : 0.0,
          residual_p10_g: isCal ? -14.0 : -21.0,
          residual_p50_g: 0.0,
          residual_p90_g: isCal ? 15.0 : 21.0,
          mae_g: isCal ? 8.4 : 13.2,
          mape_pct: isCal ? 6.8 : 12.4,
        },
      };
    });
  }

  if (pathname === "/calibration/fit") {
    return { fitted_models: store.foods.map((f) => ({ food_id: f.id, food_name: f.name })) };
  }

  if (pathname === "/foods" && method === "GET") {
    return store.foods;
  }

  if (pathname === "/foods" && method === "POST") {
    const nf = { id: store.foods.length + 1, ...bodyObj };
    store.foods.push(nf);
    saveStore(store);
    return nf;
  }

  const updateFoodMatch = pathname.match(/^\/foods\/(\d+)$/);
  if (updateFoodMatch && method === "PUT") {
    const fid = Number(updateFoodMatch[1]);
    const food = store.foods.find((f) => f.id === fid);
    if (food) Object.assign(food, bodyObj);
    saveStore(store);
    return food;
  }

  if (pathname === "/norms" && method === "GET") {
    return store.norms;
  }

  if (pathname === "/norms" && method === "POST") {
    const nn = { id: store.norms.length + 1, ...bodyObj };
    store.norms.push(nn);
    saveStore(store);
    return nn;
  }

  if (pathname === "/tray-config") {
    return {
      tray_name: "Standardized 5-Compartment School Thali Tray",
      version: "1.0.0",
      tray_width_cm: 32.0,
      tray_height_cm: 24.0,
      marker: { side_length_cm: 3.0, target_rgb: [0, 190, 210] },
      compartments: [
        { id: "comp_1", name: "Top-Left Bowl (Dal / Sambar)", shape: "circle", width_cm: 8.0, height_cm: 8.0, depth_cm: 3.5, volume_ml: 175.0 },
        { id: "comp_2", name: "Top-Center Bowl (Vegetable Curry)", shape: "circle", width_cm: 8.0, height_cm: 8.0, depth_cm: 3.5, volume_ml: 175.0 },
        { id: "comp_3", name: "Top-Right Bowl (Curd / Side / Egg)", shape: "circle", width_cm: 7.5, height_cm: 7.5, depth_cm: 3.2, volume_ml: 140.0 },
        { id: "comp_4", name: "Bottom-Left Main Well (Rice / Staple)", shape: "rounded_rect", width_cm: 15.0, height_cm: 11.0, depth_cm: 3.0, volume_ml: 380.0 },
        { id: "comp_5", name: "Bottom-Right Flat Well (Chapati / Fruit / Salad)", shape: "rounded_rect", width_cm: 11.5, height_cm: 11.0, depth_cm: 2.5, volume_ml: 250.0 },
      ],
    };
  }

  // 10. ThaliShare – Community Contributions
  if (!store.thalishareFoundations) {
    const fresh = createInitialStore();
    store.thalishareFoundations = fresh.thalishareFoundations;
    store.thalishareContributions = fresh.thalishareContributions;
    saveStore(store);
  }

  if (pathname === "/thalishare/foundations" && method === "GET") {
    return store.thalishareFoundations;
  }

  if (pathname === "/thalishare/foundations" && method === "POST") {
    const nf = {
      id: store.thalishareFoundations.length + 1,
      ...bodyObj,
      eligible_recipient: Boolean(bodyObj.verified),
    };
    store.thalishareFoundations.push(nf);
    saveStore(store);
    return nf;
  }

  if (pathname === "/thalishare/contributions" && method === "POST") {
    const fObj = store.thalishareFoundations.find(
      (f) => f.id === Number(bodyObj.foundation_id)
    );
    if (!fObj || !fObj.verified) {
      throw new Error(
        "Contributions are only permitted for organizations whose verification has been completed."
      );
    }
    const ref = `TS-20261117-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sObj = store.schools.find((s) => s.id === Number(bodyObj.school_id));
    const nc = {
      id: store.thalishareContributions.length + 1,
      tracking_ref: ref,
      foundation_id: fObj.id,
      foundation_name: fObj.name,
      foundation_website: fObj.official_website,
      full_name: bodyObj.full_name,
      email: bodyObj.email,
      phone: bodyObj.phone,
      contributor_category: bodyObj.contributor_category || "INDIVIDUAL",
      contribution_type: bodyObj.contribution_type,
      amount_inr: bodyObj.amount_inr || null,
      supply_details: bodyObj.supply_details || null,
      school_id: bodyObj.school_id || null,
      school_name: sObj ? `${sObj.name} (${sObj.code})` : null,
      initiative_name: bodyObj.initiative_name || "Child Nutrition Support",
      meals_supported_est: Number(bodyObj.meals_supported_est || 0),
      children_reached_est: Number(bodyObj.children_reached_est || 0),
      message: bodyObj.message || null,
      status: "ENQUIRY_RECORDED",
      receipt_note: `Enquiry Reference ${ref} recorded. No online payment was processed on ThaliCheck; please coordinate directly with the verified organization using this reference.`,
      utilization_report:
        "Pending confirmation & utilization report from receiving organization.",
      is_demo: Boolean(bodyObj.is_demo || fObj.is_demo),
    };
    store.thalishareContributions.unshift(nc);
    saveStore(store);
    return nc;
  }

  if (pathname === "/thalishare/impact") {
    const incDemo = url.searchParams.get("include_demo") === "true";
    const fList = store.thalishareFoundations.filter(
      (f) => f.verified && (incDemo || !f.is_demo)
    );
    const cList = store.thalishareContributions.filter(
      (c) => incDemo || !c.is_demo
    );
    return {
      include_demo: incDemo,
      total_contributions_count: cList.length,
      total_monetary_pledged_inr: cList.reduce(
        (acc, c) => acc + Number(c.amount_inr || 0),
        0
      ),
      meals_supported: cList.reduce(
        (acc, c) => acc + Number(c.meals_supported_est || 0),
        0
      ),
      children_reached: cList.reduce(
        (acc, c) => acc + Number(c.children_reached_est || 0),
        0
      ),
      schools_supported: new Set(
        cList.filter((c) => c.school_id).map((c) => c.school_id)
      ).size,
      active_verified_foundations: fList.length,
      recent_contributions: cList.slice(0, 10),
    };
  }

  if (pathname === "/thalishare/track") {
    const q = (url.searchParams.get("query") || "").trim().toLowerCase();
    return store.thalishareContributions.filter(
      (c) =>
        c.tracking_ref.toLowerCase() === q || c.email.toLowerCase() === q
    );
  }

  return {};
}
