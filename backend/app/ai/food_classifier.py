import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image
from app.config import settings

try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    HAS_TORCH = True
except Exception:
    HAS_TORCH = False


DEFAULT_FOOD_CLASSES = [
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
]

CODE_TO_DISPLAY_NAME = {
    "rice": "Rice",
    "dal": "Dal",
    "sambar": "Sambar",
    "vegetable_curry": "Vegetable Curry",
    "chapati": "Chapati",
    "ragi_mudde": "Ragi Mudde",
    "curd": "Curd",
    "egg": "Egg",
    "fruits": "Fruits",
    "vegetables": "Vegetables",
    "unknown": "Unknown / Other",
}


def build_torchvision_classifier(num_classes: int, architecture: str = "mobilenet_v3_small", pretrained: bool = False):
    if not HAS_TORCH:
        raise RuntimeError("PyTorch and torchvision are required to build the classifier.")

    if architecture == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        try:
            net = models.efficientnet_b0(weights=weights)
        except Exception:
            net = models.efficientnet_b0(weights=None)
        in_features = net.classifier[1].in_features
        net.classifier[1] = nn.Linear(in_features, num_classes)
        return net

    # Default: MobileNetV3-Small
    weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
    try:
        net = models.mobilenet_v3_small(weights=weights)
    except Exception:
        net = models.mobilenet_v3_small(weights=None)
    in_features = net.classifier[3].in_features
    net.classifier[3] = nn.Linear(in_features, num_classes)
    return net


def apply_temperature_scaling(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    t = max(0.05, float(temperature))
    scaled = logits / t
    scaled = scaled - np.max(scaled)
    exp_scores = np.exp(scaled)
    return exp_scores / np.sum(exp_scores)


class FoodRecognitionModule:
    """
    Clean interface for per-compartment food recognition.
    Supports:
    1. Real evaluated PyTorch model (`REAL_MODEL`)
    2. Smoke-test PyTorch model (`SMOKE_TEST_MODEL` - tagged `smoke_test_only`, never presented as a real food model)
    3. Clearly labeled `DEMO_MODE` fallback when no trained model weights exist.
    """

    def __init__(self):
        self.cached_weights_path: Optional[str] = None
        self.model = None
        self.metadata: Dict[str, Any] = {}

    def get_active_model_info(self, db_active_model=None) -> Dict[str, Any]:
        """
        Determines current model state (`REAL_MODEL`, `SMOKE_TEST_MODEL`, or `DEMO_MODE`)
        and reads metrics from `ai_models/reports/metrics.json` if present.
        Never invents or hard-codes accuracy figures.
        """
        metrics_file = settings.MODEL_REPORTS_DIR / "metrics.json"
        metrics_data = None
        if metrics_file.exists():
            try:
                with open(metrics_file, "r", encoding="utf-8") as f:
                    metrics_data = json.load(f)
            except Exception:
                metrics_data = None

        weights_meta_file = settings.MODEL_WEIGHTS_DIR / "active_model_meta.json"
        meta = None
        if weights_meta_file.exists():
            try:
                with open(weights_meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception:
                meta = None

        if db_active_model is not None:
            w_path = Path(db_active_model.weights_path)
            if not w_path.is_absolute():
                w_path = settings.MODEL_WEIGHTS_DIR.parent.parent / db_active_model.weights_path
            if w_path.exists():
                is_smoke = bool(db_active_model.is_smoke_test)
                state = "SMOKE_TEST_MODEL" if is_smoke else "REAL_MODEL"
                return {
                    "model_state": state,
                    "is_demo": False,
                    "is_smoke_test": is_smoke,
                    "version_tag": db_active_model.version_tag,
                    "architecture": db_active_model.architecture,
                    "weights_path": str(w_path),
                    "classes": db_active_model.classes,
                    "temperature_scale": db_active_model.temperature_scale,
                    "low_confidence_threshold": db_active_model.low_confidence_threshold,
                    "trained_at": db_active_model.trained_at.isoformat() if db_active_model.trained_at else None,
                    "dataset_hash": db_active_model.dataset_hash,
                    "metrics": metrics_data,
                }

        if meta and (settings.MODEL_WEIGHTS_DIR / meta.get("weights_filename", "best_model.pt")).exists():
            is_smoke = bool(meta.get("smoke_test_only", False))
            state = "SMOKE_TEST_MODEL" if is_smoke else "REAL_MODEL"
            return {
                "model_state": state,
                "is_demo": False,
                "is_smoke_test": is_smoke,
                "version_tag": meta.get("version_tag", "v1-local"),
                "architecture": meta.get("architecture", "mobilenet_v3_small"),
                "weights_path": str(settings.MODEL_WEIGHTS_DIR / meta.get("weights_filename", "best_model.pt")),
                "classes": meta.get("classes", DEFAULT_FOOD_CLASSES),
                "temperature_scale": float(meta.get("temperature_scale", 1.0)),
                "low_confidence_threshold": float(meta.get("low_confidence_threshold", settings.LOW_CONFIDENCE_THRESHOLD)),
                "trained_at": meta.get("trained_at"),
                "dataset_hash": meta.get("dataset_hash", "unknown"),
                "metrics": metrics_data,
            }

        return {
            "model_state": "DEMO_MODE",
            "is_demo": True,
            "is_smoke_test": False,
            "version_tag": "demo-simulated-v1",
            "architecture": "simulated_compartment_prior_and_color_signature",
            "weights_path": None,
            "classes": DEFAULT_FOOD_CLASSES,
            "temperature_scale": 1.0,
            "low_confidence_threshold": settings.LOW_CONFIDENCE_THRESHOLD,
            "trained_at": None,
            "dataset_hash": None,
            "metrics": metrics_data,
        }

    def _load_pytorch_model(self, model_info: Dict[str, Any]) -> bool:
        if not HAS_TORCH or not model_info.get("weights_path"):
            return False
        w_path = model_info["weights_path"]
        if self.cached_weights_path == w_path and self.model is not None:
            return True

        try:
            classes = model_info.get("classes", DEFAULT_FOOD_CLASSES)
            arch = model_info.get("architecture", "mobilenet_v3_small")
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            net = build_torchvision_classifier(len(classes), architecture=arch, pretrained=False)
            state_dict = torch.load(w_path, map_location=device, weights_only=True)
            if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
                net.load_state_dict(state_dict["model_state_dict"])
            else:
                net.load_state_dict(state_dict)
            net.to(device)
            net.eval()
            self.model = net
            self.cached_weights_path = w_path
            self.metadata = model_info
            return True
        except Exception:
            return False

    def classify_compartment(
        self,
        crop_img: Image.Image,
        compartment_id: str,
        comp_metric: Dict[str, Any],
        default_expected_food: str,
        model_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Classifies a single compartment crop.
        If a real or smoke-test PyTorch model is active and loaded, runs forward pass + temperature scaling.
        Otherwise runs deterministic color/texture + tray prior analysis clearly flagged under DEMO_MODE.
        """
        low_conf_thresh = float(model_info.get("low_confidence_threshold", settings.LOW_CONFIDENCE_THRESHOLD))
        fill_fraction = float(comp_metric.get("fill_fraction", 0.0))

        # Empty compartment check
        if fill_fraction < 0.05:
            return {
                "food_code": "unknown",
                "food_name": "Unknown / Other",
                "raw_confidence": 0.91,
                "calibrated_confidence": 0.89,
                "is_low_confidence": True,
                "top3": [{"class": "Unknown / Other", "probability": 0.89}],
            }

        if model_info["model_state"] in ("REAL_MODEL", "SMOKE_TEST_MODEL") and self._load_pytorch_model(model_info):
            device = next(self.model.parameters()).device
            preprocess = transforms.Compose([
                transforms.Resize((128, 128)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            input_tensor = preprocess(crop_img.convert("RGB")).unsqueeze(0).to(device)
            with torch.no_grad():
                logits = self.model(input_tensor).cpu().numpy()[0]

            raw_probs = apply_temperature_scaling(logits, temperature=1.0)
            cal_probs = apply_temperature_scaling(logits, temperature=float(model_info.get("temperature_scale", 1.0)))

            classes = model_info.get("classes", DEFAULT_FOOD_CLASSES)
            top_indices = np.argsort(cal_probs)[::-1][:3]
            best_idx = int(top_indices[0])
            code = classes[best_idx]
            display_name = CODE_TO_DISPLAY_NAME.get(code, code.replace("_", " ").title())
            raw_conf = float(raw_probs[best_idx])
            cal_conf = float(cal_probs[best_idx])
            is_low = bool(cal_conf < low_conf_thresh or code == "unknown")

            top3 = [
                {
                    "class": CODE_TO_DISPLAY_NAME.get(classes[i], classes[i]),
                    "probability": round(float(cal_probs[i]), 3),
                }
                for i in top_indices
            ]
            return {
                "food_code": code,
                "food_name": display_name,
                "raw_confidence": round(raw_conf, 3),
                "calibrated_confidence": round(cal_conf, 3),
                "is_low_confidence": is_low,
                "top3": top3,
            }

        # DEMO_MODE fallback: uses image color/chroma signature + compartment prior
        mean_r, mean_g, mean_b = comp_metric.get("mean_rgb", [180.0, 180.0, 180.0])
        chroma = float(comp_metric.get("mean_chroma", 20.0))

        # Infer food signature from compartment visual profile or default mapping
        expected_code = default_expected_food.lower().replace(" ", "_")
        if mean_r > 215 and mean_g > 215 and mean_b > 205 and chroma < 28:
            code = "rice" if "comp_4" in compartment_id else "curd"
            raw_conf = 0.88
        elif mean_r > 195 and mean_g > 155 and mean_b < 95:
            code = "dal" if "comp_1" in compartment_id else "sambar"
            raw_conf = 0.85
        elif mean_r > 175 and mean_g > 105 and mean_b < 85:
            code = "sambar"
            raw_conf = 0.83
        elif mean_g > mean_r * 0.92 and chroma > 24:
            code = "vegetable_curry" if "comp_2" in compartment_id else "vegetables"
            raw_conf = 0.81
        elif 145 <= mean_r <= 205 and 115 <= mean_g <= 170 and 75 <= mean_b <= 135:
            code = "chapati" if "comp_5" in compartment_id else "ragi_mudde"
            raw_conf = 0.84
        else:
            code = expected_code if expected_code in CODE_TO_DISPLAY_NAME else "rice"
            raw_conf = 0.76

        cal_conf = round(raw_conf * 0.96, 3)
        display_name = CODE_TO_DISPLAY_NAME.get(code, default_expected_food)
        is_low = bool(cal_conf < low_conf_thresh or code == "unknown")

        return {
            "food_code": code,
            "food_name": display_name,
            "raw_confidence": round(raw_conf, 3),
            "calibrated_confidence": cal_conf,
            "is_low_confidence": is_low,
            "top3": [
                {"class": display_name, "probability": cal_conf},
                {"class": default_expected_food, "probability": round(1.0 - cal_conf, 3)},
            ],
        }


food_recognition_module = FoodRecognitionModule()
