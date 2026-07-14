# backend/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import custom modules
from backend.database import engine, Base
from backend.models import Product
from backend.db_seeder import seed_db

# Import modular routers
from backend.routers import auth, products, sales, analytics, notifications, reports

# Database initialization
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DemandSense API",
    description="Backend API engine for predictive inventory analytics",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(reports.router)

# Serve static web app assets
static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Seed the DB initially if empty
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            print("No products found in DB, auto-seeding sample database...")
            seed_db(db)
    except Exception as ex:
        print(f"Auto-seed failed: {str(ex)}")
    finally:
        db.close()
        
    # Start the server
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
