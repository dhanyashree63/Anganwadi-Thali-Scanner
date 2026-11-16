"""
Synthetic Smoke-Test Dataset Generator for ThaliCheck.
Generates a tiny, CLEARLY LABELED synthetic dataset (colored tray & compartment shapes)
used ONLY to verify that the PyTorch training, session-based splitting, temperature calibration,
and evaluation pipeline code runs end to end.

HONESTY RULE:
Any model trained on this dataset is tagged `smoke_test_only = true` (`is_smoke_test = True`)
and is NEVER presented as a real food recognition model.
"""
import argparse
import csv
import json
from pathlib import Path
import random
from PIL import Image, ImageDraw

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SMOKE_CLASSES = [
    ("rice", (242, 242, 235), "comp_4", 155.0),
    ("dal", (232, 185, 45), "comp_1", 120.0),
    ("sambar", (205, 95, 38), "comp_1", 130.0),
    ("vegetable_curry", (95, 165, 68), "comp_2", 110.0),
    ("chapati", (188, 148, 96), "comp_5", 75.0),
    ("curd", (245, 248, 250), "comp_3", 90.0),
    ("egg", (250, 220, 110), "comp_3", 55.0),
    ("ragi_mudde", (125, 98, 90), "comp_4", 160.0),
    ("fruits", (238, 205, 65), "comp_5", 85.0),
    ("vegetables", (72, 155, 82), "comp_2", 95.0),
    ("unknown", (168, 172, 176), "comp_3", 0.0),
]


def generate_smoke_crop_image(
    out_path: Path,
    base_rgb: tuple,
    idx: int,
    class_code: str,
):
    rng = random.Random(hash((class_code, idx)))
    img = Image.new("RGB", (128, 128), color=(172, 175, 180))
    draw = ImageDraw.Draw(img)

    jitter = lambda c: max(0, min(255, c + rng.randint(-15, 15)))
    fill_color = (jitter(base_rgb[0]), jitter(base_rgb[1]), jitter(base_rgb[2]))

    margin = rng.randint(10, 22)
    if class_code in ("rice", "curd", "dal", "sambar"):
        draw.ellipse([margin, margin, 128 - margin, 128 - margin], fill=fill_color, outline=(120, 120, 125), width=2)
    elif class_code in ("chapati", "ragi_mudde", "egg"):
        draw.rounded_rectangle(
            [margin, margin, 128 - margin, 128 - margin],
            radius=18,
            fill=fill_color,
            outline=(110, 100, 90),
            width=2,
        )
    elif class_code == "unknown":
        # Empty metallic compartment pattern
        draw.line([16, 16, 112, 112], fill=(150, 152, 156), width=2)
    else:
        draw.rectangle([margin, margin, 128 - margin, 128 - margin], fill=fill_color, outline=(90, 120, 85), width=2)

    # Add deterministic synthetic texture speckles so classifier learns distinct shape+color features
    for _ in range(25):
        px = rng.randint(margin + 5, 128 - margin - 5)
        py = rng.randint(margin + 5, 128 - margin - 5)
        speckle = (jitter(base_rgb[0] - 20), jitter(base_rgb[1] - 20), jitter(base_rgb[2] - 20))
        draw.ellipse([px, py, px + 4, py + 4], fill=speckle)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="JPEG", quality=92)


def generate_synthetic_tray_image(
    out_path: Path,
    tray_config_path: Path,
    variant: str = "adequate",
):
    """
    Generates a full standardized 5-compartment thali tray image with the cyan reference marker
    so marker detection, pixel-to-cm scale, quality checks, and demo workflows have real local images.
    """
    with open(tray_config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    w, h = 640, 480
    if variant == "dark":
        bg_color = (22, 24, 26)
        tray_color = (32, 34, 38)
    else:
        bg_color = (118, 124, 132)
        tray_color = (186, 190, 196)

    img = Image.new("RGB", (w, h), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw outer stainless steel tray
    draw.rounded_rectangle([18, 14, w - 18, h - 14], radius=24, fill=tray_color, outline=(140, 145, 152), width=4)

    # Draw standardized 3.0 cm cyan reference marker in top-left corner (60x60 px => 20 px/cm)
    if variant != "no_marker":
        marker_rgb = tuple(cfg["marker"]["target_rgb"])
        draw.rectangle([34, 28, 94, 88], fill=marker_rgb, outline=(255, 255, 255), width=2)

    compartment_colors = {
        "comp_1": (228, 178, 42),   # Dal
        "comp_2": (88, 158, 65),    # Vegetable Curry
        "comp_3": (244, 246, 248),  # Curd
        "comp_4": (240, 240, 232),  # Rice
        "comp_5": (186, 144, 92),   # Chapati
    }

    fill_scale = 0.88
    if variant == "potential_shortfall":
        fill_scale = 0.68
    elif variant == "significant_shortfall":
        fill_scale = 0.42

    for comp in cfg["compartments"]:
        cid = comp["id"]
        rx1, ry1, rx2, ry2 = comp["rel_bbox"]
        x1, y1, x2, y2 = int(rx1 * w), int(ry1 * h), int(rx2 * w), int(ry2 * h)

        # Draw metallic compartment recess
        draw.rounded_rectangle([x1, y1, x2, y2], radius=16, fill=(168, 172, 178), outline=(128, 132, 138), width=3)

        if variant != "dark":
            # Draw food portion inside compartment scaled by fill_scale
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0
            hw = ((x2 - x1) / 2.0) * fill_scale
            hh = ((y2 - y1) / 2.0) * fill_scale
            fc = compartment_colors.get(cid, (210, 180, 100))
            draw.ellipse([cx - hw, cy - hh, cx + hw, cy + hh], fill=fc)
            # Add texture highlights so Laplacian blur variance is sharp (>100)
            for step in range(-int(hw * 0.7), int(hw * 0.7), 10):
                draw.rectangle(
                    [cx + step - 2, cy + step * 0.5 - 2, cx + step + 2, cy + step * 0.5 + 2],
                    fill=(max(0, fc[0] - 35), max(0, fc[1] - 35), max(0, fc[2] - 35)),
                )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="JPEG", quality=94)


def make_synthetic_smoke_dataset(
    dataset_dir: Path,
    samples_per_class: int = 12,
    num_sessions: int = 6,
) -> dict:
    """
    Creates `data/dataset/<food_class>/*.jpg`, `labels.csv`, and `smoke_dataset_manifest.json`.
    Assigns samples across distinct `session_id`s so `train.py` can split by session without leakage.
    """
    dataset_dir.mkdir(parents=True, exist_ok=True)
    labels_csv = dataset_dir / "labels.csv"

    sessions = [f"smoke_sess_{i:02d}" for i in range(1, num_sessions + 1)]
    rows = []

    for class_code, base_rgb, default_comp, base_grams in SMOKE_CLASSES:
        class_dir = dataset_dir / class_code
        class_dir.mkdir(parents=True, exist_ok=True)

        for idx in range(samples_per_class):
            session_id = sessions[idx % len(sessions)]
            img_name = f"{class_code}_{session_id}_{idx:03d}.jpg"
            img_path = class_dir / img_name
            generate_smoke_crop_image(img_path, base_rgb, idx, class_code)

            rng = random.Random(hash((class_code, session_id, idx)))
            weighed_g = 0.0 if class_code == "unknown" else round(base_grams * rng.uniform(0.82, 1.18), 1)

            rows.append({
                "image_path": f"{class_code}/{img_name}",
                "food_class": class_code,
                "compartment_id": default_comp,
                "weighed_grams": weighed_g,
                "session_id": session_id,
                "photographer": "smoke_test_generator",
                "lighting_note": "synthetic_smoke_only",
            })

    with open(labels_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "image_path",
                "food_class",
                "compartment_id",
                "weighed_grams",
                "session_id",
                "photographer",
                "lighting_note",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    manifest = {
        "smoke_test_only": True,
        "warning": "SYNTHETIC SMOKE-TEST DATASET ONLY. Any model trained on this dataset must be tagged smoke_test_only=True.",
        "total_samples": len(rows),
        "classes": [c[0] for c in SMOKE_CLASSES],
        "sessions": sessions,
    }
    with open(dataset_dir / "smoke_dataset_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Also generate demo tray images in data/demo/
    demo_dir = PROJECT_ROOT / "data" / "demo"
    tray_cfg_path = PROJECT_ROOT / "data" / "tray" / "tray_config.json"
    if tray_cfg_path.exists():
        generate_synthetic_tray_image(demo_dir / "demo_tray_adequate.jpg", tray_cfg_path, variant="adequate")
        generate_synthetic_tray_image(demo_dir / "demo_tray_potential_shortfall.jpg", tray_cfg_path, variant="potential_shortfall")
        generate_synthetic_tray_image(demo_dir / "demo_tray_significant_shortfall.jpg", tray_cfg_path, variant="significant_shortfall")
        generate_synthetic_tray_image(demo_dir / "demo_tray_no_marker.jpg", tray_cfg_path, variant="no_marker")
        generate_synthetic_tray_image(demo_dir / "demo_tray_too_dark.jpg", tray_cfg_path, variant="dark")

    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic smoke-test dataset for ThaliCheck")
    parser.add_argument("--out-dir", type=str, default=str(PROJECT_ROOT / "data" / "dataset"))
    parser.add_argument("--samples-per-class", type=int, default=12)
    args = parser.parse_args()
    result = make_synthetic_smoke_dataset(Path(args.out_dir), samples_per_class=args.samples_per_class)
    print(f"Created smoke-test dataset with {result['total_samples']} samples across {len(result['sessions'])} sessions.")
