import { useState, useEffect, useRef } from 'react';

const s = {
  panel: {
    width: '380px',
    borderLeft: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0f1e'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #1e293b',
    fontWeight: '700',
    color: '#f1f5f9',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  userMsg: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '14px 14px 2px 14px',
    maxWidth: '82%',
    fontSize: '0.9rem',
    lineHeight: '1.55',
    boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
  },
  aiMsg: {
    alignSelf: 'flex-start',
    background: '#141e3a',
    color: '#cbd5e1',
    padding: '10px 14px',
    borderRadius: '14px 14px 14px 2px',
    maxWidth: '87%',
    fontSize: '0.9rem',
    lineHeight: '1.55',
    border: '1px solid #1e293b'
  },
  partialMsg: {
    alignSelf: 'flex-start',
    background: '#0d2218',
    color: '#4ade80',
    padding: '8px 14px',
    borderRadius: '14px 14px 14px 2px',
    maxWidth: '87%',
    fontSize: '0.8rem',
    lineHeight: '1.5',
    border: '1px solid #14532d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  inputArea: {
    padding: '14px 16px',
    borderTop: '1px solid #1e293b',
    display: 'flex',
    gap: '8px',
    background: '#0a0f1e'
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: '#141e3a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5'
  },
  sendBtn: (disabled) => ({
    padding: '10px 16px',
    background: disabled
      ? '#1e293b'
      : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    color: disabled ? '#475569' : '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '700',
    fontSize: '1rem',
    transition: 'all 0.2s',
    boxShadow: disabled ? 'none' : '0 4px 15px rgba(99,102,241,0.35)'
  })
};

// ─── THINKING INDICATOR ──────────────────────────────────────────
function ThinkingIndicator({ seconds, chars, slideCount }) {
  const getStatus = () => {
    if (seconds < 15) return { text: 'KI denkt nach',         color: '#94a3b8', icon: '🧠' };
    if (seconds < 40) return { text: 'Generiere Inhalt',      color: '#f59e0b', icon: '✍️'  };
    if (seconds < 80) return { text: 'Großes Dokument',       color: '#fb923c', icon: '📄'  };
    return              { text: 'Fast fertig',                 color: '#ef4444', icon: '⚡'  };
  };

  const { text, color, icon } = getStatus();
  const dots = '.'.repeat((seconds % 3) + 1).padEnd(3, '\u00a0');

  return (
    <div style={{
      alignSelf: 'flex-start',
      background: '#0d1526',
      border: `1px solid ${color}30`,
      borderRadius: '14px 14px 14px 2px',
      padding: '12px 16px',
      maxWidth: '90%',
    }}>
      {/* Status */}
      <div style={{
        color,
        fontSize: '0.88rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: '600'
      }}>
        <span>{icon}</span>
        <span>{text}{dots}</span>
      </div>

      {/* Infoleiste */}
      <div style={{
        marginTop: '8px',
        fontSize: '0.75rem',
        color: '#475569',
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap'
      }}>
        <span>⏱ {seconds}s</span>
        {chars > 0 && <span>📝 {chars} Zeichen</span>}
        {slideCount > 0 && (
          <span style={{ color: '#4ade80' }}>✨ {slideCount} Folie{slideCount !== 1 ? 'n' : ''} bereit</span>
        )}
      </div>

      {/* Ladebalken */}
      <div style={{
        marginTop: '10px',
        background: '#1e293b',
        borderRadius: '4px',
        height: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: '35%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
          borderRadius: '4px',
          animation: 'slide 1.5s ease-in-out infinite'
        }} />
      </div>

      {seconds > 60 && (
        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
          💡 Tipp: Kürzere Prompts = schnellere Antwort
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
export default function AIChat({ socket, docId, userId }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: '👋 Hallo! Beschreibe was ich erstellen oder ändern soll.' }
  ]);
  const [input, setInput]           = useState('');
  const [thinking, setThinking]     = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [generatedChars, setGeneratedChars] = useState(0);
  const [partialSlides, setPartialSlides]   = useState(0);
  const bottomRef = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('ai-response', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: message }]);
      setPartialSlides(0);
    });

    socket.on('ai-thinking', (val) => {
      setThinking(val);
      if (val) {
        setThinkingTime(0);
        setGeneratedChars(0);
        setPartialSlides(0);
        timerRef.current = setInterval(() => {
          setThinkingTime(t => t + 1);
        }, 1000);
      } else {
        clearInterval(timerRef.current);
      }
    });

    socket.on('ai-progress', ({ chars }) => {
      setGeneratedChars(chars);
    });

    // Partial Update – zeigt wie viele Folien schon fertig sind
    socket.on('ai-partial', ({ document: partialDoc }) => {
      const count = partialDoc?.slides?.length || 0;
      if (count > 0) setPartialSlides(count);
    });

    socket.on('ai-error', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ ' + message }]);
    });

    return () => {
      socket.off('ai-response');
      socket.off('ai-thinking');
      socket.off('ai-progress');
      socket.off('ai-partial');
      socket.off('ai-error');
      clearInterval(timerRef.current);
    };
  }, [socket]);

  // Auto-Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, partialSlides]);

  // Cleanup
  useEffect(() => () => clearInterval(timerRef.current), []);

  function send() {
    const text = input.trim();
    if (!text || !socket || !docId || thinking) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    socket.emit('ai-message', { docId, userId, message: text });
    setInput('');
  }

  return (
    <>
      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(400%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .ai-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .ai-messages::-webkit-scrollbar { width: 4px; }
        .ai-messages::-webkit-scrollbar-track { background: transparent; }
        .ai-messages::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>

      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span>KI-Assistent</span>
          {thinking && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.7rem',
              padding: '3px 8px',
              background: '#14532d',
              color: '#4ade80',
              borderRadius: '20px',
              border: '1px solid #166534',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙</span>
              Live
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={s.messages} className="ai-messages">
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? s.userMsg : s.aiMsg}>
              {msg.text}
            </div>
          ))}

          {/* Partial Preview Hinweis */}
          {thinking && partialSlides > 0 && (
            <div style={s.partialMsg}>
              <span style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>✨</span>
              <span>
                <strong>{partialSlides} Folie{partialSlides !== 1 ? 'n' : ''}</strong> bereits im Preview sichtbar
              </span>
            </div>
          )}

          {/* Thinking Indicator */}
          {thinking && (
            <ThinkingIndicator
              seconds={thinkingTime}
              chars={generatedChars}
              slideCount={partialSlides}
            />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <textarea
            className="ai-input"
            style={s.input}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              thinking
                ? 'Warte auf Antwort...'
                : 'Anweisung eingeben… (Enter zum Senden)'
            }
            disabled={thinking}
          />
          <button
            style={s.sendBtn(thinking || !input.trim())}
            onClick={send}
            disabled={thinking || !input.trim()}
          >
            {thinking ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </>
  );
}
