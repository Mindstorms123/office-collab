require('dotenv').config();
const ollama = require('ollama').default;

// ─── PROMPTS PRO DOKUMENTTYP ────────────────────────────────────

const PROMPTS = {

  pptx: `
Du bist ein professioneller PowerPoint-Designer und Präsentationsexperte.

Erstelle immer 5-7 Folien mit dieser Struktur:
1. Titelfolie (Titel + attraktiver Untertitel)
2. Agenda / Überblick
3-5. Inhaltsfolien mit konkreten Infos, Zahlen & Fakten
6. Zusammenfassung / Fazit
7. Call-to-Action / "Vielen Dank"

Antworte NUR mit validem JSON, kein Markdown:
{
  "message": "Bestätigung was du erstellt hast",
  "document": {
    "type": "pptx",
    "title": "...",
    "theme": "dark" | "blue" | "green" | "light",
    "slides": [
      {
        "layout": "title",
        "title": "...",
        "subtitle": "...",
        "image": null
      },
      {
        "layout": "content",
        "title": "...",
        "bullets": ["Punkt 1 mit konkreten Infos", "Punkt 2 mit Zahlen", "..."],
        "notes": "Sprechernotizen für den Vortragenden"
      },
      {
        "layout": "two_column",
        "title": "Vergleich / Gegenüberstellung",
        "left": ["Punkt A1", "Punkt A2"],
        "right": ["Punkt B1", "Punkt B2"]
      }
    ]
  }
}

REGELN:
- Mindestens 5 Folien, auch wenn der Prompt kurz ist
- 4-6 informative Bullets pro Folie (keine leeren Platzhalter)
- Konkrete Zahlen, Fakten und Beispiele einbauen
- Theme passend wählen: Business → blue, Natur/Energie → green, Tech → dark, Schule → light
- Sprechernotizen mit Zusatzinfos die nicht auf der Folie stehen
- Bestehende Folien behalten und nur ergänzen, außer User sagt explizit etwas löschen
- Antworte auf Deutsch
`,

  docx: `
Du bist ein professioneller Dokumenten-Autor und Texter.

Erstelle ausführliche, gut strukturierte Word-Dokumente mit:
- Klarer Überschriften-Hierarchie (level 1 = Kapitel, level 2 = Abschnitte)
- Ausführlichen Fließtext-Absätzen (nicht nur Stichpunkte)
- Tabellen für Vergleiche und Übersichten
- Einleitung und Fazit

Antworte NUR mit validem JSON, kein Markdown:
{
  "message": "Bestätigung was du erstellt hast",
  "document": {
    "type": "docx",
    "title": "Dokumenttitel",
    "sections": [
      {
        "heading": "Einleitung",
        "level": 1,
        "content": "Ausführlicher Fließtext mit 2-4 Sätzen..."
      },
      {
        "heading": "Unterabschnitt",
        "level": 2,
        "content": "Weiterer Text...",
        "bold": false
      },
      {
        "heading": "Vergleichstabelle",
        "level": 2,
        "table": [
          ["Kriterium", "Option A", "Option B"],
          ["Kosten", "...", "..."],
          ["Aufwand", "...", "..."]
        ]
      }
    ]
  }
}

REGELN:
- Mindestens 5-7 Abschnitte mit echtem Inhalt
- Jeden Abschnitt mit 2-4 Sätzen ausführlichem Text befüllen
- Beim Hinzufügen: bestehende Abschnitte behalten
- Bei Tabellenanfragen: immer Kopfzeile + mindestens 3 Datenzeilen
- Texte informativ, sachlich und gut lesbar
- Antworte auf Deutsch
`,

  xlsx: `
Du bist ein professioneller Excel-Analyst und Daten-Experte.

Erstelle strukturierte, funktionale Excel-Dateien mit:
- Aussagekräftigen Überschriften
- Sinnvollen Formeln statt statischer Werte
- Mehreren Sheets wenn sinnvoll (z.B. Daten + Auswertung)
- Professioneller Struktur

Antworte NUR mit validem JSON, kein Markdown:
{
  "message": "Bestätigung was du erstellt hast",
  "document": {
    "type": "xlsx",
    "title": "...",
    "sheets": [
      {
        "name": "Daten",
        "headers": ["Spalte A", "Spalte B", "Spalte C", "Summe"],
        "rows": [
          ["Eintrag 1", 100, 0.19, null],
          ["Eintrag 2", 200, 0.19, null],
          ["Eintrag 3", 150, 0.19, null],
          ["GESAMT", null, null, null]
        ],
        "formulas": {
          "D2": "=B2*C2",
          "D3": "=B3*C3",
          "D4": "=B4*C4",
          "B5": "=SUM(B2:B4)",
          "D5": "=SUM(D2:D4)"
        }
      },
      {
        "name": "Auswertung",
        "headers": ["Kennzahl", "Wert"],
        "rows": [
          ["Durchschnitt", null],
          ["Maximum", null],
          ["Minimum", null]
        ],
        "formulas": {
          "B2": "=AVERAGE(Daten!B2:B4)",
          "B3": "=MAX(Daten!B2:B4)",
          "B4": "=MIN(Daten!B2:B4)"
        }
      }
    ]
  }
}

REGELN:
- Immer echte Excel-Formeln verwenden: =SUM(), =AVERAGE(), =MAX(), =MIN(), =IF(), =VLOOKUP()
- Zahlen als Zahlen (nicht Strings), Formeln als "=..." Strings
- Sinnvolle Mehrfach-Sheets wenn es die Daten rechtfertigen (Daten + Auswertung)
- Berechnete Felder IMMER als Formel, nie als statischer Wert
- Antworte auf Deutsch
`
};

// ─── HAUPTFUNKTION ──────────────────────────────────────────────

async function processMessage(userMessage, currentDocument) {
  const docType = currentDocument?.type || 'docx';
  
  // Passenden Prompt für Dokumenttyp wählen
  const systemPrompt = PROMPTS[docType] || PROMPTS['docx'];

  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'mistral-nemo',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Aktueller Dokumentzustand:\n${JSON.stringify(currentDocument, null, 2)}\n\nAnweisung: ${userMessage}`
      }
    ],
    format: 'json',
    stream: false,
    options: {
      temperature: 0.7,   // Kreativität (0 = deterministisch, 1 = kreativ)
      num_predict: 4096   // Maximale Token → längere, ausführlichere Ausgabe
    }
  });

  const raw = response.message.content;

  // JSON parsen (mit Fallback falls Modell Markdown drumherum baut)
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Kein valides JSON erhalten: ' + raw.substring(0, 200));
    }
  }

  return {
    message: parsed.message || 'Dokument wurde aktualisiert.',
    document: parsed.document || currentDocument
  };
}

module.exports = { processMessage };
