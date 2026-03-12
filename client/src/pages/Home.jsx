import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

const styles = {
  page: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' },
  card: { background: '#1e293b', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' },
  h1: { fontSize: '1.8rem', marginBottom: '0.4rem', color: '#f1f5f9' },
  sub: { color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' },
  label: { display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' },
  select: { width: '100%', padding: '0.9rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.5rem', outline: 'none' },
  btn: { width: '100%', padding: '1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' },
  linkBox: { marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '10px', wordBreak: 'break-all', fontSize: '0.85rem', color: '#7dd3fc' },
  copyBtn: { marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
};

export default function Home() {
  const [type, setType] = useState('docx');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function createDocument() {
    setLoading(true);
    const userId = localStorage.getItem('userId') || crypto.randomUUID();
    localStorage.setItem('userId', userId);

    const res = await fetch(`${BACKEND_URL}/api/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type })
    });
    const data = await res.json();
    setShareUrl(data.shareUrl);
    setLoading(false);

    // Direkt zum Dokument navigieren
    const linkId = data.shareUrl.split('/doc/')[1];
    navigate(`/doc/${linkId}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>📄 Office Collab</h1>
        <p style={styles.sub}>Erstelle ein Dokument – bearbeite es gemeinsam mit KI-Unterstützung.</p>

        <label style={styles.label}>Dokumenttyp</label>
        <select style={styles.select} value={type} onChange={e => setType(e.target.value)}>
          <option value="docx">📄 Word (.docx)</option>
          <option value="pptx">📊 PowerPoint (.pptx)</option>
          <option value="xlsx">📈 Excel (.xlsx)</option>
        </select>

        <button style={styles.btn} onClick={createDocument} disabled={loading}>
          {loading ? '⏳ Erstelle...' : '✨ Neues Dokument erstellen'}
        </button>

        {shareUrl && (
          <div style={styles.linkBox}>
            🔗 {shareUrl}
            <br />
            <button style={styles.copyBtn} onClick={() => navigator.clipboard.writeText(shareUrl)}>
              📋 Link kopieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
