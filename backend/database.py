# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Retrieve database configuration from environment variables
# Format: postgresql://user:password@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Check individual PostgreSQL variables
    pg_user = os.getenv("DB_USER")
    pg_password = os.getenv("DB_PASSWORD")
    pg_host = os.getenv("DB_HOST", "localhost")
    pg_port = os.getenv("DB_PORT", "5432")
    pg_name = os.getenv("DB_NAME")
    
    if pg_user and pg_password and pg_name:
        DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_name}"
    else:
        # Fallback to local SQLite database
        DATABASE_URL = "sqlite:///./demandsense.db"

# Create Database Engine
# For SQLite, we require connect_args={"check_same_thread": False}
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency helper to get a DB session in FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
