import { useState } from 'react';
import { BACKEND_URL } from '../config';

const s = {
  btn: { padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  select: { padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.85rem', marginRight: '6px' }
};

export default function ExportButton({ docId, userId }) {
  const [format, setFormat] = useState('docx');
  const [loading, setLoading] = useState(false);

  async function exportDoc() {
    if (!docId) return;
    setLoading(true);
    const res = await fetch(`${BACKEND_URL}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ docId, format })
    });

    if (!res.ok) { setLoading(false); alert('Export fehlgeschlagen'); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `dokument.${format}` });
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <>
      <select style={s.select} value={format} onChange={e => setFormat(e.target.value)}>
        <option value="docx">Word</option>
        <option value="pptx">PowerPoint</option>
        <option value="xlsx">Excel</option>
      </select>
      <button style={s.btn} onClick={exportDoc} disabled={loading}>
        {loading ? '⏳...' : '⬇ Export'}
      </button>
    </>
  );
}
