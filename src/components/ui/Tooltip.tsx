'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  content: string
  children: React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void }>
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ content, children, side = 'top' }: Props) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), 300)
  }, [])

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  const posClass: Record<NonNullable<Props['side']>, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClass: Record<NonNullable<Props['side']>, string> = {
    top:    'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--bg-3)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--bg-3)]',
    left:   'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--bg-3)]',
    right:  'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--bg-3)]',
  }

  return (
    <span className="relative inline-flex">
      {/* Enfant cloné avec les handlers hover */}
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>

      {visible && (
        <span
          role="tooltip"
          className={[
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-[var(--line-2)] px-2.5 py-1.5 font-sans text-[11px] font-medium text-ink-1 shadow-pop',
            posClass[side],
          ].join(' ')}
          style={{ background: 'var(--bg-3)' }}
        >
          {content}
          {/* Flèche */}
          <span
            className={['absolute border-4', arrowClass[side]].join(' ')}
            style={{ width: 0, height: 0 }}
          />
        </span>
      )}
    </span>
  )
}
