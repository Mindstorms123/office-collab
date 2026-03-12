import { useState, useEffect, useRef } from 'react';

const s = {
  panel: { width: '360px', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', background: '#1e293b' },
  header: { padding: '16px 20px', borderBottom: '1px solid #334155', fontWeight: '700', color: '#f1f5f9', fontSize: '0.95rem' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  userMsg: { alignSelf: 'flex-end', background: '#6366f1', color: '#fff', padding: '10px 14px', borderRadius: '12px 12px 2px 12px', maxWidth: '80%', fontSize: '0.9rem', lineHeight: '1.5' },
  aiMsg: { alignSelf: 'flex-start', background: '#0f172a', color: '#cbd5e1', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', maxWidth: '85%', fontSize: '0.9rem', lineHeight: '1.5' },
  thinkingMsg: { alignSelf: 'flex-start', color: '#94a3b8', fontSize: '0.85rem', padding: '8px', animation: 'pulse 1s infinite' },
  inputArea: { padding: '16px', borderTop: '1px solid #334155', display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', resize: 'none' },
  sendBtn: { padding: '10px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }
};

export default function AIChat({ socket, docId, userId }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: '👋 Hallo! Beschreibe was ich erstellen oder ändern soll.' }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('ai-response', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: message }]);
    });
    socket.on('ai-thinking', (val) => setThinking(val));
    socket.on('ai-error', ({ message }) => {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ ' + message }]);
    });

    return () => {
      socket.off('ai-response');
      socket.off('ai-thinking');
      socket.off('ai-error');
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  function send() {
    if (!input.trim() || !socket || !docId) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    socket.emit('ai-message', { docId, userId, message: input });
    setInput('');
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>🤖 KI-Assistent</div>
      <div style={s.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? s.userMsg : s.aiMsg}>
            {msg.text}
          </div>
        ))}
        {thinking && <div style={s.thinkingMsg}>⏳ KI denkt nach...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={s.inputArea}>
        <textarea
          style={s.input}
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Schreib eine Anweisung… (Enter zum Senden)"
        />
        <button style={s.sendBtn} onClick={send} disabled={thinking}>➤</button>
      </div>
    </div>
  );
}
