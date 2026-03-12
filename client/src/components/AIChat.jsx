import { useState, useEffect, useRef } from 'react';

const s = {
  panel: { width: '360px', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', background: '#1e293b' },
  header: { padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: '700', color: '#f1f5f9', fontSize: '0.95rem' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  userMsg: { alignSelf: 'flex-end', background: '#6366f1', color: '#fff', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', fontSize: '0.9rem', lineHeight: '1.5' },
  aiMsg: { alignSelf: 'flex-start', background: '#0f172a', color: '#cbd5e1', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', maxWidth: '85%', fontSize: '0.9rem', lineHeight: '1.5' },
  inputArea: { padding: '16px', borderTop: '1px solid #334155', display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', resize: 'none' },
  sendBtn: (disabled) => ({ padding: '10px 16px', background: disabled ? '#334155' : '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.9rem', transition: 'background 0.2s' })
};

function ThinkingIndicator({ seconds, chars }) {
  const getStatus = () => {
    if (seconds < 15) return { text: 'KI denkt nach...', color: '#94a3b8' };
    if (seconds < 40) return { text: 'Generiere Inhalt...', color: '#f59e0b' };
    if (seconds < 80) return { text: 'Großes Dokument, bitte warten...', color: '#fb923c' };
    return { text: 'Fast fertig...', color: '#ef4444' };
  };

  const { text, color } = getStatus();
  const dots = '.'.repeat((seconds % 3) + 1).padEnd(3, '\u00a0');

  return (
    <div style={{
      alignSelf: 'flex-start',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px 12px 12px 2px',
      padding: '10px 14px',
      maxWidth: '85%',
    }}>
      <div style={{ color, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1rem' }}>⏳</span>
        <span>{text}{dots}</span>
      </div>

      {/* Timer */}
      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#475569', display: 'flex', gap: '12px' }}>
        <span>⏱ {seconds}s</span>
        {chars > 0 && <span>📝 {chars} Zeichen generiert</span>}
      </div>

      {/* Fortschrittsbalken (animiert) */}
      <div style={{ marginTop: '8px', background: '#1e293b', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: '40%',
          background: color,
          borderRadius: '4px',
          animation: 'slide 1.5s ease-in-out infinite',
        }} />
      </div>

      {seconds > 60 && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
          💡 Tipp: Kürzere Prompts = schnellere Antwort
        </div>
      )}
    </div>
  );
}

export default function AIChat({ socket, docId, userId }) {
  const [messages, setMessages]     = useState([
    { role: 'ai', text: '👋 Hallo! Beschreibe was ich erstellen oder ändern soll.' }
  ]);
  const [input, setInput]           = useState('');
  const [thinking, setThinking]     = useState(false);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [generatedChars, setGeneratedChars] = useState(0);
  const bottomRef   = useRef(null);
  const timerRef    = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('ai-response', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: message }]);
    });

    socket.on('ai-thinking', (val) => {
      setThinking(val);
      if (val) {
        // Timer starten
        setThinkingTime(0);
        setGeneratedChars(0);
        timerRef.current = setInterval(() => {
          setThinkingTime(t => t + 1);
        }, 1000);
      } else {
        // Timer stoppen
        clearInterval(timerRef.current);
      }
    });

    socket.on('ai-progress', ({ chars }) => {
      setGeneratedChars(chars);
    });

    socket.on('ai-error', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ ' + message }]);
    });

    return () => {
      socket.off('ai-response');
      socket.off('ai-thinking');
      socket.off('ai-progress');
      socket.off('ai-error');
      clearInterval(timerRef.current);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Cleanup Timer wenn Komponente unmountet
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  function send() {
    if (!input.trim() || !socket || !docId || thinking) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    socket.emit('ai-message', { docId, userId, message: input });
    setInput('');
  }

  return (
    <>
      {/* CSS Animation für Ladebalken */}
      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(400%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>

      <div style={s.panel}>
        <div style={s.header}>🤖 KI-Assistent</div>

        <div style={s.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? s.userMsg : s.aiMsg}>
              {msg.text}
            </div>
          ))}

          {thinking && (
            <ThinkingIndicator
              seconds={thinkingTime}
              chars={generatedChars}
            />
          )}

          <div ref={bottomRef} />
        </div>

        <div style={s.inputArea}>
          <textarea
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
            placeholder={thinking ? 'Warte auf Antwort...' : 'Schreib eine Anweisung… (Enter zum Senden)'}
            disabled={thinking}
          />
          <button style={s.sendBtn(thinking)} onClick={send} disabled={thinking}>
            {thinking ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </>
  );
}
