# app.py
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import calendar
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="Sales Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
    <style>
    .stApp {
        background-color: #eef1f5;
        color: #111827;
    }
    [data-testid="stSidebar"] {
        background-color: #e3e7ed;
    }
    [data-testid="stSidebar"] * {
        color: #111827 !important;
    }
    .block-container,
    .stMarkdown,
    .stMarkdown *,
    .stText,
    label,
    p,
    span,
    div {
        color: #111827;
    }
    .stMetric {
        background-color: #ffffff;
        color: #111827;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #d5dbe3;
        box-shadow: 0 1px 3px rgba(17, 24, 39, 0.08);
    }
    .stMetric * {
        color: #111827 !important;
    }
    [data-testid="stMetricValue"],
    [data-testid="stMetricLabel"] {
        color: #111827 !important;
    }
    [data-testid="stTabs"] button,
    [data-testid="stTabs"] button p {
        color: #111827 !important;
    }
    .stSelectbox,
    .stMultiSelect,
    .stDateInput,
    .stSlider,
    .stCheckbox {
        color: #111827;
    }
    input,
    textarea,
    [data-baseweb="select"],
    [data-baseweb="tag"],
    [data-baseweb="input"] {
        background-color: #ffffff !important;
        color: #111827 !important;
    }
    .stDataFrame,
    [data-testid="stDataFrame"],
    [data-testid="stTable"] {
        background-color: #ffffff;
        color: #111827;
    }
    .stAlert {
        color: #111827;
    }
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #0f172a;
        text-align: center;
        margin-bottom: 1rem;
    }
    </style>
""", unsafe_allow_html=True)

# ============================================
# Data Loading and Caching
# ============================================
@st.cache_data
def load_data():
    """Load and preprocess the sales data"""
    df = pd.read_csv('sales_data.csv', parse_dates=['Date'])
    
    # Basic cleaning
    df = df.dropna(subset=['Total_Sales'])
    df['Region'] = df['Region'].fillna('Unknown')
    df['Product'] = df['Product'].fillna('Misc')
    
    # Create meaningful categories from products
    product_category = {
        'Product A': 'Electronics',
        'Product B': 'Fashion',
        'Product C': 'Home & Living'
    }
    df['Category'] = df['Product'].map(product_category).fillna('Other')
    
    # Extract date features
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    df['Month_Name'] = df['Date'].dt.month_name()
    df['Weekday'] = df['Date'].dt.day_name()
    df['Quarter'] = df['Date'].dt.quarter
    
    return df

@st.cache_data
def filter_data(df, regions, products, date_range):
    """Apply filters to the dataframe"""
    mask = pd.Series(True, index=df.index)
    
    if regions:
        mask &= df['Region'].isin(regions)
    if products:
        mask &= df['Product'].isin(products)
    if date_range and len(date_range) == 2:
        start_date = pd.to_datetime(date_range[0])
        end_date = pd.to_datetime(date_range[1]) + pd.Timedelta(days=1) - pd.Timedelta(microseconds=1)
        mask &= (df['Date'] >= start_date) & (df['Date'] <= end_date)
    
    return df[mask].copy()

# ============================================
# Visualization Functions
# ============================================
def create_sales_over_time(df, cumulative=False):
    """Create interactive line chart for sales over time"""
    daily_sales = df.groupby('Date')['Total_Sales'].sum().reset_index()
    daily_sales = daily_sales.sort_values('Date')
    
    if cumulative:
        daily_sales['Cumulative_Sales'] = daily_sales['Total_Sales'].cumsum()
        fig = px.area(daily_sales, x='Date', y='Cumulative_Sales',
                      title='📈 Cumulative Sales Over Time',
                      labels={'Cumulative_Sales': 'Cumulative Sales (₹)', 'Date': 'Date'},
                      template='plotly_white')
        fig.update_traces(fill='tozeroy', line=dict(color='#2E86AB', width=2))
    else:
        fig = px.line(daily_sales, x='Date', y='Total_Sales',
                      title='📊 Daily Sales Trend',
                      labels={'Total_Sales': 'Sales (₹)', 'Date': 'Date'},
                      markers=True, template='plotly_white')
        fig.update_traces(line=dict(color='#A23B72', width=2), marker=dict(size=6))
    
    fig.update_layout(height=450, hovermode='x unified')
    return fig

def create_region_bar_chart(df):
    """Create interactive bar chart for sales by region"""
    region_sales = df.groupby('Region')['Total_Sales'].sum().reset_index()
    region_sales = region_sales.sort_values('Total_Sales', ascending=True)
    
    fig = px.bar(region_sales, x='Total_Sales', y='Region',
                 orientation='h', text='Total_Sales',
                 title='💰 Total Sales by Region',
                 labels={'Total_Sales': 'Sales (₹)', 'Region': 'Region'},
                 color='Total_Sales', color_continuous_scale='Viridis',
                 template='plotly_white')
    fig.update_traces(texttemplate='₹%{text:,.0f}', textposition='outside')
    fig.update_layout(height=400, showlegend=False)
    return fig

def create_top_products_chart(df, top_n=10):
    """Create bar chart for top products"""
    product_sales = df.groupby('Product')['Total_Sales'].sum().reset_index()
    product_sales = product_sales.sort_values('Total_Sales', ascending=False).head(top_n)
    
    fig = px.bar(product_sales, x='Product', y='Total_Sales',
                 title=f'🏆 Top {top_n} Products by Sales',
                 labels={'Total_Sales': 'Sales (₹)', 'Product': 'Product'},
                 color='Total_Sales', color_continuous_scale='Plasma',
                 template='plotly_white')
    fig.update_layout(height=450, xaxis_tickangle=-45)
    fig.update_traces(texttemplate='₹%{y:,.0f}', textposition='outside')
    return fig

def create_monthly_trend(df):
    """Create monthly sales trend chart"""
    monthly_sales = df.groupby(['Month', 'Month_Name'])['Total_Sales'].sum().reset_index()
    # Ensure proper month ordering
    month_order = list(calendar.month_name)[1:]
    monthly_sales['Month_Name'] = pd.Categorical(monthly_sales['Month_Name'], 
                                                  categories=month_order, ordered=True)
    monthly_sales = monthly_sales.sort_values('Month')
    
    fig = px.line(monthly_sales, x='Month_Name', y='Total_Sales',
                  title='📅 Monthly Sales Trend',
                  labels={'Total_Sales': 'Sales (₹)', 'Month_Name': 'Month'},
                  markers=True, template='plotly_white')
    fig.update_traces(line=dict(color='#F18F01', width=3), marker=dict(size=8))
    fig.update_layout(height=400, xaxis_tickangle=-45)
    return fig

def create_weekday_trend(df):
    """Create weekday sales pattern chart"""
    weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    weekday_sales = df.groupby('Weekday')['Total_Sales'].sum().reset_index()
    weekday_sales['Weekday'] = pd.Categorical(weekday_sales['Weekday'], 
                                               categories=weekday_order, ordered=True)
    weekday_sales = weekday_sales.sort_values('Weekday')
    
    fig = px.bar(weekday_sales, x='Weekday', y='Total_Sales',
                 title='📆 Sales by Weekday',
                 labels={'Total_Sales': 'Sales (₹)', 'Weekday': 'Day'},
                 color='Total_Sales', color_continuous_scale='Tealgrn',
                 template='plotly_white')
    fig.update_layout(height=400, xaxis_tickangle=-45)
    return fig

def create_category_pie(df):
    """Create pie chart for category distribution"""
    category_sales = df.groupby('Category')['Total_Sales'].sum().reset_index()
    
    fig = px.pie(category_sales, values='Total_Sales', names='Category',
                 title='🎯 Sales Distribution by Category',
                 hole=0.3, template='plotly_white')
    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(height=450)
    return fig

def create_correlation_heatmap(df):
    """Create correlation heatmap for numeric variables"""
    numeric_cols = ['Quantity', 'Unit_Price', 'Total_Sales']
    corr_df = df[numeric_cols].corr()
    
    fig = px.imshow(corr_df, text_auto=True, aspect='auto',
                    color_continuous_scale='RdBu_r',
                    title='📊 Correlation Heatmap',
                    labels=dict(color='Correlation'))
    fig.update_layout(height=450, width=500)
    return fig

def create_sales_distribution(df):
    """Create histogram for sales distribution"""
    fig = px.histogram(df, x='Total_Sales', nbins=30,
                       title='💰 Sales Value Distribution',
                       labels={'Total_Sales': 'Sales Amount (₹)', 'count': 'Frequency'},
                       color_discrete_sequence=['#2E86AB'],
                       template='plotly_white')
    fig.update_layout(height=450, bargap=0.1)
    fig.add_vline(x=df['Total_Sales'].mean(), line_dash="dash", 
                  line_color="red", annotation_text=f"Mean: ₹{df['Total_Sales'].mean():,.0f}")
    return fig

def create_region_product_heatmap(df):
    """Create heatmap of sales by region and product"""
    pivot_data = df.pivot_table(values='Total_Sales', index='Region', 
                                 columns='Product', aggfunc='sum', fill_value=0)
    
    fig = px.imshow(pivot_data, text_auto=True, aspect='auto',
                    color_continuous_scale='YlOrRd',
                    title='🌍 Sales Heatmap: Region vs Product',
                    labels=dict(x='Product', y='Region', color='Sales (₹)'))
    fig.update_layout(height=450)
    return fig

# ============================================
# Main App
# ============================================
def main():
    st.markdown('<div class="main-header">📊 Sales Analytics Dashboard</div>', unsafe_allow_html=True)
    st.markdown("---")
    
    # Load data
    try:
        df = load_data()
    except FileNotFoundError:
        st.error("❌ Error: 'sales_data.csv' not found. Please make sure the file is in the same directory.")
        st.stop()
    
    # ============================================
    # Sidebar Filters
    # ============================================
    with st.sidebar:
        st.markdown("## 🔍 Filters")
        st.markdown("---")
        
        # Date range filter
        min_date = df['Date'].min().date()
        max_date = df['Date'].max().date()
        date_range = st.date_input(
            "📅 Date Range",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date
        )
        
        # Region filter
        all_regions = sorted(df['Region'].unique())
        selected_regions = st.multiselect(
            "🌍 Region",
            options=all_regions,
            default=all_regions
        )
        
        # Product filter
        all_products = sorted(df['Product'].unique())
        selected_products = st.multiselect(
            "📦 Product",
            options=all_products,
            default=all_products
        )
        
        st.markdown("---")
        st.markdown("### ⚙️ Display Options")
        
        # Top N products slider
        top_n = st.slider("Number of top products to display", 5, 20, 10)
        
        # Cumulative toggle
        show_cumulative = st.checkbox("Show Cumulative Sales", value=False)
        
        st.markdown("---")
        st.markdown("### 📈 Key Insights")
        st.info("💡 **Tip:** Hover over any chart for detailed information. Use the filters to drill down into specific regions or products.")
    
    # Apply filters
    filtered_df = filter_data(df, selected_regions, selected_products, date_range)
    
    # Check if data is empty after filtering
    if filtered_df.empty:
        st.warning("⚠️ No data available for the selected filters. Please adjust your selection.")
        st.stop()
    
    # ============================================
    # Key Metrics Row
    # ============================================
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_sales = filtered_df['Total_Sales'].sum()
        st.metric("💰 Total Sales", f"₹{total_sales:,.0f}")
    
    with col2:
        total_quantity = filtered_df['Quantity'].sum()
        st.metric("📦 Total Quantity", f"{total_quantity:,.0f}")
    
    with col3:
        avg_order_value = filtered_df['Total_Sales'].mean()
        st.metric("💵 Avg Order Value", f"₹{avg_order_value:,.2f}")
    
    with col4:
        num_transactions = len(filtered_df)
        st.metric("📝 Transactions", f"{num_transactions:,}")
    
    st.markdown("---")
    
    # ============================================
    # Main Dashboard Tabs
    # ============================================
    tab1, tab2, tab3, tab4 = st.tabs(["📈 Time Analysis", "🏆 Product & Region", "📊 Advanced Analytics", "📋 Data Explorer"])
    
    with tab1:
        col_left, col_right = st.columns([2, 1])
        
        with col_left:
            # Sales over time chart
            time_fig = create_sales_over_time(filtered_df, cumulative=show_cumulative)
            st.plotly_chart(time_fig, use_container_width=True)
            
            # Monthly and Weekly trends side by side
            col_sub1, col_sub2 = st.columns(2)
            with col_sub1:
                monthly_fig = create_monthly_trend(filtered_df)
                st.plotly_chart(monthly_fig, use_container_width=True)
            with col_sub2:
                weekday_fig = create_weekday_trend(filtered_df)
                st.plotly_chart(weekday_fig, use_container_width=True)
        
        with col_right:
            # Category distribution
            category_fig = create_category_pie(filtered_df)
            st.plotly_chart(category_fig, use_container_width=True)
            
            # Quick stats
            st.markdown("### 📌 Quick Stats")
            st.markdown(f"""
            - **Top Region:** {filtered_df.groupby('Region')['Total_Sales'].sum().idxmax()}
            - **Top Product:** {filtered_df.groupby('Product')['Total_Sales'].sum().idxmax()}
            - **Best Month:** {filtered_df.groupby('Month_Name')['Total_Sales'].sum().idxmax()}
            - **Best Weekday:** {filtered_df.groupby('Weekday')['Total_Sales'].sum().idxmax()}
            """)
    
    with tab2:
        col_left, col_right = st.columns(2)
        
        with col_left:
            # Region sales
            region_fig = create_region_bar_chart(filtered_df)
            st.plotly_chart(region_fig, use_container_width=True)
            
            # Region-Product heatmap
            heatmap_fig = create_region_product_heatmap(filtered_df)
            st.plotly_chart(heatmap_fig, use_container_width=True)
        
        with col_right:
            # Top products
            top_products_fig = create_top_products_chart(filtered_df, top_n=top_n)
            st.plotly_chart(top_products_fig, use_container_width=True)
            
            # Top products table
            st.markdown(f"### 🏅 Top {top_n} Products (Data)")
            product_ranking = filtered_df.groupby('Product')['Total_Sales'].sum().sort_values(ascending=False).head(top_n).reset_index()
            product_ranking['Rank'] = range(1, len(product_ranking) + 1)
            product_ranking['Total_Sales'] = product_ranking['Total_Sales'].apply(lambda x: f"${x:,.0f}")
            st.dataframe(product_ranking[['Rank', 'Product', 'Total_Sales']], use_container_width=True, hide_index=True)
    
    with tab3:
        col_left, col_right = st.columns(2)
        
        with col_left:
            # Sales distribution
            dist_fig = create_sales_distribution(filtered_df)
            st.plotly_chart(dist_fig, use_container_width=True)
        
        with col_right:
            # Correlation heatmap
            if len(filtered_df) > 1:
                corr_fig = create_correlation_heatmap(filtered_df)
                st.plotly_chart(corr_fig, use_container_width=True)
            else:
                st.info("Insufficient data for correlation analysis. Please select a larger date range or more products.")
        
        # Additional insights
        st.markdown("---")
        st.markdown("### 📈 Statistical Summary")
        
        col_stats1, col_stats2, col_stats3 = st.columns(3)
        with col_stats1:
            st.metric("Sales Std Deviation", f"${filtered_df['Total_Sales'].std():,.2f}")
        with col_stats2:
            st.metric("Sales Median", f"${filtered_df['Total_Sales'].median():,.2f}")
        with col_stats3:
            st.metric("Sales Range", f"${filtered_df['Total_Sales'].min():,.0f} - ${filtered_df['Total_Sales'].max():,.0f}")
        
        # Quarterly analysis
        st.markdown("### 📅 Quarterly Performance")
        quarterly_sales = filtered_df.groupby('Quarter')['Total_Sales'].sum().reset_index()
        quarterly_fig = px.bar(quarterly_sales, x='Quarter', y='Total_Sales',
                                title='Sales by Quarter',
                                labels={'Total_Sales': 'Sales ($)', 'Quarter': 'Quarter'},
                                color='Total_Sales', color_continuous_scale='Viridis',
                                template='plotly_white')
        st.plotly_chart(quarterly_fig, use_container_width=True)
    
    with tab4:
        st.markdown("### 📋 Filtered Data Preview")
        st.dataframe(filtered_df, use_container_width=True, height=400)
        
        # Download button for filtered data
        csv = filtered_df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download Filtered Data (CSV)",
            data=csv,
            file_name=f"sales_data_filtered_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )
        
        # Summary statistics
        st.markdown("### 📊 Summary Statistics")
        st.dataframe(filtered_df.describe(), use_container_width=True)

if __name__ == "__main__":
    main()
