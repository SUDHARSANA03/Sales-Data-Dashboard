# DemandSense - AI Business Intelligence Dashboard & MERN Stack Web App

A comprehensive **AI-Powered Sales & Inventory Management** web application featuring both a modern **MERN Stack (MongoDB, Express, React, Node.js)** website and a **FastAPI + Python** BI system.

---

## 🌟 MERN Stack Web App (`/mern`)
Built with modern full-stack JavaScript:
- **M**ongoDB & Mongoose (Schema design, collections, queries)
- **E**xpress.js (REST API, JWT security, custom middleware)
- **R**eact 18 & Vite (Desktop-first UI, Lucide Icons, interactive widgets)
- **N**ode.js (Linear Regression ML Demand Forecasting engine)
- 📊 **Chart.js** — Smooth gradient area charts, dual-axis trends, category doughnuts, animated bars
- 🛒 **Real-Time Inventory & POS** — Instant stock deduction, low-stock notifications

### 🚀 Running the MERN Website Locally
```bash
# 1. Start MongoDB (default port 27017)

# 2. Run the MERN Server
cd mern/server
npm install
node seedDemoUser.js   # Seeds demo store, products, and 60 days of sales
node index.js          # Runs on http://localhost:5000

# 3. Open in Browser
http://localhost:5000
```
**Demo Login:** `demo@demandsense.ai` / `password123`

---

## 🚀 FastAPI + Python System

### 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python, SQLAlchemy |
| Database | SQLite |
| ML Engine | scikit-learn (Linear Regression) |
| Frontend | HTML5, CSS3, Vanilla JS, Chart.js |
| Reports | ReportLab (PDF), openpyxl (Excel) |
| Auth | JWT (python-jose) |

### ⚡ Running FastAPI Locally
```bash
pip install -r requirements.txt
python -m backend.main
```
Open `http://127.0.0.1:8000`

---

## 📁 Project Structure
```
Sales-Data-Dashboard/
├── mern/
│   ├── client/          # React 18 + Vite frontend
│   │   ├── src/         # App.jsx, charts, components, styling
│   │   └── package.json
│   ├── server/          # Node.js + Express + MongoDB backend
│   │   ├── models/      # Mongoose schemas (User, Product, Sale, Customer, Notification)
│   │   ├── routes/      # Auth, Products, Sales, Customers, Analytics
│   │   ├── utils/       # Demo seeder
│   │   └── index.js     # API entry point & React SPA server
├── backend/             # FastAPI backend
├── static/              # Desktop BI dashboard UI
└── requirements.txt
```
