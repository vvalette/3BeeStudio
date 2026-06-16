'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const COLLAPSED_HEIGHT = 130

export default function DescriptionExpand({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 4)
  }, [text])

  return (
    <div>
      <div className="relative overflow-hidden" style={{ maxHeight: expanded ? undefined : COLLAPSED_HEIGHT }}>
        <div ref={ref}>
          <ReactMarkdown
            components={{
              p:      ({ children }) => <p className="mb-3 last:mb-0 text-[15px] text-ink-2 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-ink-1">{children}</strong>,
              em:     ({ children }) => <em className="italic text-ink-2">{children}</em>,
              ul:     ({ children }) => <ul className="mb-3 list-disc pl-4 space-y-1 text-[15px] text-ink-2">{children}</ul>,
              ol:     ({ children }) => <ol className="mb-3 list-decimal pl-4 space-y-1 text-[15px] text-ink-2">{children}</ol>,
              li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
              h3:     ({ children }) => <h3 className="mb-1 mt-3 font-semibold text-ink-1 text-[14px] uppercase tracking-wider">{children}</h3>,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
        {!expanded && overflows && (
          <div
            className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #0A0A0B, transparent)' }}
          />
        )}
      </div>
      {overflows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 font-mono text-[12px] tracking-[0.05em] text-amber hover:text-amber-soft transition-colors cursor-pointer"
        >
          {expanded ? 'Voir moins ↑' : 'Voir plus ↓'}
        </button>
      )}
    </div>
  )
}
