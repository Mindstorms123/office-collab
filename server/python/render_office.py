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
    from pptx.enum.text import PP_ALIGN
    from pptx.dml.color import RGBColor
    
    prs = Presentation()
    
    # Theme-Farben definieren
    themes = {
        'dark': {'bg': RGBColor(15, 23, 42), 'text': RGBColor(241, 245, 249), 'accent': RGBColor(56, 189, 248)},
        'light': {'bg': RGBColor(255, 255, 255), 'text': RGBColor(15, 23, 42), 'accent': RGBColor(59, 130, 246)},
        'blue': {'bg': RGBColor(30, 58, 138), 'text': RGBColor(255, 255, 255), 'accent': RGBColor(147, 197, 253)},
        'green': {'bg': RGBColor(20, 83, 45), 'text': RGBColor(255, 255, 255), 'accent': RGBColor(134, 239, 172)}
    }
    theme = themes.get(data.get('theme', 'dark'), themes['dark'])
    
    for slide_data in data.get('slides', []):
        layout_type = slide_data.get('layout', 'content')
        
        if layout_type == 'title':
            # TITELFOLIE
            slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank
            
            # Hintergrund (simuliert mit gefülltem Shape)
            bg = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
            bg.fill.solid()
            bg.fill.fore_color.rgb = theme['bg']
            bg.line.fill.background()
            
            # Titel
            title_box = slide.shapes.add_textbox(
                Inches(0.5), Inches(2), 
                Inches(9), Inches(1.5)
            )
            tf = title_box.text_frame
            tf.text = slide_data.get('title', '')
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            p.font.size = PptPt(54)
            p.font.bold = True
            p.font.color.rgb = theme['accent']
            
            # Untertitel
            if slide_data.get('subtitle'):
                sub_box = slide.shapes.add_textbox(
                    Inches(1), Inches(3.8),
                    Inches(8), Inches(1)
                )
                tf_sub = sub_box.text_frame
                tf_sub.text = slide_data['subtitle']
                p_sub = tf_sub.paragraphs[0]
                p_sub.alignment = PP_ALIGN.CENTER
                p_sub.font.size = PptPt(24)
                p_sub.font.color.rgb = theme['text']
        
        elif layout_type == 'two_column':
            # ZWEI-SPALTEN-LAYOUT
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            
            # Hintergrund
            bg = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
            bg.fill.solid()
            bg.fill.fore_color.rgb = theme['bg']
            bg.line.fill.background()
            
            # Titel
            title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(0.8))
            tf = title_box.text_frame
            tf.text = slide_data.get('title', '')
            p = tf.paragraphs[0]
            p.font.size = PptPt(36)
            p.font.bold = True
            p.font.color.rgb = theme['accent']
            
            # Linke Spalte
            left_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(4.3), Inches(4))
            tf_left = left_box.text_frame
            for bullet in slide_data.get('left', []):
                p = tf_left.add_paragraph() if tf_left.text else tf_left.paragraphs[0]
                p.text = '• ' + bullet
                p.font.size = PptPt(18)
                p.font.color.rgb = theme['text']
                p.space_after = PptPt(12)
            
            # Rechte Spalte
            right_box = slide.shapes.add_textbox(Inches(5.2), Inches(1.5), Inches(4.3), Inches(4))
            tf_right = right_box.text_frame
            for bullet in slide_data.get('right', []):
                p = tf_right.add_paragraph() if tf_right.text else tf_right.paragraphs[0]
                p.text = '• ' + bullet
                p.font.size = PptPt(18)
                p.font.color.rgb = theme['text']
                p.space_after = PptPt(12)
        
        else:
            # STANDARD CONTENT-FOLIE
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            
            # Hintergrund
            bg = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
            bg.fill.solid()
            bg.fill.fore_color.rgb = theme['bg']
            bg.line.fill.background()
            
            # Titel
            title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(0.8))
            tf = title_box.text_frame
            tf.text = slide_data.get('title', '')
            p = tf.paragraphs[0]
            p.font.size = PptPt(36)
            p.font.bold = True
            p.font.color.rgb = theme['accent']
            
            # Bullets
            content_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(8.4), Inches(4))
            tf_content = content_box.text_frame
            tf_content.word_wrap = True
            
            for i, bullet in enumerate(slide_data.get('bullets', [])):
                p = tf_content.paragraphs[0] if i == 0 else tf_content.add_paragraph()
                p.text = '• ' + bullet
                p.font.size = PptPt(20)
                p.font.color.rgb = theme['text']
                p.space_after = PptPt(14)
            
            # Notizen
            if slide_data.get('notes'):
                notes_slide = slide.notes_slide
                notes_slide.notes_text_frame.text = slide_data['notes']
    
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
