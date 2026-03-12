require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
Du bist ein KI-Assistent für einen Office-Editor.
Du bekommst den aktuellen Dokumentzustand als JSON und eine Anweisung des Nutzers.

Antworte NUR mit validem JSON im folgenden Format – kein Markdown, keine Erklärung außerhalb von JSON:
{
  "message": "Kurze Bestätigung was du gemacht hast (1-2 Sätze)",
  "document": { ... vollständiger neuer Dokumentzustand ... }
}

Dokument-Schemas:

DOCX: {
  "type": "docx",
  "title": "...",
  "sections": [
    { "heading": "...", "level": 1, "content": "...", "bold": false },
    { "heading": "Tabelle", "level": 2, "table": [["Kopf1","Kopf2"],["Wert1","Wert2"]] }
  ]
}

PPTX: {
  "type": "pptx",
  "title": "...",
  "slides": [
    {
      "title": "...",
      "bullets": ["Punkt 1", "Punkt 2"],
      "layout": "title_content",
      "notes": "...",
      "image": null
    }
  ]
}

XLSX: {
  "type": "xlsx",
  "title": "...",
  "sheets": [
    {
      "name": "Sheet1",
      "headers": ["Spalte A", "Spalte B", "Summe"],
      "rows": [["Produkt A", 100, "=B2"], ["Produkt B", 200, "=B3"]],
      "formulas": { "C2": "=B2*1.19", "C3": "=B3*1.19", "B4": "=SUM(B2:B3)" }
    }
  ]
}

Wichtig bei XLSX:
- Formeln als echte Excel-Formeln schreiben: =SUM(A1:A10), =B2*C2, =AVERAGE(B2:B10)
- Im "formulas"-Objekt stehen Zelladressen und ihre Formel-Strings
- Numerische Werte als Zahlen (nicht Strings)

Wichtig bei PPTX:
- Maximal 6 Bullets pro Folie
- Titel kurz halten (max 8 Wörter)
- Immer eine Titelfolie als erste Folie

Behalte bestehende Inhalte, außer der User sagt explizit, etwas zu löschen.
`;

async function processMessage(userMessage, currentDocument) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Aktueller Dokumentzustand:\n${JSON.stringify(currentDocument, null, 2)}\n\nAnweisung: ${userMessage}`
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

module.exports = { processMessage };
