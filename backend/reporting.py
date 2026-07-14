# backend/reporting.py
import io
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.models import Product, Sale, Expense, BusinessProfile
from backend.ml_engine import get_product_intelligence, get_business_health_score, train_demand_forecast

class NumberedCanvas(canvas.Canvas):
    """Canvas for adding page numbers and running headers/footers dynamically"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(54, 750, "DemandSense Platform - Business Report")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, page_text)
        self.drawString(54, 40, "Confidential - For Internal Use Only")
        self.line(54, 50, 558, 50)
        self.restoreState()


def generate_excel_report(db: Session, business_id: int) -> io.BytesIO:
    """Generates an Excel workbook with sheets for Summary, Inventory status, and Sales records"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    products = db.query(Product).filter(Product.business_id == business_id).all()
    sales = db.query(Sale).filter(Sale.business_id == business_id).order_by(Sale.date.desc()).all()
    
    wb = openpyxl.Workbook()
    
    # Fonts & Colors
    title_font = Font(name="Arial", size=16, bold=True, color="FFFFFF")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Arial", size=11, bold=True)
    regular_font = Font(name="Arial", size=10)
    
    title_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Dark Navy
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid") # Blue
    accent_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid") # Light Blue
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # ----------------------------------------------------
    # Sheet 1: Executive Summary
    # ----------------------------------------------------
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws1.merge_cells("A1:D2")
    ws1["A1"] = "DEMANDSENSE BUSINESS HEALTH REPORT"
    ws1["A1"].font = title_font
    ws1["A1"].fill = title_fill
    ws1["A1"].alignment = Alignment(horizontal="center", vertical="center")
    
    ws1["A4"] = "Business Name:"
    ws1["B4"] = business.name if business else "N/A"
    ws1["A5"] = "Category:"
    ws1["B5"] = business.category if business else "N/A"
    ws1["A6"] = "Report Date:"
    ws1["B6"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    for row in ["A4", "A5", "A6"]:
        ws1[row].font = bold_font
        
    # Health Score & Quick Metrics
    ws1["A8"] = "Key Business Metrics"
    ws1["A8"].font = Font(name="Arial", size=14, bold=True, color="1E3A8A")
    
    metrics = [
        ("Business Health Score", get_business_health_score(db, business_id), "/ 100"),
        ("Total Products in Catalog", len(products), "units"),
        ("Total Sales Volume", sum([s.quantity for s in sales]), "units"),
        ("Total Revenue Generated", sum([s.total_sales for s in sales]), "₹"),
        ("Total Cost of Goods Sold", sum([s.quantity * (db.query(Product).filter(Product.id == s.product_id).first().purchase_price if db.query(Product).filter(Product.id == s.product_id).first() else 0) for s in sales]), "₹"),
    ]
    
    ws1["A10"] = "Indicator"
    ws1["B10"] = "Value"
    ws1["C10"] = "Unit"
    for col in ["A10", "B10", "C10"]:
        ws1[col].font = header_font
        ws1[col].fill = header_fill
        ws1[col].alignment = Alignment(horizontal="center")
        
    row_idx = 11
    for name, val, unit in metrics:
        ws1.cell(row=row_idx, column=1, value=name).font = regular_font
        ws1.cell(row=row_idx, column=2, value=val).font = bold_font
        ws1.cell(row=row_idx, column=3, value=unit).font = regular_font
        
        ws1.cell(row=row_idx, column=1).border = thin_border
        ws1.cell(row=row_idx, column=2).border = thin_border
        ws1.cell(row=row_idx, column=3).border = thin_border
        
        if name == "Business Health Score":
            ws1.cell(row=row_idx, column=1).fill = accent_fill
            ws1.cell(row=row_idx, column=2).fill = accent_fill
            
        row_idx += 1
        
    # ----------------------------------------------------
    # Sheet 2: Inventory Analysis
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Inventory Status")
    ws2.views.sheetView[0].showGridLines = True
    
    headers = [
        "Product ID", "Product Name", "Category", "Purchase Price (₹)", 
        "Selling Price (₹)", "Current Stock", "Min Reorder Threshold", 
        "Weekly Velocity", "Stock-out Est. (Days)", "ML Recommendation"
    ]
    
    for col_idx, h in enumerate(headers, 1):
        cell = ws2.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    
    intel = get_product_intelligence(db, business_id)
    prod_lookup = {p.id: p for p in products}
    
    for row_idx, item in enumerate(intel, 2):
        p_id = item["product_id"]
        prod_obj = prod_lookup.get(p_id)
        
        ws2.cell(row=row_idx, column=1, value=p_id)
        ws2.cell(row=row_idx, column=2, value=item["product_name"])
        ws2.cell(row=row_idx, column=3, value=prod_obj.category if prod_obj else "")
        ws2.cell(row=row_idx, column=4, value=prod_obj.purchase_price if prod_obj else 0.0)
        ws2.cell(row=row_idx, column=5, value=prod_obj.selling_price if prod_obj else 0.0)
        ws2.cell(row=row_idx, column=6, value=item["stock_level"])
        ws2.cell(row=row_idx, column=7, value=item["min_reorder_qty"])
        ws2.cell(row=row_idx, column=8, value=item["weekly_sales_rate"])
        
        days_val = item["expected_stockout_days"]
        ws2.cell(row=row_idx, column=9, value="Never" if days_val < 0 else days_val)
        
        rec_cell = ws2.cell(row=row_idx, column=10, value=item["recommendation"])
        rec_cell.font = bold_font
        
        # Color code recommendations
        if item["recommendation"] == "Restock Immediately":
            rec_cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid") # Light Red
        elif item["recommendation"] == "Buy More":
            rec_cell.fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid") # Light Green
        elif item["recommendation"] == "Do Not Reorder":
            rec_cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid") # Light Yellow
            
        for c in range(1, 11):
            ws2.cell(row=row_idx, column=c).border = thin_border
            ws2.cell(row=row_idx, column=c).font = regular_font if c != 10 else bold_font

    # Autofit columns
    for ws in [ws1, ws2]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # ----------------------------------------------------
    # Sheet 3: Sales History
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Sales History")
    ws3.views.sheetView[0].showGridLines = True
    
    sales_headers = ["Transaction ID", "Date", "Product ID", "Product Name", "Quantity Sold", "Unit Selling Price (₹)", "Total Sales (₹)", "Payment Method"]
    for col_idx, h in enumerate(sales_headers, 1):
        cell = ws3.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        
    for row_idx, s in enumerate(sales, 2):
        ws3.cell(row=row_idx, column=1, value=s.id)
        ws3.cell(row=row_idx, column=2, value=s.date.strftime("%Y-%m-%d"))
        ws3.cell(row=row_idx, column=3, value=s.product_id)
        ws3.cell(row=row_idx, column=4, value=s.product.name if s.product else "Deleted Product")
        ws3.cell(row=row_idx, column=5, value=s.quantity)
        ws3.cell(row=row_idx, column=6, value=s.unit_price)
        ws3.cell(row=row_idx, column=7, value=s.total_sales)
        ws3.cell(row=row_idx, column=8, value=s.payment_method)
        
        for c in range(1, 9):
            ws3.cell(row=row_idx, column=c).border = thin_border
            ws3.cell(row=row_idx, column=c).font = regular_font

    # Autofit sales columns
    for col in ws3.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws3.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def generate_pdf_report(db: Session, business_id: int) -> io.BytesIO:
    """Generates a professional PDF report containing the executive summary, inventory indicators, and demand forecasting"""
    business = db.query(BusinessProfile).filter(BusinessProfile.id == business_id).first()
    products = db.query(Product).filter(Product.business_id == business_id).all()
    sales = db.query(Sale).filter(Sale.business_id == business_id).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=80,
        bottomMargin=60
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette Definitions
    primary_color = colors.HexColor("#1E3A8A")   # Dark Navy
    secondary_color = colors.HexColor("#3B82F6") # Slate Blue
    accent_color = colors.HexColor("#F59E0B")    # Gold Accent
    text_color = colors.HexColor("#1E293B")      # Charcoal Body
    light_bg = colors.HexColor("#F8FAFC")        # Soft white background
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=20
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=8
    )
    
    bold_body_style = ParagraphStyle(
        'BodyDarkBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    center_bold_style = ParagraphStyle(
        'CenterBold',
        parent=bold_body_style,
        alignment=1
    )

    story = []
    
    # Cover / Header
    story.append(Paragraph("DEMANDSENSE EXECUTIVE AUDIT", title_style))
    biz_name = business.name if business else "N/A"
    biz_cat = business.category if business else "N/A"
    gen_date = datetime.now().strftime("%B %d, %Y - %H:%M")
    story.append(Paragraph(f"Business Profile: <b>{biz_name}</b> ({biz_cat}) | Generated: {gen_date}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Health Score Dashboard Card
    health_score = get_business_health_score(db, business_id)
    
    health_text = f"""
    Based on machine learning models evaluating your sales growth, stock turnover, profit margin, 
    and transaction volatility, your business has been graded with a health score of <b>{health_score}/100</b>.
    """
    
    score_table_data = [
        [
            Paragraph(f"<font size=28 color='#1E3A8A'><b>{health_score}</b></font><br/><font size=9 color='#64748B'>Health Score</font>", center_bold_style),
            Paragraph(health_text, body_style)
        ]
    ]
    
    score_table = Table(score_table_data, colWidths=[120, 384])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 12),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1"))
    ]))
    
    story.append(score_table)
    story.append(Spacer(1, 15))
    
    # Section 1: Executive KPI Metrics
    story.append(Paragraph("Executive Performance Metrics", heading_style))
    
    total_revenue = sum([s.total_sales for s in sales])
    total_sales_vol = sum([s.quantity for s in sales])
    total_orders = len(sales)
    avg_price = total_revenue / (total_sales_vol + 1e-5)
    
    kpi_data = [
        [
            Paragraph("<b>Total Revenue</b>", body_style), Paragraph(f"₹{total_revenue:,.2f}", bold_body_style),
            Paragraph("<b>Total Quantity Sold</b>", body_style), Paragraph(f"{total_sales_vol:,} units", bold_body_style)
        ],
        [
            Paragraph("<b>Total Transactions</b>", body_style), Paragraph(f"{total_orders:,}", bold_body_style),
            Paragraph("<b>Average Order Value</b>", body_style), Paragraph(f"₹{total_revenue / (total_orders + 1e-5):,.2f}", bold_body_style)
        ]
    ]
    
    kpi_table = Table(kpi_data, colWidths=[120, 132, 120, 132])
    kpi_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (0,-1), light_bg),
        ('BACKGROUND', (2,0), (2,-1), light_bg),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))
    
    # Section 2: Reorder Warnings
    story.append(Paragraph("Critical Inventory Replenishment Alert", heading_style))
    story.append(Paragraph("The following products are identified by our intelligence engine as requiring immediate restock:", body_style))
    
    intel = get_product_intelligence(db, business_id)
    reorder_items = [i for i in intel if i["recommendation"] == "Restock Immediately"]
    
    if reorder_items:
        reorder_data = [["Product Name", "Current Stock", "Min Threshold", "Weekly Sales Rate", "Suggested Buy"]]
        for r in reorder_items[:8]: # Limit list size to fit nicely
            reorder_data.append([
                r["product_name"],
                str(r["stock_level"]),
                str(r["min_reorder_qty"]),
                f"{r['weekly_sales_rate']}/wk",
                str(r["suggested_reorder_qty"])
            ])
            
        reorder_table = Table(reorder_data, colWidths=[164, 80, 80, 100, 80])
        reorder_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (0,1), (0,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('FONTSIZE', (0,1), (-1,-1), 9),
        ]))
        story.append(reorder_table)
    else:
        story.append(Paragraph("🎉 Good news! All products have healthy stock levels above minimum thresholds.", body_style))
        
    story.append(Spacer(1, 15))
    
    # Section 3: Machine Learning Demand Forecast
    story.append(Paragraph("Predictive Demand Forecast (Next 7 Days)", heading_style))
    story.append(Paragraph("Machine learning regression models trained on daily sales logs forecast the following weekly demand values:", body_style))
    
    # Fetch forecasts for top 5 products
    top_selling_dict = {}
    for s in sales:
        top_selling_dict[s.product_id] = top_selling_dict.get(s.product_id, 0) + s.quantity
        
    top_p_ids = sorted(top_selling_dict, key=top_selling_dict.get, reverse=True)[:5]
    
    forecast_data = [["Product", "Recent Stock", "Next 7d Forecast", "Est. Stock-out Date", "Purchasing Recommendation"]]
    
    for pid in top_p_ids:
        # Get product and details
        prod = next((p for p in products if p.id == pid), None)
        if not prod:
            continue
            
        # Get forecast
        forecast_pts = train_demand_forecast(db, business_id, pid)
        next_week_demand = sum([pt['forecasted_demand'] for pt in forecast_pts[:7]])
        
        prod_intel = next((i for i in intel if i['product_id'] == pid), None)
        rec = prod_intel['recommendation'] if prod_intel else "Stable"
        stockout_days = prod_intel['expected_stockout_days'] if prod_intel else -1.0
        
        if stockout_days < 0:
            stockout_str = "Never"
        else:
            stockout_str = (datetime.utcnow().date() + timedelta(days=int(stockout_days))).strftime("%Y-%m-%d")
            
        forecast_data.append([
            prod.name,
            str(prod.current_stock),
            f"{next_week_demand:.1f} units",
            stockout_str,
            rec
        ])
        
    if len(forecast_data) > 1:
        forecast_table = Table(forecast_data, colWidths=[144, 70, 90, 90, 110])
        forecast_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), secondary_color),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (0,1), (0,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_bg]),
            ('PADDING', (0,0), (-1,-1), 6),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('FONTSIZE', (0,1), (-1,-1), 9),
        ]))
        story.append(forecast_table)
    else:
        story.append(Paragraph("Insufficient historical data to show product-level demand forecasting models.", body_style))
        
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
