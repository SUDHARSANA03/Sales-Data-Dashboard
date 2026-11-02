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

## 🌐 Deployment Guide

### Option 1: GitHub Pages (Instant Free Web Hosting)
The dashboard is fully equipped to deploy directly on **GitHub Pages**:
1. On GitHub, navigate to your repository: [Sudharsana03/Sales-Data-Dashboard](https://github.com/SUDHARSANA03/Sales-Data-Dashboard).
2. Go to **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Branch**:
   - Select branch: `main`
   - Select folder: `/ (root)`
   - Click **Save**.
4. In ~1-2 minutes, GitHub will publish your live dashboard at:
   `https://sudharsana03.github.io/Sales-Data-Dashboard/`
5. **Features on GitHub Pages:**
   - Works immediately in interactive **Instant Demo Mode** with live charts, sales records, customer directories, and BI analytics.
   - Use the **Set API** button anytime to connect your live backend on Render/Railway!

---

### Option 2: Render / Railway (Full-Stack Backend + Database)
1. Sign in to [Render](https://render.com) or [Railway](https://railway.app).
2. Click **New Web Service** and link `Sudharsana03/Sales-Data-Dashboard`.
3. Set **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
4. Set **Start Command**:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
   *(Or let the platform auto-detect the included `Procfile`)*
5. Optional Environment Variables:
   - `SMTP_HOST`: `smtp.gmail.com` (for real automated email invoices)
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `your-email@gmail.com`
   - `SMTP_PASSWORD`: `your-app-password`
   - `DATABASE_URL`: (Optional PostgreSQL URL; defaults to SQLite if omitted)

---

### Option 3: Docker Container
```bash
# Build the Docker image
docker build -t sales-data-dashboard .

# Run the container
docker run -p 8000:8000 sales-data-dashboard
```
Open `http://localhost:8000` in your web browser.
