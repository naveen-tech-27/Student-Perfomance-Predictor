"""
Student Performance Predictor - Model Training Script
Generates synthetic student performance data, trains a GradientBoostingRegressor,
and saves model artifacts: model.pkl, scaler.pkl, feature_importances.json
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score

# ─── Reproducibility ──────────────────────────────────────────────────────────
np.random.seed(42)
N = 5000  # larger dataset gives model more high-score examples to learn from

# ─── Feature Generation ───────────────────────────────────────────────────────
# Slightly more balanced distribution so high-performing students are represented
studytime  = np.random.choice([1, 2, 3, 4], size=N, p=[0.15, 0.30, 0.30, 0.25])
failures   = np.random.choice([0, 1, 2, 3, 4], size=N, p=[0.60, 0.22, 0.10, 0.05, 0.03])
absences   = np.random.randint(0, 40, size=N)
internet   = np.random.choice([0, 1], size=N, p=[0.25, 0.75])   # 0=No, 1=Yes
freetime   = np.random.randint(1, 6, size=N)
health     = np.random.randint(1, 6, size=N)
famrel     = np.random.randint(1, 6, size=N)
paid       = np.random.choice([0, 1], size=N, p=[0.55, 0.45])   # 0=No, 1=Yes

# ─── Target Generation (G3 scaled to 0–100) ───────────────────────────────────
# Coefficients tuned so the ideal student (study=4, failures=0, absences=0,
# internet=yes, freetime=5, health=5, famrel=5, paid=yes) scores ~95–100.
#
# Theoretical max (no noise):
#   4*12 + 5*3 + 5*3 + 5*3 + 5 + 3 + 35 = 48+15+15+15+5+3+35 = 136 -> clipped 100
# Theoretical min (no noise):
#   1*12 - 4*14 + 35 = 12-56+35 = -9 -> clipped 0
score = (
    studytime * 12.0         # study time is most important (12 pts per level)
    - failures * 14.0        # failures are heavily penalised
    - absences * 0.6         # each absence costs 0.6 pts
    + internet * 5.0         # internet access gives 5 pts
    + freetime * 3.0         # free time (scale 1-5) gives up to 15 pts
    + health   * 3.0         # health (scale 1-5) gives up to 15 pts
    + famrel   * 3.0         # family relations (scale 1-5) gives up to 15 pts
    + paid     * 3.0         # paid classes gives 3 pts
    + np.random.normal(0, 5, N)  # reduced noise for tighter fit
    + 35                     # baseline so average student scores ~50
)
score = np.clip(score, 0, 100)

# ─── Build DataFrame ──────────────────────────────────────────────────────────
df = pd.DataFrame({
    "studytime": studytime,
    "failures":  failures,
    "absences":  absences,
    "internet":  internet,
    "freetime":  freetime,
    "health":    health,
    "famrel":    famrel,
    "paid":      paid,
    "score":     score,
})

print(f"Dataset shape: {df.shape}")
print(df.describe().round(2))

# ─── Train / Test Split ───────────────────────────────────────────────────────
FEATURES = ["studytime", "failures", "absences", "internet",
            "freetime", "health", "famrel", "paid"]
X = df[FEATURES].values
y = df["score"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ─── Scale Features ───────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

# ─── Train Model ──────────────────────────────────────────────────────────────
# GradientBoostingRegressor does NOT compress extreme predictions like
# RandomForest does (RF averages many trees -> pulls predictions to mean).
# GBR builds trees sequentially correcting residuals, so it can reach
# the full 0-100 range seen in training data.
model = GradientBoostingRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    min_samples_leaf=5,
    random_state=42,
)
model.fit(X_train_sc, y_train)

# ─── Evaluate ─────────────────────────────────────────────────────────────────
y_pred = model.predict(X_test_sc)
rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
r2     = r2_score(y_test, y_pred)
print(f"\nModel Evaluation")
print(f"  RMSE        : {rmse:.2f}")
print(f"  R2          : {r2:.4f}")
print(f"  Pred range  : {y_pred.min():.1f}  to  {y_pred.max():.1f}")
print(f"  True range  : {y_test.min():.1f}  to  {y_test.max():.1f}")

# Spot-check: ideal student should score ~90+
SCALE_MAP = {"studytime": 4, "failures": 0, "absences": 0, "internet": 1,
             "freetime": 5, "health": 5, "famrel": 5, "paid": 1}
ideal_vec  = np.array([[SCALE_MAP[f] for f in FEATURES]])
ideal_sc   = scaler.transform(ideal_vec)
print(f"  Ideal student prediction : {model.predict(ideal_sc)[0]:.1f}")

poor_map   = {"studytime": 1, "failures": 4, "absences": 35, "internet": 0,
              "freetime": 1, "health": 1, "famrel": 1, "paid": 0}
poor_vec   = np.array([[poor_map[f] for f in FEATURES]])
poor_sc    = scaler.transform(poor_vec)
print(f"  Poor  student prediction : {model.predict(poor_sc)[0]:.1f}")

# ─── Feature Importances ──────────────────────────────────────────────────────
importances = model.feature_importances_
feature_importance = {
    feature: round(float(imp), 4)
    for feature, imp in zip(FEATURES, importances)
}
print("\nFeature Importances:")
for k, v in sorted(feature_importance.items(), key=lambda x: -x[1]):
    print(f"  {k:12s}: {v:.4f}")

# ─── Save Artifacts ───────────────────────────────────────────────────────────
SAVE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(SAVE_DIR, "model.pkl"), "wb") as f:
    pickle.dump(model, f)

with open(os.path.join(SAVE_DIR, "scaler.pkl"), "wb") as f:
    pickle.dump(scaler, f)

with open(os.path.join(SAVE_DIR, "feature_importances.json"), "w") as f:
    json.dump(feature_importance, f, indent=2)

print("\n[OK] Artifacts saved:")
print(f"   model.pkl                -> {SAVE_DIR}")
print(f"   scaler.pkl               -> {SAVE_DIR}")
print(f"   feature_importances.json -> {SAVE_DIR}")
