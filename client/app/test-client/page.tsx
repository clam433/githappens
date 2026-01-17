'use client';

import { useEffect, useState } from 'react';
import { identify, track } from '@/lib/amplitude/client';

type Msg = { role: 'user' | 'assistant'; text: string };

export default function TestClientPage() {
  const [userId, setUserId] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [suggestedId, setSuggestedId] = useState('test_user');

  useEffect(() => {
    setSuggestedId(`test_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`);
  }, []);

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Ask: "what events happened in the last 15 minutes?" or "who are the active users?"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;

    const finalId = userId || suggestedId;

    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/amplitude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: data.answer || 'No answer returned.' }]);

      // Send to Amplitude (analytics)
      track('amplitude_chat_question', { question: msg });

      // Mirror to your backend live buffer (for instant "live events" answers)
      fetch('/api/amplitude/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'amplitude_chat_question',
          user_id: finalId,
          event_properties: { question: msg, plan },
          ts: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Request failed. Check server logs.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 12, maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Amplitude Chat</h1>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          User ID
          <input
            value={userId}
            placeholder={suggestedId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Plan
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as any)}
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
        </label>
      </div>

      <button
        onClick={() => {
          const finalId = userId || suggestedId;
          identify(finalId, { plan, test_user: true });
          track('test_identify_clicked', { plan });

          // Optional: mirror identify click too (helps your live view)
          fetch('/api/amplitude/mirror', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'test_identify_clicked',
              user_id: finalId,
              event_properties: { plan },
              ts: Date.now(),
            }),
          }).catch(() => {});
        }}
        style={{ padding: 12, borderRadius: 10 }}
      >
        Identify user + set props
      </button>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 12,
          height: 360,
          overflow: 'auto',
          display: 'grid',
          gap: 10,
          background: '#fff',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              justifySelf: m.role === 'user' ? 'end' : 'start',
              maxWidth: '85%',
              padding: 10,
              borderRadius: 12,
              border: '1px solid #e5e5e5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.text}
          </div>
        ))}
        {loading ? <div style={{ opacity: 0.7, fontSize: 14 }}>Thinking...</div> : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "what events happened in the last 12 minutes?"'
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          style={{ padding: 12, borderRadius: 10, border: '1px solid #ccc' }}
        />
        <button onClick={send} disabled={loading} style={{ padding: 12, borderRadius: 10 }}>
          Send
        </button>
      </div>
    </div>
  );
}
