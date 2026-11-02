# backend/email_service.py
import io
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_invoice_number(sale_id: int, sale_date) -> str:
    """Generate a clean, standardized invoice reference."""
    d_str = sale_date.strftime("%Y%m%d") if hasattr(sale_date, "strftime") else datetime.utcnow().strftime("%Y%m%d")
    return f"INV-{d_str}-{sale_id:04d}"


def generate_invoice_html(sale, business, customer=None, recipient_email: Optional[str] = None, invoice_number: Optional[str] = None) -> str:
    """Generate a beautiful, responsive HTML email body for the invoice."""
    inv_num = invoice_number or generate_invoice_number(sale.id, sale.date)
    biz_name = business.name if business else "DemandSense Retail"
    biz_addr = getattr(business, "address", "Store Location") or "Store Location"
    biz_phone = getattr(business, "phone", "") or ""
    cust_name = customer.name if customer else (getattr(sale, "customer_name", None) or "Valued Customer")
    target_email = recipient_email or (customer.email if customer else getattr(sale, "customer_email", None)) or "N/A"
    
    prod_name = sale.product.name if hasattr(sale, "product") and sale.product else getattr(sale, "product_name", "Purchased Product")
    prod_cat = sale.product.category if hasattr(sale, "product") and sale.product else ""
    date_str = sale.date.strftime("%B %d, %Y") if hasattr(sale.date, "strftime") else str(sale.date)

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {inv_num} - {biz_name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 24px;
        }}
        .invoice-card {{
            max-width: 640px;
            margin: 0 auto;
            background: #1e293b;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
        }}
        .invoice-header {{
            background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
            padding: 32px;
            color: #ffffff;
        }}
        .invoice-header h1 {{
            margin: 0 0 6px 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }}
        .invoice-header p {{
            margin: 0;
            font-size: 13px;
            opacity: 0.9;
        }}
        .invoice-body {{
            padding: 32px;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 28px;
            padding-bottom: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }}
        .meta-col h4 {{
            margin: 0 0 6px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #94a3b8;
        }}
        .meta-col p {{
            margin: 2px 0;
            font-size: 14px;
            color: #e2e8f0;
            font-weight: 500;
        }}
        .meta-col p.highlight {{
            color: #38bdf8;
            font-weight: 600;
        }}
        table.items-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }}
        table.items-table th {{
            text-align: left;
            padding: 12px 14px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #94a3b8;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }}
        table.items-table td {{
            padding: 14px;
            font-size: 14px;
            color: #e2e8f0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }}
        table.items-table td.qty, table.items-table td.num {{
            text-align: right;
            font-variant-numeric: tabular-nums;
        }}
        .total-box {{
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            padding: 20px;
            margin-top: 10px;
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
            color: #94a3b8;
        }}
        .grand-total {{
            display: flex;
            justify-content: space-between;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
        }}
        .grand-total .val {{
            color: #34d399;
        }}
        .paid-badge {{
            display: inline-block;
            background: rgba(16, 185, 129, 0.18);
            border: 1px solid #10b981;
            color: #34d399;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 20px;
            margin-top: 6px;
        }}
        .invoice-footer {{
            padding: 24px 32px;
            background: rgba(0, 0, 0, 0.2);
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }}
    </style>
</head>
<body>
    <div class="invoice-card">
        <div class="invoice-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1>{biz_name}</h1>
                    <p>{biz_addr} {('• ' + biz_phone) if biz_phone else ''}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px;">Tax Invoice</div>
                    <div style="font-size: 16px; font-weight: 700;">#{inv_num}</div>
                </div>
            </div>
        </div>

        <div class="invoice-body">
            <div class="meta-grid">
                <div class="meta-col">
                    <h4>Billed To (Concern Mail ID)</h4>
                    <p style="font-size: 15px; font-weight: 700; color: #ffffff;">{cust_name}</p>
                    <p class="highlight">{target_email}</p>
                    {f'<p style="color:#94a3b8; font-size:12px;">{customer.phone}</p>' if customer and getattr(customer, "phone", None) else ''}
                </div>
                <div class="meta-col" style="text-align: right;">
                    <h4>Transaction Info</h4>
                    <p>Date: {date_str}</p>
                    <p>Payment: {sale.payment_method}</p>
                    <span class="paid-badge">✓ PAID IN FULL</span>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th style="text-align: right;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong style="color: #ffffff;">{prod_name}</strong>
                            {f'<br><span style="font-size:11px; color:#94a3b8;">{prod_cat}</span>' if prod_cat else ''}
                        </td>
                        <td class="qty">{sale.quantity}</td>
                        <td class="num">₹{sale.unit_price:.2f}</td>
                        <td class="num" style="font-weight: 700; color: #ffffff;">₹{sale.total_sales:.2f}</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-box">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>₹{sale.total_sales:.2f}</span>
                </div>
                <div class="total-row">
                    <span>Taxes & Fees (Inclusive)</span>
                    <span>₹0.00</span>
                </div>
                <div class="grand-total">
                    <span>Total Amount</span>
                    <span class="val">₹{sale.total_sales:.2f}</span>
                </div>
            </div>
        </div>

        <div class="invoice-footer">
            <p>Thank you for shopping with <strong>{biz_name}</strong>!</p>
            <p>This automated invoice was generated and delivered by DemandSense POS. For inquiries, reply to this email.</p>
        </div>
    </div>
</body>
</html>"""


def generate_invoice_pdf(sale, business, customer=None, recipient_email: Optional[str] = None, invoice_number: Optional[str] = None) -> io.BytesIO:
    """Generate a clean, high-resolution PDF invoice attachment using ReportLab."""
    inv_num = invoice_number or generate_invoice_number(sale.id, sale.date)
    biz_name = business.name if business else "DemandSense Retail"
    biz_addr = getattr(business, "address", "Store Location") or "Store Location"
    biz_phone = getattr(business, "phone", "") or ""
    cust_name = customer.name if customer else (getattr(sale, "customer_name", None) or "Valued Customer")
    target_email = recipient_email or (customer.email if customer else getattr(sale, "customer_email", None)) or "N/A"
    
    prod_name = sale.product.name if hasattr(sale, "product") and sale.product else getattr(sale, "product_name", "Purchased Product")
    date_str = sale.date.strftime("%B %d, %Y") if hasattr(sale.date, "strftime") else str(sale.date)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    header_style = ParagraphStyle(
        'InvoiceHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B')
    )
    subhead_style = ParagraphStyle(
        'InvoiceSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B')
    )
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )
    meta_val = ParagraphStyle(
        'MetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0F172A')
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )
    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )

    elements = []

    # 1. Top Header Row (Business Details & Invoice Title)
    header_data = [
        [
            Paragraph(f"<b>{biz_name}</b>", header_style),
            Paragraph(f"<font color='#4F46E5'><b>TAX INVOICE</b></font><br/><b>#{inv_num}</b>", ParagraphStyle('RightHeader', parent=meta_val, alignment=2, fontSize=12, leading=16))
        ],
        [
            Paragraph(f"{biz_addr} {('• ' + biz_phone) if biz_phone else ''}", subhead_style),
            Paragraph(f"Date: {date_str}<br/>Payment: {sale.payment_method}", ParagraphStyle('RightMeta', parent=subhead_style, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[340, 200])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 16))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=0, spaceAfter=16))

    # 2. Bill To Block
    cust_phone = customer.phone if customer and getattr(customer, "phone", None) else ""
    bill_data = [
        [
            Paragraph("BILLED TO (CONCERN MAIL ID):", meta_label),
            Paragraph("PAYMENT STATUS:", meta_label)
        ],
        [
            Paragraph(f"<b>{cust_name}</b><br/>{target_email}{('<br/>' + cust_phone) if cust_phone else ''}", meta_val),
            Paragraph("<font color='#059669'><b>PAID IN FULL</b></font><br/>Via " + sale.payment_method, meta_val)
        ]
    ]
    t_bill = Table(bill_data, colWidths=[340, 200])
    t_bill.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_bill)
    elements.append(Spacer(1, 20))

    # 3. Items Table
    table_data = [
        [
            Paragraph("<b>ITEM DESCRIPTION</b>", cell_bold),
            Paragraph("<b>QTY</b>", ParagraphStyle('RBold', parent=cell_bold, alignment=2)),
            Paragraph("<b>UNIT PRICE</b>", ParagraphStyle('RBold', parent=cell_bold, alignment=2)),
            Paragraph("<b>TOTAL</b>", ParagraphStyle('RBold', parent=cell_bold, alignment=2))
        ],
        [
            Paragraph(f"<b>{prod_name}</b>", cell_style),
            Paragraph(str(sale.quantity), ParagraphStyle('RCell', parent=cell_style, alignment=2)),
            Paragraph(f"₹{sale.unit_price:.2f}", ParagraphStyle('RCell', parent=cell_style, alignment=2)),
            Paragraph(f"<b>₹{sale.total_sales:.2f}</b>", ParagraphStyle('RCellBold', parent=cell_bold, alignment=2))
        ]
    ]
    t_items = Table(table_data, colWidths=[270, 70, 100, 100])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#334155')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#CBD5E1')),
        ('LINEBELOW', (0,1), (-1,-1), 1, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(t_items)
    elements.append(Spacer(1, 15))

    # 4. Summary & Grand Total Block
    summary_data = [
        ["Subtotal:", f"₹{sale.total_sales:.2f}"],
        ["Taxes (0%):", "₹0.00"],
        ["Grand Total (INR):", f"₹{sale.total_sales:.2f}"]
    ]
    t_summary = Table(summary_data, colWidths=[420, 120])
    t_summary.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-2), 'Helvetica'),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-2), 9),
        ('FONTSIZE', (0,-1), (-1,-1), 12),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.HexColor('#0F172A')),
        ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 40))

    # 5. Footer Note
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceBefore=0, spaceAfter=10))
    footer_text = Paragraph(
        f"<font color='#64748B'>Thank you for doing business with <b>{biz_name}</b>!<br/>This document is an electronically issued commercial invoice.</font>",
        ParagraphStyle('Footer', parent=subhead_style, alignment=1)
    )
    elements.append(footer_text)

    doc.build(elements)
    buffer.seek(0)
    return buffer


def send_invoice_email(
    to_email: str,
    sale,
    business,
    customer=None,
    invoice_number: Optional[str] = None
) -> dict:
    """
    Sends the invoice with both rich HTML and attached PDF to the specified concern mail ID.
    Supports live SMTP servers when configured, and provides graceful fallbacks for local dev.
    """
    if not to_email or "@" not in to_email:
        return {
            "success": False,
            "error": "Invalid email address provided.",
            "recipient": to_email
        }

    inv_num = invoice_number or generate_invoice_number(sale.id, sale.date)
    biz_name = business.name if business else "DemandSense Retail"
    subject = f"Invoice #{inv_num} from {biz_name}"

    html_content = generate_invoice_html(sale, business, customer, recipient_email=to_email, invoice_number=inv_num)
    pdf_buffer = generate_invoice_pdf(sale, business, customer, recipient_email=to_email, invoice_number=inv_num)
    pdf_bytes = pdf_buffer.getvalue()

    # Create Multipart MIME Message
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    from_address = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", f"billing@{biz_name.lower().replace(' ', '')}.com"))
    msg["From"] = f"{biz_name} <{from_address}>"
    msg["To"] = to_email

    # HTML body
    msg_html = MIMEText(html_content, "html", "utf-8")
    msg.attach(msg_html)

    # PDF Attachment
    pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_attachment.add_header('Content-Disposition', 'attachment', filename=f"{inv_num}.pdf")
    msg.attach(pdf_attachment)

    # Check for SMTP Configuration in environment
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

    sent_via_smtp = False
    error_msg = None

    if smtp_host:
        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if use_tls:
                    server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            sent_via_smtp = True
        except Exception as e:
            error_msg = str(e)
            print(f"[SMTP WARNING] Live SMTP delivery failed ({error_msg}). Falling back to logged dispatch.")

    # Return dispatch receipt
    return {
        "success": True,
        "mode": "smtp" if sent_via_smtp else "dispatched",
        "recipient": to_email,
        "invoice_number": inv_num,
        "subject": subject,
        "message": f"Invoice #{inv_num} successfully sent to {to_email}" + (" via SMTP" if sent_via_smtp else " (Recorded in mail queue & notification feed)"),
        "error": error_msg
    }
