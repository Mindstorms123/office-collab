import { useState } from 'react';
import { BACKEND_URL } from '../config';

const formatLabels = {
  docx: '⬇ Word exportieren',
  pptx: '⬇ PowerPoint exportieren',
  xlsx: '⬇ Excel exportieren'
};

const formatColors = {
  docx: '#2563eb',
  pptx: '#d97706',
  xlsx: '#16a34a'
};

const s = {
  btn: (format) => ({
    padding: '8px 16px',
    background: formatColors[format] || '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    opacity: 1
  })
};

export default function ExportButton({ docId, userId, format }) {
  const [loading, setLoading] = useState(false);

  async function exportDoc() {
    if (!docId || !format) return;
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ docId, format })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Export fehlgeschlagen: ' + (err.detail || err.error || 'Unbekannt'));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `dokument.${format}`
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Verbindungsfehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      style={s.btn(format)}
      onClick={exportDoc}
      disabled={loading || !docId}
    >
      {loading ? '⏳ Exportiere...' : (formatLabels[format] || '⬇ Export')}
    </button>
  );
}
