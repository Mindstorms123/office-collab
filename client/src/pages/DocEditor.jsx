import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { BACKEND_URL } from '../config';
import AIChat from '../components/AIChat';
import ExportButton from '../components/ExportButton';
import SlideCanvas from '../components/SlideCanvas';

const s = {
  page: { display: 'flex', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px' },
  title: { flex: 1, fontSize: '1rem', fontWeight: '600', color: '#f1f5f9' },
  badge: { padding: '4px 10px', background: '#0f172a', borderRadius: '20px', fontSize: '0.75rem', color: '#94a3b8' },
  content: { flex: 1, overflow: 'auto', padding: '24px' },
  docView: { maxWidth: '800px', margin: '0 auto', background: '#1e293b', borderRadius: '12px', padding: '32px', minHeight: '500px' },
  sectionTitle: { fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '8px' },
  sectionBody: { color: '#cbd5e1', lineHeight: '1.7', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '12px', marginBottom: '16px' },
  th: { background: '#4472C4', color: '#fff', padding: '8px 12px', textAlign: 'left', fontSize: '0.85rem' },
  td: { padding: '8px 12px', borderBottom: '1px solid #334155', color: '#cbd5e1', fontSize: '0.85rem' },
  empty: { color: '#475569', textAlign: 'center', paddingTop: '80px', fontSize: '1rem' }
};

export default function DocEditor() {
  const { linkId } = useParams();
  const [socket, setSocket] = useState(null);
  const [document, setDocument] = useState(null);
  const [docId, setDocId] = useState(null);
  const [users, setUsers] = useState(1);
  const [ydoc] = useState(() => new Y.Doc());
  const userId = localStorage.getItem('userId') || crypto.randomUUID();

  useEffect(() => {
    localStorage.setItem('userId', userId);

    fetch(`${BACKEND_URL}/api/join/${linkId}?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        setDocId(data.docId);

        const sock = io(BACKEND_URL, { withCredentials: true });
        setSocket(sock);

        sock.emit('join', { docId: data.docId, userId });

        sock.on('init', ({ state, users }) => {
          Y.applyUpdate(ydoc, new Uint8Array(state));
          setUsers(users);
          syncFromYdoc();
        });

        sock.on('yjs-update', ({ update }) => {
          Y.applyUpdate(ydoc, new Uint8Array(update));
        });

        sock.on('document-updated', ({ document }) => {
          setDocument(document);
        });

        sock.on('users-update', ({ count }) => setUsers(count));

        return () => sock.disconnect();
      });
  }, [linkId]);

  function syncFromYdoc() {
    const ymap = ydoc.getMap('doc');
    const raw = ymap.get('data');
    if (raw) setDocument(JSON.parse(raw));
  }

  ydoc.on('update', () => syncFromYdoc());

  function renderDocxView() {
    if (!document?.sections?.length) {
      return <p style={s.empty}>📝 Noch kein Inhalt – starte mit dem KI-Chat rechts!</p>;
    }
    return document.sections.map((sec, i) => (
      <div key={i}>
        {sec.heading && (
          <h2 style={{ ...s.sectionTitle, fontSize: sec.level === 1 ? '1.4rem' : '1.1rem' }}>
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
                      : <td key={ci} style={s.td}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    ));
  }

  function renderXlsxView() {
    if (!document?.sheets?.length) return <p style={s.empty}>📊 Noch leer – frag die KI!</p>;
    return document.sheets.map((sheet, si) => (
      <div key={si} style={{ marginBottom: '32px' }}>
        <h3 style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '0.9rem' }}>📋 {sheet.name}</h3>
        <table style={s.table}>
          <tbody>
            <tr>{sheet.headers?.map((h, i) => <th key={i} style={s.th}>{h}</th>)}</tr>
            {sheet.rows?.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={s.td}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    ));
  }

  return (
    <div style={s.page}>
      <div style={s.main}>
        <div style={s.topbar}>
          <span style={s.title}>{document?.title || 'Lade Dokument...'}</span>
          <span style={s.badge}>👥 {users} online</span>
          <span style={s.badge}>{document?.type?.toUpperCase() || ''}</span>
          <ExportButton docId={docId} userId={userId} format={document?.type || 'pptx'} />
        </div>
        <div style={s.content}>
          <div style={s.docView}>
            {document?.type === 'pptx' && <SlideCanvas document={document} />}
            {document?.type === 'docx' && renderDocxView()}
            {document?.type === 'xlsx' && renderXlsxView()}
          </div>
        </div>
      </div>
      <AIChat socket={socket} docId={docId} userId={userId} />
    </div>
  );
}
