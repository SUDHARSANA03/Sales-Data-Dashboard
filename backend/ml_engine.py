# backend/ml_engine.py
from typing import Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.linear_model import Ridge
from backend.models import Product, Sale, Expense, Customer
import logging

logger = logging.getLogger(__name__)

def get_product_intelligence(db: Session, business_id: int):
    """
    Analyzes inventory and sales, classifying products as Fast/Medium/Slow/Dead 
    and generating purchasing recommendations (Buy More, Buy Less, Do Not Reorder, Restock Immediately).
    """
    products = db.query(Product).filter(Product.business_id == business_id).all()
    
    # Get sales from the last 60 days to evaluate turnover
    cutoff_date = datetime.utcnow().date() - timedelta(days=60)
    sales = db.query(Sale).filter(Sale.business_id == business_id, Sale.date >= cutoff_date).all()
    
    # Load into dataframes
    if not products:
        return []
        
    p_data = [{
        'id': p.id,
        'name': p.name,
        'category': p.category,
        'purchase_price': p.purchase_price,
        'selling_price': p.selling_price,
        'current_stock': p.current_stock,
        'min_reorder_qty': p.min_reorder_qty
    } for p in products]
    df_prod = pd.DataFrame(p_data)
    
    if sales:
        s_data = [{
            'product_id': s.product_id,
            'quantity': s.quantity,
            'total_sales': s.total_sales,
            'date': s.date
        } for s in sales]
        df_sales = pd.DataFrame(s_data)
        df_sales['date'] = pd.to_datetime(df_sales['date'])
    else:
        df_sales = pd.DataFrame(columns=['product_id', 'quantity', 'total_sales', 'date'])

    intelligence = []
    
    # Calculate days range of sales history to normalize sales rate
    total_days = 60
    if not df_sales.empty:
        min_date = df_sales['date'].min()
        max_date = pd.Timestamp(datetime.utcnow().date())
        days_span = (max_date - min_date).days
        total_days = max(days_span, 1)

    for _, prod in df_prod.iterrows():
        p_id = int(prod['id'])
        p_sales = df_sales[df_sales['product_id'] == p_id] if not df_sales.empty else pd.DataFrame()
        
        # Calculate rates
        total_qty_sold = p_sales['quantity'].sum() if not p_sales.empty else 0
        weekly_sales_rate = (total_qty_sold / total_days) * 7
        
        # 1. Product Classification
        # Fast Moving: > 15 units/week
        # Medium Moving: 5 - 15 units/week
        # Slow Moving: 1 - 5 units/week
        # Dead Stock: < 1 unit/week and no sales in last 30 days
        if weekly_sales_rate >= 15:
            classification = "Fast Moving"
        elif weekly_sales_rate >= 5:
            classification = "Medium Moving"
        elif weekly_sales_rate >= 1:
            classification = "Slow Moving"
        else:
            # Check if there were any sales in the last 30 days
            thirty_days_ago = pd.Timestamp(datetime.utcnow().date() - timedelta(days=30))
            recent_sales = p_sales[p_sales['date'] >= thirty_days_ago] if not p_sales.empty else pd.DataFrame()
            if recent_sales.empty and prod['current_stock'] > 0:
                classification = "Dead Stock"
            else:
                classification = "Slow Moving"
                
        # 2. Expected Stock-out Days
        # expected_stockout_days = current_stock / daily_sales_rate
        daily_sales_rate = weekly_sales_rate / 7
        if daily_sales_rate > 0:
            expected_stockout_days = float(prod['current_stock'] / daily_sales_rate)
        else:
            expected_stockout_days = -1.0 # Infinite days/no demand
            
        # 3. Forecast future demand
        # Simplified forecast for individual product intelligence based on recent trends
        next_week_forecast = weekly_sales_rate # Default fallback
        if not p_sales.empty and len(p_sales) >= 5:
            # Simple trend: compare last 15 days vs previous 15 days
            d1 = pd.Timestamp(datetime.utcnow().date() - timedelta(days=15))
            d2 = pd.Timestamp(datetime.utcnow().date() - timedelta(days=30))
            sales_recent = p_sales[p_sales['date'] >= d1]['quantity'].sum()
            sales_prev = p_sales[(p_sales['date'] >= d2) & (p_sales['date'] < d1)]['quantity'].sum()
            if sales_prev > 0:
                trend_factor = sales_recent / sales_prev
                # Cap the trend factor between 0.5 and 1.5 to prevent extreme values
                trend_factor = max(0.5, min(trend_factor, 1.5))
                next_week_forecast = weekly_sales_rate * trend_factor

        # 4. Recommendation Logic
        current_stock = prod['current_stock']
        min_reorder = prod['min_reorder_qty']
        
        # Recommendations: Restock Immediately, Buy More, Buy Less, Do Not Reorder, Stable
        if current_stock == 0:
            recommendation = "Restock Immediately"
            suggested_reorder_qty = int(max(weekly_sales_rate * 3, min_reorder, 10))
        elif current_stock <= min_reorder:
            recommendation = "Restock Immediately"
            suggested_reorder_qty = int(max((weekly_sales_rate * 3) - current_stock, min_reorder, 5))
        elif classification == "Dead Stock":
            recommendation = "Do Not Reorder"
            suggested_reorder_qty = 0
        elif classification == "Fast Moving" and expected_stockout_days < 7:
            recommendation = "Restock Immediately"
            suggested_reorder_qty = int(max(weekly_sales_rate * 4 - current_stock, 20))
        elif weekly_sales_rate > 0 and expected_stockout_days > 45:
            # Overstocked
            recommendation = "Buy Less"
            suggested_reorder_qty = 0
        elif next_week_forecast > weekly_sales_rate * 1.2:
            # Demand increasing
            recommendation = "Buy More"
            suggested_reorder_qty = int(max((next_week_forecast * 3) - current_stock, 0))
        else:
            # Stable stock level
            if current_stock <= weekly_sales_rate * 1.5:
                recommendation = "Buy More" # Keep stock levels healthy
                suggested_reorder_qty = int(max((weekly_sales_rate * 2) - current_stock, min_reorder))
            else:
                recommendation = "Buy Less" # Let current inventory deplete first
                suggested_reorder_qty = 0

        intelligence.append({
            "product_id": p_id,
            "product_name": prod['name'],
            "classification": classification,
            "recommendation": recommendation,
            "stock_level": int(current_stock),
            "min_reorder_qty": int(min_reorder),
            "suggested_reorder_qty": int(suggested_reorder_qty),
            "weekly_sales_rate": float(round(weekly_sales_rate, 2)),
            "expected_stockout_days": float(round(expected_stockout_days, 1))
        })
        
    return intelligence

def train_demand_forecast(db: Session, business_id: int, product_id: Optional[int] = None):
    """
    Trains a Ridge regression model using Scikit-Learn to forecast daily sales demand 
    for the next 7 and 30 days based on lag features and calendar markers.
    """
    # Fetch sales transactions
    query = db.query(Sale).filter(Sale.business_id == business_id)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    sales = query.all()
    
    if not sales or len(sales) < 10:
        # Fallback heuristic if insufficient data
        return generate_heuristic_forecast(db, business_id, product_id)
        
    # Build dataframe
    df = pd.DataFrame([{
        'product_id': s.product_id,
        'quantity': s.quantity,
        'date': s.date
    } for s in sales])
    
    df['date'] = pd.to_datetime(df['date'])
    
    # Aggregate to daily total sales (sum of quantities)
    df_daily = df.groupby('date')['quantity'].sum().reset_index()
    df_daily = df_daily.sort_values('date').set_index('date')
    
    # Fill missing dates with 0 sales
    idx = pd.date_range(df_daily.index.min(), df_daily.index.max(), freq='D')
    df_daily = df_daily.reindex(idx, fill_value=0)
    df_daily = df_daily.reset_index().rename(columns={'index': 'date'})
    
    # Feature Engineering
    # 1. Calendar Features
    df_daily['dayofweek'] = df_daily['date'].dt.dayofweek
    df_daily['month'] = df_daily['date'].dt.month
    df_daily['dayofyear'] = df_daily['date'].dt.dayofyear
    
    # 2. Lag features (7 days lag, 14 days lag, 30 days lag)
    # Only if we have enough historical data
    n_days = len(df_daily)
    for lag in [1, 2, 7, 14]:
        if n_days > lag:
            df_daily[f'lag_{lag}'] = df_daily['quantity'].shift(lag)
    
    # 3. Rolling average features
    if n_days > 7:
        df_daily['roll_mean_7'] = df_daily['quantity'].shift(1).rolling(window=7, min_periods=1).mean()
    if n_days > 14:
        df_daily['roll_mean_14'] = df_daily['quantity'].shift(1).rolling(window=14, min_periods=1).mean()
        
    # Drop rows with NaN due to shifting
    df_train = df_daily.dropna()
    if len(df_train) < 5:
        # Fallback to simple averages if dropping NaNs leaves too few rows
        return generate_heuristic_forecast(db, business_id, product_id)
        
    # Split into features (X) and target (y)
    feature_cols = ['dayofweek', 'month', 'dayofyear']
    for col in df_train.columns:
        if col.startswith('lag_') or col.startswith('roll_mean_'):
            feature_cols.append(col)
            
    X = df_train[feature_cols]
    y = df_train['quantity']
    
    # Train Ridge Regressor
    model = Ridge(alpha=1.0)
    model.fit(X, y)
    
    # Forecast for the next 30 days
    last_date = df_daily['date'].max()
    forecast_dates = [last_date + timedelta(days=i) for i in range(1, 31)]
    
    # We will build predictions iteratively step-by-step to feed the lag features
    predictions = []
    current_history = df_daily.copy()
    
    for next_date in forecast_dates:
        # Create features for this date
        day_feat = {
            'date': next_date,
            'dayofweek': next_date.dayofweek,
            'month': next_date.month,
            'dayofyear': next_date.dayofyear
        }
        
        # Calculate lags based on current_history
        for lag in [1, 2, 7, 14]:
            lag_date = next_date - timedelta(days=lag)
            matching_row = current_history[current_history['date'] == lag_date]
            if not matching_row.empty:
                day_feat[f'lag_{lag}'] = float(matching_row['quantity'].values[0])
            else:
                day_feat[f'lag_{lag}'] = 0.0
                
        # Calculate rolling averages
        for window in [7, 14]:
            roll_dates = [next_date - timedelta(days=i) for i in range(1, window + 1)]
            matching_rows = current_history[current_history['date'].isin(roll_dates)]
            if not matching_rows.empty:
                day_feat[f'roll_mean_{window}'] = float(matching_rows['quantity'].mean())
            else:
                day_feat[f'roll_mean_{window}'] = 0.0
                
        # Format feature row
        x_pred = pd.DataFrame([day_feat])[feature_cols]
        pred_qty = max(0.0, float(model.predict(x_pred)[0]))
        predictions.append({
            'date': next_date.strftime('%Y-%m-%d'),
            'forecasted_demand': round(pred_qty, 2)
        })
        
        # Append this prediction to history so it can be used for future lags
        new_row = pd.DataFrame([{
            'date': next_date,
            'quantity': pred_qty,
            'dayofweek': next_date.dayofweek,
            'month': next_date.month,
            'dayofyear': next_date.dayofyear
        }])
        current_history = pd.concat([current_history, new_row], ignore_index=True)
        
    return predictions

def generate_heuristic_forecast(db: Session, business_id: int, product_id: Optional[int] = None):
    """
    Fallback forecasting using historical weekday averages and category-based sales trends 
    when there is insufficient data to train the ML models.
    """
    query = db.query(Sale).filter(Sale.business_id == business_id)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    sales = query.all()
    
    # Default base sales if absolutely no sales data exists
    base_sales = 3.0
    if sales:
        base_sales = np.mean([s.quantity for s in sales])
        
    # Get weekday variations if we have some data
    weekday_weights = {i: 1.0 for i in range(7)}
    if sales:
        df = pd.DataFrame([{'qty': s.quantity, 'day': pd.to_datetime(s.date).dayofweek} for s in sales])
        grp = df.groupby('day')['qty'].mean()
        for d, val in grp.items():
            if base_sales > 0:
                weekday_weights[d] = max(0.5, min(float(val / base_sales), 2.0))
                
    start_date = datetime.utcnow().date() + timedelta(days=1)
    predictions = []
    
    for i in range(30):
        forecast_date = start_date + timedelta(days=i)
        w_day = forecast_date.dayofweek
        # Add a tiny bit of random noise (simulated demand fluctuation)
        noise = np.random.normal(0, 0.1)
        pred_qty = max(0.0, base_sales * weekday_weights[w_day] * (1.0 + noise))
        
        predictions.append({
            'date': forecast_date.strftime('%Y-%m-%d'),
            'forecasted_demand': round(pred_qty, 2)
        })
        
    return predictions

def get_business_health_score(db: Session, business_id: int) -> float:
    """
    Generates a score (0 to 100) indicating the overall business performance based on:
    - Revenue growth (last 30 vs prev 30 days)
    - Inventory efficiency (turnover & active vs dead stock ratio)
    - Profitability (profit margin)
    - Sales consistency (daily variance)
    """
    # 1. Profitability (Profit Margin)
    # Gross Profit = Revenue - COGS (purchase price)
    products = db.query(Product).filter(Product.business_id == business_id).all()
    if not products:
        return 50.0
        
    prod_lookup = {p.id: p for p in products}
    
    # Last 30 days transactions
    cutoff = datetime.utcnow().date() - timedelta(days=30)
    sales = db.query(Sale).filter(Sale.business_id == business_id, Sale.date >= cutoff).all()
    
    # 1. Profit Margin Score (25%)
    # Expected profit margin around 20-30% for local retail.
    total_rev = 0.0
    total_cogs = 0.0
    for s in sales:
        p = prod_lookup.get(s.product_id)
        if p:
            total_rev += s.total_sales
            total_cogs += s.quantity * p.purchase_price
            
    margin = (total_rev - total_cogs) / (total_rev + 1e-5)
    margin_score = min(100.0, max(0.0, margin * 200.0)) # 50% margin gives 100 score
    
    # 2. Revenue Growth Score (25%)
    # Compare last 30 days sales vs prior 30 days (60 to 30 days ago)
    prev_cutoff = datetime.utcnow().date() - timedelta(days=60)
    prev_sales = db.query(Sale).filter(
        Sale.business_id == business_id,
        Sale.date >= prev_cutoff,
        Sale.date < cutoff
    ).all()
    
    prev_rev = sum([s.total_sales for s in prev_sales])
    if prev_rev > 0:
        growth = (total_rev - prev_rev) / prev_rev
        # 10% growth is great (100 score). -20% is poor (0 score).
        growth_score = min(100.0, max(0.0, 50.0 + (growth * 500.0)))
    else:
        growth_score = 75.0 # default neutral score if no historical baseline
        
    # 3. Inventory Efficiency Score (25%)
    # Active stock vs dead stock ratio
    intelligence = get_product_intelligence(db, business_id)
    dead_stock_count = sum([1 for p in intelligence if p["classification"] == "Dead Stock"])
    total_count = len(intelligence)
    active_ratio = (total_count - dead_stock_count) / (total_count + 1e-5)
    
    # Turn over score: check low stock vs total stock
    # If 80%+ products are moving, that's excellent
    inv_score = active_ratio * 100.0
    
    # 4. Sales Consistency Score (25%)
    # Standard deviation of daily sales divided by mean (Coefficient of Variation)
    # Lower CV = higher consistency = higher score
    if sales:
        df = pd.DataFrame([{'date': s.date, 'revenue': s.total_sales} for s in sales])
        daily_rev = df.groupby('date')['revenue'].sum()
        if len(daily_rev) > 3:
            mean_rev = daily_rev.mean()
            std_rev = daily_rev.std()
            cv = std_rev / (mean_rev + 1e-5)
            # CV around 0.3 is very consistent. CV > 1.5 is highly volatile.
            consistency_score = min(100.0, max(0.0, 100.0 - (cv * 40.0)))
        else:
            consistency_score = 70.0
    else:
        consistency_score = 50.0
        
    # Calculate weighted health score
    health_score = (margin_score * 0.25) + (growth_score * 0.25) + (inv_score * 0.25) + (consistency_score * 0.25)
    return float(round(health_score, 1))
