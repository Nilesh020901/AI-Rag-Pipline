'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownProps) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = className?.includes('language-');
            const lang = className?.replace('language-', '') ?? '';
            if (isBlock) {
              return (
                <pre>
                  {lang && (
                    <div className="code-block-header">
                      <span className="code-lang-label">{lang}</span>
                    </div>
                  )}
                  <code className={className} {...props}>{children}</code>
                </pre>
              );
            }
            return <code {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="stream-cursor" aria-hidden="true" />}
    </div>
  );
}
