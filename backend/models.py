# backend/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    businesses = relationship("BusinessProfile", back_populates="owner")

class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # e.g., Grocery, Bakery, Pharmacy, Retail
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="businesses")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="business", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="business", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)
    purchase_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    current_stock = Column(Integer, nullable=False, default=0)
    min_reorder_qty = Column(Integer, nullable=False, default=10)
    supplier_name = Column(String, nullable=True)
    supplier_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    business = relationship("BusinessProfile", back_populates="products")
    sales = relationship("Sale", back_populates="product", cascade="all, delete-orphan")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    segment = Column(String, default="Occasional") # Loyal, Regular, Occasional, New
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    business = relationship("BusinessProfile", back_populates="customers")
    sales = relationship("Sale", back_populates="customer")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_sales = Column(Float, nullable=False)
    date = Column(Date, nullable=False) # Historical sales date
    payment_method = Column(String, default="Cash") # Cash, Card, Mobile UPI
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    business = relationship("BusinessProfile", back_populates="sales")
    product = relationship("Product", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String, nullable=False) # rent, utilities, salaries, inventory_purchasing, marketing, misc
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    business = relationship("BusinessProfile", back_populates="expenses")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, nullable=False) # low_stock, refill_recommendation, demand_increase, overstock, forecast_update
    date = Column(Date, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    business = relationship("BusinessProfile", back_populates="notifications")
