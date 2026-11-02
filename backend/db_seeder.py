# backend/db_seeder.py
import random
import numpy as np
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
import bcrypt
from backend.database import Base, engine
from backend.models import User, BusinessProfile, Product, Sale, Customer, Expense, Notification

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def seed_db(db: Session):
    # Create tables if they do not exist
    Base.metadata.create_all(bind=engine)
    
    # Check if user already exists
    admin_user = db.query(User).filter(User.email == "owner@demandsense.com").first()
    if admin_user:
        # Clear existing data to ensure fresh, consistent seed
        db.query(Notification).delete()
        db.query(Expense).delete()
        db.query(Sale).delete()
        db.query(Customer).delete()
        db.query(Product).delete()
        db.query(BusinessProfile).delete()
        db.query(User).delete()
        db.commit()
        
    print("Seeding database...")
    
    # 1. Create Business Owner User
    hashed_pwd = hash_password("password123")
    owner = User(
        email="owner@demandsense.com",
        hashed_password=hashed_pwd,
        full_name="Alex Mercer"
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)
    
    # 2. Create Business Profile
    business = BusinessProfile(
        user_id=owner.id,
        name="Mercer's Fresh Grocery",
        category="Grocery",
        address="742 Evergreen Terrace, Springfield",
        phone="+1 (555) 019-2834"
    )
    db.add(business)
    db.commit()
    db.refresh(business)
    
    # 3. Create Products
    products_to_seed = [
        # name, category, purchase_price, selling_price, current_stock, min_reorder, supplier_name, supplier_contact
        ("Fresh Milk 1L", "Dairy", 1.80, 2.99, 12, 25, "Valley Valley Dairy", "valley@dairy.com"),
        ("Whole Wheat Bread 500g", "Bakery", 1.10, 2.49, 8, 15, "Golden Bakery Co.", "orders@goldenbakery.com"),
        ("Organic Eggs (Dozen)", "Dairy", 2.20, 4.49, 28, 20, "Valley Valley Dairy", "valley@dairy.com"),
        ("Greek Yogurt 500g", "Dairy", 1.50, 3.29, 32, 20, "Valley Valley Dairy", "valley@dairy.com"),
        ("Fresh Gala Apples (1kg Bag)", "Produce", 1.80, 3.99, 6, 15, "Sunny Orchard Growers", "sales@sunnyorchard.com"),
        ("Bananas (1kg Bundle)", "Produce", 0.90, 1.99, 15, 12, "Sunny Orchard Growers", "sales@sunnyorchard.com"),
        ("Jasmine Rice 5kg", "Pantry", 6.50, 11.99, 4, 8, "Global Grain Imports", "grain@imports.com"),
        ("Olive Oil Extra Virgin 1L", "Pantry", 8.00, 14.99, 10, 8, "Global Grain Imports", "grain@imports.com"),
        ("Spaghetti Pasta 500g", "Pantry", 0.70, 1.79, 45, 30, "Global Grain Imports", "grain@imports.com"),
        ("Canned Chunk Tuna 150g", "Pantry", 0.90, 2.19, 65, 25, "Atlantic Fisheries", "wholesale@atlanticfish.com"),
        ("Tomato Ketchup 500ml", "Pantry", 1.20, 2.89, 3, 10, "Sunny Orchard Growers", "sales@sunnyorchard.com"),
        ("Toilet Paper 9-Roll Pack", "Household", 4.00, 8.49, 5, 12, "SoftTissue Corp.", "wholesale@softtissue.com"),
        ("Sparkle Dish Soap 500ml", "Household", 1.40, 3.19, 19, 10, "EcoClean Inc.", "contact@ecoclean.com"),
        ("Ground Coffee Blend 250g", "Beverages", 3.20, 6.99, 2, 12, "Roasters Reserve Coffee", "roasters@reserve.com"),
        ("Frozen Pepperoni Pizza 400g", "Frozen", 2.50, 5.49, 18, 15, "Bellissimo Foods", "bellissimo@pizza.com")
    ]
    
    db_products = []
    for p in products_to_seed:
        product = Product(
            business_id=business.id,
            name=p[0],
            category=p[1],
            purchase_price=p[2],
            selling_price=p[3],
            current_stock=p[4],
            min_reorder_qty=p[5],
            supplier_name=p[6],
            supplier_contact=p[7]
        )
        db.add(product)
        db_products.append(product)
        
    db.commit()
    
    # Refresh to retrieve product IDs
    for p in db_products:
        db.refresh(p)
        
    product_dict = {p.name: p for p in db_products}
    
    # 4. Create Customers
    customers_to_seed = [
        # name, phone, email, segment
        ("Homer Simpson", "+1 (555) 742-0199", "homer.simpson@springfield.org", "Loyal"),
        ("Marge Simpson", "+1 (555) 742-0198", "marge.simpson@springfield.org", "Loyal"),
        ("Ned Flanders", "+1 (555) 742-1354", "ned.flanders@leftorium.com", "Regular"),
        ("Moe Szyslak", "+1 (555) 123-4567", "moe@tavernspringfield.com", "Occasional"),
        ("Barney Gumble", "+1 (555) 765-4321", "barney.gumble@springfield.org", "Occasional"),
        ("Apu Nahasapeemapetilon", "+1 (555) 999-8888", "apu@quick-e-mart.com", "Regular"),
        ("Seymour Skinner", "+1 (555) 111-2222", "principal.skinner@springfield.edu", "Regular"),
        ("Milhouse Van Houten", "+1 (555) 333-4444", "milhouse@springfield.edu", "New"),
        ("Clancy Wiggum", "+1 (555) 555-5555", "chief.wiggum@springfieldpd.gov", "Occasional"),
        ("Charles Burns", "+1 (555) 000-0001", "c.burns@springfieldnuclear.com", "New")
    ]
    
    db_customers = []
    for c in customers_to_seed:
        customer = Customer(
            business_id=business.id,
            name=c[0],
            phone=c[1],
            email=c[2],
            segment=c[3]
        )
        db.add(customer)
        db_customers.append(customer)
        
    db.commit()
    for c in db_customers:
        db.refresh(c)
        
    # 5. Create Sales (History of 120 Days)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=120)
    
    print("Generating 120 days of sales transactions...")
    
    # Sales parameters per product to make the trends look realistic
    # (base_qty, trend_type, trend_slope, weekday_seasonality)
    # trend_type: 'up' (growing), 'down' (declining), 'stable'
    # weekday_seasonality: multiplier for days [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    p_params = {
        "Fresh Milk 1L": (12, 'stable', 0.0, [0.8, 0.8, 0.9, 1.0, 1.2, 1.5, 1.3]),
        "Whole Wheat Bread 500g": (7, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.4, 1.1]),
        "Organic Eggs (Dozen)": (8, 'up', 0.04, [0.8, 0.9, 0.9, 1.0, 1.3, 1.6, 1.4]), # Growing demand
        "Greek Yogurt 500g": (6, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 1.1]),
        "Fresh Gala Apples (1kg Bag)": (5, 'stable', 0.0, [0.8, 0.9, 0.9, 1.0, 1.2, 1.5, 1.2]),
        "Bananas (1kg Bundle)": (8, 'stable', 0.0, [0.8, 0.8, 0.9, 1.0, 1.3, 1.5, 1.4]),
        "Jasmine Rice 5kg": (2, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.2, 1.1]),
        "Olive Oil Extra Virgin 1L": (3, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.2, 1.1]),
        "Spaghetti Pasta 500g": (10, 'stable', 0.0, [0.8, 0.9, 0.9, 1.0, 1.3, 1.5, 1.3]),
        "Canned Chunk Tuna 150g": (12, 'stable', 0.0, [0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.0]),
        "Tomato Ketchup 500ml": (4, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 1.1]),
        "Toilet Paper 9-Roll Pack": (3, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.3, 1.1]),
        "Sparkle Dish Soap 500ml": (3, 'stable', 0.0, [0.9, 0.9, 0.9, 1.0, 1.1, 1.2, 1.0]),
        "Ground Coffee Blend 250g": (4, 'down', -0.02, [0.9, 0.9, 0.9, 1.0, 1.2, 1.4, 1.1]), # Declining demand
        "Frozen Pepperoni Pizza 400g": (6, 'stable', 0.0, [0.7, 0.8, 0.8, 1.0, 1.4, 1.7, 1.5])
    }
    
    current_date = start_date
    sales_to_add = []
    
    while current_date <= end_date:
        w_day = current_date.weekday()
        days_from_start = (current_date - start_date).days
        
        # Calculate daily sales transactions
        for p_name, p_obj in product_dict.items():
            base, trend, slope, weekday_mult = p_params[p_name]
            
            # Apply growth/declining trend
            trend_mult = 1.0
            if trend == 'up':
                trend_mult = 1.0 + (slope * (days_from_start / 30.0))
            elif trend == 'down':
                trend_mult = max(0.2, 1.0 + (slope * (days_from_start / 30.0)))
                
            day_mult = weekday_mult[w_day]
            
            # Expected qty
            expected_qty = base * trend_mult * day_mult
            # Add some Poisson-like random variations
            qty_sold = int(np.random.poisson(expected_qty))
            
            if qty_sold > 0:
                # We split the sales into multiple separate transactions during the day
                num_txns = max(1, qty_sold // 4)
                tx_qtys = [qty_sold // num_txns] * num_txns
                tx_qtys[0] += qty_sold % num_txns
                
                for q in tx_qtys:
                    if q == 0:
                        continue
                        
                    # Customer assignment
                    # 60% chance to associate with a known customer
                    cust = None
                    if random.random() < 0.6:
                        cust = random.choice(db_customers)
                        
                    # Payments: Card, Cash, UPI
                    pay_method = random.choice(["Cash", "Card", "Mobile UPI"])
                    
                    # Create Sale
                    total_sales = float(q * p_obj.selling_price)
                    sale = Sale(
                        business_id=business.id,
                        product_id=p_obj.id,
                        customer_id=cust.id if cust else None,
                        customer_email=cust.email if cust else None,
                        quantity=q,
                        unit_price=p_obj.selling_price,
                        total_sales=total_sales,
                        date=current_date,
                        payment_method=pay_method
                    )
                    sales_to_add.append(sale)
                    
                    # Spaghetti & Olive Oil Affinity: 40% of spaghetti purchases also buy Olive Oil!
                    if p_name == "Spaghetti Pasta 500g" and random.random() < 0.4:
                        oil_obj = product_dict["Olive Oil Extra Virgin 1L"]
                        oil_qty = 1
                        oil_total = float(oil_qty * oil_obj.selling_price)
                        oil_sale = Sale(
                            business_id=business.id,
                            product_id=oil_obj.id,
                            customer_id=cust.id if cust else None,
                            customer_email=cust.email if cust else None,
                            quantity=oil_qty,
                            unit_price=oil_obj.selling_price,
                            total_sales=oil_total,
                            date=current_date,
                            payment_method=pay_method
                        )
                        sales_to_add.append(oil_sale)

        current_date += timedelta(days=1)
        
    db.add_all(sales_to_add)
    db.commit()
    print(f"Seeded {len(sales_to_add)} sales transactions.")
    
    # 6. Create Expenses (Monthly rent/utilities, weekly inventory refills)
    print("Generating expense history...")
    current_date = start_date
    expenses_to_add = []
    
    while current_date <= end_date:
        # Rent (1st of month)
        if current_date.day == 1:
            expenses_to_add.append(Expense(
                business_id=business.id,
                date=current_date,
                category="Rent",
                amount=1200.0,
                description="Monthly Store Lease"
            ))
            
        # Utilities (5th of month)
        if current_date.day == 5:
            expenses_to_add.append(Expense(
                business_id=business.id,
                date=current_date,
                category="Utilities",
                amount=random.uniform(280.0, 350.0),
                description="Power, Water, and Internet Bill"
            ))
            
        # Salaries (28th of month)
        if current_date.day == 28:
            expenses_to_add.append(Expense(
                business_id=business.id,
                date=current_date,
                category="Salaries",
                amount=800.0,
                description="Part-time Clerk Wages"
            ))
            
        # Weekly supplier purchasing refills (every Tuesday)
        if current_date.weekday() == 1:
            # Generate invoice for inventory purchase
            refill_amount = random.uniform(600.0, 1100.0)
            expenses_to_add.append(Expense(
                business_id=business.id,
                date=current_date,
                category="Inventory Purchasing",
                amount=round(refill_amount, 2),
                description="Weekly Restock - Invoice Refills"
            ))
            
        current_date += timedelta(days=1)
        
    db.add_all(expenses_to_add)
    db.commit()
    print(f"Seeded {len(expenses_to_add)} expense records.")
    
    # 7. Create Smart Notifications (Initial alerts)
    print("Generating initial notifications...")
    notifications = [
        Notification(
            business_id=business.id,
            message="Ground Coffee Blend 250g stock level is low (2 units left). Reorder recommended.",
            type="low_stock",
            date=end_date,
            is_read=False
        ),
        Notification(
            business_id=business.id,
            message="Tomato Ketchup 500ml stock level is low (3 units left). Reorder recommended.",
            type="low_stock",
            date=end_date,
            is_read=False
        ),
        Notification(
            business_id=business.id,
            message="Organic Eggs (Dozen) demand has increased by 32% this month. Restock recommended.",
            type="demand_increase",
            date=end_date,
            is_read=False
        ),
        Notification(
            business_id=business.id,
            message="Weekly inventory forecasting models updated successfully. 5 replenishment actions suggested.",
            type="forecast_update",
            date=end_date - timedelta(days=1),
            is_read=True
        )
    ]
    db.add_all(notifications)
    db.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    from backend.database import SessionLocal
    db_session = SessionLocal()
    try:
        seed_db(db_session)
    finally:
        db_session.close()
