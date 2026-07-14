# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from backend.database import get_db
from backend.models import User, BusinessProfile
from backend.schemas import UserCreate, UserResponse, UserLogin, Token, BusinessCreate, BusinessResponse
from backend.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto create a default business profile for register convenience
    default_business = BusinessProfile(
        user_id=new_user.id,
        name=f"{new_user.full_name or 'My'} Store",
        category="Grocery"
    )
    db.add(default_business)
    db.commit()
    
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "business": {
            "id": business.id if business else None,
            "name": business.name if business else "No Business Configured",
            "category": business.category if business else "N/A",
            "address": business.address if business else "",
            "phone": business.phone if business else ""
        }
    }

@router.put("/business", response_model=BusinessResponse)
def update_business(biz_in: BusinessCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        business = BusinessProfile(user_id=current_user.id)
        db.add(business)
        
    business.name = biz_in.name
    business.category = biz_in.category
    business.address = biz_in.address
    business.phone = biz_in.phone
    db.commit()
    db.refresh(business)
    return business
