'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'

const DIAL_CODES: Record<string, string> = {
  FR: '+33', GP: '+590', MQ: '+596', GF: '+594', RE: '+262', YT: '+262',
  NC: '+687', PF: '+689', PM: '+508', BL: '+590', MF: '+590',
  BE: '+32', CH: '+41', LU: '+352', MC: '+377',
  DE: '+49', IT: '+39', ES: '+34', PT: '+351', NL: '+31', AT: '+43',
  IE: '+353', SE: '+46', DK: '+45', FI: '+358', PL: '+48',
  CZ: '+420', HU: '+36', RO: '+40', GR: '+30', BG: '+359',
  HR: '+385', SK: '+421', SI: '+386', EE: '+372', LV: '+371',
  LT: '+370', CY: '+357', MT: '+356',
  GB: '+44', NO: '+47', IS: '+354', LI: '+423',
  US: '+1', CA: '+1', BR: '+55', AR: '+54', MX: '+52',
  JP: '+81', KR: '+82', AU: '+61', NZ: '+64', SG: '+65', HK: '+852',
  MA: '+212', TN: '+216', DZ: '+213', SN: '+221',
}

function getFlagEmoji(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

function parsePhone(value: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: 'FR', number: '' }
  const sorted = Object.entries(DIAL_CODES).sort((a, b) => b[1].length - a[1].length)
  for (const [code, dc] of sorted) {
    if (value.startsWith(dc)) return { countryCode: code, number: value.slice(dc.length) }
  }
  return { countryCode: 'FR', number: value }
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
}

export default function PhoneInput({ value, onChange, required, invalid }: PhoneInputProps) {
  const tCommon = useTranslations('common')
  const initial = parsePhone(value)
  const [countryCode, setCountryCode] = useState(initial.countryCode)
  const [number, setNumber] = useState(initial.number)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Sync to parent on change
  const emit = useCallback((code: string, num: string) => {
    onChange((DIAL_CODES[code] ?? '+33') + num)
  }, [onChange])

  // Reset if parent clears value
  useEffect(() => {
    if (!value) { setCountryCode('FR'); setNumber('') }
  }, [value])

  const updateRect = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    if (spaceBelow < 288 && spaceAbove > spaceBelow) {
      setRect({ bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width + 100, 260) })
    } else {
      setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width + 100, 260) })
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => { window.removeEventListener('scroll', updateRect, true); window.removeEventListener('resize', updateRect) }
  }, [open, updateRect])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const panel = document.querySelector('[data-phone-panel]')
      if (triggerRef.current?.contains(e.target as Node)) return
      if (panel?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const flag = getFlagEmoji(countryCode)
  const dialCode = DIAL_CODES[countryCode] ?? '+33'

  const countries = Object.entries(DIAL_CODES).map(([code, dc]) => ({
    code, dialCode: dc, flag: getFlagEmoji(code), label: tCommon(`countries.${code}`),
  }))

  return (
    <div
      className="flex overflow-hidden rounded-xl transition-colors"
      style={{
        border: `1px solid ${invalid ? 'rgba(248,113,113,0.5)' : open ? 'rgba(245,158,11,0.4)' : 'var(--line)'}`,
        background: 'var(--bg-2)',
        boxShadow: open ? '0 0 0 3px rgba(245,158,11,0.1)' : 'none',
      }}
    >
      {/* Sélecteur indicatif */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex cursor-pointer shrink-0 items-center gap-1.5 border-r border-[var(--line)] bg-transparent px-3 py-2.5 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
      >
        <span className="text-base leading-none">{flag}</span>
        <span className="font-mono text-[12px] text-ink-1">{dialCode}</span>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="text-ink-3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Champ numéro */}
      <input
        type="tel"
        value={number}
        onChange={e => { setNumber(e.target.value); emit(countryCode, e.target.value) }}
        required={required}
        placeholder="6 12 34 56 78"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 outline-none"
      />

      {/* Dropdown pays */}
      {open && rect && createPortal(
        <ul
          data-phone-panel
          role="listbox"
          className="no-scrollbar fixed z-[1000] max-h-72 overflow-auto rounded-xl py-1.5"
          style={{
            ...(rect.top !== undefined ? { top: rect.top } : {}),
            ...(rect.bottom !== undefined ? { bottom: rect.bottom } : {}),
            left: rect.left,
            width: rect.width,
            background: 'var(--select-panel)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--line-2)',
            boxShadow: 'var(--select-shadow)',
          }}
        >
          {countries.map(({ code, dialCode: dc, flag: f, label }) => {
            const isSel = code === countryCode
            return (
              <li
                key={code}
                role="option"
                aria-selected={isSel}
                onClick={() => { setCountryCode(code); emit(code, number); setOpen(false) }}
                className="mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-amber/10"
                style={{ color: isSel ? '#F59E0B' : 'var(--ink-1)' }}
              >
                <span className="text-base leading-none">{f}</span>
                <span className="flex-1 truncate">{label}</span>
                <span className="font-mono text-[11px] text-ink-3 shrink-0">{dc}</span>
                {isSel && (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </li>
            )
          })}
        </ul>,
        document.body
      )}
    </div>
  )
}
