# backend/routers/reports.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, BusinessProfile
from backend.reporting import generate_excel_report, generate_pdf_report
from backend.db_seeder import seed_db
from backend.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/excel")
def download_excel(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    excel_buffer = generate_excel_report(db, business.id)
    headers = {
        'Content-Disposition': f'attachment; filename="DemandSense_Report_{business.name.replace(" ", "_")}.xlsx"'
    }
    return StreamingResponse(
        excel_buffer,
        headers=headers,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@router.get("/pdf")
def download_pdf(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    pdf_buffer = generate_pdf_report(db, business.id)
    headers = {
        'Content-Disposition': f'attachment; filename="DemandSense_Executive_Summary.pdf"'
    }
    return StreamingResponse(
        pdf_buffer,
        headers=headers,
        media_type="application/pdf"
    )

@router.post("/seed")
def seed_database(db: Session = Depends(get_db)):
    """Triggers an database reset and seed initialization for testing"""
    try:
        seed_db(db)
        return {"detail": "Database seeded successfully with test dataset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed database: {str(e)}")
