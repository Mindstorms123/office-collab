# Office Collab – KI-gestützter Office-Generator

Kollaborativer Browser-Editor mit KI-Chat der native .docx, .pptx und .xlsx Dateien generiert.

## Features
- Echtzeit-Kollaboration via Y.js + Socket.IO
- Personalisierte Share-Links
- KI-Chat (GPT-4o) für Dokument-Änderungen
- Export zu nativem .docx / .pptx / .xlsx

## Setup

### Voraussetzungen
- Node.js 22+
- Python 3.10+
- OpenAI API Key

### Installation
```bash
# Server
cd server
npm install
pip3 install -r python/requirements.txt
cp .env.example .env   # API Key eintragen

# Client
cd ../client
npm install

### Starten (Entwicklung)

# Terminal 1 – Backend
cd server && npm run dev

# Terminal 2 – Frontend
cd client && npm run dev

