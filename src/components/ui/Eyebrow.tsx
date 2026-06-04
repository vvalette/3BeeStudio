interface EyebrowProps {
  children: React.ReactNode
  dot?: boolean
}

export default function Eyebrow({ children, dot = true }: EyebrowProps) {
  return (
    <div className="inline-flex items-center gap-2">
      {dot && (
        <span
          className="block w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0"
          style={{ boxShadow: '0 0 10px var(--amber)' }}
        />
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber leading-none">
        {children}
      </span>
    </div>
  )
}
