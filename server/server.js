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

// ─── App & Server ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

server.timeout        = 300000; // 5 Minuten
server.keepAliveTimeout = 305000;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT       = process.env.PORT       || 3000;

// ─── Socket.IO ───────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
  pingTimeout:  120000,
  pingInterval:  25000,
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

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
    docx: { type: 'docx', title: 'Neues Dokument',    sections: [] },
    pptx: { type: 'pptx', title: 'Neue Präsentation', slides: [],
            palette: { bg1:'#0a0f1e', bg2:'#141e3a', accent1:'#38bdf8',
                       accent2:'#818cf8', text:'#f1f5f9', sub:'#64748b', card:'#0d1526' } },
    xlsx: { type: 'xlsx', title: 'Neue Tabelle',
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
  console.log(`[Doc] Erstellt: ${docId} (${type}) von ${userId}`);
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

  const outputPath = path.join(os.tmpdir(), `${docId}_${Date.now()}.${format}`);
  const pythonCmd  = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, 'python', 'render_office.py');

  console.log(`[Export] Format=${format} | Path=${outputPath}`);

  const py = spawn(pythonCmd, [scriptPath, outputPath, format], {
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
  });

  py.stdin.write(JSON.stringify(docData));
  py.stdin.end();

  let pyError = '';
  let pyOut   = '';

  py.stdout.on('data', (d) => { pyOut += d.toString(); });
  py.stderr.on('data', (d) => {
    pyError += d.toString();
    console.error('[Python]', d.toString().trim());
  });

  py.on('error', (err) => {
    console.error('[Python spawn]', err.message);
    res.status(500).json({
      error: 'Python konnte nicht gestartet werden',
      detail: err.message
    });
  });

  py.on('close', (code) => {
    console.log(`[Python exit] ${code}`);
    if (pyOut) console.log('[Python stdout]', pyOut.trim());

    if (code !== 0) {
      return res.status(500).json({ error: 'Export fehlgeschlagen', detail: pyError });
    }
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Datei nicht erstellt', detail: pyError });
    }

    const safeName = (docData.title || 'dokument').replace(/[^\w\säöüÄÖÜß-]/g, '').trim();
    res.download(outputPath, `${safeName}.${format}`, (err) => {
      if (err) console.error('[Download]', err.message);
      fs.unlink(outputPath, () => {});
    });
  });
});

// ─── SOCKET.IO ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  let currentDocId  = null;
  let currentUserId = null;

  console.log(`[Socket] Verbunden: ${socket.id}`);

  // ── Raum beitreten ───────────────────────────────────────────
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

    console.log(`[Join] ${userId} → ${docId}`);
  });

  // ── Y.js Sync ────────────────────────────────────────────────
  socket.on('yjs-update', ({ docId, update }) => {
    const ydoc = getYdoc(docId);
    Y.applyUpdate(ydoc, new Uint8Array(update));
    socket.to(docId).emit('yjs-update', { update });
  });

  // ── KI-Chat mit Streaming + Live-Preview ─────────────────────
  socket.on('ai-message', async ({ docId, userId, message }) => {
    if (!sessionManager.hasPermission(docId, userId)) return;

    const currentDoc = getDocumentState(docId);
    if (!currentDoc) return;

    console.log(`[KI] Anfrage von ${userId}: "${message.substring(0, 60)}..."`);
    socket.emit('ai-thinking', true);

    // Fortschritt-Callback
    let lastProgress = 0;
    const onProgress = (chars) => {
      if (chars - lastProgress >= 200) {
        lastProgress = chars;
        socket.emit('ai-progress', { chars });
      }
    };

    // Partial Update – Live-Preview während Generierung
    let lastPartialSlides = 0;
    const onPartialUpdate = (partialDoc) => {
      const newSlides = partialDoc?.slides?.length || 0;

      // Nur senden wenn neue Folien hinzugekommen sind
      if (newSlides > lastPartialSlides) {
        lastPartialSlides = newSlides;
        console.log(`[KI Partial] ${newSlides} Folien generiert`);
        socket.emit('ai-partial', { document: partialDoc });
      }
    };

    try {
      const aiResult = await processMessage(message, currentDoc, onProgress, onPartialUpdate);

      if (aiResult.document) {
        // Finales Dokument speichern und an alle im Raum senden
        const update = setDocumentState(docId, aiResult.document);
        io.to(docId).emit('yjs-update',       { update: Array.from(update) });
        io.to(docId).emit('document-updated', { document: aiResult.document });
        console.log(`[KI] Fertig: ${aiResult.document.slides?.length || 0} Folien`);
      }

      socket.emit('ai-response', { message: aiResult.message });

    } catch (err) {
      console.error('[KI Fehler]', err.message);
      socket.emit('ai-error', { message: 'KI-Fehler: ' + err.message });
    } finally {
      socket.emit('ai-thinking', false);
    }
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Getrennt: ${socket.id} (${reason})`);
    if (currentDocId) {
      const count = io.sockets.adapter.rooms.get(currentDocId)?.size || 0;
      io.to(currentDocId).emit('users-update', { count });
    }
  });
});

// ─── Start ───────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✅ Server läuft auf http://localhost:${PORT}`);
  console.log(`🌐 Client URL: ${CLIENT_URL}`);
  console.log(`📁 Temp-Ordner: ${os.tmpdir()}`);
  console.log(`🐍 Python: ${process.platform === 'win32' ? 'python' : 'python3'}`);
  console.log(`⏱  Timeout: 5 Minuten\n`);
});
