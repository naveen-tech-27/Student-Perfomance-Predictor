"""
Student Performance Predictor - Flask Backend
REST API with /predict endpoint.
"""

import os
import json
import pickle
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ─── Load Model Artifacts ─────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")

try:
    with open(os.path.join(MODEL_DIR, "model.pkl"), "rb") as f:
        model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb") as f:
        scaler = pickle.load(f)
    with open(os.path.join(MODEL_DIR, "feature_importances.json")) as f:
        feature_importances = json.load(f)
    logger.info("[OK] Model artifacts loaded successfully.")
except FileNotFoundError as e:
    logger.error(f"[ERROR] Could not load model artifacts: {e}")
    model = scaler = None
    feature_importances = {}

# ─── Feature Config ───────────────────────────────────────────────────────────
FEATURES = ["studytime", "failures", "absences", "internet",
            "freetime", "health", "famrel", "paid"]

STUDYTIME_MAP = {
    "less_than_2":  1,
    "2_to_5":       2,
    "5_to_10":      3,
    "more_than_10": 4,
}

# ─── Helpers ──────────────────────────────────────────────────────────────────
def score_to_category(score: float) -> dict:
    """Map numeric score to performance category."""
    if score >= 80:
        return {"label": "Excellent", "color": "#22c55e", "emoji": "🌟"}
    elif score >= 65:
        return {"label": "Good",      "color": "#3b82f6", "emoji": "👍"}
    elif score >= 50:
        return {"label": "Average",   "color": "#f59e0b", "emoji": "📊"}
    else:
        return {"label": "Poor",      "color": "#ef4444", "emoji": "⚠️"}


def validate_input(data: dict) -> list[str]:
    """Return list of validation error messages."""
    errors = []
    required = {
        "studytime": "Study time is required",
        "failures":  "Number of failures is required",
        "absences":  "Number of absences is required",
        "internet":  "Internet access field is required",
        "freetime":  "Free time rating is required",
        "health":    "Health rating is required",
        "famrel":    "Family relationship rating is required",
        "paid":      "Extra paid classes field is required",
    }
    for field, msg in required.items():
        if field not in data or data[field] is None:
            errors.append(msg)

    if "studytime" in data and data["studytime"] not in STUDYTIME_MAP:
        errors.append(f"Invalid studytime value: {data['studytime']}")

    for int_field in ["failures", "absences"]:
        if int_field in data:
            try:
                val = int(data[int_field])
                if int_field == "failures" and not (0 <= val <= 10):
                    errors.append("Failures must be between 0 and 10")
                if int_field == "absences" and not (0 <= val <= 100):
                    errors.append("Absences must be between 0 and 100")
            except (ValueError, TypeError):
                errors.append(f"{int_field} must be a number")

    for scale_field in ["freetime", "health", "famrel"]:
        if scale_field in data:
            try:
                val = int(data[scale_field])
                if not (1 <= val <= 5):
                    errors.append(f"{scale_field} must be between 1 and 5")
            except (ValueError, TypeError):
                errors.append(f"{scale_field} must be a number")

    for bool_field in ["internet", "paid"]:
        if bool_field in data and data[bool_field] not in [True, False, 0, 1, "yes", "no"]:
            errors.append(f"{bool_field} must be true/false or yes/no")

    return errors


def parse_bool(value) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, str):
        return 1 if value.lower() in ["yes", "true", "1"] else 0
    return int(bool(value))


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None})


@app.route("/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model not loaded. Run train_model.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    logger.info(f"Received prediction request: {data}")

    errors = validate_input(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    try:
        features = np.array([[
            STUDYTIME_MAP[data["studytime"]],
            int(data["failures"]),
            int(data["absences"]),
            parse_bool(data["internet"]),
            int(data["freetime"]),
            int(data["health"]),
            int(data["famrel"]),
            parse_bool(data["paid"]),
        ]])

        features_scaled = scaler.transform(features)
        raw_score = float(model.predict(features_scaled)[0])
        score = round(float(np.clip(raw_score, 0.0, 100.0)), 1)
        category = score_to_category(score)

        logger.info(f"Prediction: score={score}, category={category['label']}")

        return jsonify({
            "score":               score,
            "category":            category["label"],
            "category_color":      category["color"],
            "category_emoji":      category["emoji"],
            "feature_importance":  feature_importances,
        })

    except Exception as e:
        logger.exception("Prediction failed")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


@app.route("/sample", methods=["GET"])
def sample():
    """Return sample input for autofill."""
    return jsonify({
        "studytime": "2_to_5",
        "failures":  1,
        "absences":  4,
        "internet":  True,
        "freetime":  3,
        "health":    4,
        "famrel":    4,
        "paid":      False,
    })


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
