"""Rebuild the committed synthetic PDF with ReportLab; no network or real data."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def generate(destination: Path) -> None:
    page_width, page_height = A4
    pdf = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1, invariant=1)
    pdf.setTitle("Synthetic Web Interface Estimate - SYN-EST-003")
    pdf.setAuthor("Fictional Example Studio")
    pdf.setSubject("Synthetic estimate for API extraction validation; JPY, tax excluded")
    forest = colors.HexColor("#123F32")
    pale = colors.HexColor("#EFF5F2")
    ink = colors.HexColor("#24332D")
    muted = colors.HexColor("#64726C")
    left, right = 48, page_width - 48

    def text(x, y, content, size=10, bold=False, color=ink):
        pdf.setFillColor(color)
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(x, y, content)

    def right_text(x, y, content, size=10, bold=False, color=ink):
        pdf.setFillColor(color)
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawRightString(x, y, content)

    text(left, page_height - 52, "FICTIONAL EXAMPLE STUDIO", 11, True, forest)
    text(left, page_height - 90, "Web Interface Estimate", 24, True, forest)
    text(left, page_height - 112, "SYNTHETIC TEST DATA - NOT A REAL OFFER", 9, True, muted)
    pdf.setStrokeColor(colors.HexColor("#CDDBD3"))
    pdf.line(left, page_height - 130, right, page_height - 130)

    text(left, page_height - 158, "Prepared for", 9, False, muted)
    text(left, page_height - 178, "Fictional Example Client", 12, True)
    right_text(right, page_height - 158, "Estimate no.  SYN-EST-003", 10)
    right_text(right, page_height - 178, "Issue date  2026-01-15", 10)
    right_text(right, page_height - 198, "Valid until  2026-02-14", 10)

    text(left, page_height - 230, "PROJECT SCOPE", 10, True, forest)
    text(left, page_height - 252, "Design and development of 3 website screens, each for PC and mobile.", 10)
    text(left, page_height - 270, "Responsive variants do not increase the number of screens.", 10)
    text(left, page_height - 292, "Currency: JPY    |    Unit prices exclude tax    |    Standard tax rate: 10%", 10, True)

    top = page_height - 320
    pdf.setFillColor(forest)
    pdf.rect(left, top - 28, right - left, 28, fill=1, stroke=0)
    columns = {"item": left + 12, "qty": left + 210, "unit": left + 225, "price": left + 360, "amount": right - 12}
    text(columns["item"], top - 18, "Item", 9, True, colors.white)
    right_text(columns["qty"], top - 18, "Qty", 9, True, colors.white)
    text(columns["unit"], top - 18, "Unit", 9, True, colors.white)
    right_text(columns["price"], top - 18, "Unit price (JPY)", 9, True, colors.white)
    right_text(columns["amount"], top - 18, "Amount (JPY)", 9, True, colors.white)

    for index, (name, unit_price) in enumerate([("Design", 50000), ("Development", 80000)]):
        row_top = top - 28 - index * 40
        pdf.setFillColor(pale if index % 2 == 0 else colors.white)
        pdf.rect(left, row_top - 40, right - left, 40, fill=1, stroke=0)
        y = row_top - 25
        text(columns["item"], y, name, 11, True)
        right_text(columns["qty"], y, "3", 11)
        text(columns["unit"], y, "screen", 10)
        right_text(columns["price"], y, f"{unit_price:,}", 11)
        right_text(columns["amount"], y, f"{3 * unit_price:,}", 11)

    subtotal_y = top - 135
    right_text(right - 130, subtotal_y, "Subtotal", 10)
    right_text(right - 12, subtotal_y, "390,000", 11)
    right_text(right - 130, subtotal_y - 24, "Tax (10%)", 10)
    right_text(right - 12, subtotal_y - 24, "39,000", 11)
    pdf.setFillColor(pale)
    pdf.rect(right - 275, subtotal_y - 75, 275, 34, fill=1, stroke=0)
    text(right - 262, subtotal_y - 62, "TOTAL (JPY)", 11, True, forest)
    right_text(right - 12, subtotal_y - 62, "429,000", 16, True, forest)

    notes_y = subtotal_y - 112
    text(left, notes_y, "ASSUMPTIONS AND EXCLUSIONS", 10, True, forest)
    text(left, notes_y - 22, "Copy and images are supplied by the fictional client.", 10)
    text(left, notes_y - 40, "Translation, copywriting, additional screens and third-party fees are excluded.", 10)
    text(left, notes_y - 58, "This document records a historical 3-screen job, not the new 5-screen request.", 10)

    pdf.setStrokeColor(colors.HexColor("#CDDBD3"))
    pdf.line(left, 61, right, 61)
    text(left, 43, "Fictional validation fixture. No personal details, payment account or binding offer.", 8, False, muted)
    right_text(right, 43, "1 / 1", 8, False, muted)
    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    output = Path(__file__).with_name("estimate.pdf")
    generate(output)
    print(f"Created {output.name}")
