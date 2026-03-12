const themes = {
  dark:  { bg: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#f1f5f9', sub: '#94a3b8' },
  light: { bg: '#f8fafc', bg2: '#e2e8f0', accent: '#3b82f6', text: '#0f172a', sub: '#475569' },
  blue:  { bg: '#0f173e', bg2: '#1e3a8a', accent: '#60a5fa', text: '#ffffff', sub: '#93c5fd' },
  green: { bg: '#05160e', bg2: '#14532d', accent: '#4ade80', text: '#ffffff', sub: '#86efac' },
};

function Slide({ slide, index, theme }) {
  const c = themes[theme] || themes.dark;

  const s = {
    wrapper: {
      background: c.bg,
      borderRadius: '12px',
      overflow: 'hidden',
      aspectRatio: '16/9',
      position: 'relative',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      marginBottom: '24px',
      fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif"
    },
    accentBar: {
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '6px',
      background: c.accent
    },
    num: {
      position: 'absolute', bottom: '12px', right: '18px',
      fontSize: '0.75rem', color: c.sub, opacity: 0.7
    }
  };

  if (slide.layout === 'title') {
    return (
      <div style={s.wrapper}>
        {/* Linker Streifen */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '18px', height: '100%', background: c.accent }} />
        {/* Dekorativer Kreis */}
        <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: c.bg2, opacity: 0.8 }} />

        <div style={{ position: 'absolute', left: '60px', top: '50%', transform: 'translateY(-50%)', width: '75%' }}>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: c.accent, lineHeight: 1.2, marginBottom: '16px' }}>
            {slide.title}
          </div>
          {slide.subtitle && (
            <div style={{ fontSize: '1.1rem', color: c.sub, lineHeight: 1.5 }}>
              {slide.subtitle}
            </div>
          )}
        </div>
        <div style={s.num}>{index + 1}</div>
      </div>
    );
  }

  if (slide.layout === 'two_column') {
    return (
      <div style={s.wrapper}>
        <div style={s.accentBar} />
        <div style={{ position: 'absolute', top: '6px', left: 0, right: 0, height: '52px', background: c.bg2, display: 'flex', alignItems: 'center', paddingLeft: '28px' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: c.accent }}>{slide.title}</span>
        </div>
        <div style={{ position: 'absolute', top: '68px', left: 0, right: 0, bottom: 0, display: 'flex' }}>
          <div style={{ flex: 1, padding: '16px 24px', borderRight: `2px solid ${c.bg2}` }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: c.accent, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vorteile</div>
            {(slide.left || []).map((b, i) => (
              <div key={i} style={{ color: c.text, fontSize: '0.85rem', marginBottom: '8px', lineHeight: 1.4 }}>• {b}</div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '16px 24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: c.sub, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nachteile</div>
            {(slide.right || []).map((b, i) => (
              <div key={i} style={{ color: c.text, fontSize: '0.85rem', marginBottom: '8px', lineHeight: 1.4 }}>• {b}</div>
            ))}
          </div>
        </div>
        <div style={s.num}>{index + 1}</div>
      </div>
    );
  }

  // Standard Content
  return (
    <div style={s.wrapper}>
      <div style={s.accentBar} />
      <div style={{ position: 'absolute', top: '6px', left: 0, right: 0, height: '56px', background: c.bg2, display: 'flex', alignItems: 'center', paddingLeft: '28px' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: c.accent }}>{slide.title}</span>
      </div>
      <div style={{ position: 'absolute', top: '72px', left: '28px', right: '28px', bottom: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(slide.bullets || []).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.accent, flexShrink: 0, marginTop: '5px' }} />
            <span style={{ color: c.text, fontSize: '0.95rem', lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={s.num}>{index + 1}</div>
    </div>
  );
}

export default function SlideCanvas({ document }) {
  if (!document?.slides?.length) {
    return (
      <div style={{ color: '#475569', textAlign: 'center', paddingTop: '80px', fontSize: '1rem' }}>
        📊 Noch keine Folien – frag die KI!
      </div>
    );
  }

  const theme = document.theme || 'dark';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {document.slides.map((slide, i) => (
        <Slide key={i} slide={slide} index={i} theme={theme} />
      ))}
    </div>
  );
}
