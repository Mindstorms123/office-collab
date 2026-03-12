const themes = {
  dark: {
    bg: '#0a0f1e',
    bg2: '#141e3a',
    accent1: '#38bdf8',
    accent2: '#818cf8',
    text: '#f1f5f9',
    sub: '#64748b',
    card: '#0d1526'
  },
  light: {
    bg: '#ffffff',
    bg2: '#f8fafc',
    accent1: '#3b82f6',
    accent2: '#6366f1',
    text: '#0f172a',
    sub: '#475569',
    card: '#f1f5f9'
  },
  blue: {
    bg: '#0c1c3d',
    bg2: '#1e3a8a',
    accent1: '#60a5fa',
    accent2: '#93c5fd',
    text: '#ffffff',
    sub: '#93c5fd',
    card: '#172554'
  },
  green: {
    bg: '#05160e',
    bg2: '#14532d',
    accent1: '#4ade80',
    accent2: '#86efac',
    text: '#ffffff',
    sub: '#86efac',
    card: '#052e16'
  },
  purple: {
    bg: '#1a0e2e',
    bg2: '#3b0764',
    accent1: '#a78bfa',
    accent2: '#c4b5fd',
    text: '#ffffff',
    sub: '#c4b5fd',
    card: '#2e1065'
  }
};

// ─── SLIDE KOMPONENTE ────────────────────────────────────────────
function Slide({ slide, index, theme }) {
  const c = themes[theme] || themes.dark;

  const baseStyle = {
    wrapper: {
      background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`,
      borderRadius: '16px',
      overflow: 'hidden',
      aspectRatio: '16/9',
      position: 'relative',
      boxShadow: `0 25px 70px rgba(0,0,0,0.6), 0 0 0 1px ${c.accent1}15`,
      marginBottom: '32px',
      fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif",
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    num: {
      position: 'absolute',
      bottom: '18px',
      right: '24px',
      fontSize: '0.7rem',
      fontWeight: '600',
      color: c.sub,
      opacity: 0.5,
      letterSpacing: '0.5px'
    }
  };

  // ────────────────────────────────────────────────────────────────
  // LAYOUT: TITLE (Titelfolie)
  // ────────────────────────────────────────────────────────────────
  if (slide.layout === 'title') {
    return (
      <div style={baseStyle.wrapper}>
        {/* Accent Streifen links */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '20px',
          height: '100%',
          background: `linear-gradient(180deg, ${c.accent1} 0%, ${c.accent2} 100%)`
        }} />

        {/* Dekorativer Kreis rechts oben */}
        <div style={{
          position: 'absolute',
          right: '-100px',
          top: '-100px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: c.bg2,
          opacity: 0.3,
          filter: 'blur(40px)'
        }} />

        {/* Inhalt */}
        <div style={{
          position: 'absolute',
          left: '80px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 'calc(100% - 160px)',
          zIndex: 1
        }}>
          <div style={{
            fontSize: '3.2rem',
            fontWeight: '900',
            background: `linear-gradient(135deg, ${c.accent1} 0%, ${c.accent2} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
            marginBottom: '20px',
            letterSpacing: '-0.02em'
          }}>
            {slide.title}
          </div>

          {slide.subtitle && (
            <div style={{
              fontSize: '1.2rem',
              color: c.text,
              opacity: 0.8,
              lineHeight: 1.6,
              fontWeight: '400'
            }}>
              {slide.subtitle}
            </div>
          )}

          {slide.author && (
            <div style={{
              fontSize: '0.9rem',
              color: c.sub,
              marginTop: '32px',
              fontWeight: '500'
            }}>
              {slide.author}
            </div>
          )}
        </div>

        <div style={baseStyle.num}>{index + 1}</div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // LAYOUT: TWO_COLUMN (Zweispaltig)
  // ────────────────────────────────────────────────────────────────
  if (slide.layout === 'two_column') {
    return (
      <div style={baseStyle.wrapper}>
        {/* Top Accent Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '8px',
          background: `linear-gradient(90deg, ${c.accent1} 0%, ${c.accent2} 100%)`
        }} />

        {/* Header */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: 0,
          right: 0,
          height: '70px',
          background: c.card,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '36px',
          borderBottom: `2px solid ${c.accent1}20`
        }}>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: c.accent1,
            letterSpacing: '-0.01em'
          }}>
            {slide.title}
          </span>
        </div>

        {/* Zweispalten-Inhalt */}
        <div style={{
          position: 'absolute',
          top: '88px',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex'
        }}>
          {/* Linke Spalte */}
          <div style={{
            flex: 1,
            padding: '24px 32px',
            borderRight: `2px solid ${c.accent1}15`
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: c.accent1,
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px'
            }}>
              {slide.leftTitle || 'Vorteile'}
            </div>
            {(slide.left || []).map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: c.accent1,
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  color: c.text,
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  opacity: 0.95
                }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Rechte Spalte */}
          <div style={{
            flex: 1,
            padding: '24px 32px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: c.sub,
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px'
            }}>
              {slide.rightTitle || 'Nachteile'}
            </div>
            {(slide.right || []).map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: c.sub,
                  marginTop: '8px',
                  flexShrink: 0
                }} />
                <span style={{
                  color: c.text,
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  opacity: 0.95
                }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={baseStyle.num}>{index + 1}</div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // LAYOUT: CONTENT (Standard Bulletpoints)
  // ────────────────────────────────────────────────────────────────
  return (
    <div style={baseStyle.wrapper}>
      {/* Top Accent Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '8px',
        background: `linear-gradient(90deg, ${c.accent1} 0%, ${c.accent2} 100%)`
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: 0,
        right: 0,
        height: '70px',
        background: c.card,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '36px',
        borderBottom: `2px solid ${c.accent1}20`
      }}>
        <span style={{
          fontSize: '1.6rem',
          fontWeight: '700',
          color: c.accent1,
          letterSpacing: '-0.01em'
        }}>
          {slide.title}
        </span>
      </div>

      {/* Content Area */}
      <div style={{
        position: 'absolute',
        top: '98px',
        left: '36px',
        right: '36px',
        bottom: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {(slide.bullets || []).map((bullet, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            animation: 'fadeIn 0.4s ease',
            animationDelay: `${i * 0.1}s`,
            animationFillMode: 'both'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.accent1} 0%, ${c.accent2} 100%)`,
              flexShrink: 0,
              marginTop: '7px',
              boxShadow: `0 0 12px ${c.accent1}40`
            }} />
            <span style={{
              color: c.text,
              fontSize: '1.05rem',
              lineHeight: 1.7,
              opacity: 0.95,
              fontWeight: '400'
            }}>
              {bullet}
            </span>
          </div>
        ))}
      </div>

      <div style={baseStyle.num}>{index + 1}</div>
    </div>
  );
}

// ─── MAIN CANVAS KOMPONENTE ──────────────────────────────────────
export default function SlideCanvas({ document, isGenerating }) {
  if (!document?.slides?.length) {
    return (
      <div style={{
        color: '#475569',
        textAlign: 'center',
        paddingTop: '100px',
        fontSize: '1.1rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
        <div>Noch keine Folien – frag die KI rechts!</div>
      </div>
    );
  }

  const theme = document.theme || 'dark';

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.6s ease'
      }}>
        {document.slides.map((slide, i) => (
          <Slide key={i} slide={slide} index={i} theme={theme} />
        ))}

        {/* Generating Indicator */}
        {isGenerating && (
          <div style={{
            padding: '40px 32px',
            textAlign: 'center',
            background: `linear-gradient(135deg, ${themes[theme]?.card || '#0d1526'} 0%, ${themes[theme]?.bg2 || '#141e3a'} 100%)`,
            borderRadius: '16px',
            border: `2px dashed ${themes[theme]?.accent1 || '#38bdf8'}30`,
            marginTop: '8px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              fontSize: '2.5rem',
              marginBottom: '12px',
              animation: 'spin 2s linear infinite'
            }}>
              ⚙
            </div>
            <div style={{
              fontSize: '1rem',
              color: themes[theme]?.text || '#f1f5f9',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              Weitere Folien werden generiert...
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: themes[theme]?.sub || '#64748b',
              opacity: 0.7
            }}>
              Das Dokument wird automatisch aktualisiert
            </div>
          </div>
        )}
      </div>
    </>
  );
}
