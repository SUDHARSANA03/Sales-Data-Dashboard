# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Retrieve database configuration from environment variables
# Format: postgresql://user:password@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Handle cloud provider postgres:// prefix (e.g. Render, Heroku)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
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

def ensure_schema_migrations():
    """Ensure newly added columns exist in SQLite database if running locally."""
    try:
        if engine.dialect.name != "sqlite":
            return
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check customers table
            res = conn.execute(text("PRAGMA table_info(customers)")).fetchall()
            col_names = [r[1] for r in res]
            if col_names and "email" not in col_names:
                conn.execute(text("ALTER TABLE customers ADD COLUMN email VARCHAR"))
                conn.commit()
            
            # Check sales table
            res = conn.execute(text("PRAGMA table_info(sales)")).fetchall()
            col_names = [r[1] for r in res]
            if col_names and "customer_email" not in col_names:
                conn.execute(text("ALTER TABLE sales ADD COLUMN customer_email VARCHAR"))
                conn.commit()
            if col_names and "invoice_number" not in col_names:
                conn.execute(text("ALTER TABLE sales ADD COLUMN invoice_number VARCHAR"))
                conn.commit()

            # Ensure sample customer emails are populated if empty
            email_defaults = [
                ('Homer Simpson', 'homer.simpson@springfield.org'),
                ('Marge Simpson', 'marge.simpson@springfield.org'),
                ('Ned Flanders', 'ned.flanders@leftorium.com'),
                ('Moe Szyslak', 'moe@tavernspringfield.com'),
                ('Barney Gumble', 'barney.gumble@springfield.org'),
                ('Apu Nahasapeemapetilon', 'apu@quick-e-mart.com'),
                ('Seymour Skinner', 'principal.skinner@springfield.edu'),
                ('Milhouse Van Houten', 'milhouse@springfield.edu'),
                ('Clancy Wiggum', 'chief.wiggum@springfieldpd.gov'),
                ('Charles Burns', 'c.burns@springfieldnuclear.com')
            ]
            for c_name, c_mail in email_defaults:
                conn.execute(text("UPDATE customers SET email = :mail WHERE name = :name AND (email IS NULL OR email = '')"), {"mail": c_mail, "name": c_name})
            conn.commit()
    except Exception as e:
        print(f"[MIGRATION NOTICE] {e}")
