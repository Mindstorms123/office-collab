const s = {
  grid: { display: 'flex', flexDirection: 'column', gap: '24px' },
  slide: { background: '#0f172a', border: '2px solid #334155', borderRadius: '12px', padding: '32px', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' },
  number: { position: 'absolute', top: '12px', right: '16px', fontSize: '0.75rem', color: '#475569' },
  slideTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' },
  bullet: { color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.8', paddingLeft: '20px', position: 'relative' },
  empty: { color: '#475569', textAlign: 'center', paddingTop: '80px' }
};

export default function SlideCanvas({ document }) {
  if (!document?.slides?.length) {
    return <p style={s.empty}>📊 Noch keine Folien – frag die KI!</p>;
  }

  return (
    <div style={s.grid}>
      {document.slides.map((slide, i) => (
        <div key={i} style={s.slide}>
          <span style={s.number}>Folie {i + 1}</span>
          <h2 style={s.slideTitle}>{slide.title}</h2>
          {slide.bullets?.map((b, j) => (
            <p key={j} style={s.bullet}>• {b}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
