# backend/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import custom modules
from backend.database import engine, Base, ensure_schema_migrations
from backend.models import Product
from backend.db_seeder import seed_db

# Import modular routers
from backend.routers import auth, products, sales, analytics, notifications, reports

# Database initialization & migrations
Base.metadata.create_all(bind=engine)
ensure_schema_migrations()

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

@app.on_event("startup")
def startup_event():
    """Auto-seed sample database on first startup if empty."""
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            print("No products found in DB, auto-seeding sample database...")
            seed_db(db)
    except Exception as ex:
        print(f"Auto-seed check: {str(ex)}")
    finally:
        db.close()

app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # Start the server
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
