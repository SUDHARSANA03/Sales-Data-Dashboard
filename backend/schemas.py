# backend/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# --- Token and Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Business Profile Schemas ---
class BusinessCreate(BaseModel):
    name: str
    category: str
    address: Optional[str] = None
    phone: Optional[str] = None

class BusinessResponse(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductCreate(BaseModel):
    name: str
    category: str
    purchase_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    current_stock: int = Field(..., ge=0)
    min_reorder_qty: int = Field(10, ge=0)
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    business_id: int
    name: str
    category: str
    purchase_price: float
    selling_price: float
    current_stock: int
    min_reorder_qty: int
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Customer Schemas ---
class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    segment: Optional[str] = "Occasional"

class CustomerResponse(BaseModel):
    id: int
    business_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    segment: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Sale Schemas ---
class SaleCreate(BaseModel):
    product_id: int
    customer_id: Optional[int] = None
    customer_email: Optional[str] = None # Direct concern mail ID
    send_email: Optional[bool] = True
    quantity: int = Field(..., gt=0)
    unit_price: Optional[float] = None # If null, will default to product's selling price
    payment_method: Optional[str] = "Cash"
    date: Optional[date] = None # defaults to today

class EmailInvoiceRequest(BaseModel):
    email: Optional[str] = None

class SaleResponse(BaseModel):
    id: int
    business_id: int
    product_id: int
    product_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    invoice_number: Optional[str] = None
    email_sent: Optional[bool] = False
    email_status: Optional[str] = None
    quantity: int
    unit_price: float
    total_sales: float
    date: date
    payment_method: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Expense Schemas ---
class ExpenseCreate(BaseModel):
    date: date
    category: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    business_id: int
    date: date
    category: str
    amount: float
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    business_id: int
    message: str
    type: str
    date: date
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics Response Schemas ---
class DashboardMetrics(BaseModel):
    total_revenue: float
    total_sales: int # transaction count
    total_profit: float
    inventory_value: float
    business_health_score: float

class SalesTrendPoint(BaseModel):
    date: str
    sales: float
    quantity: int

class SalesDashboardResponse(BaseModel):
    total_revenue: float
    daily_sales: List[SalesTrendPoint]
    weekly_sales: List[dict]
    monthly_sales: List[dict]
    revenue_growth_pct: float

class ProductIntelligencePoint(BaseModel):
    product_id: int
    product_name: str
    classification: str # Fast, Medium, Slow, Dead
    recommendation: str # Buy More, Buy Less, Do Not Reorder, Restock Immediately
    stock_level: int
    min_reorder_qty: int
    suggested_reorder_qty: int
    weekly_sales_rate: float
    expected_stockout_days: float # days left, -1 for infinite

class ProductAnalyticsResponse(BaseModel):
    top_selling: List[dict]
    classifications: List[ProductIntelligencePoint]

class ForecastPoint(BaseModel):
    date: str
    forecasted_demand: float

class ProductForecastDetail(BaseModel):
    product_id: int
    product_name: str
    next_week_demand: float
    next_month_demand: float
    suggested_reorder: int
    expected_stockout_days: int
    demand_trend: str # Increasing, Stable, Declining
    demand_change_pct: float
    forecast_points: List[ForecastPoint]

class ForecastDashboardResponse(BaseModel):
    overall_sales_forecast: List[dict]
    product_forecasts: List[ProductForecastDetail]
