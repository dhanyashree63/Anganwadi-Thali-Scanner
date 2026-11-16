"""
PyTorch Food Recognition Fine-Tuning Pipeline (`ai_models/train.py`).

Features required by Section 9 & Section 10:
- Fine-tunes pretrained MobileNetV3-Small or EfficientNet-B0 (torchvision) on a local labeled dataset.
- Dataset layout: `data/dataset/<food_class>/*.jpg` + `labels.csv`.
- Splits strictly by `session_id` (70/15/15 train/val/test) so near-duplicate images from the same meal/session never leak across splits.
- Handles class imbalance via inverse-frequency class weights.
- Applies data augmentation (random crop, rotation, color jitter, brightness/contrast, Gaussian blur, horizontal flip).
- Early stopping, CosineAnnealingLR schedule, deterministic seeds.
- Fits post-hoc temperature scaling on validation set logits for confidence calibration.
- Chooses low-confidence threshold from validation set so low-confidence flags capture errors.
- Tags models trained on synthetic smoke data with `smoke_test_only = True`.
"""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import random
from typing import Any, Dict, List, Tuple
import numpy as np
from PIL import Image
from scipy.optimize import minimize

PROJECT_ROOT = Path(__file__).resolve().parent.parent

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import Dataset, DataLoader
    from torchvision import models, transforms
    HAS_TORCH = True
except Exception:
    HAS_TORCH = False


def set_deterministic_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    if HAS_TORCH:
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)


def split_samples_by_session(
    rows: List[Dict[str, Any]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Splits dataset rows strictly by `session_id` (never by individual image) so that
    near-duplicate compartment photos from the same meal session cannot leak across train/val/test.
    Guarantees zero session overlap between train, val, and test splits.
    """
    sessions = sorted(list({str(r["session_id"]) for r in rows}))
    rng = random.Random(seed)
    rng.shuffle(sessions)

    n = len(sessions)
    if n < 3:
        # Ensure non-empty splits if fewer than 3 sessions exist
        train_s = set(sessions[:1])
        val_s = set(sessions[1:2]) if n >= 2 else set()
        test_s = set(sessions[2:]) if n >= 3 else set()
    else:
        n_train = max(1, int(round(n * train_ratio)))
        n_val = max(1, int(round(n * val_ratio)))
        if n_train + n_val >= n:
            n_train = max(1, n - 2)
            n_val = 1
        train_s = set(sessions[:n_train])
        val_s = set(sessions[n_train : n_train + n_val])
        test_s = set(sessions[n_train + n_val :])

    train_rows = [r for r in rows if str(r["session_id"]) in train_s]
    val_rows = [r for r in rows if str(r["session_id"]) in val_s]
    test_rows = [r for r in rows if str(r["session_id"]) in test_s]

    return train_rows, val_rows, test_rows


def compute_dataset_hash(rows: List[Dict[str, Any]]) -> str:
    hasher = hashlib.sha256()
    for r in sorted(rows, key=lambda x: str(x.get("image_path", ""))):
        line = f"{r.get('image_path')}|{r.get('food_class')}|{r.get('weighed_grams')}|{r.get('session_id')}\n"
        hasher.update(line.encode("utf-8"))
    return hasher.hexdigest()[:16]


def fit_temperature_scaling(logits: np.ndarray, true_labels: np.ndarray) -> float:
    """
    Optimizes a single scalar temperature T > 0 on validation set logits via negative log-likelihood.
    """
    if len(logits) == 0:
        return 1.0

    def nll_loss(t_arr):
        t = float(max(0.1, t_arr[0]))
        scaled = logits / t
        scaled = scaled - np.max(scaled, axis=1, keepdims=True)
        exp_s = np.exp(scaled)
        probs = exp_s / np.sum(exp_s, axis=1, keepdims=True)
        idx = np.arange(len(true_labels))
        chosen = np.clip(probs[idx, true_labels], 1e-12, 1.0)
        return float(-np.mean(np.log(chosen)))

    res = minimize(nll_loss, x0=[1.0], bounds=[(0.15, 5.0)], method="L-BFGS-B")
    return round(float(res.x[0]), 4)


def select_low_confidence_threshold(
    probs: np.ndarray,
    preds: np.ndarray,
    true_labels: np.ndarray,
    target_error_recall: float = 0.75,
) -> Dict[str, float]:
    """
    Selects the low-confidence threshold from validation probabilities so that low-confidence flags
    capture most classification errors, and reports precision and recall of the flag.
    """
    if len(probs) == 0:
        return {"threshold": 0.65, "flag_precision": 0.0, "flag_recall": 0.0}

    max_probs = np.max(probs, axis=1)
    is_error = (preds != true_labels)
    total_errors = int(np.sum(is_error))

    if total_errors == 0:
        thresh = float(np.clip(np.percentile(max_probs, 15), 0.50, 0.75))
        return {"threshold": round(thresh, 3), "flag_precision": 1.0, "flag_recall": 1.0}

    best_thresh = 0.65
    best_f1 = -1.0
    best_prec = 0.0
    best_rec = 0.0

    for candidate in np.linspace(0.35, 0.90, 56):
        flagged = max_probs < candidate
        tp = int(np.sum(flagged & is_error))
        fp = int(np.sum(flagged & (~is_error)))
        fn = int(np.sum((~flagged) & is_error))

        prec = tp / float(tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / float(tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        if rec >= target_error_recall and f1 > best_f1:
            best_f1 = f1
            best_thresh = float(candidate)
            best_prec = prec
            best_rec = rec

    if best_f1 < 0:
        # Fallback if no threshold reached target_error_recall
        best_thresh = 0.65
        flagged = max_probs < best_thresh
        tp = int(np.sum(flagged & is_error))
        fp = int(np.sum(flagged & (~is_error)))
        fn = int(np.sum((~flagged) & is_error))
        best_prec = tp / float(tp + fp) if (tp + fp) > 0 else 0.0
        best_rec = tp / float(tp + fn) if (tp + fn) > 0 else 0.0

    return {
        "threshold": round(best_thresh, 3),
        "flag_precision": round(float(best_prec), 3),
        "flag_recall": round(float(best_rec), 3),
    }


if HAS_TORCH:
    class CompartmentDataset(Dataset):
        def __init__(self, dataset_dir: Path, rows: List[Dict[str, Any]], class_to_idx: Dict[str, int], transform=None):
            self.dataset_dir = dataset_dir
            self.rows = rows
            self.class_to_idx = class_to_idx
            self.transform = transform

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, idx):
            row = self.rows[idx]
            img_path = self.dataset_dir / row["image_path"]
            with Image.open(img_path) as img:
                rgb = img.convert("RGB")
            if self.transform:
                tensor = self.transform(rgb)
            else:
                tensor = transforms.ToTensor()(rgb)
            label = self.class_to_idx[row["food_class"]]
            return tensor, label


def run_training_pipeline(
    dataset_dir: Path,
    weights_dir: Path,
    architecture: str = "mobilenet_v3_small",
    epochs: int = 8,
    batch_size: int = 16,
    lr: float = 0.0015,
    quick_run: bool = False,
    seed: int = 42,
) -> Dict[str, Any]:
    set_deterministic_seed(seed)
    labels_csv = dataset_dir / "labels.csv"
    if not labels_csv.exists():
        raise FileNotFoundError(f"Dataset labels.csv not found at {labels_csv}")

    with open(labels_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        all_rows = [r for r in reader if (dataset_dir / r["image_path"]).exists()]

    if not all_rows:
        raise ValueError("No valid labeled images found in dataset directory.")

    # Check if this dataset is the synthetic smoke dataset
    smoke_manifest = dataset_dir / "smoke_dataset_manifest.json"
    is_smoke_test = smoke_manifest.exists() or any(
        "smoke" in str(r.get("lighting_note", "")).lower() or "smoke" in str(r.get("session_id", "")).lower()
        for r in all_rows
    )

    classes = sorted(list({r["food_class"] for r in all_rows}))
    if "unknown" not in classes:
        classes.append("unknown")
        classes.sort()
    class_to_idx = {c: i for i, c in enumerate(classes)}

    train_rows, val_rows, test_rows = split_samples_by_session(all_rows, seed=seed)
    dataset_hash = compute_dataset_hash(all_rows)

    # Save split assignments so evaluate.py evaluates strictly on the held-out test split
    splits_path = weights_dir / "dataset_splits.json"
    weights_dir.mkdir(parents=True, exist_ok=True)
    with open(splits_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "dataset_hash": dataset_hash,
                "smoke_test_only": is_smoke_test,
                "classes": classes,
                "train": train_rows,
                "val": val_rows,
                "test": test_rows,
            },
            f,
            indent=2,
        )

    if not HAS_TORCH:
        raise RuntimeError("PyTorch is required to run train.py")

    if quick_run:
        epochs = min(epochs, 3)

    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(128, scale=(0.82, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15, hue=0.04),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_ds = CompartmentDataset(dataset_dir, train_rows, class_to_idx, transform=train_transform)
    val_ds = CompartmentDataset(dataset_dir, val_rows, class_to_idx, transform=eval_transform)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Build model
    if architecture == "efficientnet_b0":
        try:
            net = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        except Exception:
            net = models.efficientnet_b0(weights=None)
        net.classifier[1] = nn.Linear(net.classifier[1].in_features, len(classes))
    else:
        try:
            net = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        except Exception:
            net = models.mobilenet_v3_small(weights=None)
        net.classifier[3] = nn.Linear(net.classifier[3].in_features, len(classes))

    net.to(device)

    # Compute inverse-frequency class weights for imbalanced classes
    counts = np.ones(len(classes), dtype=np.float32)
    for r in train_rows:
        counts[class_to_idx[r["food_class"]]] += 1.0
    inv_weights = (np.sum(counts) / (len(classes) * counts)).astype(np.float32)
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(inv_weights, device=device))

    optimizer = torch.optim.AdamW(net.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(1, epochs))

    best_val_loss = float("inf")
    best_state = None
    patience = 3
    patience_counter = 0

    for epoch in range(1, epochs + 1):
        net.train()
        train_loss_sum = 0.0
        for x_b, y_b in train_loader:
            x_b, y_b = x_b.to(device), y_b.to(device)
            optimizer.zero_grad()
            out = net(x_b)
            loss = criterion(out, y_b)
            loss.backward()
            optimizer.step()
            train_loss_sum += float(loss.item()) * len(y_b)
        scheduler.step()

        # Validation pass
        net.eval()
        val_loss_sum = 0.0
        with torch.no_grad():
            for x_v, y_v in val_loader:
                x_v, y_v = x_v.to(device), y_v.to(device)
                out_v = net(x_v)
                v_loss = criterion(out_v, y_v)
                val_loss_sum += float(v_loss.item()) * len(y_v)

        val_loss = val_loss_sum / max(1, len(val_ds))
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.cpu().clone() for k, v in net.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                break

    if best_state is not None:
        net.load_state_dict(best_state)

    # Fit temperature scaling on validation set
    net.eval()
    val_logits_list = []
    val_labels_list = []
    with torch.no_grad():
        for x_v, y_v in val_loader:
            x_v = x_v.to(device)
            logits_v = net(x_v).cpu().numpy()
            val_logits_list.append(logits_v)
            val_labels_list.append(y_v.numpy())

    if val_logits_list:
        val_logits = np.concatenate(val_logits_list, axis=0)
        val_labels = np.concatenate(val_labels_list, axis=0)
        temp_scale = fit_temperature_scaling(val_logits, val_labels)
        scaled = val_logits / temp_scale
        scaled = scaled - np.max(scaled, axis=1, keepdims=True)
        val_probs = np.exp(scaled) / np.sum(np.exp(scaled), axis=1, keepdims=True)
        val_preds = np.argmax(val_probs, axis=1)
        thresh_info = select_low_confidence_threshold(val_probs, val_preds, val_labels)
    else:
        temp_scale = 1.0
        thresh_info = {"threshold": 0.65, "flag_precision": 0.0, "flag_recall": 0.0}

    version_prefix = "smoke-test" if is_smoke_test else "thalicheck-food"
    version_tag = f"{version_prefix}-{architecture}-{dataset_hash[:8]}"
    weights_filename = f"{version_tag}.pt"
    weights_path = weights_dir / weights_filename

    torch.save(net.state_dict(), weights_path)

    trained_at_iso = datetime.now(timezone.utc).isoformat()
    meta = {
        "version_tag": version_tag,
        "architecture": architecture,
        "weights_filename": weights_filename,
        "weights_path": str(weights_path),
        "classes": classes,
        "image_size": [128, 128],
        "trained_at": trained_at_iso,
        "dataset_hash": dataset_hash,
        "smoke_test_only": is_smoke_test,
        "train_samples": len(train_rows),
        "val_samples": len(val_rows),
        "test_samples": len(test_rows),
        "temperature_scale": temp_scale,
        "low_confidence_threshold": thresh_info["threshold"],
        "val_low_conf_flag_precision": thresh_info["flag_precision"],
        "val_low_conf_flag_recall": thresh_info["flag_recall"],
    }

    with open(weights_dir / f"{version_tag}_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    with open(weights_dir / "active_model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ThaliCheck PyTorch Food Classifier")
    parser.add_argument("--dataset-dir", type=str, default=str(PROJECT_ROOT / "data" / "dataset"))
    parser.add_argument("--weights-dir", type=str, default=str(PROJECT_ROOT / "ai_models" / "weights"))
    parser.add_argument("--arch", type=str, default="mobilenet_v3_small")
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--quick-run", action="store_true")
    args = parser.parse_args()

    res = run_training_pipeline(
        dataset_dir=Path(args.dataset_dir),
        weights_dir=Path(args.weights_dir),
        architecture=args.arch,
        epochs=args.epochs,
        quick_run=args.quick_run,
    )
    print(json.dumps(res, indent=2))
