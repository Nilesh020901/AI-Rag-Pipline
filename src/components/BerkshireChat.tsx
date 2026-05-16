'use client';

import type { UIMessage } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThemeToggle } from './ThemeToggle';

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getText(m: UIMessage) {
  return m.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
}

const SUGGESTED = [
  { icon: '📈', text: 'What does Buffett say about stock repurchases?' },
  { icon: '🏦', text: 'How did Berkshire Hathaway perform in 2022?' },
  { icon: '💡', text: "What is Buffett's view on long-term investing?" },
  { icon: '🏭', text: "Describe Berkshire's largest business holdings." },
];

/* ─── SVG ICONS ─────────────────────────────────────────────────────── */
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="20" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ─── COMPONENT ──────────────────────────────────────────────────────── */
export function BerkshireChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantDraft, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const makeUserMsg = useCallback((text: string): UIMessage => ({
    id: createId(),
    role: 'user',
    parts: [{ type: 'text', text }],
  }), []);

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setInput('');
    setHasStarted(true);

    const userMsg = makeUserMsg(text);
    const next = [...messages, userMsg];
    setMessages(next);
    setAssistantDraft('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, threadId: threadId ?? undefined, resourceId: 'web-client' }),
        signal: abortRef.current.signal,
      });

      const newThread = res.headers.get('X-Thread-Id');
      if (newThread && !threadId) setThreadId(newThread);

      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setAssistantDraft(full);
      }

      setMessages([...next, { id: createId(), role: 'assistant', parts: [{ type: 'text', text: full }] }]);
      setAssistantDraft('');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, makeUserMsg, messages, threadId]);

  const stopGeneration = () => { abortRef.current?.abort(); };

  const newChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setAssistantDraft('');
    setThreadId(null);
    setError(null);
    setInput('');
    setHasStarted(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <div className="gpt-shell">

      {/* ── SIDEBAR ── */}
      <aside className="gpt-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📊</div>
          <div>
            <div className="sidebar-logo-text">Berkshire AI</div>
            <div className="sidebar-logo-sub">Powered by Mastra RAG</div>
          </div>
        </div>

        {/* New Chat */}
        <button className="sidebar-new-chat" onClick={newChat}>
          <IconPlus />
          New conversation
        </button>

        {/* History */}
        {hasStarted && (
          <>
            <div className="sidebar-section-label">Recent</div>
            <div className="sidebar-history-item active">
              <IconChat />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {messages[0] ? getText(messages[0]).slice(0, 38) + (getText(messages[0]).length > 38 ? '…' : '') : 'New conversation'}
              </span>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ padding: '6px 12px', fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Data from Berkshire Hathaway<br />
            Shareholder Letters 2019–2024
          </div>
          {threadId && (
            <div style={{ padding: '4px 12px', fontSize: '0.68rem', color: 'var(--accent)' }}>
              ● Conversation memory active
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="gpt-main">

        {/* Top bar */}
        <div className="gpt-topbar">
          <div className="topbar-model-pill">
            <span className="topbar-model-dot" />
            Berkshire Hathaway Intelligence
          </div>
          <div className="topbar-actions">
            {hasStarted && (
              <button className="topbar-btn" onClick={newChat}>
                <IconPlus /> New Chat
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Messages */}
        <div className="gpt-messages-area">
          <div className="gpt-messages-inner">

            {/* Welcome */}
            {!hasStarted && (
              <div className="gpt-welcome">
                <div className="welcome-logo-wrap">
                  <div className="welcome-logo">🏦</div>
                  <div>
                    <h1 className="welcome-title">Berkshire Hathaway Intelligence</h1>
                    <p className="welcome-subtitle">
                      Ask anything about Warren Buffett's investment philosophy and Berkshire's strategy,
                      grounded in shareholder letters from 2019 to 2024.
                    </p>
                  </div>
                </div>
                <div className="welcome-cards">
                  {SUGGESTED.map((s, i) => (
                    <button key={i} className="welcome-card" onClick={() => void send(s.text)} disabled={loading}>
                      <span className="wcard-icon">{s.icon}</span>
                      <span className="wcard-text">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            {hasStarted && messages.map((m) => (
              <div key={m.id} className="msg-row">
                {m.role === 'user' ? (
                  <div className="msg-user-wrap">
                    <div className="msg-user-bubble">{getText(m)}</div>
                  </div>
                ) : (
                  <div className="msg-ai-wrap">
                    <div className="msg-ai-avatar">B</div>
                    <div className="msg-ai-body">
                      <div className="msg-ai-label">Berkshire Analyst</div>
                      <MarkdownRenderer content={getText(m)} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming draft */}
            {loading && assistantDraft && (
              <div className="msg-row">
                <div className="msg-ai-wrap">
                  <div className="msg-ai-avatar">B</div>
                  <div className="msg-ai-body">
                    <div className="msg-ai-label">Berkshire Analyst</div>
                    <MarkdownRenderer content={assistantDraft} isStreaming />
                  </div>
                </div>
              </div>
            )}

            {/* Thinking dots */}
            {loading && !assistantDraft && (
              <div className="msg-row">
                <div className="thinking-wrap">
                  <div className="msg-ai-avatar">B</div>
                  <div className="msg-ai-body">
                    <div className="msg-ai-label">Berkshire Analyst &nbsp;·&nbsp; Searching letters…</div>
                    <div className="thinking-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="gpt-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
                <button className="gpt-error-dismiss" onClick={() => setError(null)}>✕</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="gpt-input-area">
          <div className="gpt-input-inner">
            <form onSubmit={e => { e.preventDefault(); void send(); }}>
              <div className="gpt-input-box">
                <textarea
                  ref={textareaRef}
                  id="berkshire-input"
                  className="gpt-textarea"
                  rows={1}
                  value={input}
                  placeholder="Ask about Warren Buffett, Berkshire's strategy, investments…"
                  disabled={loading}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  aria-label="Your question"
                />
                {loading ? (
                  <button
                    type="button"
                    className="gpt-send-btn active"
                    onClick={stopGeneration}
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <IconStop />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`gpt-send-btn${canSend ? ' active' : ''}`}
                    disabled={!canSend}
                    aria-label="Send message"
                  >
                    {loading ? <IconSpinner /> : <IconSend />}
                  </button>
                )}
              </div>
            </form>
            <p className="gpt-input-footer">
              <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line &nbsp;·&nbsp; Answers sourced from Berkshire letters
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
