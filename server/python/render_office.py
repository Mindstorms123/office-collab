import sys
import json
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pptx import Presentation
from pptx.util import Inches, Pt as PptPt
from pptx.dml.color import RGBColor
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment


def render_docx(data, output_path):
    doc = Document()
    doc.add_heading(data.get('title', 'Dokument'), level=0)

    for section in data.get('sections', []):
        heading = section.get('heading')
        content = section.get('content')
        table_data = section.get('table')

        if heading:
            doc.add_heading(heading, level=section.get('level', 1))

        if content:
            p = doc.add_paragraph(content)
            if section.get('bold'):
                for run in p.runs:
                    run.bold = True

        if table_data and len(table_data) > 0:
            t = doc.add_table(rows=len(table_data), cols=len(table_data[0]))
            t.style = 'Table Grid'
            for i, row in enumerate(table_data):
                for j, cell_val in enumerate(row):
                    cell = t.rows[i].cells[j]
                    cell.text = str(cell_val)
                    if i == 0:
                        for para in cell.paragraphs:
                            for run in para.runs:
                                run.bold = True
            doc.add_paragraph('')

    doc.save(output_path)


def render_pptx(data, output_path):
    prs = Presentation()

    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = data.get('title', 'Präsentation')
    if title_slide.placeholders[1]:
        title_slide.placeholders[1].text = 'Automatisch generiert'

    for slide_data in data.get('slides', []):
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        slide.shapes.title.text = slide_data.get('title', '')

        tf = slide.placeholders[1].text_frame
        tf.clear()

        bullets = slide_data.get('bullets', [])
        for i, bullet in enumerate(bullets):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = bullet
            p.level = 0

        if slide_data.get('notes'):
            slide.notes_slide.notes_text_frame.text = slide_data['notes']

    prs.save(output_path)


def render_xlsx(data, output_path):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    header_fill = PatternFill("solid", fgColor="4472C4")
    header_font = Font(bold=True, color="FFFFFF")

    for sheet_data in data.get('sheets', []):
        ws = wb.create_sheet(title=sheet_data.get('name', 'Sheet'))

        headers = sheet_data.get('headers', [])
        if headers:
            ws.append(headers)
            for cell in ws[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal='center')

        for row in sheet_data.get('rows', []):
            ws.append([
                v if isinstance(v, (int, float)) else str(v)
                for v in row
            ])

        # Formeln eintragen (überschreiben Werte aus rows)
        for cell_ref, formula in sheet_data.get('formulas', {}).items():
            ws[cell_ref] = formula  # z.B. "=SUM(B2:B10)"

        # Spaltenbreite automatisch anpassen
        for col in ws.columns:
            max_len = max((len(str(c.value)) for c in col if c.value), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

    wb.save(output_path)


if __name__ == '__main__':
    output_path = sys.argv[1]
    file_format = sys.argv[2]
    data = json.loads(sys.stdin.read())

    if file_format == 'docx':
        render_docx(data, output_path)
    elif file_format == 'pptx':
        render_pptx(data, output_path)
    elif file_format == 'xlsx':
        render_xlsx(data, output_path)
    else:
        print(f"Unbekanntes Format: {file_format}", file=sys.stderr)
        sys.exit(1)
