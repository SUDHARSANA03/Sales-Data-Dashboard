# backend/routers/sales.py
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from backend.database import get_db
from backend.models import User, BusinessProfile, Product, Sale, Customer, Notification
from backend.schemas import (
    SaleCreate, SaleResponse, CustomerCreate, CustomerResponse, EmailInvoiceRequest
)
from backend.security import get_current_user
from backend.email_service import (
    send_invoice_email,
    generate_invoice_pdf,
    generate_invoice_html,
    generate_invoice_number
)

router = APIRouter(prefix="/api", tags=["sales"])

@router.get("/sales", response_model=List[SaleResponse])
def get_sales(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        resp.invoice_number = r.invoice_number or generate_invoice_number(r.id, r.date)
        resp.customer_email = r.customer_email or (r.customer.email if r.customer else None)
        if r.customer:
            resp.customer_name = r.customer.name
            resp.customer_phone = r.customer.phone
        response_list.append(resp)
        
    return response_list


@router.post("/sales", response_model=SaleResponse)
def record_sale(
    sale_in: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    product = db.query(Product).filter(Product.id == sale_in.product_id, Product.business_id == business.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found in business catalog")
        
    if product.current_stock < sale_in.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient inventory. Remaining stock: {product.current_stock}")
        
    selling_price = sale_in.unit_price if sale_in.unit_price is not None else product.selling_price
    total_sales = float(sale_in.quantity * selling_price)
    sale_date = sale_in.date if sale_in.date is not None else datetime.utcnow().date()
    
    customer = None
    if sale_in.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale_in.customer_id, Customer.business_id == business.id).first()
    
    target_email = (sale_in.customer_email.strip() if sale_in.customer_email else None) or (customer.email if customer else None)
    
    # Update customer's email if provided and customer doesn't have one
    if customer and target_email and not customer.email:
        customer.email = target_email
        db.add(customer)
    
    # Create Sale record
    new_sale = Sale(
        business_id=business.id,
        product_id=product.id,
        customer_id=sale_in.customer_id,
        customer_email=target_email,
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
    
    # Set official invoice reference
    inv_num = generate_invoice_number(new_sale.id, new_sale.date)
    new_sale.invoice_number = inv_num
    db.commit()
    db.refresh(new_sale)
    
    # Automatic Invoice Email Dispatch to Concern Mail ID
    email_sent = False
    email_status = None
    if target_email and sale_in.send_email:
        email_res = send_invoice_email(
            to_email=target_email,
            sale=new_sale,
            business=business,
            customer=customer,
            invoice_number=inv_num
        )
        email_sent = email_res.get("success", False)
        email_status = email_res.get("message", f"Invoice #{inv_num} dispatched to {target_email}")
        
        # Log notification in system feed
        notif = Notification(
            business_id=business.id,
            message=f"Invoice #{inv_num} (₹{total_sales:.2f}) sent to {target_email}",
            type="invoice_sent",
            date=datetime.utcnow().date()
        )
        db.add(notif)
        db.commit()
    
    # Check if stock has now dropped below min reorder limit
    if product.current_stock <= product.min_reorder_qty:
        existing_alert = db.query(Notification).filter(
            Notification.business_id == business.id,
            Notification.type == "low_stock",
            Notification.date == datetime.utcnow().date(),
            Notification.message.like(f"%{product.name}%")
        ).first()
        
        if not existing_alert:
            low_stock_notif = Notification(
                business_id=business.id,
                message=f"{product.name} stock level is low ({product.current_stock} units left). Reorder recommended.",
                type="low_stock",
                date=datetime.utcnow().date()
            )
            db.add(low_stock_notif)
            db.commit()
            
    resp = SaleResponse.from_orm(new_sale)
    resp.product_name = product.name
    resp.invoice_number = inv_num
    resp.customer_email = target_email
    resp.email_sent = email_sent
    resp.email_status = email_status
    if customer:
        resp.customer_name = customer.name
        resp.customer_phone = customer.phone
    return resp


@router.post("/sales/{sale_id}/email")
def send_sale_invoice_email(
    sale_id: int,
    req: Optional[EmailInvoiceRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.business_id == business.id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale transaction not found")
        
    customer = sale.customer
    target_email = (req.email.strip() if req and req.email else None) or sale.customer_email or (customer.email if customer else None)
    
    if not target_email or "@" not in target_email:
        raise HTTPException(status_code=400, detail="Please provide a valid concern email ID to send the invoice")
        
    inv_num = sale.invoice_number or generate_invoice_number(sale.id, sale.date)
    sale.invoice_number = inv_num
    sale.customer_email = target_email
    if customer and not customer.email:
        customer.email = target_email
    db.commit()
    
    result = send_invoice_email(
        to_email=target_email,
        sale=sale,
        business=business,
        customer=customer,
        invoice_number=inv_num
    )
    
    notif = Notification(
        business_id=business.id,
        message=f"Invoice #{inv_num} dispatched to {target_email}",
        type="invoice_sent",
        date=datetime.utcnow().date()
    )
    db.add(notif)
    db.commit()
    
    return result


@router.get("/sales/{sale_id}/invoice-pdf")
def download_sale_invoice_pdf(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.business_id == business.id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale transaction not found")
        
    inv_num = sale.invoice_number or generate_invoice_number(sale.id, sale.date)
    pdf_buf = generate_invoice_pdf(
        sale=sale,
        business=business,
        customer=sale.customer,
        recipient_email=sale.customer_email,
        invoice_number=inv_num
    )
    
    headers = {
        'Content-Disposition': f'attachment; filename="{inv_num}.pdf"'
    }
    return StreamingResponse(pdf_buf, headers=headers, media_type="application/pdf")


@router.get("/sales/{sale_id}/invoice-html", response_class=HTMLResponse)
def view_sale_invoice_html(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Configure business profile first")
        
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.business_id == business.id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale transaction not found")
        
    inv_num = sale.invoice_number or generate_invoice_number(sale.id, sale.date)
    html_content = generate_invoice_html(
        sale=sale,
        business=business,
        customer=sale.customer,
        recipient_email=sale.customer_email,
        invoice_number=inv_num
    )
    return HTMLResponse(content=html_content)


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
        email=customer_in.email,
        segment=customer_in.segment or "New"
    )
    db.add(new_cust)
    db.commit()
    db.refresh(new_cust)
    return new_cust
