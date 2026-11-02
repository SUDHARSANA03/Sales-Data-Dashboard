# DemandSense - AI Business Intelligence Dashboard

A full-stack **AI-Powered Sales & Inventory Management** web application built with **FastAPI** (Python backend) and a responsive **desktop web dashboard** frontend.

---

## 🚀 Features
- 📊 **Executive BI Dashboard** — Revenue, Profit, Health Score, Margin analytics
- 📦 **Inventory CRUD** — Add, edit, delete products with real-time stock tracking
- 🛒 **Sales Transactions** — Record sales with customer profiles and UPI/Card/Cash payments
- 🤖 **AI Demand Forecasting** — Linear regression ML model predicting next 30 days
- 📈 **Analytics Reports** — Sales trends (daily/weekly/monthly), product velocity classification
- 🔔 **Smart Alerts** — Auto-generated low-stock and demand-increase notifications
- 📄 **Export Reports** — PDF summaries and Excel ledgers via ReportLab & openpyxl
- 🔐 **JWT Authentication** — Secure user registration and login system

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python, SQLAlchemy |
| Database | SQLite |
| ML Engine | scikit-learn (Linear Regression) |
| Frontend | HTML5, CSS3, Vanilla JS, Chart.js |
| Reports | ReportLab (PDF), openpyxl (Excel) |
| Auth | JWT (python-jose) |

---

## ⚡ Running Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python -m backend.main
```

### 3. Open in Browser
```
http://127.0.0.1:8000
```

**Demo Credentials:**
- Email: `owner@demandsense.com`
- Password: `password123`

---

## 📁 Project Structure
```
Sales-Data-Dashboard/
├── backend/
│   ├── main.py          # FastAPI app entry point
│   ├── routers/         # API route handlers
│   ├── models.py        # SQLAlchemy DB models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── ml_engine.py     # Demand forecasting ML model
│   ├── reporting.py     # PDF & Excel report generators
│   ├── db_seeder.py     # Sample data seeder
│   └── security.py      # JWT authentication
├── static/
│   ├── index.html       # Desktop BI dashboard UI
│   ├── style.css        # Dashboard styles
│   └── app.js           # Frontend logic & API calls
└── requirements.txt
```

---

---
## 🌐 Deployment Guide

### Option 1: Render / Railway (PaaS)
1. Push to your GitHub repository: https://github.com/SUDHARSANA03/Sales-Data-Dashboard
2. Connect your repository on [Render](https://render.com) or [Railway](https://railway.app).
3. Set Build Command:
   \\ash
   pip install -r requirements.txt
   \4. Set Start Command:
   \\ash
   uvicorn backend.main:app --host 0.0.0.0 --port    \   *(Or allow auto-detection via the included \Procfile\)*
5. Optional Environment Variables:
   - \SMTP_HOST\: (e.g., \smtp.gmail.com\ for automated invoice dispatch)
   - \SMTP_PORT\: 87   - \SMTP_USER\: \your-email@gmail.com   - \SMTP_PASSWORD\: \your-app-password   - \DATABASE_URL\: (Optional PostgreSQL connection URL; defaults to SQLite if omitted)

### Option 2: Docker
\\ash
# Build the Docker image
docker build -t sales-data-dashboard .

# Run container
docker run -p 8000:8000 sales-data-dashboard
\Visit \http://localhost:8000\ in your browser.
