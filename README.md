# Student Performance Predictor

An AI-powered full-stack web application that predicts a student's academic performance score (0–100) using a trained Random Forest model served via Python Flask.

---

## Folder Structure

```
ML_Project/
├── frontend/          # Pure HTML + CSS + Vanilla JS (no build step needed)
│   ├── index.html     # Main predictor page
│   ├── about.html     # About project page
│   ├── css/main.css
│   └── js/
│       ├── main.js    # Form logic, API calls, results
│       ├── charts.js  # Chart.js helpers
│       ├── theme.js   # Dark/light mode
│       ├── tooltip.js # Hover tooltips
│       └── about.js   # About page chart
│
├── backend/
│   ├── app.py         # Flask REST API
│   ├── requirements.txt
│   └── .env
│
├── model/
│   ├── train_model.py # Training script
│   ├── model.pkl      # (generated after training)
│   ├── scaler.pkl     # (generated after training)
│   └── feature_importances.json
│
├── venv/              # Python virtual environment
└── README.md
```

---

## Quick Start (Local)

### 1 — Set up Python environment

```powershell
# From c:\ML_Project\
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 2 — Train the ML model

```powershell
python model\train_model.py
```

This generates `model/model.pkl`, `model/scaler.pkl`, and `model/feature_importances.json`.

### 3 — Start the Flask backend

```powershell
python backend\app.py
```

API runs at: **http://localhost:5000**

### 4 — Open the frontend

Simply open `frontend/index.html` in your browser — no build step needed.

Or serve it with Python's built-in server for cleaner URL routing:

```powershell
python -m http.server 3000 --directory frontend
```

Then visit **http://localhost:3000**

---

## API Reference

### `POST /predict`

**Request body:**
```json
{
  "studytime": "2_to_5",
  "failures": 1,
  "absences": 4,
  "internet": true,
  "freetime": 3,
  "health": 4,
  "famrel": 4,
  "paid": false
}
```

**Response:**
```json
{
  "score": 72.4,
  "category": "Good",
  "category_color": "#3b82f6",
  "category_emoji": "👍",
  "feature_importance": { "studytime": 0.285, "failures": 0.221, ... }
}
```

### `GET /health`
Returns `{ "status": "ok", "model_loaded": true }`

### `GET /sample`
Returns a sample autofill payload.

---

## Model Details

| Property | Value |
|---|---|
| Algorithm | Random Forest Regressor |
| n_estimators | 200 |
| max_depth | 10 |
| Training samples | 1,600 |
| Test samples | 400 |
| Features | 8 |
| Target | Score 0–100 |

**Features used:**
- `studytime` — Weekly study hours (1–4 encoded)
- `failures` — Past class failures (0–4)
- `absences` — School absences (0–40)
- `internet` — Internet at home (0/1)
- `freetime` — After-school free time (1–5)
- `health` — Health status (1–5)
- `famrel` — Family relationship quality (1–5)
- `paid` — Extra paid classes (0/1)

---

## Deployment

### Full Stack → Vercel (Zero Config)

The project is pre-configured to run both the HTML/JS frontend and the Flask ML backend as a unified deployment on Vercel:

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and create a **New Project**.
3. Import your GitHub repository.
4. Keep the default options (Vercel automatically detects `vercel.json` and routes `/api/*` to the Python serverless function, and `/*` to the static frontend).
5. Click **Deploy**.

---

## Features

- Dark / Light mode toggle (persists across sessions)
- Sample input autofill button
- Interactive sliders, star ratings, and toggle switches
- Hover tooltips for every input field
- Feature importance horizontal bar chart
- Radar chart of student profile
- Animated score ring with category badge
- Fully responsive (mobile + desktop)
- Client-side input validation with error messages
- Loading spinner during prediction
