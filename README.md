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

*Built with ❤️ by ARAFATH18*
