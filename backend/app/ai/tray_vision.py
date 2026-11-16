import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
from scipy import ndimage
from app.config import settings


def load_tray_config(custom_path: Optional[Path] = None) -> Dict[str, Any]:
    path = custom_path or settings.TRAY_CONFIG_PATH
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_laplacian_blur_variance(gray_arr: np.ndarray) -> float:
    """
    Computes variance of Laplacian using SciPy ndimage.laplace (no OpenCV).
    Higher values indicate sharper edges; very low values indicate blur.
    """
    lap = ndimage.laplace(gray_arr.astype(np.float32))
    return float(np.var(lap))


def detect_reference_marker(
    rgb_arr: np.ndarray,
    tray_config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Detects the standardized high-contrast square reference marker using NumPy + SciPy connected components.
    Computes pixel-to-cm scale and estimates rotation/tilt angle from bounding geometry.
    """
    h, w, _ = rgb_arr.shape
    marker_cfg = tray_config.get("marker", {})
    target_rgb = np.array(marker_cfg.get("target_rgb", [0, 190, 210]), dtype=np.float32)
    tolerance = float(marker_cfg.get("rgb_tolerance", 75.0))
    side_cm = float(marker_cfg.get("side_length_cm", 3.0))

    # Color distance threshold in RGB space, plus cyan dominance check (G and B significantly > R)
    diff = np.linalg.norm(rgb_arr.astype(np.float32) - target_rgb, axis=2)
    cyan_dominance = (
        (rgb_arr[:, :, 1].astype(np.int16) - rgb_arr[:, :, 0].astype(np.int16) > 35)
        & (rgb_arr[:, :, 2].astype(np.int16) - rgb_arr[:, :, 0].astype(np.int16) > 45)
        & (rgb_arr[:, :, 2] > 95)
    )
    mask = (diff <= tolerance) & cyan_dominance

    labeled, num_features = ndimage.label(mask)
    if num_features == 0:
        return {
            "detected": False,
            "px_per_cm": None,
            "bbox": None,
            "aspect_ratio": None,
            "tilt_degrees": 0.0,
            "marker_quality_score": 0.0,
        }

    min_area = max(36, int(h * w * 0.0004))
    max_area = int(h * w * 0.12)

    best_candidate = None
    best_score = -1.0

    objs = ndimage.find_objects(labeled)
    for idx, slc in enumerate(objs, start=1):
        if slc is None:
            continue
        ys, xs = slc
        comp_mask = labeled[ys, xs] == idx
        area = int(np.sum(comp_mask))
        if area < min_area or area > max_area:
            continue

        bw = xs.stop - xs.start
        bh = ys.stop - ys.start
        if bw <= 4 or bh <= 4:
            continue

        aspect = float(min(bw, bh)) / float(max(bw, bh))
        fill_density = float(area) / float(bw * bh)

        # Square marker should have aspect close to 1.0 and high fill density
        if aspect < 0.55 or fill_density < 0.45:
            continue

        score = aspect * 0.6 + min(fill_density, 1.0) * 0.4
        if score > best_score:
            best_score = score
            # Estimate tilt/perspective distortion from aspect ratio and principal axes
            tilt_deg = float(np.degrees(np.arccos(min(1.0, max(0.5, aspect))))) * 0.65
            side_px = float((bw + bh) / 2.0)
            best_candidate = {
                "detected": True,
                "px_per_cm": round(side_px / side_cm, 3),
                "bbox": [int(xs.start), int(ys.start), int(xs.stop), int(ys.stop)],
                "side_px": round(side_px, 2),
                "aspect_ratio": round(aspect, 3),
                "fill_density": round(fill_density, 3),
                "tilt_degrees": round(tilt_deg, 2),
                "marker_quality_score": round(float(score), 3),
            }

    if best_candidate is None:
        return {
            "detected": False,
            "px_per_cm": None,
            "bbox": None,
            "aspect_ratio": None,
            "tilt_degrees": 0.0,
            "marker_quality_score": 0.0,
        }

    return best_candidate


def estimate_tray_coverage(rgb_arr: np.ndarray) -> float:
    """
    Estimates how much of the camera frame is occupied by the tray vs dark/outer background.
    """
    h, w, _ = rgb_arr.shape
    gray = np.mean(rgb_arr, axis=2)
    # Border region sample
    border_vals = np.concatenate([
        gray[0:max(2, h // 20), :].ravel(),
        gray[h - max(2, h // 20):h, :].ravel(),
    ])
    border_median = float(np.median(border_vals))
    # Foreground pixels that differ from background or have stainless-steel/food luminance
    tray_mask = (np.abs(gray - border_median) > 14.0) | (gray > 75.0)
    coverage = float(np.mean(tray_mask))
    return round(min(1.0, max(0.1, coverage)), 3)


def run_image_quality_gate(
    image_path: Path,
    tray_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Runs all image quality checks required by Section 8:
    - Blur (Laplacian variance via SciPy)
    - Brightness
    - Marker visibility
    - Tray coverage / framing
    - Perspective tilt
    Returns plain retake guidance ("Move closer", "Marker not visible", "Too dark", "Image blurry", etc.)
    """
    cfg = tray_config or load_tray_config()
    with Image.open(image_path) as img:
        rgb_img = img.convert("RGB")
        width_px, height_px = rgb_img.size
        rgb_arr = np.asarray(rgb_img, dtype=np.uint8)

    gray_arr = np.mean(rgb_arr, axis=2).astype(np.float32)
    blur_var = compute_laplacian_blur_variance(gray_arr)
    brightness_mean = float(np.mean(gray_arr))
    marker_info = detect_reference_marker(rgb_arr, cfg)
    tray_coverage = estimate_tray_coverage(rgb_arr)
    tilt_deg = float(marker_info.get("tilt_degrees", 0.0))

    issues: List[str] = []
    guidance_parts: List[str] = []

    if not marker_info["detected"]:
        issues.append("Marker not visible")
        guidance_parts.append(
            "Marker not visible: Place the standardized cyan reference marker clearly inside the top-left corner of the tray."
        )

    if brightness_mean < 45.0:
        issues.append("Too dark")
        guidance_parts.append(
            "Too dark: Move to a well-lit area or turn on overhead lighting before photographing the meal."
        )
    elif brightness_mean > 242.0:
        issues.append("Overexposed / glare")
        guidance_parts.append(
            "Too bright / glare: Reduce direct flash glare on the steel tray."
        )

    if blur_var < 35.0:
        issues.append("Image blurry")
        guidance_parts.append(
            "Image blurry: Hold the camera steady directly above the tray and tap to focus."
        )

    # Check if camera is too far away (either low tray coverage or tiny marker scale)
    px_per_cm = marker_info.get("px_per_cm")
    if tray_coverage < 0.42 or (px_per_cm is not None and px_per_cm < 6.0):
        issues.append("Move closer")
        guidance_parts.append(
            "Move closer: Frame the standardized thali tray so it fills at least 65% of the screen."
        )

    if tilt_deg > 28.0:
        issues.append("Tray tilted too much")
        guidance_parts.append(
            "Tray tilted too much: Hold the phone parallel to the tray surface (top-down view)."
        )

    passed = len(issues) == 0

    # Calculate normalized quality score in [0, 1]
    blur_score = min(1.0, blur_var / 180.0)
    bright_score = 1.0 if 75.0 <= brightness_mean <= 210.0 else max(0.1, 1.0 - abs(brightness_mean - 140.0) / 140.0)
    marker_score = float(marker_info.get("marker_quality_score", 0.0)) if marker_info["detected"] else 0.0
    coverage_score = min(1.0, tray_coverage / 0.70)

    quality_score = round(
        0.35 * marker_score + 0.30 * blur_score + 0.20 * bright_score + 0.15 * coverage_score,
        3,
    )

    retake_guidance = " ".join(guidance_parts) if guidance_parts else "Image quality sufficient for analysis."

    return {
        "passed": passed,
        "width_px": width_px,
        "height_px": height_px,
        "quality_score": quality_score,
        "blur_variance": round(blur_var, 2),
        "brightness_mean": round(brightness_mean, 2),
        "marker_visible": bool(marker_info["detected"]),
        "px_per_cm": px_per_cm,
        "marker_bbox": marker_info.get("bbox"),
        "tray_coverage_ratio": tray_coverage,
        "tilt_degrees": round(tilt_deg, 2),
        "issues": issues,
        "retake_guidance": retake_guidance,
    }


def extract_compartment_crops(
    image_path: Path,
    tray_config: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Image.Image], Dict[str, Dict[str, Any]]]:
    """
    Locates each compartment from tray_config and extracts RGB crops and fill-fraction metrics.
    Uses pixel-to-cm scale from the detected marker when available to verify compartment geometry.
    """
    cfg = tray_config or load_tray_config()
    with Image.open(image_path) as img:
        rgb_img = img.convert("RGB")
        w, h = rgb_img.size
        rgb_arr = np.asarray(rgb_img, dtype=np.uint8)

    marker_info = detect_reference_marker(rgb_arr, cfg)
    px_per_cm = marker_info.get("px_per_cm") or (w / float(cfg.get("tray_width_cm", 32.0)))

    crops: Dict[str, Image.Image] = {}
    comp_metrics: Dict[str, Dict[str, Any]] = {}

    # Estimate empty stainless-steel tray baseline color from tray borders/dividers
    gray_full = np.mean(rgb_arr, axis=2)
    steel_ref_r = float(np.percentile(rgb_arr[:, :, 0], 60))
    steel_ref_g = float(np.percentile(rgb_arr[:, :, 1], 60))
    steel_ref_b = float(np.percentile(rgb_arr[:, :, 2], 60))
    steel_ref = np.array([steel_ref_r, steel_ref_g, steel_ref_b], dtype=np.float32)

    for comp in cfg.get("compartments", []):
        cid = comp["id"]
        rel_x1, rel_y1, rel_x2, rel_y2 = comp["rel_bbox"]
        x1 = max(0, min(w - 2, int(rel_x1 * w)))
        y1 = max(0, min(h - 2, int(rel_y1 * h)))
        x2 = max(x1 + 2, min(w, int(rel_x2 * w)))
        y2 = max(y1 + 2, min(h, int(rel_y2 * h)))

        crop_img = rgb_img.crop((x1, y1, x2, y2))
        crops[cid] = crop_img

        crop_arr = np.asarray(crop_img, dtype=np.float32)
        # Compute fill fraction via color saturation + chroma difference from neutral steel plate + texture
        r, g, b = crop_arr[:, :, 0], crop_arr[:, :, 1], crop_arr[:, :, 2]
        chroma = np.max(crop_arr, axis=2) - np.min(crop_arr, axis=2)
        color_dist = np.linalg.norm(crop_arr - steel_ref, axis=2)
        local_std = ndimage.uniform_filter(np.abs(crop_arr.mean(axis=2) - crop_arr.mean()), size=5)

        # A pixel is occupied by food if it has chroma > 16, or strong luminance/color contrast from neutral gray steel
        neutral_gray_mask = (chroma < 12.0) & (np.abs(crop_arr.mean(axis=2) - 172.0) < 22.0)
        food_pixel_mask = (~neutral_gray_mask) & ((chroma > 14.0) | (color_dist > 26.0) | (local_std > 10.0))

        raw_fill = float(np.mean(food_pixel_mask))
        # Clamp fill fraction to realistic range [0.0, 0.95]
        fill_fraction = 0.0 if raw_fill < 0.08 else min(0.95, max(0.12, raw_fill * 0.92))

        measured_width_cm = round((x2 - x1) / float(px_per_cm), 2)
        measured_height_cm = round((y2 - y1) / float(px_per_cm), 2)

        comp_metrics[cid] = {
            "compartment_id": cid,
            "name": comp["name"],
            "shape": comp.get("shape", "circle"),
            "bbox_px": [x1, y1, x2, y2],
            "configured_volume_ml": float(comp["volume_ml"]),
            "measured_width_cm": measured_width_cm,
            "measured_height_cm": measured_height_cm,
            "fill_fraction": round(fill_fraction, 3),
            "mean_rgb": [
                round(float(np.mean(r)), 1),
                round(float(np.mean(g)), 1),
                round(float(np.mean(b)), 1),
            ],
            "mean_chroma": round(float(np.mean(chroma)), 1),
        }

    return crops, comp_metrics
