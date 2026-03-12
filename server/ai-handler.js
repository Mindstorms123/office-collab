require('dotenv').config();
const ollama = require('ollama').default;

// ─── PROMPTS PRO DOKUMENTTYP ────────────────────────────────────

const PROMPTS = {

pptx: `
Du bist ein moderner Präsentationsdesigner. Du erstellst Folien als strukturierte Objekt-Listen.
Jede Folie besteht aus einer Liste von Objekten mit exakten Positionen (in Inches, Folie = 13.33 x 7.5 inch).

Antworte NUR mit validem JSON:
{
  "message": "...",
  "document": {
    "type": "pptx",
    "title": "...",
    "palette": {
      "bg1": "#0a0f1e",
      "bg2": "#141e3a",
      "accent1": "#38bdf8",
      "accent2": "#818cf8",
      "text": "#f1f5f9",
      "sub": "#64748b",
      "card": "#0d1526"
    },
    "slides": [
      {
        "title": "Folientitel",
        "notes": "Sprechernotizen",
        "objects": [
          {
            "type": "rect",
            "l": 0, "t": 0, "w": 13.33, "h": 7.5,
            "color": "#0a0f1e",
            "rounded": 0,
            "back": true
          },
          {
            "type": "image",
            "l": 7.0, "t": 0, "w": 6.33, "h": 7.5,
            "query": "solar panels roof aerial",
            "back": true
          },
          {
            "type": "rect",
            "l": 7.0, "t": 0, "w": 6.33, "h": 7.5,
            "color": "#0a0f1e",
            "opacity": 0.6,
            "rounded": 0
          },
          {
            "type": "rect",
            "l": 0, "t": 0, "w": 0.08, "h": 7.5,
            "color": "#38bdf8",
            "rounded": 0
          },
          {
            "type": "text",
            "l": 0.5, "t": 1.8, "w": 6.2, "h": 2.2,
            "content": "Solarenergie für Hausbesitzer",
            "size": 52, "bold": true,
            "color": "#f1f5f9"
          },
          {
            "type": "text",
            "l": 0.5, "t": 4.2, "w": 6.0, "h": 0.7,
            "content": "Nutzen Sie die Kraft der Sonne",
            "size": 22, "bold": false,
            "color": "#64748b"
          },
          {
            "type": "rect",
            "l": 0.5, "t": 5.2, "w": 2.5, "h": 0.06,
            "color": "#38bdf8",
            "rounded": 0
          }
        ]
      }
    ]
  }
}

OBJEKT-TYPEN:
- rect: Rechteck/Fläche. Felder: l,t,w,h (Inches), color (#hex), rounded (0=eckig, 50000=leicht, 100000=Kreis), opacity (0.0-1.0), back (true=Hintergrund-Layer)
- text: Textfeld. Felder: l,t,w,h, content, size (px), bold, italic, color, align ("left"/"center"/"right")
- image: Bild von Unsplash. Felder: l,t,w,h, query (englisch), rounded, opacity, back

DESIGN-PRINZIPIEN (modernes minimalistisches Design):
- Hintergrund: tiefdunkle Farbe, fast schwarz (back: true auf dem ersten rect)
- Bilder: immer mit leichtem dunklen Overlay drüber für Lesbarkeit
- Typografie: großer Kontrast (riesiger Titel, kleiner Subtext)
- Akzente: 1-2 Farben, sparsam einsetzen (dünne Linien, kleine Punkte, Karten-Rand)
- Whitespace: viel Freiraum nutzen
- Karten: abgerundete Rechtecke (rounded: 15000) als Hintergrund für Bullet-Gruppen
- Bilder in Formen: image-Objekt mit rounded: 100000 für Kreis, 30000 für abgerundetes Rect

STANDARD-FOLIEN-STRUKTUREN:

Titelfolie:
- Hintergrund rect (back: true)
- Bild rechts (image mit back: true)
- Overlay über Bild (rect mit opacity 0.6)
- Vertikale Akzentlinie links (rect, 0.08 breit)
- Großer Titel links
- Kleiner Untertitel links
- Dünne horizontale Linie unter Titel

Content-Folie mit Bullets als Karten:
- Hintergrund rect (back: true)
- Optionales kleines Bild oben rechts (image, abgerundet)
- Akzentbalken oben (rect, volle Breite, 0.07 hoch)
- Dunklere Titelzeile (rect)
- Titel-Text
- Pro Bullet: card-rect (abgerundet, l=0.4) + linker Rand (rect, 0.08 breit) + Text

Abschlussfolie:
- Großes Bild als Hintergrund (image mit back: true, volle Größe)
- Dunkles Overlay (rect mit opacity 0.7)
- Zentrierter großer Text
- Akzentlinie

WICHTIG FÜR PERFORMANCE:
- Erstelle maximal 5 Folien
- Pro Folie maximal 8-10 Objekte
- Halte Texte in "content" kurz und prägnant
- Kompaktes JSON ohne unnötige Felder

Antworte auf Deutsch.
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

// ─── HAUPTFUNKTION MIT STREAMING ────────────────────────────────

async function processMessage(userMessage, currentDocument, onProgress, onPartialUpdate) {
  const docType = currentDocument?.type || 'docx';
  const systemPrompt = PROMPTS[docType] || PROMPTS['docx'];

  const stream = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'mistral-nemo',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Aktueller Dokumentzustand:\n${JSON.stringify(currentDocument, null, 2)}\n\nAnweisung: ${userMessage}`
      }
    ],
    format: 'json',
    stream: true,
    options: {
      temperature: 0.7,
      num_predict: 4096,
      num_ctx: 8192
    }
  });

  let raw = '';
  let lastValidParse = null;
  let parseAttempts = 0;

  for await (const chunk of stream) {
    raw += chunk.message.content;
    
    // Fortschritt melden
    if (onProgress && raw.length % 200 < chunk.message.content.length) {
      onProgress(raw.length);
    }

    // Alle 500 Zeichen versuchen zu parsen
    parseAttempts++;
    if (parseAttempts % 25 === 0 && onPartialUpdate) {
      try {
        // Versuche vollständiges JSON zu extrahieren
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const partial = JSON.parse(match[0]);
          if (partial.document) {
            lastValidParse = partial;
            onPartialUpdate(partial.document);
          }
        }
      } catch {
        // Noch nicht komplett parsebar → weiter warten
      }
    }
  }

  // Finales Parsing
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        // Falls finales Parsing fehlschlägt, letzten validen Stand nehmen
        if (lastValidParse) {
          console.warn('[Parsing] Finales JSON ungültig, verwende letzten gültigen Stand');
          return {
            message: lastValidParse.message || 'Teilweise erstellt.',
            document: lastValidParse.document
          };
        }
        throw new Error('Kein valides JSON erhalten: ' + raw.substring(0, 300));
      }
    } else {
      if (lastValidParse) {
        return {
          message: lastValidParse.message || 'Teilweise erstellt.',
          document: lastValidParse.document
        };
      }
      throw new Error('Kein valides JSON erhalten: ' + raw.substring(0, 300));
    }
  }

  return {
    message: parsed.message || 'Dokument wurde aktualisiert.',
    document: parsed.document || currentDocument
  };
}

module.exports = { processMessage };
