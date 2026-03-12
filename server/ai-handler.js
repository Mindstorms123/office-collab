require('dotenv').config();
const ollama = require('ollama').default;

// ─── PROMPTS PRO DOKUMENTTYP ────────────────────────────────────

const PROMPTS = {

pptx: `Du bist ein Präsentationsdesigner. Erstelle moderne Folien als JSON-Objekte.

WICHTIG: Gib die Folien EINZELN aus – jede Folie auf EINER Zeile (NDJSON-Format).
Kein umschließendes Array, keine Kommentare, sofort starten.

FORMAT PRO ZEILE (eine Zeile = eine fertige Folie):
{"layout":"title","title":"Haupttitel","subtitle":"Untertitel","image":"nature landscape"}
{"layout":"content","title":"Überschrift","bullets":["Punkt 1","Punkt 2","Punkt 3"]}
{"layout":"two_column","title":"Vergleich","left":["Pro 1","Pro 2"],"right":["Contra 1","Contra 2"]}
{"layout":"image_text","title":"Beispiel","text":"Beschreibung","image":"technology abstract"}
{"layout":"end","title":"Vielen Dank","subtitle":"Fragen?"}

LAYOUTS:

1. title (Titelfolie)
   - title: Haupttitel (max 50 Zeichen)
   - subtitle: Untertitel (max 80 Zeichen)
   - image: Unsplash-Query (englisch, 2-3 Wörter)

2. content (Bullet-Liste)
   - title: Überschrift (max 40 Zeichen)
   - bullets: Array mit 3-5 Punkten (je max 60 Zeichen)
   - image: (optional) Unsplash-Query

3. two_column (Zweispaltig)
   - title: Überschrift
   - leftTitle: Linke Spalte (z.B. "Vorteile")
   - left: 3-4 Punkte
   - rightTitle: Rechte Spalte (z.B. "Nachteile")
   - right: 3-4 Punkte

4. image_text (Bild + Text)
   - title: Überschrift
   - text: Beschreibung (max 200 Zeichen)
   - image: Unsplash-Query

5. end (Abschlussfolie)
   - title: "Vielen Dank" / "Fragen?"
   - subtitle: Kontaktinfo (optional)
   - image: (optional)

REGELN:
✓ Maximal 5-6 Folien
✓ Kurze prägnante Texte
✓ Bilder: englische Queries, 2-3 Wörter (z.B. "solar panels roof", "business team meeting")
✓ Pro Folie: 3-5 Bullets maximal
✓ Jede Folie SOFORT auf einer Zeile ausgeben
✓ Keine umschließende Struktur, kein "message", kein "document"

BEISPIEL-OUTPUT:
{"layout":"title","title":"Solarenergie für Hausbesitzer","subtitle":"Nutzen Sie die Kraft der Sonne","image":"solar panels roof"}
{"layout":"content","title":"Warum Solar?","bullets":["Senkung der Stromkosten um bis zu 70%","Unabhängigkeit von Energieversorgern","Wertsteigerung der Immobilie","Umweltschutz durch CO2-Reduktion"]}
{"layout":"two_column","title":"Vor- und Nachteile","leftTitle":"Vorteile","left":["Langfristige Ersparnis","Staatliche Förderungen","Geringe Wartung"],"rightTitle":"Nachteile","right":["Hohe Anfangsinvestition","Abhängig vom Wetter","Dacheignung erforderlich"]}
{"layout":"end","title":"Vielen Dank!","subtitle":"Fragen? → info@solar-beratung.de"}

Antworte auf Deutsch (außer image-Queries). Starte SOFORT mit der ersten Folie.`
,

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
      num_predict: 2048,
      num_ctx: 4096
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
