'use client';

import type { UIMessage } from 'ai';
import { useCallback, useMemo, useState } from 'react';
import '@/styles/chat.css';

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BerkshireChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const appendUserMessage = useCallback((text: string): UIMessage => {
    return {
      id: createId(),
      role: 'user',
      parts: [{ type: 'text', text }],
    };
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }
    setError(null);
    setLoading(true);
    setInput('');

    const userMessage = appendUserMessage(text);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setAssistantDraft('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          threadId: threadId ?? undefined,
          resourceId: 'web-client',
        }),
      });

      const newThread = res.headers.get('X-Thread-Id');
      if (newThread && !threadId) {
        setThreadId(newThread);
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        full += decoder.decode(value, { stream: true });
        setAssistantDraft(full);
      }

      const assistantMessage: UIMessage = {
        id: createId(),
        role: 'assistant',
        parts: [{ type: 'text', text: full }],
      };
      setMessages([...nextMessages, assistantMessage]);
      setAssistantDraft('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [appendUserMessage, input, loading, messages, threadId]);

  return (
    <div className="berkshire-chat">
      <header className="berkshire-chat-header">
        <div>
          <h1 className="berkshire-chat-title">Berkshire Hathaway Intelligence</h1>
          <p className="berkshire-chat-sub">
            Questions are answered from Warren Buffett shareholder letters using Mastra RAG. Responses stream in real time.
          </p>
        </div>
        {threadId ? (
          <span className="berkshire-chat-thread" title="Conversation id (memory scope)">
            Conversation saved
          </span>
        ) : null}
      </header>

      <div className="berkshire-chat-panel">
        <div className="berkshire-chat-messages" aria-live="polite">
          {messages.length === 0 && !loading ? (
            <p className="berkshire-chat-empty">
              Ask about Berkshire strategy, acquisitions, Buffett&apos;s views on markets, and more. Load PDFs into{' '}
              <code>data/letters</code> and run ingestion first (see README).
            </p>
          ) : null}

          {messages.map((m) => (
            <article key={m.id} className={m.role === 'user' ? 'berkshire-msg berkshire-msg-user' : 'berkshire-msg berkshire-msg-assistant'}>
              <span className="berkshire-msg-label">{m.role === 'user' ? 'You' : 'Analyst'}</span>
              <div className="berkshire-msg-body">
                {m.parts
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p, i) => (
                    <p key={i} className="berkshire-msg-paragraph">
                      {p.text}
                    </p>
                  ))}
              </div>
            </article>
          ))}

          {loading && assistantDraft ? (
            <article className="berkshire-msg berkshire-msg-assistant berkshire-msg-streaming">
              <span className="berkshire-msg-label">Analyst</span>
              <div className="berkshire-msg-body">
                <p className="berkshire-msg-paragraph">{assistantDraft}</p>
              </div>
            </article>
          ) : null}

          {loading && !assistantDraft ? (
            <div className="berkshire-chat-loading" role="status">
              <span className="berkshire-dot" />
              Thinking through the letters…
            </div>
          ) : null}
        </div>

        {error ? <div className="berkshire-chat-error">{error}</div> : null}

        <form
          className="berkshire-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label className="berkshire-chat-label" htmlFor="berkshire-input">
            Your question
          </label>
          <textarea
            id="berkshire-input"
            className="berkshire-chat-input"
            rows={3}
            value={input}
            placeholder="e.g. What does Warren Buffett say about share repurchases?"
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="berkshire-chat-actions">
            <button type="submit" className="berkshire-chat-submit" disabled={!canSend}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
