'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value?: string
  onChange: (value: string) => void
  options: (string | SelectOption)[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  compact?: boolean
}

function normalize(opt: string | SelectOption): SelectOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Choisir...',
  disabled,
  invalid,
  compact,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const items = options.map(normalize)
  const selected = items.find((o) => o.value === value)

  const close = useCallback(() => setOpen(false), [])

  // Position du panneau sous le trigger (recalculé à l'ouverture, au scroll et au resize)
  const updateRect = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + 8, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [open, updateRect])

  // Clic extérieur
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        // ne pas fermer si on clique dans le panneau (data-select-panel)
        const panel = document.querySelector('[data-select-panel]')
        if (panel && panel.contains(target)) return
        close()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, close])

  // Aligner le highlight sur la valeur sélectionnée à l'ouverture
  useEffect(() => {
    if (open) {
      const idx = items.findIndex((o) => o.value === value)
      setHighlight(idx >= 0 ? idx : 0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(idx: number) {
    onChange(items[idx].value)
    close()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        pick(highlight)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close()
        break
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between outline-none transition-all disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'rounded-lg px-2.5 py-1.5 text-xs' : 'rounded-xl px-4 py-3 text-sm'}`}
        style={{
          background: open ? 'rgba(245,158,11,0.04)' : 'var(--hi-04)',
          border: `1px solid ${invalid ? 'rgba(248,113,113,0.5)' : open ? 'rgba(245,158,11,0.4)' : 'var(--line-08)'}`,
          color: selected ? 'var(--ink-0)' : 'var(--ink-3)',
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${compact ? 'ml-1.5' : 'ml-2'}`}
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M4 6l4 4 4-4" stroke={open ? '#F59E0B' : 'var(--ink-2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && rect && createPortal(
        <ul
          data-select-panel
          role="listbox"
          className="no-scrollbar fixed z-[1000] max-h-60 overflow-auto rounded-xl py-1.5"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            background: 'var(--select-panel)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--line-2)',
            boxShadow: 'var(--select-shadow)',
            animation: 'fadeUp 160ms cubic-bezier(0.2,0.7,0.2,1) both',
          }}
        >
          {items.map((opt, idx) => {
            const isSelected = opt.value === value
            const isHighlight = idx === highlight
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(idx)}
                className="mx-1.5 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: isHighlight ? 'rgba(245,158,11,0.1)' : 'transparent',
                  color: isSelected ? '#F59E0B' : isHighlight ? 'var(--ink-0)' : 'var(--ink-1)',
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="ml-2 shrink-0">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>,
        document.body
      )}
    </>
  )
}
