# backend/routers/products.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from backend.database import get_db
from backend.models import User, BusinessProfile, Product, Notification
from backend.schemas import ProductCreate, ProductResponse
from backend.security import get_current_user

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("", response_model=List[ProductResponse])
def get_products(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        return []
    return db.query(Product).filter(Product.business_id == business.id).all()

@router.post("", response_model=ProductResponse)
def create_product(product_in: ProductCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    new_prod = Product(
        business_id=business.id,
        name=product_in.name,
        category=product_in.category,
        purchase_price=product_in.purchase_price,
        selling_price=product_in.selling_price,
        current_stock=product_in.current_stock,
        min_reorder_qty=product_in.min_reorder_qty,
        supplier_name=product_in.supplier_name,
        supplier_contact=product_in.supplier_contact
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    
    # Check if stock is low on creation
    if new_prod.current_stock <= new_prod.min_reorder_qty:
        notif = Notification(
            business_id=business.id,
            message=f"{new_prod.name} stock level is low ({new_prod.current_stock} units left). Reorder recommended.",
            type="low_stock",
            date=datetime.utcnow().date()
        )
        db.add(notif)
        db.commit()
        
    return new_prod

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_in: ProductCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    product = db.query(Product).filter(Product.id == product_id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product.name = product_in.name
    product.category = product_in.category
    product.purchase_price = product_in.purchase_price
    product.selling_price = product_in.selling_price
    product.current_stock = product_in.current_stock
    product.min_reorder_qty = product_in.min_reorder_qty
    product.supplier_name = product_in.supplier_name
    product.supplier_contact = product_in.supplier_contact
    db.commit()
    db.refresh(product)
    
    # Check low stock thresholds
    if product.current_stock <= product.min_reorder_qty:
        notif = Notification(
            business_id=business.id,
            message=f"{product.name} stock level is low ({product.current_stock} units left). Reorder recommended.",
            type="low_stock",
            date=datetime.utcnow().date()
        )
        db.add(notif)
        db.commit()
        
    return product

@router.delete("/{product_id}")
def delete_product(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    product = db.query(Product).filter(Product.id == product_id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted successfully"}
