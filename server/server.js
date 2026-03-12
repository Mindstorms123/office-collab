require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');
const { v4: uuidv4 } = require('uuid');
const Y        = require('yjs');
const { spawn } = require('child_process');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');

const sessionManager     = require('./session-manager');
const { processMessage } = require('./ai-handler');

const app    = require('express')();
const server = http.createServer(app);
server.timeout = 300000;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT       = process.env.PORT       || 3000;

// ─── Socket.IO ───────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── Y.js State ──────────────────────────────────────────────────
const ydocs = new Map();

function getYdoc(docId) {
  if (!ydocs.has(docId)) ydocs.set(docId, new Y.Doc());
  return ydocs.get(docId);
}

function getDocumentState(docId) {
  const raw = getYdoc(docId).getMap('doc').get('data');
  return raw ? JSON.parse(raw) : null;
}

function setDocumentState(docId, data) {
  const ydoc = getYdoc(docId);
  ydoc.transact(() => ydoc.getMap('doc').set('data', JSON.stringify(data)));
  return Y.encodeStateAsUpdate(ydoc);
}

function getEmptyDocument(type) {
  const defaults = {
    docx:  { type: 'docx',  title: 'Neues Dokument',    sections: [] },
    pptx:  { type: 'pptx',  title: 'Neue Präsentation', slides: [] },
    xlsx:  { type: 'xlsx',  title: 'Neue Tabelle',
             sheets: [{ name: 'Sheet1', headers: ['Spalte A', 'Spalte B'], rows: [], formulas: {} }] }
  };
  return defaults[type] || defaults.docx;
}

// ─── REST API ────────────────────────────────────────────────────

// Neues Dokument erstellen
app.post('/api/document', (req, res) => {
  const { userId = uuidv4(), type = 'docx' } = req.body;
  const docId  = sessionManager.createDocument(userId, type);
  const linkId = sessionManager.createShareLink(docId, 'edit');
  setDocumentState(docId, getEmptyDocument(type));
  res.json({ docId, userId, shareUrl: `${CLIENT_URL}/doc/${linkId}` });
});

// Via Share-Link beitreten
app.get('/api/join/:linkId', (req, res) => {
  const userId = req.query.userId || uuidv4();
  const result = sessionManager.joinViaLink(req.params.linkId, userId);
  if (!result) return res.status(404).json({ error: 'Link ungültig oder abgelaufen' });
  res.json({ ...result, userId });
});

// Office-Datei exportieren
app.post('/api/export', (req, res) => {
  const { docId, format } = req.body;
  const userId = req.headers['x-user-id'];

  if (!sessionManager.hasPermission(docId, userId)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }

  const docData = getDocumentState(docId);
  if (!docData) return res.status(404).json({ error: 'Dokument ist leer' });

  // os.tmpdir() → funktioniert auf Windows UND Linux/Mac
  const outputPath = path.join(os.tmpdir(), `${docId}_${Date.now()}.${format}`);

  // Windows: 'python' statt 'python3'
  const pythonCmd  = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, 'python', 'render_office.py');

  console.log(`[Export] Format: ${format} | Datei: ${outputPath}`);
  console.log(`[Export] Python: ${pythonCmd} ${scriptPath}`);

  const py = spawn(pythonCmd, [scriptPath, outputPath, format], {
  env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
});
  py.stdin.write(JSON.stringify(docData));
  py.stdin.end();

  let pyError = '';
  let pyOut   = '';

  py.stdout.on('data', (d) => { pyOut   += d.toString(); });
  py.stderr.on('data', (d) => {
    pyError += d.toString();
    console.error('[Python STDERR]', d.toString());
  });

  py.on('error', (err) => {
    console.error('[Python spawn error]', err.message);
    return res.status(500).json({
      error: 'Python konnte nicht gestartet werden',
      detail: err.message + '\nInstalliert? Pfad korrekt?'
    });
  });

  py.on('close', (code) => {
    console.log(`[Python exit code] ${code}`);
    if (pyOut) console.log('[Python STDOUT]', pyOut);

    if (code !== 0) {
      return res.status(500).json({ error: 'Export fehlgeschlagen', detail: pyError });
    }

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Datei wurde nicht erstellt', detail: pyError });
    }

    const filename = `${(docData.title || 'dokument').replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '')}.${format}`;
    res.download(outputPath, filename, (err) => {
      if (err) console.error('[Download Fehler]', err.message);
      fs.unlink(outputPath, () => {});
    });
  });
});

// ─── SOCKET.IO ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentDocId  = null;
  let currentUserId = null;

  socket.on('join', ({ docId, userId }) => {
    if (!sessionManager.hasPermission(docId, userId)) {
      socket.emit('error', { message: 'Keine Berechtigung' });
      return;
    }
    currentDocId  = docId;
    currentUserId = userId;
    socket.join(docId);

    socket.emit('init', {
      state: Array.from(Y.encodeStateAsUpdate(getYdoc(docId))),
      users: io.sockets.adapter.rooms.get(docId)?.size || 1
    });
    io.to(docId).emit('users-update', {
      count: io.sockets.adapter.rooms.get(docId)?.size || 1
    });
  });

  // Y.js Sync
  socket.on('yjs-update', ({ docId, update }) => {
    const ydoc = getYdoc(docId);
    Y.applyUpdate(ydoc, new Uint8Array(update));
    socket.to(docId).emit('yjs-update', { update });
  });

  // KI-Chat
  socket.on('ai-message', async ({ docId, userId, message }) => {
    if (!sessionManager.hasPermission(docId, userId)) return;

    const currentDoc = getDocumentState(docId);
    if (!currentDoc) return;

    socket.emit('ai-thinking', true);
    try {
      const aiResult = await processMessage(message, currentDoc);

      if (aiResult.document) {
        const update = setDocumentState(docId, aiResult.document);
        io.to(docId).emit('yjs-update',       { update: Array.from(update) });
        io.to(docId).emit('document-updated', { document: aiResult.document });
      }
      socket.emit('ai-response', { message: aiResult.message });

    } catch (err) {
      console.error('[KI Fehler]', err.message);
      socket.emit('ai-error', { message: 'KI-Fehler: ' + err.message });
    } finally {
      socket.emit('ai-thinking', false);
    }
  });

  socket.on('disconnect', () => {
    if (currentDocId) {
      io.to(currentDocId).emit('users-update', {
        count: io.sockets.adapter.rooms.get(currentDocId)?.size || 0
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
  console.log(`📁 Temp-Ordner: ${os.tmpdir()}`);
  console.log(`🐍 Python-Befehl: ${process.platform === 'win32' ? 'python' : 'python3'}`);
});
