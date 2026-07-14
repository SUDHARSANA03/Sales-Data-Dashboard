# backend/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import User, BusinessProfile, Notification
from backend.schemas import NotificationResponse
from backend.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(unread_only: bool = False, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        return []
    query = db.query(Notification).filter(Notification.business_id == business.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.date.desc(), Notification.created_at.desc()).all()

@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.business_id == business.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"detail": "Notification marked as read"}
