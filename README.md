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

## 🌐 Render Deployment Guide (MERN Stack)

You can deploy the MERN stack web app directly to **Render** using MongoDB Atlas:

### Step 1: Set Up Free MongoDB Atlas Database
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. Create a free **M0 Cluster**.
3. Under **Database Access**, create a user (e.g. `admin`) and set a password.
4. Under **Network Access**, click **Add IP Address** -> choose **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** -> **Drivers** (Node.js) -> copy your connection URI string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/demandsense?retryWrites=true&w=majority`

### Step 2: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository `Sales-Data-Dashboard`.
3. Configure the following settings:
   - **Name**: `demandsense-app`
   - **Environment / Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add **Environment Variables**:
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/demandsense?retryWrites=true&w=majority`
   - `JWT_SECRET`: Any long random secret key (e.g. `demandsense_secret_key_prod_2025`)
   - `NODE_ENV`: `production`
5. Click **Deploy Web Service**!

*Note: On first startup, DemandSense automatically initializes the database and creates the demo user (`demo@demandsense.ai` / `password123`) with 60 days of sample data.*

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
