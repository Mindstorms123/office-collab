import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { BACKEND_URL } from '../config';
import AIChat from '../components/AIChat';
import ExportButton from '../components/ExportButton';
import SlideCanvas from '../components/SlideCanvas';

const s = {
  page:    { display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f172a' },
  main:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar:  { padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155',
             display: 'flex', alignItems: 'center', gap: '12px' },
  title:   { flex: 1, fontSize: '1rem', fontWeight: '600', color: '#f1f5f9' },
  badge:   { padding: '4px 10px', background: '#0f172a', borderRadius: '20px',
             fontSize: '0.75rem', color: '#94a3b8' },
  content: { flex: 1, overflow: 'auto', padding: '24px' },
  docView: { maxWidth: '900px', margin: '0 auto' },

  // DOCX
  sectionTitle: { fontWeight: '700', color: '#f1f5f9', marginBottom: '6px', marginTop: '24px' },
  sectionBody:  { color: '#cbd5e1', lineHeight: '1.8', marginBottom: '12px', fontSize: '0.95rem' },
  table:  { width: '100%', borderCollapse: 'collapse', marginTop: '12px', marginBottom: '20px',
            borderRadius: '8px', overflow: 'hidden' },
  th:     { background: '#1e40af', color: '#fff', padding: '10px 14px',
            textAlign: 'left', fontSize: '0.85rem' },
  td:     { padding: '10px 14px', borderBottom: '1px solid #1e293b',
            color: '#cbd5e1', fontSize: '0.85rem', background: '#0f172a' },
  tdAlt:  { padding: '10px 14px', borderBottom: '1px solid #1e293b',
            color: '#cbd5e1', fontSize: '0.85rem', background: '#111827' },

  // XLSX
  sheetLabel: { color: '#94a3b8', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '600' },

  // EMPTY
  empty: { color: '#475569', textAlign: 'center', paddingTop: '80px', fontSize: '1rem' },

  // GENERATING BADGE
  generatingBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '4px 10px', background: '#14532d', borderRadius: '20px',
    fontSize: '0.75rem', color: '#4ade80', border: '1px solid #166534'
  }
};

// ─── DOCX VIEW ───────────────────────────────────────────────────
function DocxView({ document: doc }) {
  if (!doc?.sections?.length) {
    return <p style={s.empty}>📝 Noch kein Inhalt – starte mit dem KI-Chat rechts!</p>;
  }
  return (
    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '32px', minHeight: '500px' }}>
      {doc.sections.map((sec, i) => (
        <div key={i}>
          {sec.heading && (
            <h2 style={{ ...s.sectionTitle, fontSize: sec.level === 1 ? '1.4rem' : '1.1rem',
                         color: sec.level === 1 ? '#38bdf8' : '#f1f5f9' }}>
              {sec.heading}
            </h2>
          )}
          {sec.content && <p style={s.sectionBody}>{sec.content}</p>}
          {sec.table && (
            <table style={s.table}>
              <tbody>
                {sec.table.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      ri === 0
                        ? <th key={ci} style={s.th}>{cell}</th>
                        : <td key={ci} style={ri % 2 === 0 ? s.td : s.tdAlt}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── XLSX VIEW ───────────────────────────────────────────────────
function XlsxView({ document: doc }) {
  if (!doc?.sheets?.length) {
    return <p style={s.empty}>📊 Noch leer – frag die KI!</p>;
  }
  return (
    <div>
      {doc.sheets.map((sheet, si) => (
        <div key={si} style={{ marginBottom: '32px', background: '#1e293b',
                               borderRadius: '12px', padding: '24px' }}>
          <p style={s.sheetLabel}>📋 {sheet.name}</p>
          <table style={s.table}>
            <tbody>
              <tr>{sheet.headers?.map((h, i) => <th key={i} style={s.th}>{h}</th>)}</tr>
              {sheet.rows?.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={ri % 2 === 0 ? s.td : s.tdAlt}>
                      {cell ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
export default function DocEditor() {
  const { linkId }    = useParams();
  const [socket, setSocket]       = useState(null);
  const [document, setDocument]   = useState(null);
  const [docId, setDocId]         = useState(null);
  const [users, setUsers]         = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const ydocRef = useRef(new Y.Doc());
  const ydoc    = ydocRef.current;

  const userId = (() => {
    let id = localStorage.getItem('userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('userId', id); }
    return id;
  })();

  function syncFromYdoc() {
    const raw = ydoc.getMap('doc').get('data');
    if (raw) {
      try { setDocument(JSON.parse(raw)); } catch {}
    }
  }

  useEffect(() => {
    if (!linkId) return;

    fetch(`${BACKEND_URL}/api/join/${linkId}?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.docId) return;
        setDocId(data.docId);

        const sock = io(BACKEND_URL, {
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        setSocket(sock);
        sock.emit('join', { docId: data.docId, userId });

        // ── Socket Events ─────────────────────────────────────

        sock.on('init', ({ state, users: u }) => {
          Y.applyUpdate(ydoc, new Uint8Array(state));
          setUsers(u);
          syncFromYdoc();
        });

        sock.on('yjs-update', ({ update }) => {
          Y.applyUpdate(ydoc, new Uint8Array(update));
          syncFromYdoc();
        });

        // Finales Dokument fertig
        sock.on('document-updated', ({ document: doc }) => {
          setDocument(doc);
        });

        // Partial Update – Live-Preview während KI generiert
        sock.on('ai-partial', ({ document: partialDoc }) => {
          if (partialDoc) {
            setDocument(partialDoc);
          }
        });

        sock.on('users-update', ({ count }) => setUsers(count));

        // Generierungs-Status
        sock.on('ai-thinking', (val) => setIsGenerating(val));

        return () => sock.disconnect();
      })
      .catch(err => console.error('[Join Fehler]', err));
  }, [linkId]);

  // Y.js live sync
  useEffect(() => {
    ydoc.on('update', syncFromYdoc);
    return () => ydoc.off('update', syncFromYdoc);
  }, []);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <div style={s.page}>
        <div style={s.main}>

          {/* Topbar */}
          <div style={s.topbar}>
            <span style={s.title}>
              {document?.title || 'Lade Dokument...'}
            </span>

            {isGenerating && (
              <span style={s.generatingBadge}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚙</span>
                Generiere...
              </span>
            )}

            <span style={s.badge}>👥 {users} online</span>
            <span style={s.badge}>{document?.type?.toUpperCase() || '–'}</span>
            <ExportButton docId={docId} userId={userId} format={document?.type || 'pptx'} />
          </div>

          {/* Dokument-Inhalt */}
          <div style={s.content}>
            <div style={s.docView} className="doc-view">

              {document?.type === 'pptx' && (
                <SlideCanvas document={document} isGenerating={isGenerating} />
              )}
              {document?.type === 'docx' && (
                <DocxView document={document} />
              )}
              {document?.type === 'xlsx' && (
                <XlsxView document={document} />
              )}
              {!document && (
                <p style={s.empty}>⏳ Verbinde...</p>
              )}

            </div>
          </div>
        </div>

        {/* KI Chat */}
        <AIChat socket={socket} docId={docId} userId={userId} />
      </div>
    </>
  );
}
