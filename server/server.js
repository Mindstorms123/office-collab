require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Y = require('yjs');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const sessionManager = require('./session-manager');
const { processMessage } = require('./ai-handler');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Y.js Dokumente (in-memory; für Produktion: Redis oder DB)
const ydocs = new Map();

function getYdoc(docId) {
  if (!ydocs.has(docId)) ydocs.set(docId, new Y.Doc());
  return ydocs.get(docId);
}

function getDocumentState(docId) {
  const ydoc = getYdoc(docId);
  const ymap = ydoc.getMap('doc');
  const raw = ymap.get('data');
  return raw ? JSON.parse(raw) : null;
}

function setDocumentState(docId, data) {
  const ydoc = getYdoc(docId);
  const ymap = ydoc.getMap('doc');
  ydoc.transact(() => {
    ymap.set('data', JSON.stringify(data));
  });
  return Y.encodeStateAsUpdate(ydoc);
}

// ─── REST API ───────────────────────────────────────────────────

// Neues Dokument erstellen
app.post('/api/document', (req, res) => {
  const { userId = uuidv4(), type = 'docx' } = req.body;

  const docId = sessionManager.createDocument(userId, type);
  const linkId = sessionManager.createShareLink(docId, 'edit');

  // Leeres Dokument initialisieren
  const emptyDoc = getEmptyDocument(type);
  setDocumentState(docId, emptyDoc);

  res.json({
    docId,
    userId,
    shareUrl: `${CLIENT_URL}/doc/${linkId}`
  });
});

// Via Share-Link beitreten
app.get('/api/join/:linkId', (req, res) => {
  const { linkId } = req.params;
  const userId = req.query.userId || uuidv4();

  const result = sessionManager.joinViaLink(linkId, userId);
  if (!result) return res.status(404).json({ error: 'Link ungültig' });

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
  if (!docData) return res.status(404).json({ error: 'Dokument leer' });

  const outputPath = path.join('/tmp', `${docId}_${Date.now()}.${format}`);
  const py = spawn('python3', [
    path.join(__dirname, 'python/render_office.py'),
    outputPath,
    format
  ]);

  py.stdin.write(JSON.stringify(docData));
  py.stdin.end();

  let pyError = '';
  py.stderr.on('data', (d) => { pyError += d.toString(); });

  py.on('close', (code) => {
    if (code !== 0) {
      console.error('Python Error:', pyError);
      return res.status(500).json({ error: 'Export fehlgeschlagen', detail: pyError });
    }
    const filename = `${docData.title || 'dokument'}.${format}`;
    res.download(outputPath, filename, () => {
      fs.unlink(outputPath, () => {});
    });
  });
});

// ─── SOCKET.IO ──────────────────────────────────────────────────

io.on('connection', (socket) => {
  let currentDocId = null;
  let currentUserId = null;

  socket.on('join', ({ docId, userId }) => {
    if (!sessionManager.hasPermission(docId, userId)) {
      socket.emit('error', { message: 'Keine Berechtigung' });
      return;
    }

    currentDocId = docId;
    currentUserId = userId;
    socket.join(docId);

    const ydoc = getYdoc(docId);
    const initState = Y.encodeStateAsUpdate(ydoc);

    socket.emit('init', {
      state: Array.from(initState),
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

    try {
      socket.emit('ai-thinking', true);
      const aiResult = await processMessage(message, currentDoc);

      if (aiResult.document) {
        const update = setDocumentState(docId, aiResult.document);
        io.to(docId).emit('yjs-update', { update: Array.from(update) });
        io.to(docId).emit('document-updated', { document: aiResult.document });
      }

      socket.emit('ai-response', { message: aiResult.message });
    } catch (err) {
      socket.emit('ai-error', { message: 'KI-Fehler: ' + err.message });
    } finally {
      socket.emit('ai-thinking', false);
    }
  });

  socket.on('disconnect', () => {
    if (currentDocId) {
      const count = io.sockets.adapter.rooms.get(currentDocId)?.size || 0;
      io.to(currentDocId).emit('users-update', { count });
    }
  });
});

// ─── Hilfsfunktionen ─────────────────────────────────────────────

function getEmptyDocument(type) {
  if (type === 'docx') {
    return { type: 'docx', title: 'Neues Dokument', sections: [] };
  } else if (type === 'pptx') {
    return {
      type: 'pptx', title: 'Neue Präsentation',
      slides: [{ title: 'Titel', bullets: ['Untertitel'], layout: 'title_content', notes: '' }]
    };
  } else if (type === 'xlsx') {
    return {
      type: 'xlsx', title: 'Neue Tabelle',
      sheets: [{ name: 'Sheet1', headers: ['Spalte A', 'Spalte B'], rows: [], formulas: {} }]
    };
  }
}

server.listen(PORT, () => console.log(`✅ Server auf http://localhost:${PORT}`));
