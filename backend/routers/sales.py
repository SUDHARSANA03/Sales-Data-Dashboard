# backend/routers/sales.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from backend.database import get_db
from backend.models import User, BusinessProfile, Product, Sale, Customer, Notification
from backend.schemas import SaleCreate, SaleResponse, CustomerCreate, CustomerResponse
from backend.security import get_current_user

router = APIRouter(prefix="/api", tags=["sales"])

@router.get("/sales", response_model=List[SaleResponse])
def get_sales(start_date: Optional[date] = None, end_date: Optional[date] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        return []
        
    query = db.query(Sale).filter(Sale.business_id == business.id)
    if start_date:
        query = query.filter(Sale.date >= start_date)
    if end_date:
        query = query.filter(Sale.date <= end_date)
        
    results = query.order_by(Sale.date.desc(), Sale.created_at.desc()).all()
    
    # Attach helper names to response schemas
    response_list = []
    for r in results:
        resp = SaleResponse.from_orm(r)
        resp.product_name = r.product.name if r.product else "Deleted Product"
        resp.customer_name = r.customer.name if r.customer else None
        response_list.append(resp)
        
    return response_list

@router.post("/sales", response_model=SaleResponse)
def record_sale(sale_in: SaleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    product = db.query(Product).filter(Product.id == sale_in.product_id, Product.business_id == business.id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in business catalog")
        
    if product.current_stock < sale_in.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient inventory. Remaining stock: {product.current_stock}")
        
    selling_price = sale_in.unit_price if sale_in.unit_price is not None else product.selling_price
    total_sales = float(sale_in.quantity * selling_price)
    sale_date = sale_in.date if sale_in.date is not None else datetime.utcnow().date()
    
    # Create Sale record
    new_sale = Sale(
        business_id=business.id,
        product_id=product.id,
        customer_id=sale_in.customer_id,
        quantity=sale_in.quantity,
        unit_price=selling_price,
        total_sales=total_sales,
        date=sale_date,
        payment_method=sale_in.payment_method
    )
    
    # Deduct stock
    product.current_stock -= sale_in.quantity
    
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    
    # Check if stock has now dropped below min reorder limit
    if product.current_stock <= product.min_reorder_qty:
        # Prevent spamming alerts if one exists for today
        existing_alert = db.query(Notification).filter(
            Notification.business_id == business.id,
            Notification.type == "low_stock",
            Notification.date == datetime.utcnow().date(),
            Notification.message.like(f"%{product.name}%")
        ).first()
        
        if not existing_alert:
            notif = Notification(
                business_id=business.id,
                message=f"{product.name} stock level is low ({product.current_stock} units left). Reorder recommended.",
                type="low_stock",
                date=datetime.utcnow().date()
            )
            db.add(notif)
            db.commit()
            
    resp = SaleResponse.from_orm(new_sale)
    resp.product_name = product.name
    if new_sale.customer_id:
        resp.customer_name = db.query(Customer).filter(Customer.id == new_sale.customer_id).first().name
    return resp


@router.get("/customers", response_model=List[CustomerResponse])
def get_customers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        return []
    return db.query(Customer).filter(Customer.business_id == business.id).all()

@router.post("/customers", response_model=CustomerResponse)
def create_customer(customer_in: CustomerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    new_cust = Customer(
        business_id=business.id,
        name=customer_in.name,
        phone=customer_in.phone,
        segment=customer_in.segment or "New"
    )
    db.add(new_cust)
    db.commit()
    db.refresh(new_cust)
    return new_cust
