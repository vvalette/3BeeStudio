'use client'

import { useCart } from './CartProvider'

export default function CartButton() {
  const { count, open } = useCart()

  return (
    <button
      onClick={open}
      aria-label={`Panier (${count} article${count > 1 ? 's' : ''})`}
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-bg-2 text-ink-1 transition-colors hover:bg-bg-3 hover:text-ink-0"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
        <path d="M2 2h2.5l2.2 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 6H5.2" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold text-bg-0"
          style={{ background: 'var(--amber)' }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
